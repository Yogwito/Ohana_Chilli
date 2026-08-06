import { describe, expect, it } from 'vitest';
import { CART_VERSION, parsePersistedCart } from '@/domain/cartPersistence';

const validProduct = {
  id: 'product-1',
  name: 'Bowl',
  description: 'Fresco',
  price: 25000,
  brand: 'ohana',
  categoryId: 'bowls',
};

describe('cart persistence validation', () => {
  it('restores a valid cart:v3 product item', () => {
    const cart = parsePersistedCart({
      version: CART_VERSION,
      items: [{
        id: 'item-1',
        brand: 'ohana',
        type: 'product',
        product: validProduct,
        quantity: 1,
        unitPrice: 25000,
        totalPrice: 25000,
      }],
      subtotal: 25000,
      total: 25000,
    });

    expect(cart?.items).toHaveLength(1);
    expect(cart?.total).toBe(25000);
  });

  it('rejects stale versions and malformed nested data', () => {
    expect(parsePersistedCart({ version: 'cart:v2', items: [], subtotal: 0, total: 0 })).toBeNull();
    expect(parsePersistedCart({
      version: CART_VERSION,
      items: [{
        id: 'item-1',
        brand: 'ohana',
        type: 'product',
        product: { ...validProduct, price: '25000' },
        quantity: 1,
        unitPrice: 25000,
        totalPrice: 25000,
      }],
      subtotal: 25000,
      total: 25000,
    })).toBeNull();
  });
});
