# Runbook: Estado de pedido inconsistente

## SÍNTOMAS
Pedido `delivered` sin pago aprobado, `cancelled` con pago aprobado, estado que retrocede, versión en conflicto (`version_conflict`).

## DETECCIÓN
`/pedidos` y tab "Pedidos"; incidentes de `financial_attention`; tests `supabase/tests/order-workflow.sql`, `legacy-order-transition.sql`, `financial-attention.sql`.

## IMPACTO
Cocina/entrega equivocadas, contabilidad errónea.

## ACCIÓN INMEDIATA
1. Congelar cambios sobre ese pedido (un solo operador). 2. Registrar capturas y tokens.

## MITIGACIÓN
Corregir solo con la acción de admin que respeta transiciones; no editar `orders` a mano salvo orden del responsable técnico con respaldo.

## RECUPERACIÓN
Reconciliar con `reconcile` si hay pago; documentar en el postmortem.

## VALIDACIÓN
Ejecutar `node scripts/test-database.mjs`; el pedido refleja la secuencia pending/confirmed/preparing/ready/delivered.

## ESCALAMIENTO
Responsable técnico; responsable financiero.

