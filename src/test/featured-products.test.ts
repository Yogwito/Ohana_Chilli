import { describe, expect, it } from 'vitest';
import { selectFeaturedProducts } from '@/domain/featuredProducts';
import type { Product } from '@/types';

const makeProduct = (id: string, categoryId = 'ohana-bowls-sugeridos', isPopular = false): Product => ({
  id, categoryId, isPopular, name: id, description: '', price: 10000, brand: 'ohana',
});
const paisa = makeProduct('7460dcd8-cfe1-e147-4be0-2b66c4d1da62');
const teriyaki = makeProduct('be1fa199-5029-433f-7ccf-8fce38116665');
const americana = makeProduct('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', 'chilli-burgers');

describe('featured dishes from the active catalog', () => {
  it('prioritizes popular dishes and fills with editorial choices without duplicates', () => {
    const popular = { ...paisa, isPopular: true, price: 27900 };
    const result = selectFeaturedProducts([americana, teriyaki, popular]);
    expect(result.map(product => product.id)).toEqual([paisa.id, teriyaki.id, americana.id]);
    expect(result[0]).toBe(popular);
  });
  it('excludes beverages, combos, extras and hidden builder entries even when popular', () => {
    const excluded = ['ohana-bebidas', 'chilli-combos', 'chilli-adicionales', 'ohana-arma-tu-bowl'];
    expect(selectFeaturedProducts([...excluded.map(id => makeProduct(id, id, true)), paisa])).toEqual([paisa]);
  });
  it('never restores a missing or inactive editorial choice absent from the active input', () => {
    expect(selectFeaturedProducts([teriyaki])).toEqual([teriyaki]);
    expect(selectFeaturedProducts([])).toEqual([]);
  });
  it('limits selection to three and accepts other qualifying dishes when defaults are unavailable', () => {
    const dishes = [1, 2, 3, 4].map(id => makeProduct(String(id), 'chilli-hot-dogs', true));
    expect(selectFeaturedProducts(dishes)).toEqual(dishes.slice(0, 3));
  });
});
