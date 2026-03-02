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
