import { resolveProductImageUrl } from '@/domain/productImages';
import type { BowlSizeRule, Brand, Category, Ingredient, Product, Promotion } from '@/types';

export interface ProductQueryRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  brand_id: string;
  category_id: string;
  image_url: string | null;
  ingredients_list: string[] | null;
  calories: number | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  is_popular: boolean | null;
  is_new: boolean | null;
  is_active: boolean;
}

export interface CategoryQueryRow {
  id: string;
  name: string;
  brand_id: string;
  slug: string | null;
  icon: string | null;
  sort_order: number | null;
}

export interface IngredientQueryRow {
  id: string;
  name: string;
  type: string;
  price_cents: number;
  calories: number | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  is_active: boolean;
}

export interface BowlRuleQueryRow {
  size: string;
  name: string;
  price_cents: number;
  bases: number;
  proteins: number;
  accompaniments: number;
}

export interface SettingQueryRow {
  key: string;
  value: string;
}

export interface PublicCatalog {
  products: Product[];
  categories: Category[];
  ingredients: Ingredient[];
  bowlRules: BowlSizeRule[];
  promotions: Promotion[];
  settings: SettingQueryRow[];
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toCategorySlug(row: Pick<CategoryQueryRow, 'id' | 'name' | 'slug'>) {
  if (row.slug?.trim()) return row.slug;

  const derivedSlug = row.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return derivedSlug || row.id;
}

export function mapProduct(row: ProductQueryRow): Product {
  const rawImageUrl = row.image_url ?? undefined;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: row.price_cents,
    brand: row.brand_id as Brand,
    categoryId: row.category_id,
    imageUrl: resolveProductImageUrl({ id: row.id, imageUrl: rawImageUrl }),
    ingredients: row.ingredients_list ?? undefined,
    calories: row.calories ?? undefined,
    isVegan: row.is_vegan ?? false,
    isGlutenFree: row.is_gluten_free ?? false,
    isPopular: row.is_popular ?? false,
    isNew: row.is_new ?? false,
  };
}

export function mapCategory(row: CategoryQueryRow): Category {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand_id as Brand,
    slug: toCategorySlug(row),
    icon: row.icon ?? undefined,
  };
}

export function mapIngredient(row: IngredientQueryRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Ingredient['type'],
    price: row.price_cents > 0 ? row.price_cents : undefined,
    calories: row.calories ?? undefined,
    isVegan: row.is_vegan ?? false,
    isGlutenFree: row.is_gluten_free ?? false,
  };
}

export function mapBowlRule(row: BowlRuleQueryRow): BowlSizeRule {
  return {
    size: row.size as BowlSizeRule['size'],
    name: row.name,
    price: row.price_cents,
    maxBases: row.bases,
    maxProteins: row.proteins,
    maxAcompanantes: row.accompaniments,
    maxSauces: row.size === 'large' ? 3 : row.size === 'medium' ? 2 : 1,
    maxComplementos: row.size === 'large' ? 3 : row.size === 'medium' ? 2 : 1,
  };
}

export function mapPublicCatalogResponse(value: unknown): PublicCatalog {
  const payload = toRecord(value);

  return {
    products: toArray<ProductQueryRow>(payload.products).map(mapProduct),
    categories: toArray<CategoryQueryRow>(payload.categories).map(mapCategory),
    ingredients: toArray<IngredientQueryRow>(payload.ingredients).map(mapIngredient),
    bowlRules: toArray<BowlRuleQueryRow>(payload.bowl_rules).map(mapBowlRule),
    promotions: toArray<Promotion>(payload.promotions),
    settings: toArray<SettingQueryRow>(payload.settings),
  };
}

export function isBeverageCategory(category: Pick<Category, 'slug' | 'name'>) {
  const slug = category.slug.toLowerCase();
  const name = category.name.toLowerCase();
  return slug.includes('bebida') || slug.includes('cafe') || name.includes('bebida') || name.includes('cafe');
}
