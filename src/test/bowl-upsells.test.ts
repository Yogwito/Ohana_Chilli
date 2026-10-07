import { describe, expect, it } from 'vitest';
import { getBowlUpsells } from '@/domain/bowlUpsells';
import type { CustomBowl, Ingredient } from '@/types';

const protein: Ingredient = { id: 'pollo', name: 'Pollo', type: 'protein' };
const cheese: Ingredient = {
  id: 'queso',
  name: 'Queso frito',
  type: 'topping',
  price: 6000,
};
const tariff: Ingredient = {
  id: 'protein-proteina-adicional',
  name: 'Proteína adicional',
  type: 'protein',
  price: 7000,
};
const bowl: CustomBowl = {
  size: {
    size: 'small',
    name: 'Pequeño',
    price: 23900,
    maxBases: 1,
    maxProteins: 2,
    maxAcompanantes: 4,
    maxSauces: 1,
    maxComplementos: 1,
  },
  bases: [],
  proteins: [protein],
  acompanantes: [],
  sauces: [],
  complementos: [],
  extras: [],
};

describe('paid bowl recommendations', () => {
  it('uses the current generic tariff and recommends the concrete selected protein', () => {
    expect(getBowlUpsells(bowl, [protein, tariff, cheese])).toEqual([
      { ingredient: protein, source: 'generic', tariff, price: 7000 },
      { ingredient: cheese, source: 'catalog', price: 6000 },
    ]);
  });
  it('uses the existing upsell tariff when there is no generic protein option', () => {
    expect(getBowlUpsells(bowl, [protein])[0]).toMatchObject({
      source: 'upsell',
      price: 5000,
    });
  });
  it('does not recommend inactive selections, bases, free toppings or generic placeholders as foods', () => {
    const options: Ingredient[] = [
      tariff,
      { id: 'base', name: 'Papas', type: 'base', price: 6000 },
      { id: 'mani', name: 'Maní', type: 'topping' },
      cheese,
    ];
    expect(
      getBowlUpsells(bowl, options).map((item) => item.ingredient.id),
    ).toEqual(['queso']);
    expect(getBowlUpsells(bowl, [])).toEqual([]);
  });
  it('uses updated catalog prices rather than stored recipe prices', () => {
    const live = { ...protein, price: 8500 };
    expect(getBowlUpsells(bowl, [live, tariff])[0]).toMatchObject({
      ingredient: live,
      source: 'catalog',
      tariff: undefined,
      price: 8500,
    });
  });
  it('limits food recommendations to two and gives cheese priority without changing catalog order', () => {
    const options: Ingredient[] = [
      { id: 'croqueta', name: 'Croqueta', type: 'topping', price: 2000 },
      cheese,
      { id: 'salsa', name: 'Salsa', type: 'sauce', price: 1000 },
    ];
    const original = [...options];
    expect(
      getBowlUpsells({ ...bowl, proteins: [] }, options).map(
        (item) => item.ingredient.id,
      ),
    ).toEqual(['queso', 'salsa']);
    expect(options).toEqual(original);
  });
});
