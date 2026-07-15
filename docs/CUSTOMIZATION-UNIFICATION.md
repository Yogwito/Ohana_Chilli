# Unificación del modelo de customización — Auditoría y migración (2026-07-15)

## FASE 1 — Formas encontradas antes del cambio

| Superficie | Forma | Problemas |
|---|---|---|
| Productos/bebidas/combos | `ProductCustomization` `{removedIngredients: string[], extras: {id,name,price}[] (COPIAS expandidas), note, extraTotal (derivado), variant?}` | cantidades implícitas por repetición; `extraTotal` duplicado/derivable; remociones sin id |
| Bowls | `CustomBowl` `{size: BowlSizeRule, bases/proteins/acompanantes/sauces/complementos: Ingredient[] (repetidos), notes}` + extras sintéticos `extra-*` con uid aleatorio | estructura paralela completa, sin relación con ProductCustomization |
| Identidad | DOS sistemas: `getProductCustomizationKey` y `getCustomBowlSignature` | duplicación exacta del riesgo que este trabajo elimina |
| Precio display | DOS rutas: `calculateProductUnitPrice` y `calculateBowlPrice` (con fallback por nombre en `getIngredientExtraCharge`) | duplicación; el fallback por nombre solo aplica a ingredientes precio-0 llamados "extra/adicional" (hoy: ninguno en BD) |
| Resumen | DOS formatters: `formatProductCustomizationLines` y `formatBowlSummary`/`formatBowlDetailLines` | carrito/WhatsApp podían divergir de checkout/admin |
| Payload de orden | productos → `details.customizations` legacy; bowls → arrays de NOMBRES + `details.validation {size, ingredient_ids, extras}` | el contrato de la RPC viva depende de esta forma exacta |
| Admin | **No renderiza items** (solo cabecera de la orden) | los detalles de customización eran invisibles para el operador |
| Repetir pedido | Reconstruye bowls desde los arrays de nombres contra catálogo vivo; ignora `customizations` | cualquier renombre de campo rompe silenciosamente |
| Casts | Sin `as any` en el scope; casts `as X[]` sin validación runtime en OrdersPage/AdminPage/use-order-history | riesgo bajo, documentado |

## FASE 2-3 — Modelo canónico implementado (`src/domain/customization.ts`)

`CanonicalCustomization` = `{variant, comboSelection (reservado: los combos hoy
son SKU-por-bebida y su sabor viaja en variant), addons[{id,name,quantity,unitPrice}],
removedIngredients[{id,name}], bowl{sizeId,sizeName,basePrice,selections{5 grupos
de CustomizationSelection con quantity}}, note}` — JSON puro, COP enteros,
defaults estables, sin `any`.

Utilidades: `normalizeCustomization` (ordena por id, fusiona duplicados sumando
cantidad, elimina qty≤0, extras sintéticos fusionan por `nombre|precio` en vez
del uid aleatorio) · `validateCustomization` · `calculateCustomizationTotal`
(única fórmula: base + Δvariante + Δcombo + Σaddons + Σextras de bowl) ·
`createCustomizationSignature` (única identidad para TODOS los tipos) ·
`formatCustomizationSummary` (único formatter para carrito/checkout/WhatsApp/
admin) · `serializeCustomizationForOrder` (emite el bloque canónico CON
cantidades + la proyección exacta que valida la RPC viva: `customizations.extras`
expandidos y `validation.ingredient_ids` repetidos — la RPC NO se tocó).

## FASE 5-7 — Estrategia de compatibilidad

- **Adapters aislados** `canonicalFromLegacyProduct` / `canonicalFromCustomBowl`
  elevan las formas del UI (que no cambian) al canónico en las fronteras.
  Ruta de retiro documentada en el propio archivo: cuando ProductDrawer y
  BowlBuilder emitan canónico directo, se borran los adapters y los campos
  legacy de CartItem (buscar usos de las dos funciones).
- **Carrito v4**: cada item persiste `customization` canónico junto a los
  campos legacy; el reducer lo deriva en un único punto. Migración v3→v4 al
  restaurar localStorage: deriva canónico, re-normaliza, nunca crashea con
  JSON corrupto (fallback a carrito vacío) y notifica si hubo ajustes. Los
  precios guardados NUNCA se confían: la reconciliación con catálogo vivo
  los recalcula (comportamiento ya existente que se preserva).
- **RecentOrders**: el serializer conserva los arrays legacy por nombre, así
  que "repetir pedido" sigue funcionando sin cambios.
- **Admin**: nueva vista de items por orden que entiende `details` canónicos
  Y legacy vía `customizationFromOrderDetails` (sin migrar filas históricas).

## Limitaciones conocidas
- `removedIngredients.id` = nombre cuando el origen legacy no traía id (la
  remoción no afecta precio ni validación server-side).
- `comboSelection` permanece null hasta que negocio pida combos configurables.
- Repetir pedido no re-materializa extras sintéticos de bowls (preexistente).
