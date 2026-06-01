import { describe, expect, it } from 'vitest';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import type { CartState } from '@/types';

describe('cart catalog sync', () => {
  it('refreshes product and bowl prices from the live catalog and removes unavailable products', () => {
    const state: CartState = {
      items: [
        {
          id: 'item-product',
          brand: 'ohana',
          type: 'product',
          product: {
            id: 'product-1',
            name: 'Bowl antiguo',
            description: 'Versión vieja',
            price: 23000,
            brand: 'ohana',
            categoryId: 'cat-1',
          },
          quantity: 2,
          customizations: {
            removedIngredients: ['Tomate'],
            extras: [{ id: 'tocineta', name: 'Tocineta', price: 5000 }],
            note: 'sin mucha salsa',
            extraTotal: 5000,
          },
          notes: 'sin mucha salsa',
          unitPrice: 28000,
          totalPrice: 56000,
        },
        {
          id: 'item-bowl',
          brand: 'ohana',
          type: 'custom-bowl',
          customBowl: {
            size: {
              size: 'small',
              name: 'Pequeño',
              price: 23900,
              maxBases: 1,
              maxProteins: 1,
              maxAcompanantes: 4,
              maxSauces: 1,
              maxComplementos: 1,
            },
            bases: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
            proteins: [{ id: 'protein-extra', name: 'Proteína adicional', type: 'protein' }],
            acompanantes: [{ id: 'acomp-maiz', name: 'Maíz', type: 'acompanante' }],
            sauces: [],
            complementos: [],
          },
          quantity: 1,
          unitPrice: 23900,
          totalPrice: 23900,
        },
        {
          id: 'item-missing',
          brand: 'ohana',
          type: 'product',
          product: {
            id: 'missing-product',
            name: 'Producto eliminado',
            description: '',
            price: 1000,
            brand: 'ohana',
            categoryId: 'cat-1',
          },
          quantity: 1,
          unitPrice: 1000,
          totalPrice: 1000,
        },
      ],
      subtotal: 80900,
      total: 80900,
    };

    const nextState = reconcileCartWithCatalog(state, {
      products: [
        {
          id: 'product-1',
          name: 'Bowl actualizado',
          description: 'Versión actual',
          price: 27000,
          brand: 'ohana',
          categoryId: 'cat-1',
        },
      ],
      bowlRules: [
        {
          size: 'small',
          name: 'Pequeño',
          price: 24900,
          maxBases: 1,
          maxProteins: 1,
          maxAcompanantes: 4,
          maxSauces: 1,
          maxComplementos: 1,
        },
      ],
      ingredients: [
        { id: 'base-arroz', name: 'Arroz', type: 'base' },
        { id: 'protein-extra', name: 'Proteína adicional', type: 'protein' },
        { id: 'acomp-maiz', name: 'Maíz', type: 'acompanante' },
      ],
    });

    expect(nextState.items).toHaveLength(2);
    expect(nextState.items[0].product?.name).toBe('Bowl actualizado');
    expect(nextState.items[0].customizations?.extras[0].name).toBe('Tocineta');
    expect(nextState.items[0].unitPrice).toBe(32000);
    expect(nextState.items[0].totalPrice).toBe(64000);
    expect(nextState.items[1].unitPrice).toBe(29900);
    expect(nextState.subtotal).toBe(93900);
    expect(nextState.total).toBe(93900);
  });
});
