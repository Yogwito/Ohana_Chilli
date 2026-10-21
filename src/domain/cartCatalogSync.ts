import { calculateBowlPrice, getIngredientExtraCharge } from '@/domain/bowlPricing';
import { calculateProductUnitPrice, normalizeProductCustomization } from '@/domain/productCustomizations';
import type { BowlSizeRule, CartItem, CartState, CustomBowl, Ingredient, Product, Promotion } from '@/types';

export interface CatalogSnapshot {
  bowlRules: BowlSizeRule[];
  ingredients: Ingredient[];
  products: Product[];
  /** Si no viene (promociones aún sin cargar), los combos del carrito se conservan tal cual. */
  promotions?: Promotion[];
}

const PROMO_PREFIX = 'promo-';

// Misma regla que create_order_with_items: combo activo, con precio y dentro de fechas.
function isOrderablePromotion(promotion: Promotion, now: number) {
  if (!promotion.is_active || promotion.type !== 'combo' || promotion.price_cents == null) return false;
  if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) return false;
  if (promotion.ends_at && new Date(promotion.ends_at).getTime() < now) return false;
  return true;
}

function reconcilePromotionItem(item: CartItem, promotions: Promotion[] | undefined) {
  if (!promotions) return item;
  const promotionId = item.product!.id.slice(PROMO_PREFIX.length);
  const promotion = promotions.find((candidate) => candidate.id === promotionId);
  if (!promotion || !isOrderablePromotion(promotion, Date.now())) return null;

  const unitPrice = promotion.price_cents!;
  return {
    ...item,
    product: { ...item.product!, name: promotion.title, price: unitPrice },
    unitPrice,
    totalPrice: unitPrice * item.quantity,
  };
}

// Recargo de un extra "desbordado" (ingrediente gratis pedido por encima del límite) en BowlBuilder.
const OVERFLOW_EXTRA_CHARGE: Partial<Record<Ingredient['type'], number>> = { acompanante: 2000, sauce: 2000, topping: 500 };

/**
 * Carritos guardados por el frontend legacy (misma clave cart:v3) traen extras sin sourceId/extraKind
 * y la RPC necesita el ingrediente de origen. Se infiere del catálogo por tipo + recargo; si no hay
 * uno que cobre exactamente lo mismo, el bowl se descarta como cualquier otro ítem desactualizado.
 */
function repairLegacyExtra(selection: Ingredient, ingredients: Ingredient[]): Ingredient | null {
  if (selection.sourceId) return selection;
  const sameType = ingredients.filter((ingredient) => ingredient.type === selection.type);
  const source = sameType.find((ingredient) => getIngredientExtraCharge(ingredient) === selection.price)
    ?? (OVERFLOW_EXTRA_CHARGE[selection.type] === selection.price
      ? sameType.find((ingredient) => getIngredientExtraCharge(ingredient) === 0)
      : undefined);
  if (!source || !['protein', 'acompanante', 'sauce', 'topping'].includes(source.type)) return null;
  return { ...selection, sourceId: source.id, extraKind: source.type as Ingredient['extraKind'] };
}

function reconcileIngredientSelections(
  selections: Ingredient[],
  ingredientsById: Map<string, Ingredient>,
) {
  const nextSelections: Ingredient[] = [];

  for (const selection of selections) {
    // "extra-*" ids are synthetic, user-picked premium add-ons created in
    // BowlBuilder (see makeExtra*Ingredient) — they never exist in the
    // catalog by design, so looking them up would wrongly invalidate the
    // whole bowl. They already carry their own price, so pass them through.
    if (selection.id.startsWith('extra-')) {
      const repaired = repairLegacyExtra(selection, Array.from(ingredientsById.values()));
      if (!repaired) return null;
      nextSelections.push(repaired);
      continue;
    }

    const currentIngredient = ingredientsById.get(selection.id);
    if (!currentIngredient) return null;
    nextSelections.push(currentIngredient);
  }

  return nextSelections;
}

function reconcileCustomBowl(
  bowl: CustomBowl,
  bowlRulesBySize: Map<string, BowlSizeRule>,
  ingredientsById: Map<string, Ingredient>,
) {
  const currentSize = bowlRulesBySize.get(bowl.size.size);
  if (!currentSize) return null;

  const bases = reconcileIngredientSelections(bowl.bases, ingredientsById);
  const proteins = reconcileIngredientSelections(bowl.proteins, ingredientsById);
  const acompanantes = reconcileIngredientSelections(bowl.acompanantes, ingredientsById);
  const sauces = reconcileIngredientSelections(bowl.sauces ?? [], ingredientsById);
  const complementos = reconcileIngredientSelections(bowl.complementos ?? [], ingredientsById);

  if (!bases || !proteins || !acompanantes || !sauces || !complementos) {
    return null;
  }

  return {
    ...bowl,
    size: currentSize,
    bases,
    proteins,
    acompanantes,
    sauces,
    complementos,
  };
}

function reconcileCartItem(
  item: CartItem,
  productsById: Map<string, Product>,
  bowlRulesBySize: Map<string, BowlSizeRule>,
  ingredientsById: Map<string, Ingredient>,
  promotions: Promotion[] | undefined,
) {
  if (item.type === 'product' && item.product?.id.startsWith(PROMO_PREFIX)) {
    // Los combos no existen en products: se validan contra promotions.
    return reconcilePromotionItem(item, promotions);
  }

  if (item.type === 'product') {
    const currentProduct = item.product?.id ? productsById.get(item.product.id) : null;
    if (!currentProduct) return null;

    const customizations = normalizeProductCustomization(item.customizations);
    const unitPrice = calculateProductUnitPrice(currentProduct.price, customizations);

    return {
      ...item,
      brand: currentProduct.brand,
      product: currentProduct,
      customizations,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    };
  }

  if (!item.customBowl) return null;

  const currentBowl = reconcileCustomBowl(item.customBowl, bowlRulesBySize, ingredientsById);
  if (!currentBowl) return null;

  const unitPrice = calculateBowlPrice(currentBowl);

  return {
    ...item,
    customBowl: currentBowl,
    unitPrice,
    totalPrice: unitPrice * item.quantity,
  };
}

export function reconcileCartWithCatalog(state: CartState, snapshot: CatalogSnapshot): CartState {
  const productsById = new Map(snapshot.products.map((product) => [product.id, product]));
  const bowlRulesBySize = new Map(snapshot.bowlRules.map((rule) => [rule.size, rule]));
  const ingredientsById = new Map(snapshot.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const nextItems = state.items
    .map((item) => reconcileCartItem(item, productsById, bowlRulesBySize, ingredientsById, snapshot.promotions))
    .filter((item): item is CartItem => Boolean(item));

  const nextState: CartState = {
    items: nextItems,
    subtotal: nextItems.reduce((sum, item) => sum + item.totalPrice, 0),
    total: nextItems.reduce((sum, item) => sum + item.totalPrice, 0),
  };

  return JSON.stringify(nextState) === JSON.stringify(state) ? state : nextState;
}
