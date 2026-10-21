-- SOLO LECTURA. Respaldo literal de la función vigente (guárdalo antes de aplicar 21c).
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_order_with_items';
