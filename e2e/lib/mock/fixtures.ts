// Catálogo sintético para E2E_MOCK=1. Reproduce las formas de las tablas de prod/staging
// (mismas columnas que usa la app y la RPC create_order_with_items).
import type { Tables } from '../types';

const now = Date.now();
const iso = (deltaDays: number) => new Date(now + deltaDays * 86_400_000).toISOString();

export function mockTables(): Tables {
  return {
    brands: [{ id: 'ohana', name: 'Ohana' }],
    categories: [
      { id: 'ohana-wraps', name: 'Wraps', brand_id: 'ohana', slug: 'wraps', icon: null, sort_order: 1 },
      { id: 'ohana-ensaladas', name: 'Ensaladas', brand_id: 'ohana', slug: 'ensaladas', icon: null, sort_order: 2 },
      { id: 'ohana-bebidas', name: 'Bebidas', brand_id: 'ohana', slug: 'bebidas', icon: null, sort_order: 3 },
    ],
    products: [
      p('11111111-1111-4111-8111-111111111111', 'Ensalada Mediterránea E2E', 'ohana-ensaladas', 18000),
      p('22222222-2222-4222-8222-222222222222', 'Wrap Pollo E2E', 'ohana-wraps', 22000),
      p('33333333-3333-4333-8333-333333333333', 'Hatsu Té 400 ml', 'ohana-bebidas', 7000),
      p('44444444-4444-4444-8444-444444444444', 'Smoothie Premium E2E', 'ohana-bebidas', 12000),
    ],
    product_default_ingredients: [
      pdi('aaaaaaaa-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Queso extra', true, 3000, 1),
      pdi('aaaaaaaa-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Aguacate extra', true, 4000, 2),
      pdi('aaaaaaaa-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Lechuga', false, 0, 3, true),
    ],
    product_variants: [
      { id: 'bbbbbbbb-0000-4000-8000-000000000001', product_id: '33333333-3333-4333-8333-333333333333', name: 'Durazno', price_delta_cents: 0, is_active: true },
      { id: 'bbbbbbbb-0000-4000-8000-000000000002', product_id: '33333333-3333-4333-8333-333333333333', name: 'Frutos rojos', price_delta_cents: 0, is_active: true },
      { id: 'bbbbbbbb-0000-4000-8000-000000000003', product_id: '44444444-4444-4444-8444-444444444444', name: 'Fresa', price_delta_cents: 1000, is_active: true },
    ],
    ingredients: [
      ing('arroz', 'Arroz blanco', 'base'), ing('quinoa', 'Quinoa', 'base'),
      ing('pollo', 'Pollo', 'protein'), ing('res', 'Res', 'protein'), ing('salmon', 'Salmón', 'protein', 6000),
      ing('mango', 'Mango', 'acompanante'), ing('pepino', 'Pepino', 'acompanante'),
      ing('maiz', 'Maíz', 'acompanante'), ing('edamame', 'Edamame', 'acompanante'),
      ing('chipotle', 'Ohana Chipotle', 'sauce'), ing('teriyaki', 'Teriyaki Premium', 'sauce', 2000),
      ing('ajonjoli', 'Ajonjolí', 'topping'), ing('nueces', 'Nueces Premium', 'topping', 3000),
    ],
    bowl_rules: [
      { size: 'small', name: 'Pequeño', price_cents: 22000, bases: 1, proteins: 1, accompaniments: 3 },
      { size: 'medium', name: 'Mediano', price_cents: 28000, bases: 1, proteins: 2, accompaniments: 3 },
      { size: 'large', name: 'Grande', price_cents: 34000, bases: 2, proteins: 2, accompaniments: 4 },
    ],
    promotions: [
      {
        id: '55555555-5555-4555-8555-555555555555', title: 'Combo Pareja E2E', description: 'Dos bowls y dos bebidas',
        type: 'combo', discount_type: 'label', discount_value: 0, badge_text: 'Combo', image_url: null,
        price_cents: 40000, cta_text: null, cta_url: null, days_of_week: [], is_active: true,
        starts_at: iso(-1), ends_at: iso(30), sort_order: 1, created_at: iso(-10),
      },
    ],
    delivery_zones: [
      { id: 'zone-0001', name: 'Centro E2E', fee_cents: 5000, is_active: true },
      { id: 'zone-0002', name: 'Cable Plaza', fee_cents: 6000, is_active: true },
      { id: 'zone-0003', name: 'Zona Inactiva', fee_cents: 9000, is_active: false },
    ],
    settings: [
      { key: 'whatsapp_number', value: '573001112233' },
      { key: 'business_hours_enforce', value: 'false' },
      { key: 'address', value: 'Calle 1 # 2-3, Manizales' },
    ],
  };
}

function p(id: string, name: string, category_id: string, price_cents: number) {
  return {
    id, name, description: `${name} — producto de prueba`, price_cents, brand_id: 'ohana', category_id,
    image_url: null, ingredients_list: null, calories: null, is_vegan: false, is_gluten_free: false,
    is_popular: false, is_new: false, is_active: true,
  };
}
function pdi(id: string, product_id: string, ingredient_name: string, is_extra: boolean, extra_price_cents: number, sort_order: number, is_removable = false) {
  return { id, product_id, ingredient_name, is_extra, extra_price_cents, sort_order, is_removable, created_at: iso(-30) };
}
function ing(id: string, name: string, type: string, price_cents = 0) {
  return { id, name, type, price_cents, calories: null, is_vegan: false, is_gluten_free: false, is_active: true };
}
