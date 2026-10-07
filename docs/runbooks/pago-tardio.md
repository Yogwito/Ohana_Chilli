# Runbook: Pago tardío

## SÍNTOMAS
Pago aprobado sobre un pedido ya `cancelled` o vencido; aparece incidente persistente "financial attention" en el panel de pedidos.

## DETECCIÓN
Panel de incidentes del admin; `financial_attention` (migración `20261006123000`); webhook `webhook` o `reconcile`.

## IMPACTO
Cobro sin servicio; cliente exige entrega o reembolso.

## ACCIÓN INMEDIATA
1. No reactivar el pedido sin decisión. 2. Contactar al cliente por WhatsApp.

## MITIGACIÓN
Según decisión del administrador: reembolso completo vía `refund` o reabrir el pedido por vía soportada. No duplicar el reembolso.

## RECUPERACIÓN
Resolver el incidente, anotar causa (webhook retrasado, expiración).

## VALIDACIÓN
El incidente queda resuelto; `supabase/tests/financial-attention.sql` pasa.

## ESCALAMIENTO
Responsable financiero; administrador.

