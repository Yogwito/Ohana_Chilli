# Hotfix checkout legacy — 2026-10-21

Rama `hotfix/checkout-legacy`, construida sobre `98bd908` (el frontend que está en producción).
Nada de esto se ha aplicado a staging ni a producción. Todo se verificó en un PostgreSQL 16 local
con `supabase/baseline/prod_schema_2026-10-20.sql` y un catálogo sintético
(`supabase/hotfix/local_seed_synthetic_catalog.sql`).

## 1. Diagnóstico

La función `create_order_with_items` de producción (10 args, SECURITY DEFINER) recalcula cada item:

| `details` del item | Regla del servidor |
|---|---|
| `product_id = 'promo-<uuid>'` | precio = `promotions.price_cents` (activa, `type='combo'`, dentro de fechas) |
| `product_id = <uuid>` | `products.price_cents` + delta de `customizations.variant.id`; si el producto tiene variantes activas y no se envía variante → **'Falta seleccionar sabor'**; cada `customizations.extras[].id` se busca en `addons` y luego en `products` |
| `validation = {size, ingredient_ids[], extras[{name,charge}]}` | `bowl_rules.price_cents` + `ingredients.price_cents` por id + cada `charge` ∈ {2000,3000,5000} o igual al precio de algún ingrediente activo |
| ninguno | **'Item sin datos de validación'** |

Después: `unit_price_cents` debe ser igual al calculado (**'Precio no coincide'**) y `p_total_cents` igual a subtotal + domicilio (**'Total no coincide'**).

Qué envía 98bd908 (`CheckoutPage.tsx`) y qué pasa (repro local, mensaje exacto):

| Caso | Payload de 98bd908 | Resultado en prod |
|---|---|---|
| 1. Producto simple | `{product_id, customizations: null}` | OK |
| 2. Producto con extras (ProductDrawer) | `customizations.extras[].id` = id de `product_default_ingredients` | `Adicional no disponible: <extra>` |
| 3. Producto con variantes activas | no tiene selector de sabor, no hay `variant` | `Falta seleccionar sabor para <producto>` |
| 4. Bowl personalizado | solo nombres (`size, bases, …`), sin `validation` | `Item sin datos de validación: Bowl Personalizado` |
| 4'. Bowl con complemento extra de $500 (aunque llegue `validation`) | `EXTRA_COMP_PRICE = 500` en BowlBuilder | `Recargo de bowl inválido: … (500)` |
| 5. Promo combo (`promo-<id>`) | `{product_id:'promo-<id>'}` | OK |

Todo bowl falla, así que en la práctica casi ningún pedido entra.

El precio del bowl en 98bd908 es `size.price + Σ getIngredientExtraCharge`: precio del ingrediente si es > 0; si no, 5000/3000 cuando el nombre dice "adicional"/"extra"; los extras sintéticos (`extra-*`) usan 5000 para proteína, el precio del premium o 2000/3000 para acompañante, precio o 2000 para salsa, y precio o **500** para complemento. Todo cabe en la whitelist del RPC salvo 500.

## 2. Arreglo (opción a + b)

- **(a) Frontend** (`src/domain/orderPayload.ts`, con tests en `src/test/order-payload.test.ts`): los bowls ahora envían `details.validation`. `ingredient_ids` lleva los ingredientes de catálogo (el servidor suma su `price_cents`). `extras` lleva los recargos sintéticos `extra-*` y los recargos por nombre de ingredientes con precio 0. La suma reproduce exactamente `calculateBowlPrice`.
- **(b) SQL** `supabase/hotfix/2026-10-21_create_order_with_items.sql`: `CREATE OR REPLACE` con la misma firma, SECURITY DEFINER, `search_path ''` y los mismos grants:
  1. Los extras de producto se aceptan desde `product_default_ingredients`, solo si `product_id` es el del item y `is_extra`. El precio sale de `extra_price_cents` del servidor. Después se siguen buscando en addons y products como antes. `v_pid` se reinicia por item para que una promo no herede el producto anterior.
  2. Si no se envía variante, se cobra el precio base **solo si existe una variante activa con delta 0**. Si todas cuestan más, se sigue rechazando y no se cobra de menos. El sabor lo indica el cliente en notas o WhatsApp.
  3. Se agrega 500 a la whitelist de recargos de bowl.
- **(c) Datos**: hace falta solo si un producto tiene variantes activas y todas con delta > 0. En ese caso hay que desactivarlas o crear una con delta 0, con aprobación del dueño. Primero corre la consulta de la sección 3.

Seguridad: el cliente sigue sin poder fijar precios. Precios de productos, extras, variantes, promos, tamaño e ingredientes salen del servidor, y cualquier diferencia se rechaza (casos 6, 7 y 8 abajo). Este límite ya existía y sigue igual: en el bowl el cliente declara qué recargos de la whitelist lleva.

Compatibilidad con el cutover: la firma no cambia y no se crean overloads, así que `REVOKE EXECUTE` sobre todos los overloads la cubre. La función sigue insertando `p_payment_method`, que es NULL en el legacy. Cuando `payment_method` pase a NOT NULL default 'legacy', este RPC dejaría de insertar, pero para ese momento el cutover ya le quitó EXECUTE. Hay que aplicar el cutover junto con el frontend nuevo, como estaba planeado.

## Verificación local

`supabase/hotfix/verify_checkout_cases.sql` corre dentro de BEGIN … ROLLBACK y no deja datos:

```
ANTES:    1 OK | 2 Adicional no disponible | 3 Falta seleccionar sabor | 4a Item sin datos de validación
          4b Recargo de bowl inválido (500) | 5 OK | 6 Precio no coincide | 7,8 rechazados
DESPUÉS:  1 OK 8000 | 2 OK 28000 | 3 OK 9000 | 4b OK 39500 | 5 OK 40000
          4a (payload viejo) sigue rechazado | 6 Precio no coincide | 7 Precio no coincide
          8 Adicional no disponible (extra de otro producto)
          producto con todas las variantes > 0 → sigue 'Falta seleccionar sabor'
ROLLBACK: los mismos resultados que ANTES; md5(prosrc) igual al del snapshot de prod
```

Además: `anon` puede ejecutar la función, hay un solo overload y `prosecdef = true` con `search_path=""`.
`vitest` 33/33, `lint` limpio y `build` OK. `tsc` da 35 errores que ya existían en 98bd908 (tipos generados viejos); el hotfix no agrega ninguno.

## 3. Prueba en STAGING (mbnedymxjplngwqkaabi), para el dueño

Los pasos son comandos sueltos para zsh. Pega **uno por vez**.

1. `cd ~/Ohana_Chilli && git fetch origin && git worktree add ../ohana-hotfix origin/hotfix/checkout-legacy`
2. `cd ../ohana-hotfix && npm ci`
3. Escribe la contraseña de staging. Este comando va solo, sin nada más pegado:
   `read -rs STAGING_PW`
4. `export STAGING_DB_URL="postgresql://postgres.mbnedymxjplngwqkaabi:${STAGING_PW}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"`
5. Guardia. Debe imprimir `staging ok`:
   `case "$STAGING_DB_URL" in *naoqsypqqgjhdudenevx*) echo "ALTO: PROD";; *mbnedymxjplngwqkaabi*) echo "staging ok";; *) echo "ALTO: desconocido";; esac`
6. Consulta de solo lectura con los productos que tienen variantes activas:
   `psql "$STAGING_DB_URL" -c "select p.name, count(*) from product_variants v join products p on p.id=v.product_id where v.is_active and p.is_active group by 1"`
7. Para ver si alguno no tiene variante en $0:
   `psql "$STAGING_DB_URL" -c "select p.name, min(v.price_delta_cents) from product_variants v join products p on p.id=v.product_id where v.is_active and p.is_active group by 1 having min(v.price_delta_cents) > 0"`
8. Respaldo del cuerpo actual en staging:
   `psql "$STAGING_DB_URL" -Atc "select pg_get_functiondef('public.create_order_with_items(text,text,text,text,text,integer,text,integer,jsonb,text)'::regprocedure)" > /tmp/staging_coi_before.sql`
9. Guardia antes de escribir:
   `case "$STAGING_DB_URL" in *naoqsypqqgjhdudenevx*) echo "ALTO: PROD";; esac`
10. Aplica el hotfix:
    `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/hotfix/2026-10-21_create_order_with_items.sql`
11. Obtén la anon key de staging:
    `npx supabase@latest projects api-keys --project-ref mbnedymxjplngwqkaabi -o json`
    Copia el valor con name `anon`.
12. `printf 'VITE_SUPABASE_URL=https://mbnedymxjplngwqkaabi.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=PEGAR_ANON\nVITE_SUPABASE_ANON_KEY=PEGAR_ANON\n' > .env.local`
    Después edita `PEGAR_ANON` dentro de `.env.local`.
13. `grep -c naoqsypqqgjhdudenevx .env.local`
    Debe dar `0`.
14. `npm run dev`
    Haz 5 pedidos de recogida: (1) producto simple, (2) producto con extra ×2, (3) producto con variantes, (4) bowl con proteína extra, salsa extra y complemento extra, (5) promo combo. Todos deben llegar hasta WhatsApp.
15. Manipulación de precio: en DevTools → Application → Local Storage → `ohana-chilli-cart`, baja un `unitPrice`, recarga y confirma. Debe aparecer `Error: Precio no coincide…` o `Total no coincide…`.
16. Opcional, con ids reales: `psql "$STAGING_DB_URL" -v simple_product_id=… -v extra_product_id=… -v extra_id=… -v variant_product_id=… -v bowl_size=medium -v bowl_ingredient_ids='id1,id2' -v promo_id=… -f supabase/hotfix/verify_checkout_cases.sql`
    Termina en ROLLBACK. Las líneas 4a, 6, 7 y 8 deben salir RECHAZADO.
17. Rollback de staging si algo falla. Primero la guardia:
    `case "$STAGING_DB_URL" in *naoqsypqqgjhdudenevx*) echo "ALTO: PROD";; esac`
18. `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/hotfix/2026-10-21_create_order_with_items_ROLLBACK.sql`

Nota: si en staging la función es distinta del snapshot, compara `/tmp/staging_coi_before.sql` antes de usar el ROLLBACK. El ROLLBACK restaura el cuerpo de **prod**.

## 4. Plan PROD (NO ejecutado; cada paso necesita aprobación explícita del dueño)

| # | Paso | Rollback |
|---|---|---|
| 0 | Staging (sección 3) aprobado. Correr las consultas de los pasos 6 y 7 contra prod en **solo lectura**. Si hay productos con todas las variantes > 0, el dueño decide la opción (c). | — |
| 1 | Respaldo: `pg_get_functiondef(...)` de prod a un archivo. Confirmar que coincide con `*_ROLLBACK.sql`. | — |
| 2 | Aplicar `2026-10-21_create_order_with_items.sql` en prod. Cambia el comportamiento del frontend actual: extras y variantes empiezan a funcionar ya. | `*_ROLLBACK.sql` |
| 3 | Build: `git checkout hotfix/checkout-legacy && npm ci && npm run build` con las variables VITE de **PROD** (`VITE_SUPABASE_URL=https://naoqsypqqgjhdudenevx.supabase.co` y la anon key de prod). | — |
| 4 | **Solo con aprobación explícita del dueño:** `wrangler pages deploy dist --project-name ohana-bowls --branch main` | En Cloudflare Pages, "Rollback" al deployment anterior (98bd908), o redeploy de un `dist` de 98bd908 |
| 5 | (c) si aplica: `update product_variants set is_active=false where id in (…)` | `update … set is_active=true where id in (…)` con los ids guardados |

Orden: primero 2 y después 4. El frontend nuevo con el RPC viejo deja pasar bowls sin complemento de $500, pero los extras seguirían fallando.

### Checklist post-deploy
- [ ] El bundle servido en ohanabowls.com y en pages.dev es el nuevo (comparar el hash del `index-*.js`).
- [ ] Un pedido real pequeño de cada tipo (simple, extras, variantes, bowl con extras, promo) aparece en `/pedidos` con el total correcto.
- [ ] El mensaje de WhatsApp sale bien.
- [ ] La manipulación de precio desde DevTools se rechaza.
- [ ] Una hora mirando los logs de Postgres en Supabase por `RAISE` del RPC.
- [ ] Cuando llegue el cutover, el REVOKE EXECUTE sobre todos los overloads sigue aplicando, porque la firma es la misma.
