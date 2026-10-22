# Mini-release sobre release/redesign

No ejecutar en producción hasta aprobar y completar staging. Todos los comandos son para zsh, uno por línea. No usan un proyecto Supabase vinculado. Las funciones `safe_*_psql` abortan si la URL no contiene la referencia esperada o contiene la otra. Escribe las URLs con `read -rs` para no dejarlas en el historial.

## Staging: catálogo, 21b → 21c → 21d, SQL y E2E

Staging es `mbnedymxjplngwqkaabi`. Inspecciona la versión inicial: si ya es 21c, omite 21b y 21c. Si es 21, aplica ambos en orden. No apliques 21b sobre una versión posterior. La migración de catálogo es aditiva y debe estar antes del frontend nuevo.
La migración aborta si `product_variants` no tiene RLS activa o si `get_public_catalog` tiene más de una firma; en ese caso detén la secuencia y revisa el esquema antes de conceder lectura pública.

```zsh
read -rs 'STAGING_DB_URL?URL de PostgreSQL staging: '
function safe_staging_psql() { [[ "$STAGING_DB_URL" == *mbnedymxjplngwqkaabi* && "$STAGING_DB_URL" != *naoqsypqqgjhdudenevx* ]] || { print -u2 'ALTO: URL no es staging'; return 1; }; psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 "$@"; }
safe_staging_psql -f supabase/hotfix/verify_rpc_version.sql
safe_staging_psql -f supabase/migrations/20261022100000_public_catalog_variants.sql
safe_staging_psql -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_catalog'"
safe_staging_psql -f supabase/hotfix/2026-10-21b_bowl_surcharge.sql
safe_staging_psql -f supabase/hotfix/verify_rpc_version.sql
safe_staging_psql -f supabase/hotfix/2026-10-21c_bowl_legacy_extras.sql
safe_staging_psql -f supabase/hotfix/verify_rpc_version.sql
safe_staging_psql -f supabase/hotfix/2026-10-21d.sql
safe_staging_psql -f supabase/hotfix/verify_rpc_version.sql
safe_staging_psql -f supabase/tests/mini-release-21d.sql
safe_staging_psql -f supabase/tests/bowl-complex.sql
```

Cada consulta de versión debe dar `count = 1`. `mini-release-21d.sql` y `bowl-complex.sql` terminan en `ROLLBACK`. Para E2E real, el navegador debe usar la URL y clave pública de staging; la clave service role también debe ser de staging. La suite crea y limpia pedidos de prueba. El escenario de horario cerrado cambia temporalmente dos settings de staging y los restaura en `finally`; ejecuta la suite sin otros cambios de horario simultáneos.

```zsh
read -rs 'STAGING_ANON?Clave pública staging: '
read -rs 'E2E_SUPABASE_SERVICE_KEY?Service role staging: '
export VITE_SUPABASE_URL=https://mbnedymxjplngwqkaabi.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY="$STAGING_ANON"
export E2E_SUPABASE_SERVICE_KEY
npm ci
npm run e2e
node e2e/cleanup.mjs
unset E2E_SUPABASE_SERVICE_KEY STAGING_ANON
```

La E2E tiene una guardia que aborta si `.env.local`, `.env.development*` o variables `VITE_*`/`E2E_*` contienen la referencia de producción. El informe queda en `e2e/artifacts/summary.md`.

Rollback de staging, en orden inverso, si hace falta:

```zsh
safe_staging_psql -f supabase/hotfix/2026-10-21d_ROLLBACK.sql
safe_staging_psql -f supabase/hotfix/2026-10-21c_bowl_legacy_extras_ROLLBACK.sql
safe_staging_psql -f supabase/hotfix/2026-10-21b_bowl_surcharge_ROLLBACK.sql
safe_staging_psql -f supabase/hotfix/2026-10-22_public_catalog_variants_ROLLBACK.sql
unset STAGING_DB_URL
```

## Producción: orden y respaldo

Producción es `naoqsypqqgjhdudenevx`. Orden seguro: **SQL aditivo de catálogo → RPC 21b → RPC 21c → frontend nuevo → RPC 21d**. El frontend 527c185 ignora la nueva clave JSON y funciona con 21b/21c. El frontend nuevo envía `variant.id` y `variant.name`, que 21c acepta. La RPC 21d exige sabor incluso para variantes con delta cero, por lo que debe ir después del frontend. Mantén `business_hours_enforce=false` hasta guardar los siete días en admin.

Antes de cada paso SQL, guarda la definición vigente y verifica que solo existe una función. Los respaldos quedan fuera del repositorio. Cada verificación debe mostrar `count=1` y la versión esperada. Ejecuta los pasos de despliegue frontend solo tras fusionar la rama probada según Gitflow en `main`.

```zsh
read -rs 'PROD_DB_URL?URL de PostgreSQL producción: '
function safe_prod_psql() { [[ "$PROD_DB_URL" == *naoqsypqqgjhdudenevx* && "$PROD_DB_URL" != *mbnedymxjplngwqkaabi* ]] || { print -u2 'ALTO: URL no es producción'; return 1; }; psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 "$@"; }
mkdir -p ../ohana-mini-backup
safe_prod_psql -Atc "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_catalog'" > ../ohana-mini-backup/catalog-before.sql
safe_prod_psql -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_catalog'"
safe_prod_psql -f supabase/migrations/20261022100000_public_catalog_variants.sql
safe_prod_psql -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_catalog'"
safe_prod_psql -Atc "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_order_with_items'" > ../ohana-mini-backup/rpc-21.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -f supabase/hotfix/2026-10-21b_bowl_surcharge.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -Atc "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_order_with_items'" > ../ohana-mini-backup/rpc-21b.sql
safe_prod_psql -f supabase/hotfix/2026-10-21c_bowl_legacy_extras.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -Atc "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_order_with_items'" > ../ohana-mini-backup/rpc-21c.sql
safe_prod_psql -Atc "SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'value',value)), '[]'::jsonb) FROM public.settings WHERE key IN ('business_hours_weekly','business_hours_enforce')" > ../ohana-mini-backup/hours-before.json
```

Frontend: tras la integración probada en `main`, configura las variables `VITE_*` de prod y publica desde `main`. Conserva el despliegue anterior `527c185` para rollback en Cloudflare → Pages → Deployments. Ejecuta cada línea por separado; la comprobación de assets debe imprimir `0` antes de publicar.

```zsh
git switch main
git pull --ff-only
npm ci
npm run build
rg -l mbnedymxjplngwqkaabi dist/assets | wc -l
npx wrangler pages deploy dist --project-name ohana-bowls --branch main
```

Entonces:

```zsh
safe_prod_psql -f supabase/hotfix/2026-10-21d.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_order_with_items'"
```

Rollback de cada paso: 21d vuelve a 21c y apaga el flag; 21c vuelve a 21b; 21b vuelve a 21. Revierte el frontend a `527c185` **antes** de retirar la clave de variantes del catálogo. Verifica `count=1` después de cada SQL y comprueba un pedido de prueba/WhatsApp.

```zsh
safe_prod_psql -f supabase/hotfix/2026-10-21d_ROLLBACK.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -f supabase/hotfix/2026-10-21c_bowl_legacy_extras_ROLLBACK.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -f supabase/hotfix/2026-10-21b_bowl_surcharge_ROLLBACK.sql
safe_prod_psql -f supabase/hotfix/verify_rpc_version.sql
safe_prod_psql -f supabase/hotfix/2026-10-22_public_catalog_variants_ROLLBACK.sql
safe_prod_psql -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_catalog'"
```

## Horario en admin

En `/admin` → Configuración → Horarios de atención, activa cada día de apertura, define `HH:MM` de apertura y cierre en **America/Bogota**, deja apagados los días de cierre y pulsa **Guardar horario semanal**. Verifica en el sitio un horario abierto y uno cerrado: banner `Estamos cerrados. Abrimos hoy/mañana a las HH:MM`, carrito disponible y envío deshabilitado. Después activa **Bloquear pedidos fuera de horario**. El flag queda desactivado por defecto. Los campos antiguos “Horario Lun-Vie” y “Sáb-Dom” siguen sirviendo para footer/contacto hasta que se actualice esa presentación.
