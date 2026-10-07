# Runbook: Realtime caído

## SÍNTOMAS
El panel admin no se actualiza solo; la lista de pedidos queda desactualizada; WebSocket falla.

## DETECCIÓN
Consola del navegador en `/admin`; estado de Realtime en el panel de Supabase.

## IMPACTO
Solo degradación del admin; clientes y creación de pedidos no dependen de Realtime. Riesgo: operador no ve pedidos nuevos.

## ACCIÓN INMEDIATA
1. Indicar al operador recargar `/admin` o `/pedidos` manualmente cada pocos minutos. 2. Vigilar WhatsApp, donde también llega cada pedido.

## MITIGACIÓN
Mantener refresco manual; revisar `useCatalogMutationSync` (BroadcastChannel/localStorage), que no depende de Realtime.

## RECUPERACIÓN
Esperar restauración del servicio y recargar el admin.

## VALIDACIÓN
Crear un pedido de prueba y verlo aparecer en el tab "Pedidos".

## ESCALAMIENTO
Responsable técnico si dura más de 30 min.

