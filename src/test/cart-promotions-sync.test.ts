import { describe, expect, it } from 'vitest';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import type { CartItem, CartState, Promotion } from '@/types';

const promotion: Promotion = {
  id: 'combo-1',
  title: 'Combo pareja',
  type: 'combo',
  discount_type: 'label',
  discount_value: 0,
  price_cents: 40000,
  is_active: true,
  sort_order: 0,
  created_at: '2026-10-01T00:00:00Z',
};

function comboItem(price = 40000): CartItem {
  return {
    id: 'item-combo',
    brand: 'ohana',
    type: 'product',
    product: { id: 'promo-combo-1', name: 'Combo pareja', description: '', price, brand: 'ohana', categoryId: 'promociones' },
    quantity: 2,
    unitPrice: price,
    totalPrice: price * 2,
  };
}

function stateWith(item: CartItem): CartState {
  return { items: [item], subtotal: item.totalPrice, total: item.totalPrice };
}

const emptyCatalog = { bowlRules: [], ingredients: [], products: [] };

describe('combos en la reconciliación del carrito', () => {
  it('conserva un combo vigente aunque no exista en products', () => {
    const state = stateWith(comboItem());
    const next = reconcileCartWithCatalog(state, { ...emptyCatalog, promotions: [promotion] });
    expect(next.items).toHaveLength(1);
    expect(next.total).toBe(80000);
  });

  it('actualiza el precio del combo desde promotions', () => {
    const next = reconcileCartWithCatalog(stateWith(comboItem(35000)), { ...emptyCatalog, promotions: [promotion] });
    expect(next.items[0].unitPrice).toBe(40000);
    expect(next.total).toBe(80000);
  });

  it('no toca los combos mientras las promociones no han cargado', () => {
    const state = stateWith(comboItem());
    expect(reconcileCartWithCatalog(state, emptyCatalog)).toBe(state);
  });

  it('quita el combo si la promoción ya no se puede pedir', () => {
    const cases: Promotion[] = [
      { ...promotion, is_active: false },
      { ...promotion, type: 'informative' },
      { ...promotion, price_cents: undefined },
      { ...promotion, ends_at: '2020-01-01T00:00:00Z' },
      { ...promotion, starts_at: '2999-01-01T00:00:00Z' },
    ];
    for (const promo of cases) {
      expect(reconcileCartWithCatalog(stateWith(comboItem()), { ...emptyCatalog, promotions: [promo] }).items).toHaveLength(0);
    }
    expect(reconcileCartWithCatalog(stateWith(comboItem()), { ...emptyCatalog, promotions: [] }).items).toHaveLength(0);
  });
});
