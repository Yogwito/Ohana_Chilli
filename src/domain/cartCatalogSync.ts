import { calculateBowlPrice } from '@/domain/bowlPricing';
import type { BowlSizeRule, CartItem, CartState, CustomBowl, Ingredient, Product } from '@/types';

export interface CatalogSnapshot {
  bowlRules: BowlSizeRule[];
  ingredients: Ingredient[];
  products: Product[];
}

function reconcileIngredientSelections(
  selections: Ingredient[],
  ingredientsById: Map<string, Ingredient>,
) {
  const nextSelections: Ingredient[] = [];

  for (const selection of selections) {
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
) {
  if (item.type === 'product') {
    const currentProduct = item.product?.id ? productsById.get(item.product.id) : null;
    if (!currentProduct) return null;

    const unitPrice = currentProduct.price;

    return {
      ...item,
      brand: currentProduct.brand,
      product: currentProduct,
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
    .map((item) => reconcileCartItem(item, productsById, bowlRulesBySize, ingredientsById))
    .filter((item): item is CartItem => Boolean(item));

  const nextState: CartState = {
    items: nextItems,
    subtotal: nextItems.reduce((sum, item) => sum + item.totalPrice, 0),
    total: nextItems.reduce((sum, item) => sum + item.totalPrice, 0),
  };

  return JSON.stringify(nextState) === JSON.stringify(state) ? state : nextState;
}
