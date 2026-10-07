# Runbook: Restauración requerida

## SÍNTOMAS
Corrupción de datos, borrado accidental, migración dañina.

## DETECCIÓN
Auditoría con `supabase/tests/live-audit.sql`; diferencias contra el último respaldo.

## IMPACTO
Pérdida de pedidos o catálogo; tiempo de inactividad durante la restauración.

## ACCIÓN INMEDIATA
1. `ORDERS_ENABLED=false`. 2. Preservar el estado actual (dump) antes de tocar nada. 3. Nunca restaurar sobre producción sin aprobación del administrador.

## MITIGACIÓN
Restaurar primero en una base aislada (ver `docs/BACKUP_RESTORE.md`; `node scripts/restore-drill.mjs` valida el procedimiento) y comparar pedidos y artículos.

## RECUPERACIÓN
Restauración aprobada; reaplicar pedidos de la ventana perdida desde WhatsApp y `analytics_events`; regenerar tipos (`scripts/generate-db-types.mjs`).

## VALIDACIÓN
`node scripts/test-database.mjs`; conteos de `orders`/`order_items` coinciden; pedido de prueba.

## ESCALAMIENTO
Responsable técnico y administrador (aprobación); soporte de Supabase.

