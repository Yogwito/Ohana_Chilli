import { describe, expect, it } from 'vitest';
import { calculateProductUnitPrice, getProductCustomizationKey, normalizeProductCustomization } from '@/domain/productCustomizations';
import { getBusinessOpenStatus } from '@/domain/businessHours';
import { mapPublicCatalogResponse } from '@/domain/publicCatalog';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import { applyQuantityReviewIssues, CART_QUANTITY_LIMIT_MESSAGE } from '@/domain/cartCatalogSync';
import { buildOrderItemsPayload } from '@/domain/orderPayload';
import type { CartState, Product } from '@/types';

describe('mini release', () => {
  it('keeps flavors distinct and includes their delta in the unit price', () => {
    const lychee = normalizeProductCustomization({ removedIngredients: [], extras: [], note: '', extraTotal: 0, variant: { id: 'lychee', name: 'Lychee', priceDelta: 1000 } });
    const mango = normalizeProductCustomization({ removedIngredients: [], extras: [], note: '', extraTotal: 0, variant: { id: 'mango', name: 'Mango', priceDelta: 0 } });
    expect(getProductCustomizationKey(lychee)).not.toBe(getProductCustomizationKey(mango));
    expect(calculateProductUnitPrice(8000, lychee)).toBe(9000);
  });

  it('reports the next opening in Bogota time', () => {
    const schedule = [null, { open: '11:00', close: '21:00' }, { open: '11:00', close: '21:00' }, null, null, null, null];
    expect(getBusinessOpenStatus(schedule, new Date('2026-10-20T14:00:00Z')).message).toBe('Estamos cerrados. Abrimos hoy a las 11:00');
    expect(getBusinessOpenStatus(schedule, new Date('2026-10-20T17:00:00Z')).isOpen).toBe(true);
    expect(getBusinessOpenStatus(schedule, new Date('2026-10-20T03:00:00Z')).message).toBe('Estamos cerrados. Abrimos mañana a las 11:00');
  });

  it('maps active flavors and keeps a saved flavorless cart line for repair', () => {
    const catalog = mapPublicCatalogResponse({
      products: [{ id: 'hatsu', name: 'Hatsu 400 ml', price_cents: 7000, brand_id: 'ohana', category_id: 'bebidas', is_active: true }],
      product_variants: [{ id: 'lychee', product_id: 'hatsu', name: 'Lychee', price_delta_cents: 1000 }],
    });
    expect(catalog.products[0].variants).toEqual([{ id: 'lychee', name: 'Lychee', priceDelta: 1000 }]);
    const product: Product = catalog.products[0];
    const state: CartState = { items: [{ id: 'saved', brand: 'ohana', type: 'product', product, quantity: 1, unitPrice: 7000, totalPrice: 7000 }], subtotal: 7000, total: 7000 };
    const repaired = reconcileCartWithCatalog(state, { products: [product], ingredients: [], bowlRules: [] });
    expect(repaired.items).toHaveLength(1);
    expect(repaired.items[0].reviewIssues).toEqual(['Selecciona un sabor antes de enviar el pedido.']);
  });

  it('sends selected flavor in the order name and customization payload', () => {
    const product: Product = { id: 'hatsu', name: 'Hatsu 400 ml', description: '', price: 7000, brand: 'ohana', categoryId: 'bebidas' };
    const items: CartState['items'] = [{ id: 'one', brand: 'ohana', type: 'product', product, quantity: 1, unitPrice: 8000, totalPrice: 8000,
      customizations: { removedIngredients: [], extras: [], note: '', extraTotal: 0, variant: { id: 'lychee', name: 'Lychee', priceDelta: 1000 } } }];
    expect(buildOrderItemsPayload(items)[0]).toMatchObject({ name: 'Hatsu 400 ml · Lychee', details: { customizations: { variant: { id: 'lychee', name: 'Lychee' } } } });
    expect(JSON.parse(JSON.stringify(buildOrderItemsPayload(items)[0])).details.customizations.variant).toEqual({ id: 'lychee', name: 'Lychee' });
  });

  it('blocks a saved cart with more than ten units across flavors until reduced', () => {
    const product: Product = { id: 'hatsu', name: 'Hatsu', description: '', price: 7000, brand: 'ohana', categoryId: 'bebidas' };
    const lines: CartState['items'] = [6, 5].map((quantity, index) => ({ id: String(index), brand: 'ohana', type: 'product', product, quantity, unitPrice: 7000, totalPrice: 7000 * quantity }));
    expect(applyQuantityReviewIssues(lines).every(line => line.reviewIssues?.includes(CART_QUANTITY_LIMIT_MESSAGE))).toBe(true);
    expect(applyQuantityReviewIssues([{ ...lines[0], quantity: 6 }, { ...lines[1], quantity: 4 }]).every(line => !line.reviewIssues?.length)).toBe(true);
  });
});
