-- NO SE APLICA AUTOMÁTICAMENTE (fuera de supabase/migrations/).
-- Elimina las columnas del flujo Wompi anterior que 20261006120000 deja intactas.
-- Requisitos antes de ejecutarlo manualmente:
--   1. 20261006* aplicadas y estables en producción; ningún cliente/Edge lee estas columnas.
--   2. Respaldo verificado (scripts/backup-database.mjs + restore drill).
--   3. Confirmar que no hay datos útiles:
--        SELECT payment_status, payment_provider, count(*), count(payment_reference),
--               count(payment_transaction_id), count(paid_at)
--        FROM public.orders GROUP BY 1, 2;
--      (al 2026-10-20: 22 órdenes, todas payment_status='not_required', resto NULL).
--   4. Regenerar src/integrations/supabase/types.ts después.
-- Para aplicarlo, copiarlo como migración nueva con timestamp actual y revisarlo en PR.
BEGIN;
DROP INDEX IF EXISTS public.orders_payment_reference_unique;
DROP INDEX IF EXISTS public.orders_payment_transaction_unique;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_provider_check;
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_provider,
  DROP COLUMN IF EXISTS payment_reference,
  DROP COLUMN IF EXISTS payment_transaction_id,
  DROP COLUMN IF EXISTS paid_at;
COMMIT;
