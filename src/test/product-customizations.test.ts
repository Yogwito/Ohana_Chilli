import { describe, expect, it } from 'vitest';
import { isProductCustomizable } from '@/domain/productCustomizations';
import type { Product } from '@/types';

function product(overrides: Partial<Product> & Record<string, unknown>): Product {
  return {
    id: 'product-1',
    name: 'Producto',
    description: '',
    price: 10000,
    brand: 'ohana',
    categoryId: 'unknown-category',
    ...overrides,
  } as Product;
}

describe('isProductCustomizable', () => {
  it('opens customization for hamburguesas', () => {
    expect(isProductCustomizable(product({ categoryName: 'Hamburguesas' }))).toBe(true);
  });

  it('adds bebidas directly', () => {
    expect(isProductCustomizable(product({ categorySlug: 'ohana-bebidas' }))).toBe(false);
  });

  it('adds simple adicionales directly', () => {
    expect(isProductCustomizable(product({ category_name: 'Adicionales' }))).toBe(false);
  });

  it('opens customization for unknown categories', () => {
    expect(isProductCustomizable(product({ categoryId: '8f5f3f1a-unknown' }))).toBe(true);
  });
});
