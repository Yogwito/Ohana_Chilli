import type {
  BowlSizeRule,
  CartItem,
  CartState,
  CustomBowl,
  Ingredient,
  Product,
  ProductCustomization,
} from '@/types';

export const CART_VERSION = 'cart:v3';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isIngredient(value: unknown): value is Ingredient {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.type === 'string'
    && (value.price === undefined || isFiniteNumber(value.price));
}

function isBowlRule(value: unknown): value is BowlSizeRule {
  if (!isRecord(value)) return false;
  return ['small', 'medium', 'large'].includes(String(value.size))
    && typeof value.name === 'string'
    && isFiniteNumber(value.price)
    && isFiniteNumber(value.maxBases)
    && isFiniteNumber(value.maxProteins)
    && isFiniteNumber(value.maxAcompanantes)
    && isFiniteNumber(value.maxSauces)
    && isFiniteNumber(value.maxComplementos);
}

function isCustomBowl(value: unknown): value is CustomBowl {
  if (!isRecord(value) || !isBowlRule(value.size)) return false;
  const ingredientArrayKeys = ['bases', 'proteins', 'acompanantes'] as const;
  if (!ingredientArrayKeys.every((key) => Array.isArray(value[key]) && value[key].every(isIngredient))) return false;
  if (value.sauces !== undefined && (!Array.isArray(value.sauces) || !value.sauces.every(isIngredient))) return false;
  if (value.complementos !== undefined && (!Array.isArray(value.complementos) || !value.complementos.every(isIngredient))) return false;
  return isOptionalString(value.notes);
}

function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.description === 'string'
    && isFiniteNumber(value.price)
    && value.brand === 'ohana'
    && typeof value.categoryId === 'string'
    && (value.ingredients === undefined || isStringArray(value.ingredients));
}

function isProductCustomization(value: unknown): value is ProductCustomization {
  if (!isRecord(value)) return false;
  if (!isStringArray(value.removedIngredients) || typeof value.note !== 'string') return false;
  if (!isFiniteNumber(value.extraTotal) || !Array.isArray(value.extras)) return false;
  return value.extras.every((extra) => isRecord(extra)
    && typeof extra.id === 'string'
    && typeof extra.name === 'string'
    && isFiniteNumber(extra.price));
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.brand !== 'ohana') return false;
  if (value.type !== 'product' && value.type !== 'custom-bowl') return false;
  if (!Number.isInteger(value.quantity) || Number(value.quantity) <= 0) return false;
  if (!isFiniteNumber(value.unitPrice) || !isFiniteNumber(value.totalPrice)) return false;
  if (!isOptionalString(value.notes)) return false;
  if (value.customizations !== undefined && value.customizations !== null && !isProductCustomization(value.customizations)) return false;

  if (value.type === 'product') return isProduct(value.product);
  return isCustomBowl(value.customBowl);
}

export function parsePersistedCart(value: unknown): CartState | null {
  if (!isRecord(value)) return null;
  if (value.version !== undefined && value.version !== CART_VERSION) return null;
  if (!Array.isArray(value.items) || !value.items.every(isCartItem)) return null;
  if (!isFiniteNumber(value.subtotal) || !isFiniteNumber(value.total)) return null;

  return {
    items: value.items,
    subtotal: value.subtotal,
    total: value.total,
  };
}
