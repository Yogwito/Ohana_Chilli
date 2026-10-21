import { getIngredientExtraCharge } from '@/domain/bowlPricing';
import type { CartItem, CustomBowl, Ingredient } from '@/types';

/**
 * Construye el `p_items` que espera la RPC create_order_with_items en prod.
 * La RPC recalcula el precio en el servidor; aquí solo se declara QUÉ se pidió:
 *  - bowls: details.validation = { size, ingredient_ids, extras[{name, charge}] }
 *  - productos/promos: details.product_id (+ customizations.extras con ids de
 *    product_default_ingredients).
 */
/**
 * kind/source_id: el servidor (hotfix 2026-10-21b) calcula el recargo desde el
 * ingrediente `source_id`; `charge` solo lo usa la versión anterior de la RPC.
 * kind 'named' = recargo de un ingrediente incluido ya listado en ingredient_ids
 * (el servidor nuevo lo cobra desde ingredient_ids y lo ignora aquí).
 */
export interface BowlValidationExtra {
  kind: 'protein' | 'acompanante' | 'sauce' | 'topping' | 'named';
  source_id: string;
  name: string;
  charge: number;
}

export interface BowlValidationPayload {
  size: string;
  ingredient_ids: string[];
  extras: BowlValidationExtra[];
}

// Los extras sintéticos del BowlBuilder usan ids "extra-..." (no existen en el catálogo).
const SYNTHETIC_EXTRA_PREFIX = 'extra-';

export function buildBowlValidation(bowl: CustomBowl): BowlValidationPayload {
  const ingredientIds: string[] = [];
  const extras: BowlValidationExtra[] = [];
  const all: Ingredient[] = [
    ...bowl.bases,
    ...bowl.proteins,
    ...bowl.acompanantes,
    ...(bowl.sauces ?? []),
    ...(bowl.complementos ?? []),
  ];

  all.forEach((item) => {
    const charge = getIngredientExtraCharge(item);
    const catalogPrice = item.price ?? 0;

    if (item.id.startsWith(SYNTHETIC_EXTRA_PREFIX)) {
      if (charge > 0) {
        extras.push({
          kind: item.extraKind ?? item.type,
          source_id: item.sourceId ?? '',
          name: item.name,
          charge,
        });
      }
      return;
    }

    // La RPC suma ingredients.price_cents por cada id.
    ingredientIds.push(item.id);
    // Recargo por nombre ("adicional"/"extra") con precio de catálogo 0.
    if (charge > 0 && catalogPrice === 0) {
      extras.push({ kind: 'named', source_id: item.id, name: item.name, charge });
    }
  });

  return { size: bowl.size.size, ingredient_ids: ingredientIds, extras };
}

export function buildOrderItemsPayload(items: CartItem[]) {
  return items.map((item) => ({
    brand_id: item.brand,
    name: item.type === 'product' ? (item.product?.name ?? 'Producto') : 'Bowl Personalizado',
    quantity: item.quantity,
    unit_price_cents: item.unitPrice,
    details:
      item.type === 'custom-bowl' && item.customBowl
        ? {
            size: item.customBowl.size.name,
            bases: item.customBowl.bases.map((b) => b.name),
            proteins: item.customBowl.proteins.map((p) => p.name),
            acompanantes: item.customBowl.acompanantes.map((a) => a.name),
            sauces: item.customBowl.sauces?.map((s) => s.name),
            complementos: item.customBowl.complementos?.map((c) => c.name),
            notes: item.notes,
            validation: buildBowlValidation(item.customBowl),
          }
        : {
            product_id: item.product?.id,
            notes: item.notes,
            customizations: item.customizations ?? null,
          },
  }));
}
