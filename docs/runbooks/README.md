# Runbooks operativos

Roles: administrador, operador, responsable técnico, responsable financiero. Ver también `../INCIDENT_RESPONSE.md`.

**Interruptores**: `ORDERS_ENABLED` (secret de Edge: `false` cierra `quote`/`create` con 503 `orders_disabled`; el checkout muestra mantenimiento y conserva el carrito), `ONLINE_PAYMENTS_ENABLED` (Edge) y `VITE_ONLINE_PAYMENTS_ENABLED` (frontend, sandbox y desactivado por defecto). Seguimiento (`/pedido/:token`) y admin no se ven afectados por el cierre de pedidos.

Nunca ejecutar estos pasos contra producción sin aprobación del administrador; probar primero en staging.

| Runbook | Archivo |
|---|---|
| Frontend caído | `frontend-caido.md` |
| Supabase caído (plataforma) | `supabase-caido.md` |
| Base de datos inalcanzable | `base-datos-inalcanzable.md` |
| Edge Function `order-api` fallando | `edge-fallando.md` |
| Realtime caído | `realtime-caido.md` |
| Storage caído | `storage-caido.md` |
| Auth caído | `auth-caido.md` |
| Turnstile caído | `turnstile-caido.md` |
| Rate limiting incorrecto | `rate-limit-incorrecto.md` |
| Checkout fallando | `checkout-fallando.md` |
| Pedido duplicado | `pedido-duplicado.md` |
| Estado de pedido inconsistente | `estado-inconsistente.md` |
| Pago duplicado | `pago-duplicado.md` |
| Pago tardío | `pago-tardio.md` |
| Wompi no disponible | `wompi-no-disponible.md` |
| Webhook retrasado | `webhook-retrasado.md` |
| Reconciliación fallando | `reconciliacion-fallando.md` |
| Respaldo fallando | `respaldo-fallando.md` |
| Restauración requerida | `restauracion-requerida.md` |
| Migración fallida | `migracion-fallida.md` |
