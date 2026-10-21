-- Regresión del hotfix 2026-10-21c: bowls COMPLEJOS con el payload del frontend 527c185.
-- SOLO Postgres local o STAGING: necesita la RPC 21c. Siembra su propio catálogo (forma de staging)
-- y todo corre dentro de BEGIN ... ROLLBACK: no deja datos. Falla con ERROR si algún caso no da lo esperado.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.bowl_rules (size, name, price_cents, bases, proteins, accompaniments) VALUES
  ('small', 'Pequeño', 23900, 1, 1, 4), ('medium', 'Mediano', 27900, 1, 2, 5), ('large', 'Grande', 32900, 1, 3, 6)
ON CONFLICT (size) DO UPDATE SET price_cents = EXCLUDED.price_cents, bases = EXCLUDED.bases,
  proteins = EXCLUDED.proteins, accompaniments = EXCLUDED.accompaniments;
INSERT INTO public.ingredients (id, name, type, price_cents, is_active) VALUES
  ('t-arroz', 'Arroz blanco', 'base', 0, true),
  ('t-papas', 'Papas a la francesa', 'base', 6000, true),
  ('t-pollo', 'Pollo', 'protein', 0, true),
  ('t-res', 'Res', 'protein', 0, true),
  ('t-prot-adic', 'Proteína adicional', 'protein', 5000, true),
  ('t-prot-adic0', 'Proteína adicional 0', 'protein', 0, true),
  ('t-tomate', 'Tomate', 'acompanante', 0, true),
  ('t-maiz', 'Maicitos', 'acompanante', 0, true),
  ('t-acomp-adic', 'Acompañante adicional', 'acompanante', 3000, true),
  ('t-aguacate', 'Aguacate adicional', 'acompanante', 0, true),
  ('t-chipotle', 'Ohana Chipotle', 'sauce', 0, true),
  ('t-ajo', 'Salsa de Ajo', 'sauce', 0, true),
  ('t-trufa', 'Mayo trufa', 'sauce', 2500, true),
  ('t-salsa-adic', 'Salsa adicional', 'sauce', 0, true),
  ('t-mani', 'Maní', 'topping', 0, true),
  ('t-ajonjoli', 'Ajonjolí', 'topping', 0, true),
  ('t-queso-frito', 'Queso frito', 'topping', 6000, true),
  ('t-croqueta', 'Croqueta veggie', 'topping', 5000, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type,
  price_cents = EXCLUDED.price_cents, is_active = true;

CREATE FUNCTION pg_temp.expect(label text, size text, ids text[], extras jsonb, price integer, qty integer, should_pass boolean)
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE ok boolean := true; msg text := '';
BEGIN
  BEGIN
    PERFORM public.create_order_with_items('E2E-TEST-sql', '3001234567', 'pickup', NULL, NULL, 0, NULL, price * qty,
      jsonb_build_array(jsonb_build_object('brand_id', 'ohana', 'name', 'Bowl Personalizado', 'quantity', qty,
        'unit_price_cents', price, 'details', jsonb_build_object('validation',
          jsonb_build_object('size', size, 'ingredient_ids', to_jsonb(ids), 'extras', extras)))));
  EXCEPTION WHEN OTHERS THEN ok := false; msg := SQLERRM;
  END;
  IF ok IS DISTINCT FROM should_pass THEN
    RAISE EXCEPTION 'FALLA % : esperado %, obtenido % %', label,
      CASE WHEN should_pass THEN 'OK' ELSE 'RECHAZO' END, CASE WHEN ok THEN 'OK' ELSE 'RECHAZO' END, msg;
  END IF;
  RAISE NOTICE '% -> % %', rpad(label, 40), CASE WHEN ok THEN 'OK' ELSE 'RECHAZADO' END, msg;
END $f$;

-- Extras tal como los arma buildBowlValidation (kind, source_id, name, charge).
CREATE FUNCTION pg_temp.x(kind text, src text, charge integer) RETURNS jsonb LANGUAGE sql AS $f$
  SELECT jsonb_build_object('kind', kind, 'source_id', src, 'name', kind || ' extra', 'charge', charge)
$f$;

-- Todos los tamaños al MÁXIMO por regla + 2 proteínas extra, 2 acompañantes premium repetidos,
-- acompañante gratis desbordado, 2 salsas premium, salsa desbordada, 2 complementos premium,
-- complemento desbordado, aguacate "adicional" (precio 0 => 3000) y cantidad 3.
-- Extras: 5000*2 + 3000*2 + 2000 + 2500 + 3000 + 2000 + 6000 + 5000 + 500 + 3000(aguacate) = 40000
SELECT pg_temp.expect('pequeño máximo + extras x3', 'small',
  ARRAY['t-arroz','t-pollo','t-tomate','t-maiz','t-tomate','t-maiz','t-chipotle','t-mani'],
  jsonb_build_array(pg_temp.x('protein','t-prot-adic',5000), pg_temp.x('protein','t-prot-adic',5000),
    pg_temp.x('acompanante','t-acomp-adic',3000), pg_temp.x('acompanante','t-acomp-adic',3000), pg_temp.x('acompanante','t-tomate',2000),
    pg_temp.x('sauce','t-trufa',2500), pg_temp.x('sauce','t-salsa-adic',3000), pg_temp.x('sauce','t-chipotle',2000),
    pg_temp.x('topping','t-queso-frito',6000), pg_temp.x('topping','t-croqueta',5000), pg_temp.x('topping','t-mani',500),
    pg_temp.x('acompanante','t-aguacate',3000)),
  23900 + 40000, 3, true);
SELECT pg_temp.expect('mediano máximo + extras x2', 'medium',
  ARRAY['t-papas','t-pollo','t-res','t-tomate','t-maiz','t-tomate','t-maiz','t-tomate','t-chipotle','t-ajo','t-mani','t-ajonjoli'],
  jsonb_build_array(pg_temp.x('protein','t-prot-adic',5000), pg_temp.x('protein','t-prot-adic',5000),
    pg_temp.x('acompanante','t-acomp-adic',3000), pg_temp.x('acompanante','t-acomp-adic',3000), pg_temp.x('acompanante','t-tomate',2000),
    pg_temp.x('sauce','t-trufa',2500), pg_temp.x('sauce','t-salsa-adic',3000), pg_temp.x('sauce','t-chipotle',2000),
    pg_temp.x('topping','t-queso-frito',6000), pg_temp.x('topping','t-croqueta',5000), pg_temp.x('topping','t-mani',500),
    pg_temp.x('acompanante','t-aguacate',3000)),
  27900 + 6000 + 40000, 2, true);
SELECT pg_temp.expect('grande máximo + extras x1', 'large',
  ARRAY['t-arroz','t-pollo','t-res','t-pollo','t-tomate','t-maiz','t-tomate','t-maiz','t-tomate','t-maiz',
        't-chipotle','t-ajo','t-chipotle','t-mani','t-ajonjoli','t-mani'],
  jsonb_build_array(pg_temp.x('protein','t-prot-adic',5000), pg_temp.x('protein','t-prot-adic',5000),
    pg_temp.x('acompanante','t-acomp-adic',3000), pg_temp.x('acompanante','t-acomp-adic',3000), pg_temp.x('acompanante','t-tomate',2000),
    pg_temp.x('sauce','t-trufa',2500), pg_temp.x('sauce','t-salsa-adic',3000), pg_temp.x('sauce','t-chipotle',2000),
    pg_temp.x('topping','t-queso-frito',6000), pg_temp.x('topping','t-croqueta',5000), pg_temp.x('topping','t-mani',500),
    pg_temp.x('acompanante','t-aguacate',3000)),
  32900 + 40000, 1, true);
-- "Salsa adicional" con precio 0 INCLUIDA (no como extra): 3000 en ambos lados.
SELECT pg_temp.expect('salsa adicional incluida', 'small',
  ARRAY['t-arroz','t-pollo','t-salsa-adic'], '[]', 23900 + 3000, 1, true);
-- Proteína "adicional" con precio 0 como extra: 5000.
SELECT pg_temp.expect('proteína adicional precio 0', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(pg_temp.x('protein','t-prot-adic0',5000)), 23900 + 5000, 1, true);

-- Carrito legacy (98bd908): extras sin source_id ('' o ausente) con recargo real.
SELECT pg_temp.expect('legacy proteína sin source_id', 'medium',
  ARRAY['t-arroz','t-pollo','t-res'],
  jsonb_build_array(pg_temp.x('protein','',5000), jsonb_build_object('kind','topping','name','Complemento extra: Maní','charge',500),
    pg_temp.x('sauce','',2000), pg_temp.x('acompanante','',3000)),
  27900 + 10500, 1, true);

-- Rechazos.
SELECT pg_temp.expect('legacy proteína rebajada (500)', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(pg_temp.x('protein','',500)), 23900 + 500, 1, false);
SELECT pg_temp.expect('legacy kind inventado', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(pg_temp.x('base','',6000)), 23900 + 6000, 1, false);
SELECT pg_temp.expect('legacy charge no numérico', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(jsonb_build_object('kind','sauce','source_id','','charge','2000.5')), 23900 + 2000, 1, false);
SELECT pg_temp.expect('salsa adicional cobrada 2000', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(pg_temp.x('sauce','t-salsa-adic',2000)), 23900 + 2000, 1, false);
SELECT pg_temp.expect('premium con charge rebajado', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(pg_temp.x('topping','t-queso-frito',500)), 23900 + 500, 1, false);
SELECT pg_temp.expect('kind no coincide con source', 'small',
  ARRAY['t-arroz','t-pollo'], jsonb_build_array(pg_temp.x('topping','t-trufa',2500)), 23900 + 2500, 1, false);
SELECT pg_temp.expect('excede proteínas del pequeño', 'small',
  ARRAY['t-arroz','t-pollo','t-res'], '[]', 23900, 1, false);
SELECT pg_temp.expect('excede salsas del mediano', 'medium',
  ARRAY['t-arroz','t-pollo','t-chipotle','t-ajo','t-chipotle'], '[]', 27900, 1, false);
SELECT pg_temp.expect('excede complementos del grande', 'large',
  ARRAY['t-arroz','t-pollo','t-mani','t-ajonjoli','t-mani','t-ajonjoli'], '[]', 32900, 1, false);
ROLLBACK;
