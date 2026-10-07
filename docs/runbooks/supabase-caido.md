# Runbook: Supabase caído (plataforma)

## SÍNTOMAS
Fallan a la vez catálogo (`products`, `ingredients`), Auth, Edge (`order-api`) y Storage; errores de red/timeout contra `VITE_SUPABASE_URL`.

## DETECCIÓN
Página de estado de Supabase; panel del proyecto; `curl -sS -o /dev/null -w "%{http_code}" $VITE_SUPABASE_URL/rest/v1/` ; errores 5xx en `order-api`; alerta de `MONITORING_URL`.

## IMPACTO
Sin catálogo ni pedidos; admin inaccesible. Datos intactos pero inalcanzables.

## ACCIÓN INMEDIATA
Para cerrar pedidos de inmediato: poner el secret `ORDERS_ENABLED=false` en las Edge Functions (`supabase secrets set ORDERS_ENABLED=false`); `quote` y `create` responden HTTP 503 `{code:'orders_disabled'}` y el checkout muestra el aviso de mantenimiento sin borrar el carrito. Si la plataforma está caída puede que el switch no se pueda aplicar: el frontend ya muestra el aviso de servicio no disponible (503 sin código).

## MITIGACIÓN
Operar por WhatsApp con la carta publicada fuera de línea. No ejecutar restauraciones ni migraciones durante el incidente. No reintentar masivamente.

## RECUPERACIÓN
Al volver la plataforma: revisar `orders` pendientes de la ventana, ejecutar `reconcile` si hubo pagos, volver a `ORDERS_ENABLED=true`.

## VALIDACIÓN
Pedido de prueba en el flujo completo; `/pedidos` lista pedidos recientes; `financial_attention` sin incidentes nuevos.

## ESCALAMIENTO
Responsable técnico; soporte de Supabase con el ID del proyecto; administrador para comunicación.

