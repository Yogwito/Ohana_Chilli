import { describe, expect, it } from 'vitest';
import { calculateBowlPrice } from '@/domain/bowlPricing';
import { buildBowlValidation, buildOrderItemsPayload } from '@/domain/orderPayload';
import type { CartItem, CustomBowl } from '@/types';

const size = { size: 'medium' as const, name: 'Mediano', price: 28000, maxBases: 1, maxProteins: 2, maxAcompanantes: 3, maxSauces: 2, maxComplementos: 2 };

const bowl: CustomBowl = {
  size,
  bases: [{ id: 'arroz', name: 'Arroz', type: 'base' }],
  proteins: [
    { id: 'pollo', name: 'Pollo', type: 'protein' },
    { id: 'salmon', name: 'Salmón', type: 'protein', price: 6000 },
    { id: 'extra-1-a', name: 'Proteína extra: Pollo (+$5.000)', type: 'protein', price: 5000 },
  ],
  acompanantes: [
    { id: 'aguacate-adicional', name: 'Aguacate adicional', type: 'acompanante' },
    { id: 'extra-acomp-1-b', name: 'Acompañante extra: Mango', type: 'acompanante', price: 2000 },
  ],
  sauces: [{ id: 'extra-sauce-1-c', name: 'Salsa extra: Teriyaki', type: 'sauce', price: 2000 }],
  complementos: [{ id: 'extra-comp-1-d', name: 'Complemento extra: Sésamo', type: 'topping', price: 500 }],
};

describe('buildBowlValidation', () => {
  it('declara size, ids de catálogo y recargos sintéticos', () => {
    expect(buildBowlValidation(bowl)).toEqual({
      size: 'medium',
      ingredient_ids: ['arroz', 'pollo', 'salmon', 'aguacate-adicional'],
      extras: [
        { name: 'Proteína extra: Pollo (+$5.000)', charge: 5000 },
        { name: 'Aguacate adicional', charge: 3000 },
        { name: 'Acompañante extra: Mango', charge: 2000 },
        { name: 'Salsa extra: Teriyaki', charge: 2000 },
        { name: 'Complemento extra: Sésamo', charge: 500 },
      ],
    });
  });

  it('suma exactamente lo mismo que calculateBowlPrice (regla de la RPC)', () => {
    const v = buildBowlValidation(bowl);
    const prices: Record<string, number> = { salmon: 6000 };
    const server = size.price
      + v.ingredient_ids.reduce((s, id) => s + (prices[id] ?? 0), 0)
      + v.extras.reduce((s, e) => s + e.charge, 0);
    expect(server).toBe(calculateBowlPrice(bowl));
  });
});

describe('buildOrderItemsPayload', () => {
  it('productos y promos envían product_id y extras con ids', () => {
    const items: CartItem[] = [
      {
        id: 'c1', brand: 'ohana', type: 'product', quantity: 2, unitPrice: 25000, totalPrice: 50000,
        product: { id: 'p-1', name: 'Wrap', description: '', price: 22000, brand: 'ohana', categoryId: 'x' },
        customizations: { removedIngredients: [], extras: [{ id: 'pdi-1', name: 'Queso', price: 3000 }], note: '', extraTotal: 3000 },
      },
      {
        id: 'c2', brand: 'ohana', type: 'product', quantity: 1, unitPrice: 40000, totalPrice: 40000,
        product: { id: 'promo-abc', name: 'Combo', description: '', price: 40000, brand: 'ohana', categoryId: 'promociones' },
      },
      { id: 'c3', brand: 'ohana', type: 'custom-bowl', quantity: 1, unitPrice: 0, totalPrice: 0, customBowl: bowl },
    ];
    const payload = buildOrderItemsPayload(items);
    expect(payload[0].details).toMatchObject({ product_id: 'p-1', customizations: { extras: [{ id: 'pdi-1', price: 3000 }] } });
    expect(payload[1].details).toMatchObject({ product_id: 'promo-abc', customizations: null });
    expect(payload[2].details).toHaveProperty('validation.size', 'medium');
    expect(payload[2].details).not.toHaveProperty('product_id');
  });
});
