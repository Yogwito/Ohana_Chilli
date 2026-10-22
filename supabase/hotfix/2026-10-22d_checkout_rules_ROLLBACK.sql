-- Restores 21c RPC; keeps configured schedule and flag. Disable flag before rollback if needed.
-- HOTFIX 2026-10-21c: 21b + (1) extras de carritos guardados antes de 527c185 (sin source_id)
-- y (2) salsa "adicional/extra" con precio 0 cobrada 3000 como en bowlPricing.ts (21b cobraba 2000).
-- CREATE OR REPLACE, misma firma de 10 args y mismos grants. Sigue sin confiar en precios del cliente
-- salvo el caso legacy, donde el recargo declarado debe ser EXACTAMENTE el de un ingrediente activo del mismo tipo.
-- Rollback: 2026-10-21c_bowl_legacy_extras_ROLLBACK.sql (vuelve a 21b, lo que hay hoy en prod).
-- Guardia: aborta si la función vigente no es 21b ni 21c, o si hay sobrecargas.
BEGIN;
DO $$
DECLARE n integer; src text;
BEGIN
  SELECT count(*), max(p.prosrc) INTO n, src FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'create_order_with_items';
  IF n <> 1 OR (src NOT LIKE '%HOTFIX 2026-10-21d%') THEN
    RAISE EXCEPTION 'ALTO: create_order_with_items no es 21d (o hay % versiones). No se aplicó nada.', n;
  END IF;
END $$;
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
  v_type text;
  v_name text;
  v_named boolean;
  v_max_bases integer;
  v_max_proteins integer;
  v_max_acomp integer;
  v_max_sauces integer;
  v_n_base integer;
  v_n_protein integer;
  v_n_acomp integer;
  v_n_sauce integer;
  v_n_topping integer;
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
      -- HOTFIX 2026-10-21b (vigente en 21c): el servidor calcula CADA recargo del bowl desde el
      -- catálogo (ingredients + bowl_rules). El cliente solo declara QUÉ eligió
      -- (ids y tipo de extra); cualquier "charge" enviado se ignora.
      v := item -> 'details' -> 'validation';
      SELECT br.price_cents, br.bases, br.proteins, br.accompaniments
        INTO v_price, v_max_bases, v_max_proteins, v_max_acomp
      FROM public.bowl_rules br
      WHERE br.size = v ->> 'size';
      IF v_price IS NULL THEN
        RAISE EXCEPTION 'Tamaño de bowl inválido';
      END IF;
      -- Mismo límite que el frontend (publicCatalog.ts): salsas y complementos 1/2/3.
      v_max_sauces := CASE v ->> 'size' WHEN 'large' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END;
      unit := v_price;
      v_n_base := 0; v_n_protein := 0; v_n_acomp := 0; v_n_sauce := 0; v_n_topping := 0;

      -- Ingredientes incluidos: precio de catálogo o, si el nombre dice
      -- "adicional"/"extra" con precio 0, el recargo fijo por tipo (como bowlPricing.ts).
      FOR ing_id IN SELECT jsonb_array_elements_text(COALESCE(v -> 'ingredient_ids', '[]'::jsonb)) LOOP
        SELECT i.type, i.price_cents, i.name INTO v_type, v_charge, v_name
        FROM public.ingredients i
        WHERE i.id = ing_id AND i.is_active;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Ingrediente no disponible: %', ing_id;
        END IF;
        IF COALESCE(v_charge, 0) <= 0 THEN
          v_charge := CASE WHEN (lower(translate(v_name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) ~ '(adicional|extra)') THEN (CASE WHEN v_type = 'protein' THEN 5000 ELSE 3000 END) ELSE 0 END;
        END IF;
        unit := unit + v_charge;
        CASE v_type
          WHEN 'base' THEN v_n_base := v_n_base + 1;
          WHEN 'protein' THEN v_n_protein := v_n_protein + 1;
          WHEN 'acompanante' THEN v_n_acomp := v_n_acomp + 1;
          WHEN 'sauce' THEN v_n_sauce := v_n_sauce + 1;
          ELSE v_n_topping := v_n_topping + 1;
        END CASE;
      END LOOP;

      IF v_n_base > v_max_bases OR v_n_protein > v_max_proteins OR v_n_acomp > v_max_acomp
         OR v_n_sauce > v_max_sauces OR v_n_topping > v_max_sauces THEN
        RAISE EXCEPTION 'Selección excede el tamaño de bowl %', v ->> 'size';
      END IF;

      -- Extras pagos: { kind, source_id }. kind debe coincidir con el tipo del
      -- ingrediente (protein | acompanante | sauce | topping). Precio = catálogo.
      FOR extra IN SELECT * FROM jsonb_array_elements(COALESCE(v -> 'extras', '[]'::jsonb)) LOOP
        -- 'named': recargo de un ingrediente incluido; ya se cobró arriba desde ingredient_ids.
        -- Ignorarlo no permite pagar menos (el servidor nunca usa el charge declarado).
        CONTINUE WHEN extra ->> 'kind' = 'named';
        -- HOTFIX 2026-10-21c: carritos persistidos por el frontend legacy (98bd908, misma clave
        -- cart:v3) no traen source_id; 527c185 los manda con source_id ''. Se acepta el recargo
        -- declarado solo si coincide con el recargo de servidor de un ingrediente activo de ese tipo.
        IF COALESCE(extra ->> 'source_id', '') = '' THEN
          v_charge := CASE WHEN (extra ->> 'charge') ~ '^[0-9]{1,7}$' THEN (extra ->> 'charge')::integer END;
          IF v_charge IS NULL
             OR (extra ->> 'kind') IS NULL
             OR (extra ->> 'kind') NOT IN ('protein', 'acompanante', 'sauce', 'topping')
             OR NOT EXISTS (
            SELECT 1 FROM public.ingredients i
            WHERE i.is_active AND i.type = (extra ->> 'kind')
              AND v_charge = CASE
                WHEN COALESCE(i.price_cents, 0) > 0 THEN i.price_cents
                WHEN i.type = 'protein' THEN CASE WHEN lower(translate(i.name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) ~ '(adicional|extra)' THEN 5000 END
                WHEN i.type IN ('acompanante', 'sauce') THEN CASE WHEN lower(translate(i.name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) ~ '(adicional|extra)' THEN 3000 ELSE 2000 END
                WHEN i.type = 'topping' THEN CASE WHEN lower(translate(i.name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) ~ '(adicional|extra)' THEN 3000 ELSE 500 END
              END
          ) THEN
            RAISE EXCEPTION 'Recargo de bowl inválido: %', COALESCE(extra ->> 'name', '?');
          END IF;
          unit := unit + v_charge;
          CONTINUE;
        END IF;
        SELECT i.type, i.price_cents, i.name INTO v_type, v_charge, v_name
        FROM public.ingredients i
        WHERE i.id = extra ->> 'source_id' AND i.is_active;
        IF NOT FOUND OR v_type IS DISTINCT FROM (extra ->> 'kind') THEN
          RAISE EXCEPTION 'Recargo de bowl inválido: %', COALESCE(extra ->> 'name', extra ->> 'source_id', '?');
        END IF;
        v_named := (lower(translate(v_name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) ~ '(adicional|extra)');
        v_charge := CASE
          WHEN COALESCE(v_charge, 0) > 0 THEN v_charge
          WHEN v_type = 'protein' THEN CASE WHEN v_named THEN 5000 END
          WHEN v_type = 'acompanante' THEN CASE WHEN v_named THEN 3000 ELSE 2000 END
          -- 21c: como getIngredientExtraCharge ("adicional"/"extra" = 3000); 21b cobraba 2000.
          WHEN v_type = 'sauce' THEN CASE WHEN v_named THEN 3000 ELSE 2000 END
          WHEN v_type = 'topping' THEN CASE WHEN v_named THEN 3000 ELSE 500 END
        END;
        IF v_charge IS NULL THEN
          RAISE EXCEPTION 'Recargo de bowl inválido: %', COALESCE(extra ->> 'name', extra ->> 'source_id', '?');
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
UPDATE public.settings SET value = 'false' WHERE key = 'business_hours_enforce';
COMMIT;
