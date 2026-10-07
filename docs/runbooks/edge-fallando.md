# Runbook: Edge Function `order-api` fallando

## SÍNTOMAS
Checkout muestra "No pudimos completar la operación"; 500/502/timeout (25 s en el cliente) en `/functions/v1/order-api/{quote,create,track,payment,webhook,reconcile}`.

## DETECCIÓN
Logs de la función `order-api`; código de error en `MONITORING_URL` (`service: orders`); `supabase/functions/order-api/handler.test.ts` (Deno); revisar secrets requeridos: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `APP_ORIGIN`, `RATE_LIMIT_SECRET`, `TURNSTILE_SECRET_KEY`.

## IMPACTO
Sin pedidos nuevos ni seguimiento (`track`); webhooks de Wompi pueden perderse (se recuperan con `reconcile`).

## ACCIÓN INMEDIATA
Para cerrar pedidos de inmediato: poner el secret `ORDERS_ENABLED=false` en las Edge Functions (`supabase secrets set ORDERS_ENABLED=false`); `quote` y `create` responden HTTP 503 `{code:'orders_disabled'}` y el checkout muestra el aviso de mantenimiento sin borrar el carrito.

## MITIGACIÓN
Revertir el último despliegue de la función; revisar secrets faltantes (la falta de `RATE_LIMIT_SECRET` da `rate_limit_unavailable` 503; la de `TURNSTILE_SECRET_KEY` da `bot_protection_unavailable` 503). Atender por WhatsApp.

## RECUPERACIÓN
Re-desplegar la versión estable, correr `deno test` sobre `handler.test.ts`, reactivar `ORDERS_ENABLED=true`, ejecutar `reconcile` para webhooks perdidos.

## VALIDACIÓN
`quote` y `create` con pedido de prueba (staging); `track` con un token existente; CI `.github/workflows/order-ci.yml` en verde.

## ESCALAMIENTO
Responsable técnico; responsable financiero si hay pagos en vuelo.

