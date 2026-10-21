-- Línea base del esquema public de PRODUCCIÓN.
-- Derivada de supabase/baseline/prod_schema_2026-10-20.sql
-- (pg_dump --schema-only --schema=public, PostgreSQL 17.6, sin datos).
--
-- Idempotente: sobre producción (o una copia restaurada) no cambia nada; sobre una
-- base limpia crea el mismo esquema. Reemplaza las migraciones históricas archivadas
-- en supabase/migrations_archive/ (no reproducibles).
--
-- Omitido a propósito respecto del volcado:
--   * CREATE SCHEMA public / COMMENT ON SCHEMA (lo gestiona Supabase).
--   * ALTER DEFAULT PRIVILEGES (configuración de plataforma de Supabase, no de la app).
-- Requiere (lo provee Supabase; en local supabase/tests/local-bootstrap.sql):
--   roles anon/authenticated/service_role, esquema auth con auth.users y auth.uid().
--
-- Se aplica UNA vez, antes de 20261006*. En producción no se ejecuta: se marca como
-- aplicada (supabase migration repair --status applied 20261005000000). Volver a
-- ejecutarla DESPUÉS de 20261006* re-otorgaría permisos y políticas que esas
-- migraciones retiran a propósito (p. ej. create_order_with_items para anon).
--
-- NO editar para cambiar el esquema: cree una migración nueva posterior.

-- Las funciones LANGUAGE sql referencian tablas creadas más abajo.
SET check_function_bodies = false;

-- app_role (TYPE)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'app_role') THEN
    CREATE TYPE "public"."app_role" AS ENUM (
        'admin',
        'user'
    );
  END IF;
END $baseline$;

-- create_order_with_items("text", "text", "text", "text", "text", integer, "text", integer, "jsonb", "text") (FUNCTION)
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
        ELSIF EXISTS (
          SELECT 1 FROM public.product_variants pv
          WHERE pv.product_id = v_pid AND pv.is_active
        ) THEN
          RAISE EXCEPTION 'Falta seleccionar sabor para %', item ->> 'name';
        END IF;
      END IF;

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
$$;

-- get_public_catalog() (FUNCTION)
CREATE OR REPLACE FUNCTION "public"."get_public_catalog"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'products', coalesce(
      (
        select jsonb_agg(to_jsonb(product_row) order by product_row.name)
        from public.products as product_row
        where product_row.is_active = true
      ),
      '[]'::jsonb
    ),
    'categories', coalesce(
      (
        select jsonb_agg(
          to_jsonb(category_row)
          order by category_row.sort_order nulls last, category_row.name
        )
        from public.categories as category_row
      ),
      '[]'::jsonb
    ),
    'ingredients', coalesce(
      (
        select jsonb_agg(to_jsonb(ingredient_row) order by ingredient_row.name)
        from public.ingredients as ingredient_row
        where ingredient_row.is_active = true
      ),
      '[]'::jsonb
    ),
    'bowl_rules', coalesce(
      (
        select jsonb_agg(to_jsonb(rule_row) order by rule_row.price_cents)
        from public.bowl_rules as rule_row
      ),
      '[]'::jsonb
    ),
    'promotions', coalesce(
      (
        select jsonb_agg(to_jsonb(promotion_row) order by promotion_row.sort_order)
        from public.promotions as promotion_row
        where promotion_row.is_active = true
      ),
      '[]'::jsonb
    ),
    'settings', coalesce(
      (
        select jsonb_agg(to_jsonb(setting_row) order by setting_row.key)
        from public.settings as setting_row
      ),
      '[]'::jsonb
    )
  );
$$;

-- has_role("public"."app_role", "uuid") (FUNCTION)
CREATE OR REPLACE FUNCTION "public"."has_role"("_role" "public"."app_role", "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_roles
    WHERE  user_id = _user_id
      AND  role    = _role
  );
$$;

-- set_updated_at() (FUNCTION)
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- addon_recommendations (TABLE)
CREATE TABLE IF NOT EXISTS "public"."addon_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "text" NOT NULL,
    "addon_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);

-- addons (TABLE)
CREATE TABLE IF NOT EXISTS "public"."addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "addons_price_cents_check" CHECK (("price_cents" >= 0))
);

-- analytics_events (TABLE)
CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- bowl_rules (TABLE)
CREATE TABLE IF NOT EXISTS "public"."bowl_rules" (
    "size" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "bases" integer DEFAULT 1 NOT NULL,
    "proteins" integer DEFAULT 1 NOT NULL,
    "accompaniments" integer DEFAULT 3 NOT NULL,
    CONSTRAINT "bowl_rules_accompaniments_check" CHECK (("accompaniments" >= 0)),
    CONSTRAINT "bowl_rules_bases_check" CHECK (("bases" > 0)),
    CONSTRAINT "bowl_rules_price_cents_check" CHECK (("price_cents" >= 0)),
    CONSTRAINT "bowl_rules_proteins_check" CHECK (("proteins" > 0)),
    CONSTRAINT "bowl_rules_size_check" CHECK (("size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"])))
);

-- TABLE "bowl_rules" (COMMENT)
COMMENT ON TABLE "public"."bowl_rules" IS 'One row per bowl size; sauces/complementos are derived in TypeScript from size';

-- COLUMN "bowl_rules"."price_cents" (COMMENT)
COMMENT ON COLUMN "public"."bowl_rules"."price_cents" IS 'Base price in whole COP pesos';

-- brands (TABLE)
CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL
);

-- TABLE "brands" (COMMENT)
COMMENT ON TABLE "public"."brands" IS 'Brand identifiers: ohana | chilli';

-- categories (TABLE)
CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "brand_id" "text" NOT NULL,
    "slug" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 99
);

-- TABLE "categories" (COMMENT)
COMMENT ON TABLE "public"."categories" IS 'Menu sections per brand';

-- delivery_zones (TABLE)
CREATE TABLE IF NOT EXISTS "public"."delivery_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "fee_cents" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "delivery_zones_fee_cents_check" CHECK (("fee_cents" >= 0))
);

-- COLUMN "delivery_zones"."fee_cents" (COMMENT)
COMMENT ON COLUMN "public"."delivery_zones"."fee_cents" IS 'Delivery fee in whole COP pesos';

-- ingredients (TABLE)
CREATE TABLE IF NOT EXISTS "public"."ingredients" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "calories" integer,
    "is_vegan" boolean,
    "is_gluten_free" boolean,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "ingredients_calories_check" CHECK ((("calories" IS NULL) OR ("calories" >= 0))),
    CONSTRAINT "ingredients_price_cents_check" CHECK (("price_cents" >= 0)),
    CONSTRAINT "ingredients_type_check" CHECK (("type" = ANY (ARRAY['base'::"text", 'protein'::"text", 'acompanante'::"text", 'sauce'::"text", 'topping'::"text"])))
);

-- COLUMN "ingredients"."price_cents" (COMMENT)
COMMENT ON COLUMN "public"."ingredients"."price_cents" IS 'Upcharge in whole COP pesos; 0 = included';

-- order_items (TABLE)
CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "brand_id" "text",
    "name" "text" NOT NULL,
    "unit_price_cents" integer DEFAULT 0 NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "details" "jsonb",
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_price_cents_check" CHECK (("unit_price_cents" >= 0))
);

-- TABLE "order_items" (COMMENT)
COMMENT ON TABLE "public"."order_items" IS 'RLS intentionally has no anon/authenticated policies. Written exclusively by create_order_with_items() (SECURITY DEFINER).';

-- COLUMN "order_items"."details" (COMMENT)
COMMENT ON COLUMN "public"."order_items"."details" IS 'For custom bowls: nested ingredient breakdown. For products: {product_id, notes}.';

-- orders (TABLE)
CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "order_type" "text" NOT NULL,
    "address" "text",
    "delivery_zone" "text",
    "delivery_fee_cents" integer DEFAULT 0 NOT NULL,
    "total_cents" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "whatsapp_sent" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" "text",
    "payment_status" "text" DEFAULT 'not_required'::"text" NOT NULL,
    "payment_provider" "text",
    "payment_reference" "text",
    "payment_transaction_id" "text",
    "paid_at" timestamp with time zone,
    CONSTRAINT "orders_delivery_fee_cents_check" CHECK (("delivery_fee_cents" >= 0)),
    CONSTRAINT "orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['pickup'::"text", 'delivery'::"text"]))),
    CONSTRAINT "orders_payment_method_check" CHECK ((("payment_method" IS NULL) OR ("payment_method" = ANY (ARRAY['cash'::"text", 'transfer'::"text", 'wompi'::"text"])))),
    CONSTRAINT "orders_payment_provider_check" CHECK ((("payment_provider" IS NULL) OR ("payment_provider" = 'wompi'::"text"))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['not_required'::"text", 'pending'::"text", 'approved'::"text", 'declined'::"text", 'voided'::"text", 'error'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'preparing'::"text", 'ready'::"text", 'delivered'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_total_cents_check" CHECK (("total_cents" >= 0))
);

-- TABLE "orders" (COMMENT)
COMMENT ON TABLE "public"."orders" IS 'RLS intentionally has no anon/authenticated policies. All writes go through create_order_with_items() (SECURITY DEFINER). Add authenticated SELECT policies here for a future admin panel.';

-- COLUMN "orders"."delivery_fee_cents" (COMMENT)
COMMENT ON COLUMN "public"."orders"."delivery_fee_cents" IS 'Delivery fee in whole COP pesos; 0 for pickup';

-- COLUMN "orders"."total_cents" (COMMENT)
COMMENT ON COLUMN "public"."orders"."total_cents" IS 'Grand total in whole COP pesos (subtotal + delivery)';

-- COLUMN "orders"."payment_status" (COMMENT)
COMMENT ON COLUMN "public"."orders"."payment_status" IS 'Estado confirmado por el webhook del proveedor; nunca por la URL de retorno.';

-- product_default_ingredients (TABLE)
CREATE TABLE IF NOT EXISTS "public"."product_default_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "ingredient_name" "text" NOT NULL,
    "is_removable" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_extra" boolean DEFAULT false NOT NULL,
    "extra_price_cents" integer DEFAULT 0 NOT NULL
);

-- product_variants (TABLE)
CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price_delta_cents" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_variants_price_delta_cents_check" CHECK (("price_delta_cents" >= 0))
);

-- products (TABLE)
CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "text" NOT NULL,
    "category_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price_cents" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "ingredients_list" "text"[],
    "calories" integer,
    "is_vegan" boolean DEFAULT false NOT NULL,
    "is_gluten_free" boolean DEFAULT false NOT NULL,
    "is_popular" boolean DEFAULT false NOT NULL,
    "is_new" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "products_calories_check" CHECK ((("calories" IS NULL) OR ("calories" >= 0))),
    CONSTRAINT "products_price_cents_check" CHECK (("price_cents" >= 0))
);

-- COLUMN "products"."price_cents" (COMMENT)
COMMENT ON COLUMN "public"."products"."price_cents" IS 'Whole COP pesos — NOT centavos';

-- promotions (TABLE)
CREATE TABLE IF NOT EXISTS "public"."promotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" integer DEFAULT 0,
    "badge_text" "text",
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'informative'::"text" NOT NULL,
    "cta_text" "text",
    "cta_url" "text",
    "days_of_week" integer[],
    "price_cents" integer,
    CONSTRAINT "promotions_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'label'::"text"])))
);

-- settings (TABLE)
CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);

-- TABLE "settings" (COMMENT)
COMMENT ON TABLE "public"."settings" IS 'Key/value config; e.g. whatsapp_number';

-- user_roles (TABLE)
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL
);

-- addon_recommendations addon_recommendations_category_id_addon_id_key (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."addon_recommendations"'::regclass AND conname = 'addon_recommendations_category_id_addon_id_key') THEN
    ALTER TABLE ONLY "public"."addon_recommendations"
        ADD CONSTRAINT "addon_recommendations_category_id_addon_id_key" UNIQUE ("category_id", "addon_id");
  END IF;
END $baseline$;

-- addon_recommendations addon_recommendations_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."addon_recommendations"'::regclass AND conname = 'addon_recommendations_pkey') THEN
    ALTER TABLE ONLY "public"."addon_recommendations"
        ADD CONSTRAINT "addon_recommendations_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- addons addons_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."addons"'::regclass AND conname = 'addons_pkey') THEN
    ALTER TABLE ONLY "public"."addons"
        ADD CONSTRAINT "addons_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- analytics_events analytics_events_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."analytics_events"'::regclass AND conname = 'analytics_events_pkey') THEN
    ALTER TABLE ONLY "public"."analytics_events"
        ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- bowl_rules bowl_rules_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."bowl_rules"'::regclass AND conname = 'bowl_rules_pkey') THEN
    ALTER TABLE ONLY "public"."bowl_rules"
        ADD CONSTRAINT "bowl_rules_pkey" PRIMARY KEY ("size");
  END IF;
END $baseline$;

-- brands brands_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."brands"'::regclass AND conname = 'brands_pkey') THEN
    ALTER TABLE ONLY "public"."brands"
        ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- categories categories_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."categories"'::regclass AND conname = 'categories_pkey') THEN
    ALTER TABLE ONLY "public"."categories"
        ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- delivery_zones delivery_zones_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."delivery_zones"'::regclass AND conname = 'delivery_zones_pkey') THEN
    ALTER TABLE ONLY "public"."delivery_zones"
        ADD CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- ingredients ingredients_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."ingredients"'::regclass AND conname = 'ingredients_pkey') THEN
    ALTER TABLE ONLY "public"."ingredients"
        ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- order_items order_items_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."order_items"'::regclass AND conname = 'order_items_pkey') THEN
    ALTER TABLE ONLY "public"."order_items"
        ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- orders orders_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."orders"'::regclass AND conname = 'orders_pkey') THEN
    ALTER TABLE ONLY "public"."orders"
        ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- product_default_ingredients product_default_ingredients_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."product_default_ingredients"'::regclass AND conname = 'product_default_ingredients_pkey') THEN
    ALTER TABLE ONLY "public"."product_default_ingredients"
        ADD CONSTRAINT "product_default_ingredients_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- product_variants product_variants_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."product_variants"'::regclass AND conname = 'product_variants_pkey') THEN
    ALTER TABLE ONLY "public"."product_variants"
        ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- products products_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."products"'::regclass AND conname = 'products_pkey') THEN
    ALTER TABLE ONLY "public"."products"
        ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- promotions promotions_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."promotions"'::regclass AND conname = 'promotions_pkey') THEN
    ALTER TABLE ONLY "public"."promotions"
        ADD CONSTRAINT "promotions_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- settings settings_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."settings"'::regclass AND conname = 'settings_pkey') THEN
    ALTER TABLE ONLY "public"."settings"
        ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");
  END IF;
END $baseline$;

-- user_roles user_roles_pkey (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."user_roles"'::regclass AND conname = 'user_roles_pkey') THEN
    ALTER TABLE ONLY "public"."user_roles"
        ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");
  END IF;
END $baseline$;

-- user_roles user_roles_user_id_role_key (CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."user_roles"'::regclass AND conname = 'user_roles_user_id_role_key') THEN
    ALTER TABLE ONLY "public"."user_roles"
        ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");
  END IF;
END $baseline$;

-- addon_recommendations_category_idx (INDEX)
CREATE INDEX IF NOT EXISTS "addon_recommendations_category_idx" ON "public"."addon_recommendations" USING "btree" ("category_id");

-- addons_name_key (INDEX)
CREATE UNIQUE INDEX IF NOT EXISTS "addons_name_key" ON "public"."addons" USING "btree" ("lower"("btrim"("name")));

-- idx_analytics_created_at (INDEX)
CREATE INDEX IF NOT EXISTS "idx_analytics_created_at" ON "public"."analytics_events" USING "btree" ("created_at" DESC);

-- idx_analytics_event_type (INDEX)
CREATE INDEX IF NOT EXISTS "idx_analytics_event_type" ON "public"."analytics_events" USING "btree" ("event_type");

-- idx_categories_brand_id (INDEX)
CREATE INDEX IF NOT EXISTS "idx_categories_brand_id" ON "public"."categories" USING "btree" ("brand_id");

-- idx_delivery_zones_active (INDEX)
CREATE INDEX IF NOT EXISTS "idx_delivery_zones_active" ON "public"."delivery_zones" USING "btree" ("name") WHERE ("is_active" = true);

-- idx_ingredients_type (INDEX)
CREATE INDEX IF NOT EXISTS "idx_ingredients_type" ON "public"."ingredients" USING "btree" ("type") WHERE ("is_active" = true);

-- idx_order_items_brand_id (INDEX)
CREATE INDEX IF NOT EXISTS "idx_order_items_brand_id" ON "public"."order_items" USING "btree" ("brand_id");

-- idx_order_items_order_id (INDEX)
CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");

-- idx_orders_created_at (INDEX)
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);

-- idx_orders_phone (INDEX)
CREATE INDEX IF NOT EXISTS "idx_orders_phone" ON "public"."orders" USING "btree" ("phone");

-- idx_orders_status (INDEX)
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "public"."orders" USING "btree" ("status");

-- idx_products_active (INDEX)
CREATE INDEX IF NOT EXISTS "idx_products_active" ON "public"."products" USING "btree" ("brand_id", "category_id") WHERE ("is_active" = true);

-- idx_products_brand_id (INDEX)
CREATE INDEX IF NOT EXISTS "idx_products_brand_id" ON "public"."products" USING "btree" ("brand_id");

-- idx_products_category_id (INDEX)
CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");

-- idx_user_roles_user_id (INDEX)
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");

-- orders_payment_reference_unique (INDEX)
CREATE UNIQUE INDEX IF NOT EXISTS "orders_payment_reference_unique" ON "public"."orders" USING "btree" ("payment_reference") WHERE ("payment_reference" IS NOT NULL);

-- orders_payment_transaction_unique (INDEX)
CREATE UNIQUE INDEX IF NOT EXISTS "orders_payment_transaction_unique" ON "public"."orders" USING "btree" ("payment_transaction_id") WHERE ("payment_transaction_id" IS NOT NULL);

-- product_default_ingredients_product_id_idx (INDEX)
CREATE INDEX IF NOT EXISTS "product_default_ingredients_product_id_idx" ON "public"."product_default_ingredients" USING "btree" ("product_id");

-- product_variants_product_active_idx (INDEX)
CREATE INDEX IF NOT EXISTS "product_variants_product_active_idx" ON "public"."product_variants" USING "btree" ("product_id") WHERE "is_active";

-- product_variants_product_name_key (INDEX)
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_product_name_key" ON "public"."product_variants" USING "btree" ("product_id", "lower"("btrim"("name")));

-- orders orders_set_updated_at (TRIGGER)
CREATE OR REPLACE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- addon_recommendations addon_recommendations_addon_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."addon_recommendations"'::regclass AND conname = 'addon_recommendations_addon_id_fkey') THEN
    ALTER TABLE ONLY "public"."addon_recommendations"
        ADD CONSTRAINT "addon_recommendations_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE CASCADE;
  END IF;
END $baseline$;

-- addon_recommendations addon_recommendations_category_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."addon_recommendations"'::regclass AND conname = 'addon_recommendations_category_id_fkey') THEN
    ALTER TABLE ONLY "public"."addon_recommendations"
        ADD CONSTRAINT "addon_recommendations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;
  END IF;
END $baseline$;

-- categories categories_brand_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."categories"'::regclass AND conname = 'categories_brand_id_fkey') THEN
    ALTER TABLE ONLY "public"."categories"
        ADD CONSTRAINT "categories_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");
  END IF;
END $baseline$;

-- order_items order_items_brand_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."order_items"'::regclass AND conname = 'order_items_brand_id_fkey') THEN
    ALTER TABLE ONLY "public"."order_items"
        ADD CONSTRAINT "order_items_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");
  END IF;
END $baseline$;

-- order_items order_items_order_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."order_items"'::regclass AND conname = 'order_items_order_id_fkey') THEN
    ALTER TABLE ONLY "public"."order_items"
        ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
  END IF;
END $baseline$;

-- product_default_ingredients product_default_ingredients_product_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."product_default_ingredients"'::regclass AND conname = 'product_default_ingredients_product_id_fkey') THEN
    ALTER TABLE ONLY "public"."product_default_ingredients"
        ADD CONSTRAINT "product_default_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
  END IF;
END $baseline$;

-- product_variants product_variants_product_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."product_variants"'::regclass AND conname = 'product_variants_product_id_fkey') THEN
    ALTER TABLE ONLY "public"."product_variants"
        ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
  END IF;
END $baseline$;

-- products products_brand_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."products"'::regclass AND conname = 'products_brand_id_fkey') THEN
    ALTER TABLE ONLY "public"."products"
        ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");
  END IF;
END $baseline$;

-- products products_category_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."products"'::regclass AND conname = 'products_category_id_fkey') THEN
    ALTER TABLE ONLY "public"."products"
        ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");
  END IF;
END $baseline$;

-- user_roles user_roles_user_id_fkey (FK CONSTRAINT)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"public"."user_roles"'::regclass AND conname = 'user_roles_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."user_roles"
        ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $baseline$;

-- promotions Admin full access promotions (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotions' AND policyname = 'Admin full access promotions') THEN
    CREATE POLICY "Admin full access promotions" ON "public"."promotions" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- promotions Public can view active promotions (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotions' AND policyname = 'Public can view active promotions') THEN
    CREATE POLICY "Public can view active promotions" ON "public"."promotions" FOR SELECT USING (("is_active" = true));
  END IF;
END $baseline$;

-- addon_recommendations (ROW SECURITY)
ALTER TABLE "public"."addon_recommendations" ENABLE ROW LEVEL SECURITY;

-- addons (ROW SECURITY)
ALTER TABLE "public"."addons" ENABLE ROW LEVEL SECURITY;

-- order_items admin read order_items (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'admin read order_items') THEN
    CREATE POLICY "admin read order_items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- orders admin read orders (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'admin read orders') THEN
    CREATE POLICY "admin read orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- orders admin update orders (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'admin update orders') THEN
    CREATE POLICY "admin update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- addon_recommendations admin_all_addon_recommendations (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addon_recommendations' AND policyname = 'admin_all_addon_recommendations') THEN
    CREATE POLICY "admin_all_addon_recommendations" ON "public"."addon_recommendations" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- addons admin_all_addons (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addons' AND policyname = 'admin_all_addons') THEN
    CREATE POLICY "admin_all_addons" ON "public"."addons" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- bowl_rules admin_all_bowl_rules (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bowl_rules' AND policyname = 'admin_all_bowl_rules') THEN
    CREATE POLICY "admin_all_bowl_rules" ON "public"."bowl_rules" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- categories admin_all_categories (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'admin_all_categories') THEN
    CREATE POLICY "admin_all_categories" ON "public"."categories" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- delivery_zones admin_all_delivery_zones (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_zones' AND policyname = 'admin_all_delivery_zones') THEN
    CREATE POLICY "admin_all_delivery_zones" ON "public"."delivery_zones" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- ingredients admin_all_ingredients (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ingredients' AND policyname = 'admin_all_ingredients') THEN
    CREATE POLICY "admin_all_ingredients" ON "public"."ingredients" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- product_variants admin_all_variants (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_variants' AND policyname = 'admin_all_variants') THEN
    CREATE POLICY "admin_all_variants" ON "public"."product_variants" TO "authenticated" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- products admin_read_all_products (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'admin_read_all_products') THEN
    CREATE POLICY "admin_read_all_products" ON "public"."products" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- product_default_ingredients admin_write_product_ingredients (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_default_ingredients' AND policyname = 'admin_write_product_ingredients') THEN
    CREATE POLICY "admin_write_product_ingredients" ON "public"."product_default_ingredients" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- settings admin_write_settings (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'admin_write_settings') THEN
    CREATE POLICY "admin_write_settings" ON "public"."settings" USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles"
      WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));
  END IF;
END $baseline$;

-- analytics_events (ROW SECURITY)
ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;

-- analytics_events anon_insert (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analytics_events' AND policyname = 'anon_insert') THEN
    CREATE POLICY "anon_insert" ON "public"."analytics_events" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
  END IF;
END $baseline$;

-- bowl_rules anon_read (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bowl_rules' AND policyname = 'anon_read') THEN
    CREATE POLICY "anon_read" ON "public"."bowl_rules" FOR SELECT TO "authenticated", "anon" USING (true);
  END IF;
END $baseline$;

-- brands anon_read (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brands' AND policyname = 'anon_read') THEN
    CREATE POLICY "anon_read" ON "public"."brands" FOR SELECT TO "authenticated", "anon" USING (true);
  END IF;
END $baseline$;

-- categories anon_read (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'anon_read') THEN
    CREATE POLICY "anon_read" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (true);
  END IF;
END $baseline$;

-- ingredients anon_read (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ingredients' AND policyname = 'anon_read') THEN
    CREATE POLICY "anon_read" ON "public"."ingredients" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));
  END IF;
END $baseline$;

-- products anon_read (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'anon_read') THEN
    CREATE POLICY "anon_read" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));
  END IF;
END $baseline$;

-- settings anon_read (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'anon_read') THEN
    CREATE POLICY "anon_read" ON "public"."settings" FOR SELECT TO "authenticated", "anon" USING (true);
  END IF;
END $baseline$;

-- delivery_zones anon_read_active (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_zones' AND policyname = 'anon_read_active') THEN
    CREATE POLICY "anon_read_active" ON "public"."delivery_zones" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));
  END IF;
END $baseline$;

-- addons anon_read_active_addons (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addons' AND policyname = 'anon_read_active_addons') THEN
    CREATE POLICY "anon_read_active_addons" ON "public"."addons" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));
  END IF;
END $baseline$;

-- product_variants anon_read_active_variants (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_variants' AND policyname = 'anon_read_active_variants') THEN
    CREATE POLICY "anon_read_active_variants" ON "public"."product_variants" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));
  END IF;
END $baseline$;

-- addon_recommendations anon_read_addon_recommendations (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addon_recommendations' AND policyname = 'anon_read_addon_recommendations') THEN
    CREATE POLICY "anon_read_addon_recommendations" ON "public"."addon_recommendations" FOR SELECT TO "authenticated", "anon" USING (true);
  END IF;
END $baseline$;

-- product_default_ingredients anon_read_product_ingredients (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_default_ingredients' AND policyname = 'anon_read_product_ingredients') THEN
    CREATE POLICY "anon_read_product_ingredients" ON "public"."product_default_ingredients" FOR SELECT USING (true);
  END IF;
END $baseline$;

-- bowl_rules (ROW SECURITY)
ALTER TABLE "public"."bowl_rules" ENABLE ROW LEVEL SECURITY;

-- brands (ROW SECURITY)
ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;

-- categories (ROW SECURITY)
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

-- delivery_zones (ROW SECURITY)
ALTER TABLE "public"."delivery_zones" ENABLE ROW LEVEL SECURITY;

-- ingredients (ROW SECURITY)
ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;

-- user_roles no_delete_roles (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'no_delete_roles') THEN
    CREATE POLICY "no_delete_roles" ON "public"."user_roles" FOR DELETE USING (false);
  END IF;
END $baseline$;

-- user_roles no_modify_roles (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'no_modify_roles') THEN
    CREATE POLICY "no_modify_roles" ON "public"."user_roles" FOR UPDATE USING (false);
  END IF;
END $baseline$;

-- user_roles no_self_assign_roles (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'no_self_assign_roles') THEN
    CREATE POLICY "no_self_assign_roles" ON "public"."user_roles" FOR INSERT WITH CHECK (false);
  END IF;
END $baseline$;

-- order_items (ROW SECURITY)
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;

-- orders (ROW SECURITY)
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

-- product_default_ingredients (ROW SECURITY)
ALTER TABLE "public"."product_default_ingredients" ENABLE ROW LEVEL SECURITY;

-- product_variants (ROW SECURITY)
ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;

-- products (ROW SECURITY)
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

-- promotions (ROW SECURITY)
ALTER TABLE "public"."promotions" ENABLE ROW LEVEL SECURITY;

-- user_roles read_own_role (POLICY)
DO $baseline$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'read_own_role') THEN
    CREATE POLICY "read_own_role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));
  END IF;
END $baseline$;

-- settings (ROW SECURITY)
ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;

-- user_roles (ROW SECURITY)
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

-- SCHEMA "public" (ACL)
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- FUNCTION "create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") (ACL)
REVOKE ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_phone" "text", "p_order_type" "text", "p_address" "text", "p_delivery_zone" "text", "p_delivery_fee_cents" integer, "p_notes" "text", "p_total_cents" integer, "p_items" "jsonb", "p_payment_method" "text") TO "service_role";

-- FUNCTION "get_public_catalog"() (ACL)
REVOKE ALL ON FUNCTION "public"."get_public_catalog"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_catalog"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_catalog"() TO "authenticated";

-- FUNCTION "has_role"("_role" "public"."app_role", "_user_id" "uuid") (ACL)
GRANT ALL ON FUNCTION "public"."has_role"("_role" "public"."app_role", "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_role" "public"."app_role", "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_role" "public"."app_role", "_user_id" "uuid") TO "service_role";

-- FUNCTION "set_updated_at"() (ACL)
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";

-- TABLE "addon_recommendations" (ACL)
GRANT ALL ON TABLE "public"."addon_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."addon_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."addon_recommendations" TO "service_role";

-- TABLE "addons" (ACL)
GRANT ALL ON TABLE "public"."addons" TO "anon";
GRANT ALL ON TABLE "public"."addons" TO "authenticated";
GRANT ALL ON TABLE "public"."addons" TO "service_role";

-- TABLE "analytics_events" (ACL)
GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";

-- TABLE "bowl_rules" (ACL)
GRANT ALL ON TABLE "public"."bowl_rules" TO "anon";
GRANT ALL ON TABLE "public"."bowl_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."bowl_rules" TO "service_role";

-- TABLE "brands" (ACL)
GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";

-- TABLE "categories" (ACL)
GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";

-- TABLE "delivery_zones" (ACL)
GRANT ALL ON TABLE "public"."delivery_zones" TO "anon";
GRANT ALL ON TABLE "public"."delivery_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_zones" TO "service_role";

-- TABLE "ingredients" (ACL)
GRANT ALL ON TABLE "public"."ingredients" TO "anon";
GRANT ALL ON TABLE "public"."ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients" TO "service_role";

-- TABLE "order_items" (ACL)
GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";

-- TABLE "orders" (ACL)
GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";

-- TABLE "product_default_ingredients" (ACL)
GRANT ALL ON TABLE "public"."product_default_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."product_default_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."product_default_ingredients" TO "service_role";

-- TABLE "product_variants" (ACL)
GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";

-- TABLE "products" (ACL)
GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";

-- TABLE "promotions" (ACL)
GRANT ALL ON TABLE "public"."promotions" TO "anon";
GRANT ALL ON TABLE "public"."promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotions" TO "service_role";

-- TABLE "settings" (ACL)
GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";

-- TABLE "user_roles" (ACL)
GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";

RESET check_function_bodies;
