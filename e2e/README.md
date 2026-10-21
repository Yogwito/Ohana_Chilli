# Suite E2E de checkout (Playwright) — STAGING

Prueba el flujo real de compra (menú → carrito → checkout → RPC `create_order_with_items` → WhatsApp)
contra **staging** (`mbnedymxjplngwqkaabi`). **Nunca abre WhatsApp**: `window.open`, clics y navegaciones a
`wa.me`, `web.whatsapp.com`, `api.whatsapp.com` y `whatsapp://` se interceptan y su texto se guarda para
verificarlo. Cualquier request a producción (`naoqsypqqgjhdudenevx`) se bloquea.

La suite **aborta antes de arrancar** si:
- la `VITE_SUPABASE_URL` efectiva (env o `.env.local`) no contiene `mbnedymxjplngwqkaabi`,
- `.env.local` (o `.env.development*`, o cualquier variable `VITE_*`/`E2E_*`) contiene `naoqsypqqgjhdudenevx`,
- la anon key o `E2E_SUPABASE_SERVICE_KEY` son JWT de otro proyecto (claim `ref`),
- el dev server que responde en el puerto 5179 sirve otra URL de Supabase.

Los pedidos de prueba se llaman `E2E-TEST-<run>-<escenario>-<mobile|desktop>` y se borran al final
(`globalTeardown` ejecuta `e2e/cleanup.mjs`; usa `E2E_KEEP_ORDERS=1` para conservarlos y revisarlos).

## Requisito previo

Staging debe tener aplicado `supabase/hotfix/2026-10-21b_bowl_surcharge.sql`. Con la versión anterior de la RPC, el escenario 07d (recargo de bowl rebajado) falla, porque el servidor acepta el recargo rebajado.

## Pasos para el dueño (zsh, un comando por línea, pégalos de a uno)

```zsh
cd ~/Developer/ohana-redesign
```
```zsh
git pull
```
```zsh
npm ci
```
```zsh
npx playwright install chromium
```
Debe imprimir 1 o más:
```zsh
grep -c mbnedymxjplngwqkaabi .env.local
```
Debe imprimir 0:
```zsh
grep -c naoqsypqqgjhdudenevx .env.local
```
```zsh
export E2E_SUPABASE_SERVICE_KEY=$(npx supabase@latest projects api-keys --project-ref mbnedymxjplngwqkaabi -o json | python3 -c 'import sys,json;print([k["api_key"] for k in json.load(sys.stdin) if k["name"]=="service_role"][0])')
```
Asegúrate de que no haya otro `npm run dev` en el puerto 5179 y corre:
```zsh
npm run e2e
```
```zsh
npx playwright show-report e2e/artifacts/report
```
```zsh
open e2e/artifacts/summary.md
```
Limpieza (ya corre sola al final; repítela si algo se interrumpió):
```zsh
node e2e/cleanup.mjs
```
```zsh
unset E2E_SUPABASE_SERVICE_KEY
```

Si el negocio tiene `business_hours_enforce=true` y está cerrado, los escenarios de pedido fallan con
“El negocio está CERRADO”: corre la suite en horario o desactiva el enforce en staging.

## Escenarios (cada uno en `mobile` 390×844 táctil y `desktop` 1440×900)

| # | Escenario | Qué verifica |
|---|---|---|
| 01 | Producto simple (sin extras ni variantes) | total UI = WhatsApp = `orders.total_cents`; 1 `order_item` |
| 02 | Producto con 2 extras (`product_default_ingredients.is_extra`) | precio base + extras; ids de extras en `details.customizations.extras` |
| 03 | Hatsu 400 ml (variantes activas delta 0) | pasa al precio base sin selector de sabor |
| 04 | Bowl con proteína extra, salsa premium y complemento pago | precio del builder = servidor; `details.validation` |
| 05 | Promoción combo vigente | `product_id = promo-<id>` al precio de la promo |
| 06 | Carrito mixto con los cinco | suma correcta, todos los ítems en WhatsApp y DB |
| 07a | `unitPrice` rebajado en localStorage (`ohana-bowls-cart`) + recarga | nunca se crea un pedido por debajo del precio real |
| 07b | `unit_price_cents` rebajado en la request | “Precio no coincide”, 0 pedidos en DB |
| 07c | `p_total_cents` rebajado en la request | “Total no coincide”, 0 pedidos en DB |
| 07d | recargo de bowl rebajado a 500 | **falla esperada** (`test.fail`): hueco conocido de la whitelist |
| 08a/b | Recoger vs domicilio a zona con tarifa | total incluye `delivery_zones.fee_cents`; `delivery_zone` en DB |
| 09 | Validaciones (vacíos, teléfono inválido, dirección) | mensajes en español y **0** llamadas a la RPC |
| 10 | Layout | sin scroll horizontal; botón “Enviar por WhatsApp” alcanzable y no tapado por la barra inferior |

Los datos se descubren en tiempo de ejecución desde staging con la service role
(`e2e/artifacts/discovery.json`). Si falta un dato (p. ej. no hay combo vigente) el escenario se
**salta** con el motivo.

## Resultados

- `e2e/artifacts/summary.md` — tabla generada automáticamente, con este formato:

| Escenario | Viewport | Estado | Esperado | UI | WhatsApp | DB orders.total_cents | Error / motivo |
|---|---|---|---|---|---|---|---|
| 01 producto simple | mobile | OK | $18.000 | $18.000 | $18.000 | $18.000 | |
| 07b precio unitario manipulado… | desktop | OK | $17.000 | — | — | — | |

  Debajo, por test: notas, errores de consola y requests fallidos.
- `e2e/artifacts/screenshots/` — `cart-*`, `checkout-*`, `manipulacion-*` por viewport.
- `e2e/artifacts/report/` — reporte HTML (trazas y video de los fallos).

## Modo mock (sin red, para desarrollo de la suite)

`E2E_MOCK=1` intercepta `*.supabase.co` con fixtures (`e2e/lib/mock/`) y un port JS de la RPC
(`supabase/hotfix/2026-10-21b_bowl_surcharge.sql`). No prueba la base real.

```zsh
E2E_MOCK=1 VITE_SUPABASE_URL=https://mbnedymxjplngwqkaabi.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=dummy npm run e2e
```
