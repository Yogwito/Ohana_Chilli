-- ═══════════════════════════════════════════════════════════════════════════
-- Endurecimiento de creación de órdenes.
--
-- Antes: create_order_with_items insertaba unit_price_cents / total_cents /
-- delivery_fee_cents TAL CUAL los mandaba el cliente, y orders/order_items
-- tenían política de INSERT anónimo directo (se podía saltar la RPC).
--
-- Ahora:
--  * La RPC recalcula y valida CADA precio contra el catálogo vivo
--    (products, product_variants, addons, promotions tipo combo, bowl_rules,
--    ingredients, delivery_zones). Cualquier discrepancia o item inactivo
--    aborta la transacción completa.
--  * Se eliminan las políticas de INSERT anónimo directo: la RPC (SECURITY
--    DEFINER) es la única vía de escritura.
--  * orders.payment_method se persiste (antes solo iba en el WhatsApp).
--  * Se agregan políticas admin faltantes para categories / ingredients /
--    bowl_rules / delivery_zones (el CRUD del admin estaba bloqueado por RLS)
--    y lectura admin de ingredientes inactivos (para poder reactivarlos).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. payment_method en orders ─────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'transfer', 'wompi'));

-- ── 2. Cerrar la puerta lateral: sin INSERT directo de anon ─────────────────
DROP POLICY IF EXISTS anon_insert_orders ON public.orders;
DROP POLICY IF EXISTS anon_insert_order_items ON public.order_items;
DROP POLICY IF EXISTS "guest can insert orders" ON public.orders;
DROP POLICY IF EXISTS "guest can insert order items" ON public.order_items;

-- ── 3. Políticas admin faltantes (CRUD del panel estaba bloqueado) ──────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'ingredients', 'bowl_rules', 'delivery_zones']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY admin_all_%I ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.user_roles
                        WHERE user_id = auth.uid() AND role = ''admin''::app_role))
         WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                             WHERE user_id = auth.uid() AND role = ''admin''::app_role))',
      t, t);
  END LOOP;
END $$;

-- ── 4. RPC validadora ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_customer_name text,
  p_phone text,
  p_order_type text,
  p_address text DEFAULT NULL,
  p_delivery_zone text DEFAULT NULL,
  p_delivery_fee_cents integer DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_total_cents integer DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_payment_method text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_order_id uuid;
  item jsonb;
  extra jsonb;
  v jsonb;
  ing_id text;
  qty integer;
  claimed_unit integer;
  unit integer;
  computed_subtotal integer := 0;
  v_fee integer := 0;
  v_pid uuid;
  v_base integer;
  v_delta integer;
  v_price integer;
  v_charge integer;
  v_promo_id text;
BEGIN
  -- Datos básicos
  IF p_customer_name IS NULL OR length(btrim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Nombre de cliente inválido';
  END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\D', '', 'g')) < 7 THEN
    RAISE EXCEPTION 'Teléfono inválido';
  END IF;
  IF p_order_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Tipo de orden inválido';
  END IF;
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('cash', 'transfer', 'wompi') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La orden no tiene items';
  END IF;

  -- Domicilio: zona y tarifa canónicas del catálogo, nunca del cliente
  IF p_order_type = 'delivery' THEN
    IF p_address IS NULL OR length(btrim(p_address)) < 5 THEN
      RAISE EXCEPTION 'Dirección inválida para domicilio';
    END IF;
    SELECT dz.fee_cents INTO v_fee
    FROM public.delivery_zones dz
    WHERE dz.is_active
      AND lower(btrim(dz.name)) = lower(btrim(COALESCE(p_delivery_zone, '')))
    LIMIT 1;
    IF v_fee IS NULL THEN
      RAISE EXCEPTION 'Zona de entrega no disponible: %', p_delivery_zone;
    END IF;
  END IF;

  IF COALESCE(p_delivery_fee_cents, 0) <> v_fee THEN
    RAISE EXCEPTION 'Tarifa de domicilio no coincide (enviada %, vigente %)',
      p_delivery_fee_cents, v_fee;
  END IF;

  -- Validación item por item
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    qty := COALESCE((item ->> 'quantity')::integer, 0);
    IF qty < 1 OR qty > 50 THEN
      RAISE EXCEPTION 'Cantidad inválida para %', item ->> 'name';
    END IF;
    claimed_unit := COALESCE((item ->> 'unit_price_cents')::integer, -1);

    IF item -> 'details' ->> 'product_id' IS NOT NULL THEN
      -- ── Producto de catálogo (o combo de promoción sintético promo-*) ──
      IF (item -> 'details' ->> 'product_id') LIKE 'promo-%' THEN
        v_promo_id := substring(item -> 'details' ->> 'product_id' FROM 7);
        SELECT pr.price_cents INTO v_price
        FROM public.promotions pr
        WHERE pr.id::text = v_promo_id
          AND pr.is_active
          AND pr.type = 'combo'
          AND pr.price_cents IS NOT NULL
          AND (pr.starts_at IS NULL OR pr.starts_at <= now())
          AND (pr.ends_at IS NULL OR pr.ends_at >= now());
        IF v_price IS NULL THEN
          RAISE EXCEPTION 'Promoción no disponible: %', item ->> 'name';
        END IF;
        unit := v_price;
      ELSE
        SELECT p.price_cents, p.id INTO v_base, v_pid
        FROM public.products p
        WHERE p.id::text = item -> 'details' ->> 'product_id'
          AND p.is_active;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Producto no disponible: %', item ->> 'name';
        END IF;
        unit := v_base;

        -- Variante/sabor: si viene, debe ser válida; si el producto tiene
        -- variantes activas, es obligatoria.
        IF item -> 'details' -> 'customizations' -> 'variant' ->> 'id' IS NOT NULL THEN
          SELECT pv.price_delta_cents INTO v_delta
          FROM public.product_variants pv
          WHERE pv.id::text = item -> 'details' -> 'customizations' -> 'variant' ->> 'id'
            AND pv.product_id = v_pid
            AND pv.is_active;
          IF v_delta IS NULL THEN
            RAISE EXCEPTION 'Sabor/variante no disponible para %', item ->> 'name';
          END IF;
          unit := unit + v_delta;
        ELSIF EXISTS (
          SELECT 1 FROM public.product_variants pv
          WHERE pv.product_id = v_pid AND pv.is_active
        ) THEN
          RAISE EXCEPTION 'Falta seleccionar sabor para %', item ->> 'name';
        END IF;
      END IF;

      -- Adicionales: cada entrada debe existir activa en el catálogo
      -- compartido de addons (o ser un producto activo de adicionales) y su
      -- precio se toma del catálogo, no del cliente.
      FOR extra IN
        SELECT * FROM jsonb_array_elements(
          COALESCE(item -> 'details' -> 'customizations' -> 'extras', '[]'::jsonb))
      LOOP
        SELECT a.price_cents INTO v_price
        FROM public.addons a
        WHERE a.id::text = extra ->> 'id' AND a.is_active;
        IF v_price IS NULL THEN
          SELECT p2.price_cents INTO v_price
          FROM public.products p2
          WHERE p2.id::text = extra ->> 'id' AND p2.is_active;
        END IF;
        IF v_price IS NULL THEN
          RAISE EXCEPTION 'Adicional no disponible: %', extra ->> 'name';
        END IF;
        unit := unit + v_price;
      END LOOP;

    ELSIF item -> 'details' -> 'validation' IS NOT NULL THEN
      -- ── Bowl personalizado ──
      v := item -> 'details' -> 'validation';
      SELECT br.price_cents INTO v_price
      FROM public.bowl_rules br
      WHERE br.size = v ->> 'size';
      IF v_price IS NULL THEN
        RAISE EXCEPTION 'Tamaño de bowl inválido';
      END IF;
      unit := v_price;

      FOR ing_id IN SELECT jsonb_array_elements_text(COALESCE(v -> 'ingredient_ids', '[]'::jsonb)) LOOP
        SELECT i.price_cents INTO v_charge
        FROM public.ingredients i
        WHERE i.id = ing_id AND i.is_active;
        IF v_charge IS NULL THEN
          RAISE EXCEPTION 'Ingrediente no disponible: %', ing_id;
        END IF;
        unit := unit + v_charge;
      END LOOP;

      -- Extras del builder: el recargo debe ser una tarifa reconocida
      -- (proteína 5000, acompañante/topping 3000, salsa 2000) o el precio
      -- de un ingrediente activo con recargo (croqueta, queso frito, papas).
      FOR extra IN SELECT * FROM jsonb_array_elements(COALESCE(v -> 'extras', '[]'::jsonb)) LOOP
        v_charge := COALESCE((extra ->> 'charge')::integer, -1);
        IF v_charge NOT IN (2000, 3000, 5000)
           AND NOT EXISTS (
             SELECT 1 FROM public.ingredients i
             WHERE i.is_active AND i.price_cents > 0 AND i.price_cents = v_charge
           ) THEN
          RAISE EXCEPTION 'Recargo de bowl inválido: % (%)', extra ->> 'name', v_charge;
        END IF;
        unit := unit + v_charge;
      END LOOP;
    ELSE
      RAISE EXCEPTION 'Item sin datos de validación: %', item ->> 'name';
    END IF;

    IF claimed_unit <> unit THEN
      RAISE EXCEPTION 'Precio no coincide para % (enviado %, vigente %)',
        item ->> 'name', claimed_unit, unit;
    END IF;
    computed_subtotal := computed_subtotal + unit * qty;
  END LOOP;

  IF COALESCE(p_total_cents, -1) <> computed_subtotal + v_fee THEN
    RAISE EXCEPTION 'Total no coincide (enviado %, vigente %)',
      p_total_cents, computed_subtotal + v_fee;
  END IF;

  INSERT INTO public.orders (
    customer_name, phone, order_type, address, delivery_zone,
    delivery_fee_cents, notes, total_cents, payment_method
  ) VALUES (
    btrim(p_customer_name), btrim(p_phone), p_order_type, p_address, p_delivery_zone,
    v_fee, p_notes, computed_subtotal + v_fee, p_payment_method
  )
  RETURNING id INTO new_order_id;

  INSERT INTO public.order_items (order_id, brand_id, name, unit_price_cents, quantity, details)
  SELECT
    new_order_id,
    it ->> 'brand_id',
    it ->> 'name',
    COALESCE((it ->> 'unit_price_cents')::integer, 0),
    COALESCE((it ->> 'quantity')::integer, 1),
    CASE WHEN (it -> 'details') IS NOT NULL AND (it -> 'details') <> 'null'::jsonb
         THEN it -> 'details' ELSE NULL END
  FROM jsonb_array_elements(p_items) AS it;

  RETURN new_order_id::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_with_items(text, text, text, text, text, integer, text, integer, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(text, text, text, text, text, integer, text, integer, jsonb, text) TO anon, authenticated;

-- Compat: elimina la firma vieja (sin p_payment_method) para que no queden
-- dos sobrecargas y la vieja sin validación siga siendo invocable.
DROP FUNCTION IF EXISTS public.create_order_with_items(text, text, text, text, text, integer, text, integer, jsonb);
