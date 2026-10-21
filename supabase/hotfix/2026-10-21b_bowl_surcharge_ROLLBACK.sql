-- ROLLBACK de 2026-10-21b: restaura EXACTAMENTE el hotfix 2026-10-21 (no la versión original de prod).
-- Misma firma de 10 args; no crea overloads.
BEGIN;
CREATE OR REPLACE FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text" DEFAULT NULL::"text", "p_delivery_zone" "text" DEFAULT NULL::"text", "p_delivery_fee_cents" integer DEFAULT 0, "p_notes" "text" DEFAULT NULL::"text", "p_total_cents" integer DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb", "p_payment_method" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    qty := COALESCE((item ->> 'quantity')::integer, 0);
    IF qty < 1 OR qty > 50 THEN
      RAISE EXCEPTION 'Cantidad inválida para %', item ->> 'name';
    END IF;
    claimed_unit := COALESCE((item ->> 'unit_price_cents')::integer, -1);
    v_pid := NULL;

    IF item -> 'details' ->> 'product_id' IS NOT NULL THEN
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
        -- HOTFIX 2026-10-21: el frontend legacy (98bd908) no tiene selector de sabor.
        -- Sin variante enviada se acepta el precio base SOLO si existe una variante
        -- activa con delta 0 (precio base = precio real de una opción vendible).
        ELSIF EXISTS (
          SELECT 1 FROM public.product_variants pv
          WHERE pv.product_id = v_pid AND pv.is_active
        ) AND NOT EXISTS (
          SELECT 1 FROM public.product_variants pv
          WHERE pv.product_id = v_pid AND pv.is_active AND pv.price_delta_cents = 0
        ) THEN
          RAISE EXCEPTION 'Falta seleccionar sabor para %', item ->> 'name';
        END IF;
      END IF;

      FOR extra IN
        SELECT * FROM jsonb_array_elements(
          COALESCE(item -> 'details' -> 'customizations' -> 'extras', '[]'::jsonb))
      LOOP
        v_price := NULL;
        -- HOTFIX 2026-10-21: extras de producto de product_default_ingredients
        -- (precio del servidor, solo si pertenece al MISMO producto y is_extra).
        IF v_pid IS NOT NULL THEN
          SELECT pdi.extra_price_cents INTO v_price
          FROM public.product_default_ingredients pdi
          WHERE pdi.id::text = extra ->> 'id'
            AND pdi.product_id = v_pid
            AND pdi.is_extra;
        END IF;
        IF v_price IS NULL THEN
        SELECT a.price_cents INTO v_price
        FROM public.addons a
        WHERE a.id::text = extra ->> 'id' AND a.is_active;
        IF v_price IS NULL THEN
          SELECT p2.price_cents INTO v_price
          FROM public.products p2
          WHERE p2.id::text = extra ->> 'id' AND p2.is_active;
        END IF;
        END IF;
        IF v_price IS NULL THEN
          RAISE EXCEPTION 'Adicional no disponible: %', extra ->> 'name';
        END IF;
        unit := unit + v_price;
      END LOOP;

    ELSIF item -> 'details' -> 'validation' IS NOT NULL THEN
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

      FOR extra IN SELECT * FROM jsonb_array_elements(COALESCE(v -> 'extras', '[]'::jsonb)) LOOP
        v_charge := COALESCE((extra ->> 'charge')::integer, -1);
        -- HOTFIX 2026-10-21: 500 = EXTRA_COMP_PRICE del BowlBuilder legacy.
        IF v_charge NOT IN (500, 2000, 3000, 5000)
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
$$;

REVOKE ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") TO "service_role";
COMMIT;
