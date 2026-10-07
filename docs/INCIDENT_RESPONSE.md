# Respuesta a incidentes

Roles: **administrador** (decide y comunica), **operador** (atiende pedidos y WhatsApp), **responsable técnico** (diagnostica y corrige), **responsable financiero** (pagos, reembolsos). Procedimientos por escenario en `docs/runbooks/README.md`.

## Severidades

| Nivel | Definición | Ejemplos en este sistema | Objetivo de reconocimiento |
|---|---|---|---|
| SEV1 | No se pueden tomar pedidos o hay riesgo de pérdida de datos/dinero | Frontend caído; Supabase o base de datos inaccesible; `order-api` fallando en `create`; pedido duplicado masivo; pago duplicado o incidente `financial_attention` por pago tardío; restauración requerida; migración fallida | 15 min |
| SEV2 | Pedidos posibles pero degradados o un flujo clave roto | Turnstile caído; rate limiting incorrecto; Wompi no disponible (pago en línea, sandbox); webhook retrasado; reconciliación fallando; Auth admin caído; respaldo fallando | 1 h |
| SEV3 | Impacto menor o cosmético | Realtime caído; imágenes de Storage no cargan; error aislado de un pedido | siguiente día hábil |

## Flujo

1. **Detección**: alertas (`MONITORING_URL`), reportes de clientes por WhatsApp, `/pedidos`, incidentes `financial_attention`, CI.
2. **Reconocimiento**: el responsable técnico acepta el incidente, asigna severidad y abre el registro.
3. **Mitigación**: SEV1 con riesgo para pedidos o dinero: cerrar pedidos con `ORDERS_ENABLED=false` (el cliente ve el aviso de mantenimiento y conserva el carrito; el seguimiento y el admin siguen funcionando) y atender por WhatsApp. Pagos en línea: `ONLINE_PAYMENTS_ENABLED=false`.
4. **Recuperación**: seguir el runbook; reactivar `ORDERS_ENABLED=true` solo tras validar con un pedido de prueba.
5. **Comunicación**: el administrador informa a clientes por WhatsApp; el operador atiende manualmente.
6. **Postmortem**: dentro de 5 días hábiles para SEV1/SEV2, sin culpables.

## Plantilla de registro / postmortem

```
Incidente: <título>            Severidad: SEV_
Inicio: <fecha/hora Bogotá>    Detección: <fecha/hora, cómo>
Reconocimiento: <hora, rol>    Mitigación: <hora, acción>    Resolución: <hora>
Impacto: <pedidos afectados, dinero, clientes>
Cronología:
- hh:mm ...
Causa raíz:
Qué funcionó / qué no:
Acciones correctivas (responsable por rol, fecha):
Runbook actualizado: sí/no
Datos verificados (pedidos, pagos, reconciliación): sí/no
```
