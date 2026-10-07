-- Fresh installations ONLY. Repository-derived schema; catalog data must be imported separately.
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
-- 1. BRANDS
CREATE TABLE public.brands (
  id text PRIMARY KEY,
  name text NOT NULL
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);

-- 2. CATEGORIES
CREATE TABLE public.categories (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  icon text
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE INDEX idx_categories_brand ON public.categories(brand_id);

-- 3. PRODUCTS
CREATE TABLE public.products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  brand_id text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  calories integer,
  is_vegan boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_popular boolean DEFAULT false,
  is_new boolean DEFAULT false,
  ingredients_list text[]
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active);

-- 4. INGREDIENTS
CREATE TABLE public.ingredients (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('base','protein','acompanante','sauce','topping')),
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  calories integer,
  is_vegan boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active ingredients" ON public.ingredients FOR SELECT USING (is_active = true);
CREATE INDEX idx_ingredients_type ON public.ingredients(type);

-- 5. BOWL_RULES
CREATE TABLE public.bowl_rules (
  size text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  bases integer NOT NULL DEFAULT 1,
  proteins integer NOT NULL DEFAULT 1,
  accompaniments integer NOT NULL DEFAULT 4
);
ALTER TABLE public.bowl_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bowl_rules" ON public.bowl_rules FOR SELECT USING (true);

-- 6. ORDERS (new schema)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('pickup','delivery')),
  address text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','delivered','cancelled')),
  total_cents integer NOT NULL DEFAULT 0,
  whatsapp_sent boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Anon can insert orders (guest checkout)
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
-- No public SELECT for orders (admin only later)

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. ORDER_ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  brand_id text REFERENCES public.brands(id),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
-- Anon can insert order items
CREATE POLICY "Anyone can create order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- 8. SETTINGS
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read whatsapp_number" ON public.settings FOR SELECT USING (key = 'whatsapp_number');



-- User roles for admin panel
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: only admins can read user_roles
CREATE POLICY "Admins can read user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for catalog tables (CRUD for admins)
-- Products
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Ingredients
CREATE POLICY "Admins can insert ingredients" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ingredients" ON public.ingredients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ingredients" ON public.ingredients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Bowl rules
CREATE POLICY "Admins can insert bowl_rules" ON public.bowl_rules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bowl_rules" ON public.bowl_rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete bowl_rules" ON public.bowl_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Settings: admins can read all, update all
CREATE POLICY "Admins can read all settings" ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders: admins can read all orders and update them
CREATE POLICY "Admins can read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order items: admins can read all
CREATE POLICY "Admins can read order_items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categories: admins can CRUD
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Brands: admins can CRUD
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  fee_cents integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_zones_name ON public.delivery_zones(name);
CREATE INDEX idx_delivery_zones_is_active ON public.delivery_zones(is_active);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active delivery_zones"
ON public.delivery_zones
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can read delivery_zones"
ON public.delivery_zones
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert delivery_zones"
ON public.delivery_zones
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update delivery_zones"
ON public.delivery_zones
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete delivery_zones"
ON public.delivery_zones
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_zone text,
  ADD COLUMN IF NOT EXISTS delivery_fee_cents integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_delivery_fee_cents_non_negative'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_fee_cents_non_negative
      CHECK (delivery_fee_cents >= 0);
  END IF;
END $$;


-- Lightweight analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries by event type and time
CREATE INDEX idx_analytics_events_type_time ON public.analytics_events (event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    event_type IS NOT NULL AND length(trim(event_type)) >= 1
  );

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete old events
CREATE POLICY "Admins can delete analytics"
  ON public.analytics_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_customer_name text,
  p_phone text,
  p_order_type text,
  p_address text DEFAULT NULL,
  p_delivery_zone text DEFAULT NULL,
  p_delivery_fee_cents integer DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_total_cents integer DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := gen_random_uuid();
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must include at least one item';
  END IF;

  INSERT INTO public.orders (
    id,
    customer_name,
    phone,
    order_type,
    address,
    delivery_zone,
    delivery_fee_cents,
    notes,
    total_cents,
    status
  )
  VALUES (
    v_order_id,
    p_customer_name,
    p_phone,
    p_order_type,
    p_address,
    p_delivery_zone,
    p_delivery_fee_cents,
    p_notes,
    p_total_cents,
    'pending'
  );

  INSERT INTO public.order_items (
    order_id,
    brand_id,
    name,
    quantity,
    unit_price_cents,
    details
  )
  SELECT
    v_order_id,
    item.brand_id,
    item.name,
    item.quantity,
    item.unit_price_cents,
    COALESCE(item.details, '{}'::jsonb)
  FROM jsonb_to_recordset(p_items) AS item(
    brand_id text,
    name text,
    quantity integer,
    unit_price_cents integer,
    details jsonb
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.order_items
    WHERE order_id = v_order_id
  ) THEN
    RAISE EXCEPTION 'Order must include at least one persisted item';
  END IF;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  integer,
  jsonb
) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read whatsapp_number" ON public.settings;

CREATE POLICY "Public read business settings"
ON public.settings
FOR SELECT
USING (
  key IN (
    'whatsapp_number',
    'contact_email',
    'contact_address',
    'contact_maps_url',
    'hours_weekday',
    'hours_weekend',
    'instagram_url',
    'instagram_handle',
    'facebook_url',
    'delivery_eta',
    'review_rating'
  )
);


CREATE TABLE public.product_default_ingredients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 ingredient_name text NOT NULL, is_removable boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
 is_extra boolean NOT NULL DEFAULT false, extra_price_cents integer NOT NULL DEFAULT 0, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,description text,type text NOT NULL DEFAULT 'informative',
 discount_type text NOT NULL DEFAULT 'label',discount_value integer NOT NULL DEFAULT 0,badge_text text,image_url text,price_cents integer,
 cta_text text,cta_url text,days_of_week integer[],is_active boolean NOT NULL DEFAULT true,starts_at timestamptz,ends_at timestamptz,
 sort_order integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_promotions ON public.promotions FOR SELECT USING (is_active);
CREATE POLICY admin_promotions ON public.promotions TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands, public.categories, public.products, public.ingredients, public.bowl_rules, public.delivery_zones, public.settings, public.promotions TO authenticated;
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.categories ADD COLUMN sort_order integer DEFAULT 0;
