# Runbook: Reconciliación fallando

## SÍNTOMAS
`reconcile` devuelve 401 (`unauthorized`), `reference_lookup_not_verified`, o termina con errores; quedan pagos sin conciliar.

## DETECCIÓN
Logs de `reconcile`; `RECONCILIATION_SECRET`, `WOMPI_REFERENCE_LOOKUP_VERIFIED`, `WOMPI_REFUND_LOOKUP_VERIFIED`.

## IMPACTO
Pagos sin estado cierto; riesgo financiero.

## ACCIÓN INMEDIATA
Detener cobros en línea: `ONLINE_PAYMENTS_ENABLED=false`.

## MITIGACIÓN
Corregir el secreto o el flag de verificación en staging primero; ejecutar manualmente por lotes pequeños.

## RECUPERACIÓN
Reconciliar todos los pagos pendientes y revisar `financial_attention`.

## VALIDACIÓN
Una corrida completa sin errores; pagos coinciden con el proveedor.

## ESCALAMIENTO
Responsable financiero; responsable técnico.

