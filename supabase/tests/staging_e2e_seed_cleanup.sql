-- Borra SOLO lo que creó staging_e2e_seed.sql (prefijo E2E-SEED-). SOLO STAGING.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE image_url LIKE '%naoqsypqqgjhdudenevx%')
     OR NOT EXISTS (SELECT 1 FROM public.products WHERE image_url LIKE '%mbnedymxjplngwqkaabi%') THEN
    RAISE EXCEPTION 'ALTO: esta base no parece STAGING (mbnedymxjplngwqkaabi). No se borró nada.';
  END IF;
END $$;
SELECT 'antes' AS momento,
  (SELECT count(*) FROM public.ingredients WHERE id LIKE 'e2e-seed-%' OR name LIKE 'E2E-SEED-%') AS ingredientes,
  (SELECT count(*) FROM public.promotions WHERE title LIKE 'E2E-SEED-%') AS promociones;
DELETE FROM public.ingredients WHERE id LIKE 'e2e-seed-%' OR name LIKE 'E2E-SEED-%';
DELETE FROM public.promotions WHERE title LIKE 'E2E-SEED-%';
SELECT 'después' AS momento,
  (SELECT count(*) FROM public.ingredients WHERE id LIKE 'e2e-seed-%' OR name LIKE 'E2E-SEED-%') AS ingredientes,
  (SELECT count(*) FROM public.promotions WHERE title LIKE 'E2E-SEED-%') AS promociones;
COMMIT;
