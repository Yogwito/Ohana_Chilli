# Runbook: Pago duplicado

## SÍNTOMAS
Dos transacciones aprobadas para un mismo pedido o cliente reporta doble cobro (Wompi sandbox; en producción el pago en línea está deshabilitado).

## DETECCIÓN
Tabla de pagos (`order_payments`); incidente en `financial_attention`; `payment_reconciliation_required` en el cliente.

## IMPACTO
Dinero del cliente retenido indebidamente.

## ACCIÓN INMEDIATA
1. No solicitar ni reintentar el reembolso a mano más de una vez. 2. Confirmar `WOMPI_REFUNDS_ENABLED`. 3. Informar al cliente.

## MITIGACIÓN
Usar la ruta `refund` (requiere `ONLINE_PAYMENTS_ENABLED=true`, `WOMPI_REFUNDS_ENABLED=true`); si responde `refund_requires_review`, esperar revisión del responsable financiero.

## RECUPERACIÓN
Verificar el reembolso en el panel del proveedor y en `financial_attention`; cerrar el incidente.

## VALIDACIÓN
`supabase/tests/financial-attention.sql`; saldo de la transacción correcto.

## ESCALAMIENTO
Responsable financiero; responsable técnico.

