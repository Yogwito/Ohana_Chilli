-- Datos de prueba para la suite E2E: SOLO STAGING (mbnedymxjplngwqkaabi).
-- Crea, con prefijo "E2E-SEED-":
--   * una salsa premium activa (ingredients.type='sauce', price_cents > 0)
--   * una promoción combo vigente con price_cents (30 días, todos los días)
-- Idempotente. Limpieza: supabase/tests/staging_e2e_seed_cleanup.sql
--
-- Guardia: en staging las imágenes de productos apuntan a mbnedymxjplngwqkaabi.supabase.co
-- (se reescribieron al restaurar); en prod apuntan a naoqsypqqgjhdudenevx. Si no se cumple, aborta.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE image_url LIKE '%naoqsypqqgjhdudenevx%')
     OR NOT EXISTS (SELECT 1 FROM public.products WHERE image_url LIKE '%mbnedymxjplngwqkaabi%') THEN
    RAISE EXCEPTION 'ALTO: esta base no parece STAGING (mbnedymxjplngwqkaabi). No se creó nada.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bowl_rules) THEN
    RAISE EXCEPTION 'ALTO: staging no tiene bowl_rules; la salsa premium no serviría para el bowl.';
  END IF;
END $$;

INSERT INTO public.ingredients (id, name, type, price_cents, is_active)
VALUES ('e2e-seed-salsa-premium', 'E2E-SEED-Salsa premium', 'sauce', 2500, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = 'sauce', price_cents = 2500, is_active = true;

DELETE FROM public.promotions WHERE title = 'E2E-SEED-Combo';
INSERT INTO public.promotions (title, description, type, discount_type, discount_value, price_cents,
                               is_active, starts_at, ends_at, days_of_week, sort_order)
VALUES ('E2E-SEED-Combo', 'Combo de prueba para la suite E2E', 'combo', 'label', 0, 25000,
        true, now() - interval '1 day', now() + interval '30 days', NULL, 999);

-- Qué más necesita el escenario 04 (bowl) además de la salsa premium:
SELECT 'proteína premium' AS requisito, count(*) > 0 AS ok FROM public.ingredients
  WHERE is_active AND type = 'protein' AND (price_cents > 0 OR lower(name) ~ '(adicional|extra)')
UNION ALL SELECT 'complemento premium', count(*) > 0 FROM public.ingredients
  WHERE is_active AND type = 'topping' AND (price_cents > 0 OR lower(name) ~ '(adicional|extra)')
UNION ALL SELECT 'complemento gratis', count(*) > 0 FROM public.ingredients
  WHERE is_active AND type = 'topping' AND price_cents = 0 AND lower(name) !~ '(adicional|extra)'
UNION ALL SELECT 'salsa premium', count(*) > 0 FROM public.ingredients
  WHERE is_active AND type = 'sauce' AND price_cents > 0
UNION ALL SELECT 'combo E2E-SEED vigente', count(*) = 1 FROM public.promotions
  WHERE title = 'E2E-SEED-Combo' AND is_active AND type = 'combo' AND price_cents IS NOT NULL;
COMMIT;
