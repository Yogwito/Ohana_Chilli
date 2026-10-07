# Runbook: Rate limiting incorrecto

## SÍNTOMAS
Clientes legítimos reciben `rate_limited` ("Demasiados intentos"), o bien hay abuso sin bloqueo; `rate_limit_unavailable` 503.

## DETECCIÓN
Logs de `order-api` con código `rate_limited`; revisar `RATE_LIMIT_TRUSTED_HEADER` y `RATE_LIMIT_SECRET`; si todos comparten la misma IP, la cabecera de confianza está mal.

## IMPACTO
Falso positivo: pedidos legítimos bloqueados (límites: `quote` 60, `create` 10). Falso negativo: abuso y costos.

## ACCIÓN INMEDIATA
1. Identificar si el origen es una sola IP/NAT o todos. 2. Si todos son bloqueados, corregir `RATE_LIMIT_TRUSTED_HEADER`.

## MITIGACIÓN
Ajustar el secret y re-desplegar; en abuso, subir la verificación Turnstile y cerrar con `ORDERS_ENABLED=false` si es grave.

## RECUPERACIÓN
Limpiar los contadores de rate limit según la migración `operational_retention` (retención) si quedaron entradas erróneas.

## VALIDACIÓN
Hacer 3 cotizaciones desde IPs distintas; confirmar que no hay bloqueo cruzado; `supabase/tests/operational-retention.sql`.

## ESCALAMIENTO
Responsable técnico.

