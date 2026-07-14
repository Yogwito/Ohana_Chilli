# Auditoría del flujo de pedidos — FASE 1 (2026-07-15)

Auditoría de código (3 pases exhaustivos) + inspección directa de la base de
datos de producción (`naoqsypqqgjhdudenevx`). Las migraciones del repo estaban
**desincronizadas de producción** en varios puntos; este documento refleja el
estado VIVO verificado por SQL.

## Causas raíz encontradas

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| 1 | **CRÍTICO** | La RPC viva `create_order_with_items` es SECURITY DEFINER e inserta `unit_price_cents`, `total_cents` y `delivery_fee_cents` **tal cual los manda el cliente**, sin ningún lookup contra catálogo. Un cliente puede crear órdenes con total 0. | `pg_get_functiondef` en vivo |
| 2 | **CRÍTICO** | `orders` y `order_items` tienen política de **INSERT anónimo directo** (`with_check: true`) — se puede saltar la RPC por completo. | `pg_policies` en vivo |
| 3 | **ALTO** | `categories`, `ingredients`, `bowl_rules` y `delivery_zones` **no tienen políticas de escritura admin en vivo** (solo SELECT). El CRUD del panel admin sobre esas tablas está bloqueado por RLS; además los ingredientes inactivos son invisibles para el admin (irreactivables desde la UI). | `pg_policies` en vivo |
| 4 | **ALTO** | No existe modelo de variantes/sabores: cada bebida es un `product` plano. No hay selector de sabor; Hatsu Tea / Hatsu Soda se agregan sin sabor. | `use-catalog.ts`, datos vivos |
| 5 | **ALTO** | Dos fuentes de verdad de adicionales en conflicto: productos `chilli-adicionales` (oficiales: Tocineta 4500, Queso 3500, Queso frito 6000, Pepinillos 3500, Guacamole 3500, Papa francesa 9000) vs `product_default_ingredients.is_extra` con precios divergentes (Tocineta +3000, Queso +2000). El drawer usa los segundos. | SQL en vivo |
| 6 | **MEDIO** | Checkout no valida selecciones requeridas por item antes de enviar; no persiste `payment_method` (solo va en el texto de WhatsApp); no distingue "orden creada" de "WhatsApp abierto" a nivel de estado. | `CheckoutPage.tsx` |
| 7 | **MEDIO** | Bowls personalizados **nunca se mergean** en el carrito (siempre línea nueva); la reconciliación de catálogo elimina/reprecia items **en silencio** (sin toast); un solo ingrediente desactivado borra el bowl completo sin aviso. | `CartContext.tsx`, `cartCatalogSync.ts` |
| 8 | **MEDIO** | No hay edición de items desde el carrito (solo cantidad/eliminar). | `CartDrawer.tsx` |
| 9 | **MEDIO** | Combos (`chilli-combos`: Papas + Bretaña/Cerveza/Gaseosa/Hatsu/Soda, precios propios por SKU) no piden la bebida/sabor incluido. | datos vivos |
| 10 | **BAJO** | Bowl Builder: pasos obligatorios exigen exactamente el cupo (min=max) — no existe "continuar con menos" con confirmación. Los límites de salsas/complementos por tamaño están hardcodeados en TS (no en `bowl_rules`). | `BowlBuilder.tsx`, `use-catalog.ts:234` |
| 11 | **BAJO** | Migraciones del repo desactualizadas vs producción (columnas `is_extra`/`extra_price_cents`, políticas, RPC). `src/integrations/supabase/types.ts` no incluye `product_default_ingredients`. | comparación repo/vivo |
| 12 | **INFO** | Bebidas duplicadas en `products` (una fila activa + una inactiva por cada bebida). `example.test.ts` es placeholder. `whatsapp_sent` nunca se actualiza. | datos vivos |

Lo que ya estaba BIEN: la zona/tarifa de domicilio sí se re-valida server-side
en checkout; el carrito se limpia después del éxito de la RPC y WhatsApp no se
abre si falla; el merge de productos usa una clave normalizada y ordenada
(extras + removidos + nota); los precios pagos del Bowl Builder en la BD
coinciden 1:1 con los oficiales (Papas base 6000, Proteína adicional 5000,
Acompañante adicional 3000, Croqueta veggie 5000, Queso frito 6000); la
remoción de ingredientes ya es por-producto vía `product_default_ingredients`.

## Arquitectura implementada (FASE 2)

**DB (2 migraciones nuevas, no destructivas):**
- `product_variants` (genérica: sabores hoy, Hit/cerveza después desde admin
  sin tocar código), `addons` (catálogo compartido oficial),
  `addon_recommendations` (priorización contextual por categoría, no
  restrictiva). Seeds: 9 sabores Hatsu Tea, 4 Hatsu Soda, sabores heredados en
  combos Hatsu/Soda, gaseosas del combo Gaseosa; 6 adicionales oficiales.
  Cerveza y Hit quedan SIN variantes (pendientes de negocio, no inventados).
- Endurecimiento: RPC re-escrita que valida producto/variante/adicional/
  promoción-combo/bowl/ingredientes/zona contra catálogo vivo y aborta la
  transacción entera ante cualquier discrepancia; drop de INSERT anónimo
  directo en orders/order_items; políticas admin faltantes; columna
  `orders.payment_method`.

**Frontend:** selector obligatorio de sabor (drawer unificado), adicionales
compartidos con cantidad (recomendados primero), variante en la identidad del
carrito, merge de bowls idénticos por firma determinística, edición de items
desde el carrito, notificación de ajustes por reconciliación, continuar-con-
menos con confirmación explícita en el builder, checkout con validación
previa por item y `payment_method` persistido, mensaje de WhatsApp con sabor.

**Decisión de diseño — combos:** cada combo ya es un SKU con precio oficial
propio por bebida; la "selección de bebida incluida" se modela con el mismo
sistema genérico de variantes sobre el producto combo (Papas + Hatssu → 9
sabores de té; Papas + Soda Hatsu → 4; Papas + Gaseosa 250 → las dos gaseosas
activas existentes; Papas + Bretaña sin opciones; Papas + Cerveza sin
variantes hasta que negocio las defina). Sin tabla `combo_options` duplicada.

## Brechas conocidas que quedan (documentadas, no resueltas en este pase)
- Edición de bowls desde el carrito reabre configuración solo para productos/
  bebidas/combos; el Bowl Builder no se precarga (rehacer bowl sigue siendo
  eliminar + crear). Marcado como "cuando sea técnicamente seguro".
- Límites de salsas/complementos por tamaño siguen derivados en TS.
- Duplicados inactivos de bebidas en `products` (limpieza manual sugerida).
- `use-order-history` requiere política SELECT por teléfono para invitados
  (hoy inoperante); decisión de privacidad pendiente de negocio.
- Promociones: fuera de alcance por instrucción explícita.
