-- SOLO LECTURA. Catálogo real del bowl + versión de la RPC desplegada. Seguro en prod (no escribe).
-- Salida: una fila JSON por sección; pégala completa como seed (supabase/tests/bowl-complex.sql la acepta).
SELECT 'bowl_rules' AS section, jsonb_agg(to_jsonb(br) ORDER BY br.price_cents) AS data
FROM public.bowl_rules br
UNION ALL
SELECT 'ingredients', jsonb_agg(jsonb_build_object(
         'id', i.id, 'name', i.name, 'type', i.type, 'price_cents', i.price_cents, 'is_active', i.is_active,
         -- Mismo criterio que bowlPricing.ts (premium = precio > 0 o nombre "adicional"/"extra").
         'premium', COALESCE(i.price_cents, 0) > 0
                    OR lower(translate(i.name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) ~ '(adicional|extra)')
       ORDER BY i.type, i.name)
FROM public.ingredients i
WHERE i.is_active
UNION ALL
SELECT 'ingredient_types', jsonb_object_agg(t.type, t.n)
FROM (SELECT type, count(*) AS n FROM public.ingredients WHERE is_active GROUP BY type) t
UNION ALL
SELECT 'rpc_version', to_jsonb(CASE
         WHEN p.prosrc LIKE '%HOTFIX 2026-10-21c%' THEN '21c'
         WHEN p.prosrc LIKE '%HOTFIX 2026-10-21b%' THEN '21b'
         WHEN p.prosrc LIKE '%HOTFIX 2026-10-21%' THEN '21'
         ELSE 'otra' END)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_order_with_items';
