import { describe, expect, it } from 'vitest';
import { isBeverageCategory, mapPublicCatalogResponse } from '@/domain/publicCatalog';

describe('public catalog mapping', () => {
  it('maps the aggregate RPC payload into the existing app types', () => {
    const catalog = mapPublicCatalogResponse({
      products: [{
        id: 'product-1',
        name: 'Bowl del día',
        description: null,
        price_cents: 25900,
        brand_id: 'ohana',
        category_id: 'bowls',
        image_url: null,
        ingredients_list: ['Arroz'],
        calories: null,
        is_vegan: null,
        is_gluten_free: true,
        is_popular: true,
        is_new: false,
        is_active: true,
      }],
      categories: [{
        id: 'bebidas',
        name: 'Bebidas Frías',
        brand_id: 'ohana',
        slug: null,
        icon: null,
        sort_order: 1,
      }],
      ingredients: [{
        id: 'arroz',
        name: 'Arroz',
        type: 'base',
        price_cents: 0,
        calories: 100,
        is_vegan: true,
        is_gluten_free: true,
        is_active: true,
      }],
      bowl_rules: [{
        size: 'medium',
        name: 'Mediano',
        price_cents: 25900,
        bases: 2,
        proteins: 1,
        accompaniments: 3,
      }],
      promotions: [],
      settings: [{ key: 'whatsapp_number', value: '573215667170' }],
    });

    expect(catalog.products[0]).toMatchObject({ price: 25900, description: '', isPopular: true });
    expect(catalog.categories[0].slug).toBe('bebidas-frias');
    expect(catalog.ingredients[0]).toMatchObject({ type: 'base', price: undefined });
    expect(catalog.bowlRules[0]).toMatchObject({ maxBases: 2, maxSauces: 2 });
    expect(catalog.settings).toEqual([{ key: 'whatsapp_number', value: '573215667170' }]);
    expect(isBeverageCategory(catalog.categories[0])).toBe(true);
  });

  it('uses empty arrays for missing RPC fields', () => {
    expect(mapPublicCatalogResponse(null)).toEqual({
      products: [],
      categories: [],
      ingredients: [],
      bowlRules: [],
      promotions: [],
      settings: [],
    });
  });
});
