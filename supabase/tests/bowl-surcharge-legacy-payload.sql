-- ¿Acepta la RPC 2026-10-21b el payload de bowl del frontend en vivo (c5e6364)?
-- c5e6364 manda extras como {name, charge} (sin kind/source_id) y los recargos de
-- ingredientes "adicional" como extras declarados. SOLO Postgres local; termina en ROLLBACK.
BEGIN;
INSERT INTO public.ingredients (id, name, type, price_cents) VALUES
  ('ajonjoli', 'Ajonjolí', 'topping', 0) ON CONFLICT (id) DO NOTHING;
CREATE FUNCTION pg_temp.try(label text, ids text[], extras jsonb, price integer) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM public.create_order_with_items('E2E-TEST-legacy', '3001234567', 'pickup', NULL, NULL, 0, NULL, price,
    jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Bowl Personalizado','quantity',1,'unit_price_cents',price,
      'details', jsonb_build_object('size','Mediano','validation',
        jsonb_build_object('size','medium','ingredient_ids',to_jsonb(ids),'extras',extras)))));
  RETURN rpad(label, 46) || 'ACEPTADO';
EXCEPTION WHEN OTHERS THEN RETURN rpad(label, 46) || 'RECHAZADO: ' || SQLERRM;
END $f$;
SELECT pg_temp.try('c5e6364 bowl sin recargos', ARRAY['arroz','pollo','mango'], '[]', 28000)
UNION ALL SELECT pg_temp.try('c5e6364 bowl con ingrediente premium (salmón)', ARRAY['arroz','salmon'], '[]', 34000)
UNION ALL SELECT pg_temp.try('c5e6364 bowl con proteína extra {name,charge}', ARRAY['arroz','pollo'],
  '[{"name":"Proteína extra: Pollo (+$5.000)","charge":5000}]', 33000)
UNION ALL SELECT pg_temp.try('c5e6364 bowl con complemento extra 500', ARRAY['arroz','pollo'],
  '[{"name":"Complemento extra: Ajonjolí (+$500)","charge":500}]', 28500)
UNION ALL SELECT pg_temp.try('c5e6364 bowl con "Aguacate adicional"', ARRAY['arroz','pollo','aguacate-adicional'],
  '[{"name":"Aguacate adicional","charge":3000}]', 31000);
ROLLBACK;
