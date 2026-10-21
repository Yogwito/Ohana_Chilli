# Backlog

Pendientes detectados por la suite E2E (2026-10-21) que no se corrigieron en `release/redesign`.

## Baja: los toasts tapan la barra inferior en móvil
- **Qué pasa:** Sonner muestra los avisos abajo a la derecha, encima de la barra de navegación fija (`nav[aria-label="Navegación móvil"]`). Si el puntero o el dedo queda sobre el aviso, no se cierra y bloquea el botón "Carrito".
- **Dónde:** el `<Toaster>` de `src/App.tsx` y `.experience-bottom-nav` en `src/experience.css`.
- **Propuesta:** en móvil, `position="top-center"` o un `offset` igual a la altura de la barra (64px + `env(safe-area-inset-bottom)`).

## Baja: el teléfono se valida distinto en el cliente y en el servidor
- **Qué pasa:** el esquema Zod del checkout acepta valores como `----------`; la RPC `create_order_with_items` los rechaza con "Teléfono inválido" (exige al menos 7 dígitos).
- **Dónde:** el esquema del formulario en `src/pages/CheckoutPage.tsx` y la validación de `p_phone` en la RPC.
- **Propuesta:** en el cliente, contar los dígitos (`replace(/\D/g, '')`) y exigir el mismo mínimo que el servidor, con el mensaje en el campo.

## Documentación: `CLAUDE.md` no describe esta rama
`CLAUDE.md` describe el flujo de `feature/production-readiness`, no el de `release/redesign`:
- **Clave del carrito:** es `ohana-bowls-cart`, no `ohana-chilli-cart`.
- **Creación de pedidos:** no hay Edge Function `order-api` ni `src/lib/orderApi.ts`. El checkout llama a la RPC `create_order_with_items`, con el payload de `src/domain/orderPayload.ts`.
- **WhatsApp:** `openWhatsAppHandoff` no detecta iframes. En móvil muestra un enlace a `wa.me`, en desktop abre `web.whatsapp.com` y siempre hay un botón "Copiar mensaje".
- **Ruta `/pedido/:token`:** no existe en esta rama.
- **Propuesta:** actualizar `CLAUDE.md` cuando se decida qué rama queda como base (esta o `production-readiness`).
