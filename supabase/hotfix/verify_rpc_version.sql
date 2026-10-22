-- SOLO LECTURA. Debe devolver count = 1 con la versión esperada (21, 21b, 21c o 21d).
SELECT count(*) AS count,
       CASE WHEN max(p.prosrc) LIKE '%HOTFIX 2026-10-21d%' THEN '21d'
            WHEN max(p.prosrc) LIKE '%HOTFIX 2026-10-21c%' THEN '21c'
            WHEN max(p.prosrc) LIKE '%HOTFIX 2026-10-21b%' THEN '21b' ELSE 'otra' END AS version
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_order_with_items';
