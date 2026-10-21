# Migraciones archivadas (no se aplican)

Estos archivos son las migraciones históricas anteriores a `20261006120000`.
Se movieron aquí porque **no reproducen el esquema de producción**:

- Producción se construyó con migraciones de otras ramas que nunca llegaron a este
  repositorio (por ejemplo `promotions`, `product_variants`, `addons`,
  `addon_recommendations` y las columnas de pago Wompi de `orders`).
- Aplicadas en orden sobre una base vacía fallan o divergen: `delivery_zones` se crea
  dos veces, `product_default_ingredients.product_id` se declara `uuid` con FK hacia
  `products.id` de tipo `text` (en producción `products.id` es `uuid`), falta la tabla
  `promotions`, `has_role` tiene el orden de argumentos invertido, etc.

## Qué las reemplaza

`supabase/migrations/20261005000000_prod_baseline.sql` describe el esquema `public`
real de producción, derivado del volcado `supabase/baseline/prod_schema_2026-10-20.sql`
(`pg_dump --schema-only --schema=public`, PostgreSQL 17.6, sin datos). Es idempotente:
sobre producción no cambia nada; sobre una base limpia (local, CI, staging) crea el
mismo esquema. Después se aplican las migraciones `20261006*`.

## Reglas

- No mover estos archivos de vuelta a `supabase/migrations/`.
- No ejecutarlos contra ninguna base. Se conservan solo como historial y referencia.
- En el historial remoto (`supabase_migrations.schema_migrations`) de producción pueden
  figurar versiones distintas; para alinear el historial use
  `supabase migration repair` de forma manual y revisada, nunca `db push` a ciegas.

## Versiones registradas en producción

`supabase_migrations.schema_migrations` de producción contiene 16 versiones que **no**
corresponden a ningún archivo de este repositorio (vinieron de otras ramas):

| Versión | Nombre |
|---|---|
| 20260316054414 | initial_schema |
| 20260316054621 | fix_rls_initplan_and_missing_fk_index |
| 20260316061937 | seed_menu_data |
| 20260322211123 | add_sort_order_to_categories |
| 20260322225657 | create_product_images_bucket |
| 20260322230017 | temp_allow_anon_upload_product_images |
| 20260322230338 | drop_temp_anon_upload_policy |
| 20260329023655 | admin_rls_orders |
| 20260610132240 | restore_hotdog_chilli |
| 20260711032727 | deactivate_crutones_de_pan |
| 20260714134905 | variants_addons_recommendations |
| 20260714135058 | harden_order_creation |
| 20260714215817 | add_wompi_payments |
| 20260804225723 | get_public_catalog |
| 20260805053016 | restrict_public_catalog_execute |
| 20260805235819 | optimize_catalog_image_urls |

Su efecto acumulado es exactamente lo que captura `prod_schema_2026-10-20.sql` y, por
tanto, `20261005000000_prod_baseline.sql`. Ninguna de las versiones archivadas aquí
figura en ese historial.
