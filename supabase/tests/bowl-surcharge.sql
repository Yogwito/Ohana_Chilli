-- Regresión del hotfix 2026-10-21b (recargos de bowl calculados en el servidor).
-- SOLO Postgres local: requiere el esquema de prod + 2026-10-21b_bowl_surcharge.sql +
-- supabase/hotfix/local_seed_synthetic_catalog.sql + los ingredientes extra de abajo.
-- Todo corre dentro de BEGIN ... ROLLBACK: no deja datos. Falla con ERROR si algún caso no da lo esperado.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.ingredients (id, name, type, price_cents) VALUES
  ('quinoa', 'Quinoa', 'base', 0),
  ('salsa-ponzu', 'Ponzu', 'sauce', 0),
  ('salsa-trufa', 'Mayo trufa', 'sauce', 2500),
  ('ajonjoli', 'Ajonjolí', 'topping', 0),
  ('almendras', 'Almendras', 'topping', 1500),
  ('proteina-adicional', 'Proteína adicional', 'protein', 0)
ON CONFLICT (id) DO NOTHING;

CREATE FUNCTION pg_temp.expect(label text, items jsonb, total integer, should_pass boolean) RETURNS void
LANGUAGE plpgsql AS $f$
DECLARE ok boolean := true; msg text := '';
BEGIN
  BEGIN
    PERFORM public.create_order_with_items('E2E-TEST-sql', '3001234567', 'pickup', NULL, NULL, 0, NULL, total, items);
  EXCEPTION WHEN OTHERS THEN ok := false; msg := SQLERRM;
  END;
  IF ok IS DISTINCT FROM should_pass THEN
    RAISE EXCEPTION 'FALLA % : esperado %, obtenido % %', label,
      CASE WHEN should_pass THEN 'OK' ELSE 'RECHAZO' END, CASE WHEN ok THEN 'OK' ELSE 'RECHAZO' END, msg;
  END IF;
  RAISE NOTICE '% -> % %', rpad(label, 34), CASE WHEN ok THEN 'OK' ELSE 'RECHAZADO' END, msg;
END $f$;

-- Bowl mediano (28000; 1 base, 2 proteínas, 3 acompañantes, 2 salsas, 2 complementos).
CREATE FUNCTION pg_temp.bowl(size text, ids text[], extras jsonb, price integer) RETURNS jsonb LANGUAGE sql AS $f$
  SELECT jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Bowl Personalizado','quantity',1,
    'unit_price_cents',price,'details',jsonb_build_object('validation',
      jsonb_build_object('size',size,'ingredient_ids',to_jsonb(ids),'extras',extras))))
$f$;
CREATE FUNCTION pg_temp.product(pid text, price integer, customizations jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $f$
  SELECT jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Producto','quantity',1,
    'unit_price_cents',price,'details',jsonb_build_object('product_id',pid,'customizations',customizations)))
$f$;

-- 28000 + salmón 6000 + aguacate adicional 3000 + proteína extra 5000 + ajonjolí extra 500 + mayo trufa extra 2500
SELECT pg_temp.expect('bowl recargo correcto', pg_temp.bowl('medium',
  ARRAY['arroz','pollo','salmon','mango','aguacate-adicional'],
  '[{"kind":"protein","source_id":"proteina-adicional"},{"kind":"topping","source_id":"ajonjoli"},{"kind":"sauce","source_id":"salsa-trufa"}]',
  45000), 45000, true);
SELECT pg_temp.expect('bowl recargo rebajado (charge 500)', pg_temp.bowl('medium',
  ARRAY['arroz','pollo','salmon','mango','aguacate-adicional'],
  '[{"kind":"protein","source_id":"proteina-adicional","charge":500},{"kind":"topping","source_id":"ajonjoli"},{"kind":"sauce","source_id":"salsa-trufa"}]',
  40500), 40500, false);
SELECT pg_temp.expect('bowl recargo inventado (sin source)', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"name":"Proteína extra","charge":500}]', 28500), 28500, false);
SELECT pg_temp.expect('bowl ingrediente inexistente', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"kind":"protein","source_id":"no-existe"}]', 33000), 33000, false);
SELECT pg_temp.expect('bowl tipo cruzado (salmón como compl.)', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"kind":"topping","source_id":"salmon"}]', 28500), 28500, false);
SELECT pg_temp.expect('bowl proteína extra sin premium', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"kind":"protein","source_id":"pollo"}]', 28000), 28000, false);
SELECT pg_temp.expect('bowl excede tamaño (small, 2 proteínas)', pg_temp.bowl('small', ARRAY['arroz','pollo','salmon'],
  '[]', 28000), 28000, false);
SELECT pg_temp.expect('bowl excede tamaño (medium, 2 bases)', pg_temp.bowl('medium', ARRAY['arroz','quinoa','pollo'],
  '[]', 28000), 28000, false);
SELECT pg_temp.expect('bowl tamaño inexistente', pg_temp.bowl('xl', ARRAY['arroz'], '[]', 28000), 28000, false);
SELECT pg_temp.expect('bowl acomp. extra gratis -> 2000', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"kind":"acompanante","source_id":"mango"}]', 30000), 30000, true);
SELECT pg_temp.expect('bowl salsa extra sin precio -> 2000', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"kind":"sauce","source_id":"salsa-ponzu"}]', 30000), 30000, true);
SELECT pg_temp.expect('bowl compl. extra con precio -> 1500', pg_temp.bowl('medium', ARRAY['arroz','pollo'],
  '[{"kind":"topping","source_id":"almendras"}]', 29500), 29500, true);

-- Los otros 4 tipos de pedido siguen pasando.
SELECT pg_temp.expect('producto simple', pg_temp.product('11111111-1111-1111-1111-111111111111', 8000), 8000, true);
SELECT pg_temp.expect('producto + 2 extras', pg_temp.product('22222222-2222-2222-2222-222222222222', 28000,
  '{"extras":[{"id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},{"id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}]}'), 28000, true);
SELECT pg_temp.expect('producto con variante delta 0', pg_temp.product('33333333-3333-3333-3333-333333333333', 9000,
  jsonb_build_object('variant', (SELECT jsonb_build_object('id', id, 'name', name) FROM public.product_variants
    WHERE product_id = '33333333-3333-3333-3333-333333333333' AND is_active AND price_delta_cents = 0 LIMIT 1))), 9000, true);
SELECT pg_temp.expect('promo combo', pg_temp.product('promo-55555555-5555-5555-5555-555555555555', 40000), 40000, true);
SELECT pg_temp.expect('precio manipulado', pg_temp.product('11111111-1111-1111-1111-111111111111', 7000), 7000, false);
ROLLBACK;
