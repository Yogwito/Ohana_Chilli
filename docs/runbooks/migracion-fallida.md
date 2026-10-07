# Runbook: Migración fallida

## SÍNTOMAS
Una migración de `supabase/migrations/2026100612*` falla a la mitad o la app falla tras aplicarla; tests SQL rojos.

## DETECCIÓN
Salida de la migración; `node scripts/test-database.mjs`; `scripts/test-migration-scenarios.mjs`; `supabase/tests/verify-legacy.sql`, `legacy-sentinel.sql`.

## IMPACTO
Esquema parcial; funciones RPC ausentes; pedidos fallan.

## ACCIÓN INMEDIATA
1. Detener el despliegue. 2. `ORDERS_ENABLED=false`. 3. No volver a aplicar sin analizar.

## MITIGACIÓN
Las migraciones son aditivas: no borrar tablas; restaurar el esquema desde respaldo previo solo si es imprescindible (ver `restauracion-requerida.md`).

## RECUPERACIÓN
Corregir en staging aislado (`docs/ORDER_BACKEND_ROLLOUT.md`, `STAGING_DEPLOYMENT.md`), repetir el ensayo, luego aplicar en producción.

## VALIDACIÓN
Todos los SQL de `supabase/tests/*.sql` pasan con `node scripts/test-database.mjs`; regenerar `src/integrations/supabase/types.ts`.

## ESCALAMIENTO
Responsable técnico; administrador aprueba la ventana.

