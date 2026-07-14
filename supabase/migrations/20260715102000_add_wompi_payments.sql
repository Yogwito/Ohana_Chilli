-- Estado y trazabilidad de pagos Wompi. Los pedidos siguen siendo la fuente
-- canónica del monto; las Edge Functions solo firman y confirman ese valor.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('not_required', 'pending', 'approved', 'declined', 'voided', 'error'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_provider_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_provider_check
  CHECK (payment_provider IS NULL OR payment_provider = 'wompi');

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_unique
  ON public.orders (payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_transaction_unique
  ON public.orders (payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;

COMMENT ON COLUMN public.orders.payment_status IS
  'Estado confirmado por el webhook del proveedor; nunca por la URL de retorno.';
