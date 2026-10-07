# Runbook: Wompi no disponible

## SÍNTOMAS
Falla `payment` (hosted checkout, timeout de 15 s); clientes no pueden pagar en línea; el sitio muestra "El pago en línea no está habilitado" (`online_payments_disabled`).

## DETECCIÓN
Respuestas de `payment` en logs; estado de Wompi; `onlineEnabled()` exige `ONLINE_PAYMENTS_ENABLED`, `WOMPI_*` y llaves `pub_test_`/`prv_test_` (solo sandbox).

## IMPACTO
Solo pago en línea; efectivo y transferencia continúan. Producción tiene `VITE_ONLINE_PAYMENTS_ENABLED=false` por defecto.

## ACCIÓN INMEDIATA
1. Poner `ONLINE_PAYMENTS_ENABLED=false` en secrets de Edge. 2. Ocultar el método con `VITE_ONLINE_PAYMENTS_ENABLED=false` (requiere nuevo build).

## MITIGACIÓN
Ofrecer contra entrega o transferencia. Los pedidos ya creados con pago pendiente se mantienen; no reintentar cobros.

## RECUPERACIÓN
Reactivar tras confirmar el servicio con una transacción sandbox (`docs/ORDER_BACKEND_ROLLOUT.md`, sección de aceptación).

## VALIDACIÓN
Pago sandbox exitoso, webhook recibido, estado del pedido actualizado.

## ESCALAMIENTO
Responsable financiero; responsable técnico.

