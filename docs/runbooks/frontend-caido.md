# Runbook: Frontend caído

## SÍNTOMAS
Sitio no carga, pantalla en blanco, 404/5xx en `/`, `/checkout`, `/pedido/:token`, `/admin`; ErrorBoundary visible; chunks lazy fallan tras un deploy.

## DETECCIÓN
Alertas externas de uptime sobre `/`; reportes de clientes por WhatsApp; consola del navegador (errores de chunk); estado del proveedor de hosting; último deploy y `vercel.json`.

## IMPACTO
Los clientes no pueden armar bowls ni hacer pedidos; el seguimiento y el admin también. El backend (Edge/DB) sigue sano y los pedidos ya creados no se pierden.

## ACCIÓN INMEDIATA
1. Confirmar si es global o local (otra red/dispositivo). 2. Revisar el último deploy: si coincide con el inicio, hacer rollback al deploy anterior desde el hosting. 3. Avisar por WhatsApp/redes que se atienden pedidos por ese canal.

## MITIGACIÓN
Atender manualmente por WhatsApp (número en `settings.whatsapp_number`). Si es caché/CDN, invalidar caché. Si es un chunk obsoleto, forzar recarga y re-desplegar.

## RECUPERACIÓN
Rollback o corregir y re-desplegar; verificar variables `VITE_*` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_ONLINE_PAYMENTS_ENABLED=false`) del build.

## VALIDACIÓN
Cargar `/`, `/bebidas`, `/checkout` con carrito, `/pedido/<token>` y `/admin/login`; ejecutar `npm run build` y `npm test` sobre el commit desplegado; pedido de prueba en staging.

## ESCALAMIENTO
Responsable técnico de inmediato; si supera 30 min sin causa, proveedor de hosting. Administrador decide el aviso a clientes.

