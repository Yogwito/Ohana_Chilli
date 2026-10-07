# Runbook: Webhook retrasado

## SÍNTOMAS
Cliente pagó pero el pedido sigue sin pago confirmado; `webhook` sin eventos recientes o con `invalid_webhook` (403).

## DETECCIÓN
Logs de `webhook`; comparar con transacciones en Wompi; revisar `WOMPI_EVENTS_SECRET` y entorno.

## IMPACTO
Pedido aparece impago; riesgo de cancelación indebida o de pago tardío.

## ACCIÓN INMEDIATA
1. No cancelar pedidos con pago en vuelo. 2. Esperar al menos un ciclo de reintento del proveedor.

## MITIGACIÓN
Ejecutar `reconcile` (POST con `Authorization: Bearer $RECONCILIATION_SECRET`) para consultar el estado en Wompi.

## RECUPERACIÓN
Verificar que `WOMPI_EVENTS_SECRET` coincide y el endpoint es accesible.

## VALIDACIÓN
El pedido pasa a pagado tras `reconcile`; sin incidentes nuevos.

## ESCALAMIENTO
Responsable técnico; responsable financiero.

