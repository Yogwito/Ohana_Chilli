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
