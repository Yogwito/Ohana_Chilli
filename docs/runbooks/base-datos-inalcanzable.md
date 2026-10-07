# Runbook: Base de datos inalcanzable

## SÍNTOMAS
`order-api` devuelve 500/503 en `quote`/`create`; PostgREST con timeouts; errores de conexión o `too many connections`; consultas lentas.

## DETECCIÓN
Logs de Edge Functions y de Postgres en el panel; métricas de CPU/conexiones; `scripts/database-env.mjs` para validar la URL; alertas de `MONITORING_URL`.

## IMPACTO
No se pueden cotizar ni crear pedidos; el catálogo en caché de React Query puede seguir mostrándose pero la compra falla.

## ACCIÓN INMEDIATA
Para cerrar pedidos de inmediato: poner el secret `ORDERS_ENABLED=false` en las Edge Functions (`supabase secrets set ORDERS_ENABLED=false`); `quote` y `create` responden HTTP 503 `{code:'orders_disabled'}` y el checkout muestra el aviso de mantenimiento sin borrar el carrito.

## MITIGACIÓN
Cancelar consultas largas y liberar conexiones desde el panel; no relanzar migraciones; evitar picos (el rate limit de `quote` es 60 y `create` 10 por ventana).

## RECUPERACIÓN
Si hay corrupción o pérdida: ver `restauracion-requerida.md`. Si fue saturación: escalar el plan o corregir la consulta causante; rehabilitar `ORDERS_ENABLED`.

## VALIDACIÓN
Ejecutar los SQL de regresión de solo lectura (`supabase/tests/live-audit.sql`, `h10-legacy-orders-readonly.sql`) en una sesión de solo lectura; pedido de prueba.

## ESCALAMIENTO
Responsable técnico; soporte de Supabase; administrador informado de la pausa de pedidos.

