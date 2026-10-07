# Runbook: Turnstile caído

## SÍNTOMAS
El widget `BotProtection` no entrega token; el botón de envío queda deshabilitado (`!botToken`); `create` responde `bot_verification_failed` o `bot_protection_unavailable` (503).

## DETECCIÓN
Consola del navegador (script de Cloudflare); logs de `order-api` en verificación (timeout de 10 s); estado de Cloudflare.

## IMPACTO
Nadie puede finalizar pedidos (se exige token en `create`), aunque `quote` funciona.

## ACCIÓN INMEDIATA
1. Confirmar que `VITE_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` coinciden. 2. Atender por WhatsApp.

## MITIGACIÓN
Si es caída de Cloudflare, esperar: no se debe omitir la verificación en producción. Si es mala configuración del dominio, corregir el widget en Cloudflare.

## RECUPERACIÓN
Corregir claves o esperar; reiniciar el widget (`resetKey`) recargando el checkout.

## VALIDACIÓN
Completar el desafío y crear un pedido de prueba; `create` devuelve 200.

## ESCALAMIENTO
Responsable técnico; administrador para decidir una excepción temporal (solo con `ORDERS_ENABLED=false` mientras tanto).

