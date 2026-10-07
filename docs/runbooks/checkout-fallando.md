# Runbook: Checkout fallando

## SÍNTOMAS
Errores al crear pedido, total distinto (`quote_changed`), `business_closed`, `idempotency_conflict`, botón deshabilitado, mensaje de mantenimiento (`orders_disabled`).

## DETECCIÓN
Tasa de errores `create`; eventos `checkout_start` vs `checkout_complete` en `analytics_events`; `node scripts/test-purchase-browser.cjs` contra staging; códigos en `src/lib/orderApi.ts`.

## IMPACTO
Pérdida directa de ventas. Un pedido pendiente en `sessionStorage` (`ohana-pending-order:v1`) puede existir en el navegador del cliente.

## ACCIÓN INMEDIATA
1. Reproducir en staging. 2. Si `orders_disabled`: es intencional, verificar el secret `ORDERS_ENABLED`. 3. Si falla el servidor: ver `edge-fallando.md`. Para cerrar pedidos de inmediato: poner el secret `ORDERS_ENABLED=false` en las Edge Functions (`supabase secrets set ORDERS_ENABLED=false`); `quote` y `create` responden HTTP 503 `{code:'orders_disabled'}` y el checkout muestra el aviso de mantenimiento sin borrar el carrito.

## MITIGACIÓN
No pedir al cliente rehacer el pedido: usar "Verificar pedido anterior" / "Reenviar solicitud original" (misma clave de idempotencia). Para `business_closed`, revisar horarios en `settings`.

## RECUPERACIÓN
Corregir causa, rehabilitar pedidos y avisar a clientes que reintenten; revisar duplicados (ver `pedido-duplicado.md`).

## VALIDACIÓN
Compra completa en staging, `npx vitest run src/test/checkout-recovery.test.tsx src/test/checkout-maintenance.test.tsx`.

## ESCALAMIENTO
Responsable técnico; administrador para comunicación.

