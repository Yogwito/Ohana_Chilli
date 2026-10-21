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

  it('keeps synthetic "extra-*" ingredient selections instead of dropping the bowl', () => {
    const state: CartState = {
      items: [
        {
          id: 'item-bowl-with-extra',
          brand: 'ohana',
          type: 'custom-bowl',
          customBowl: {
            size: {
              size: 'large',
              name: 'Grande',
              price: 29900,
              maxBases: 1,
              maxProteins: 1,
              maxAcompanantes: 6,
              maxSauces: 3,
              maxComplementos: 3,
            },
            bases: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
            proteins: [
              { id: 'protein-1', name: 'Pollo', type: 'protein' },
              {
                id: 'extra-1720000000000-abc123',
                name: 'Proteína extra: Carne (+$5.000)',
                type: 'protein',
                price: 5000,
              },
            ],
            acompanantes: [],
            sauces: [],
            complementos: [],
          },
          quantity: 1,
          unitPrice: 34900,
          totalPrice: 34900,
        },
      ],
      subtotal: 34900,
      total: 34900,
    };

    const nextState = reconcileCartWithCatalog(state, {
      products: [],
      bowlRules: [
        {
          size: 'large',
          name: 'Grande',
          price: 29900,
          maxBases: 1,
          maxProteins: 1,
          maxAcompanantes: 6,
          maxSauces: 3,
          maxComplementos: 3,
        },
      ],
      // Catalog refetch — the synthetic extra id is intentionally absent here,
      // same as it always is in the real catalog.
      ingredients: [
        { id: 'base-arroz', name: 'Arroz', type: 'base' },
        { id: 'protein-1', name: 'Pollo', type: 'protein' },
        { id: 'protein-adicional', name: 'Proteína adicional', type: 'protein', price: 5000 },
      ],
    });

    expect(nextState.items).toHaveLength(1);
    const bowl = nextState.items[0].customBowl!;
    expect(bowl.proteins).toHaveLength(2);
    expect(bowl.proteins[1].id).toBe('extra-1720000000000-abc123');
    // Carrito legacy sin sourceId: se infiere el ingrediente premium que cobra lo mismo.
    expect(bowl.proteins[1].sourceId).toBe('protein-adicional');
    expect(bowl.proteins[1].extraKind).toBe('protein');
    expect(nextState.items[0].unitPrice).toBe(34900);
  });

  it('repairs legacy overflow extras and drops bowls whose legacy extra has no matching charge', () => {
    const size = {
      size: 'small' as const, name: 'Pequeño', price: 23900,
      maxBases: 1, maxProteins: 1, maxAcompanantes: 4, maxSauces: 1, maxComplementos: 1,
    };
    const bowlWith = (extraPrice: number): CartState['items'][number] => ({
      id: `bowl-${extraPrice}`,
      brand: 'ohana',
      type: 'custom-bowl',
      customBowl: {
        size,
        bases: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
        proteins: [{ id: 'protein-1', name: 'Pollo', type: 'protein' }],
        acompanantes: [],
        sauces: [{ id: 'extra-sauce-1', name: 'Salsa extra: Ajo', type: 'sauce', price: extraPrice }],
        complementos: [],
      },
      quantity: 1,
      unitPrice: 23900 + extraPrice,
      totalPrice: 23900 + extraPrice,
    });

    const nextState = reconcileCartWithCatalog(
      { items: [bowlWith(2000), bowlWith(1234)], subtotal: 0, total: 0 },
      {
        products: [],
        bowlRules: [size],
        ingredients: [
          { id: 'base-arroz', name: 'Arroz', type: 'base' },
          { id: 'protein-1', name: 'Pollo', type: 'protein' },
          { id: 'sauce-ajo', name: 'Salsa de Ajo', type: 'sauce' },
        ],
      },
    );

    expect(nextState.items.map((item) => item.id)).toEqual(['bowl-2000']);
    expect(nextState.items[0].customBowl!.sauces![0]).toMatchObject({ sourceId: 'sauce-ajo', extraKind: 'sauce' });
  });
});
