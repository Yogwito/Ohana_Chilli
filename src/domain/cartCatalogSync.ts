import { reconcileBowl, validateBowl } from '@/domain/bowlConfiguration';
import { calculateBowlPrice } from '@/domain/bowlPricing';
import {
  calculateProductUnitPrice,
  normalizeProductCustomization,
} from '@/domain/productCustomizations';
import type {
  BowlSizeRule,
  CartItem,
  CartState,
  CustomBowl,
  Ingredient,
  Product,
  Promotion,
} from '@/types';

export interface CatalogSnapshot {
  bowlRules: BowlSizeRule[];
  ingredients: Ingredient[];
  products: Product[];
  promotions?: Promotion[];
}

function reconcileCartItem(
  item: CartItem,
  productsById: Map<string, Product>,
  bowlRulesBySize: Map<string, BowlSizeRule>,
  ingredientsById: Map<string, Ingredient>,
): CartItem | null {
  if (item.type === 'product') {
    const currentProduct = item.product?.id
      ? productsById.get(item.product.id)
      : null;
    if (!currentProduct) return null;

    const customizations = normalizeProductCustomization(item.customizations);
    const unitPrice = calculateProductUnitPrice(
      currentProduct.price,
      customizations,
    );

    return {
      ...item,
      brand: currentProduct.brand,
      product: currentProduct,
      customizations,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    };
  }

  if (!item.customBowl)
    return {
      ...item,
      reviewIssues: [
        'La receta guardada está incompleta. Edita el bowl para reconstruirla.',
      ],
    };

  let currentBowl: CustomBowl;
  try {
    currentBowl = reconcileBowl(
      item.customBowl,
      [...bowlRulesBySize.values()],
      [...ingredientsById.values()],
    );
  } catch {
    return {
      ...item,
      reviewIssues: ['La configuración del bowl necesita revisión.'],
    };
  }
  const reviewIssues = validateBowl(
    currentBowl,
    [...bowlRulesBySize.values()],
    [...ingredientsById.values()],
  ).map((i) => i.message);

  const unitPrice = calculateBowlPrice(currentBowl);

  return {
    ...item,
    customBowl: currentBowl,
    reviewIssues,
    unitPrice,
    totalPrice: unitPrice * item.quantity,
  };
}

export function reconcileCartWithCatalog(
  state: CartState,
  snapshot: CatalogSnapshot,
): CartState {
  const productsById = new Map(
    snapshot.products.map((product) => [product.id, product]),
  );
  // Promotions are catalog entities in their own right, never fabricated product rows.
  for (const promo of snapshot.promotions || []) {
    const now = Date.now();
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short' }).format(new Date());
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(weekday);
    if (!promo.is_active || promo.type !== 'combo' || promo.price_cents == null || promo.price_cents <= 0
      || (promo.starts_at && new Date(promo.starts_at).getTime() > now)
      || (promo.ends_at && new Date(promo.ends_at).getTime() <= now)
      || (promo.days_of_week?.length && !promo.days_of_week.includes(day))) continue;
    productsById.set(`promo-${promo.id}`, { id:`promo-${promo.id}`,promotionId:promo.id,name:promo.title,description:promo.description || '',price:promo.price_cents,brand:'ohana',categoryId:'promociones',imageUrl:promo.image_url });
  }
  const bowlRulesBySize = new Map(
    snapshot.bowlRules.map((rule) => [rule.size, rule]),
  );
  const ingredientsById = new Map(
    snapshot.ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );

  const nextItems = state.items
    .map((item) =>
      reconcileCartItem(item, productsById, bowlRulesBySize, ingredientsById),
    )
    .filter((item): item is CartItem => Boolean(item));

  const nextState: CartState = {
    items: nextItems,
    subtotal: nextItems.reduce((sum, item) => sum + item.totalPrice, 0),
    total: nextItems.reduce((sum, item) => sum + item.totalPrice, 0),
  };

  return JSON.stringify(nextState) === JSON.stringify(state)
    ? state
    : nextState;
}
