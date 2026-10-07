# Runbook: Pedido duplicado

## SÍNTOMAS
Dos pedidos iguales (mismo teléfono, items y minutos), o el cliente dice haber pagado dos veces.

## DETECCIÓN
Consulta en `orders` por `phone` y ventana de tiempo; comparar `idempotency_key` y tracking token; `scripts/test-order-concurrency.mjs` valida la garantía.

## IMPACTO
Doble preparación y posible doble cobro.

## ACCIÓN INMEDIATA
1. No cancelar a ciegas: identificar cuál tiene el tracking token que el cliente recibió. 2. Avisar a cocina.

## MITIGACIÓN
Cancelar el duplicado por la acción de admin (`action`) con motivo; si hubo pago, tratarlo como `pago-duplicado.md`.

## RECUPERACIÓN
Si el índice de idempotencia no actuó, abrir bug: la creación debe ser atómica por RPC con clave única.

## VALIDACIÓN
Correr `TEST_DATABASE_URL=... node scripts/test-order-concurrency.mjs` y `supabase/tests/order-workflow.sql`.

## ESCALAMIENTO
Responsable técnico; responsable financiero si hay dinero involucrado.

