
-- 1. Create delivery_zones table
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  fee_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Public can read active zones
CREATE POLICY "Public read active delivery_zones" ON public.delivery_zones
  FOR SELECT USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins can insert delivery_zones" ON public.delivery_zones
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update delivery_zones" ON public.delivery_zones
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete delivery_zones" ON public.delivery_zones
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can read ALL zones (including inactive)
CREATE POLICY "Admins can read all delivery_zones" ON public.delivery_zones
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add missing columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_zone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_cents integer NOT NULL DEFAULT 0;
