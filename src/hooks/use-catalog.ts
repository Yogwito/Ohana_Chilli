import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BUSINESS_SETTING_DEFINITIONS,
  EMPTY_BUSINESS_SETTINGS,
  mapBusinessSettings,
} from '@/domain/businessSettings';
import { resolveProductImageUrl } from '@/domain/productImages';
import type { BowlSizeRule, Brand, Category, DeliveryZone, Ingredient, Product, Promotion } from '@/types';

interface ProductQueryRow {
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

interface CategoryQueryRow {
  id: string;
  name: string;
  brand_id: string;
  slug: string | null;
  icon: string | null;
  sort_order: number | null;
}

interface IngredientQueryRow {
  id: string;
  name: string;
  type: string;
  price_cents: number;
  calories: number | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  is_active: boolean;
}

interface SettingQueryRow {
  key: string;
  value: string;
}

function mapProduct(row: ProductQueryRow): Product {
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

function mapCategory(row: CategoryQueryRow): Category {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand_id as Brand,
    slug: toCategorySlug(row),
    icon: row.icon ?? undefined,
  };
}

function mapIngredient(row: IngredientQueryRow): Ingredient {
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

function isBeverageCategory(category: Pick<CategoryQueryRow, 'slug' | 'name'>) {
  const slug = (category.slug ?? '').toLowerCase();
  const name = category.name.toLowerCase();
  return slug.includes('bebida') || slug.includes('cafe') || name.includes('bebida') || name.includes('cafe');
}

const liveCatalogQueryOptions = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
};

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('*').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useCategories(brandId?: Brand) {
  return useQuery({
    queryKey: ['categories', brandId],
    queryFn: async () => {
      let query = supabase.from('categories').select('*').order('sort_order').order('name');
      if (brandId) query = query.eq('brand_id', brandId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((category) => mapCategory(category as CategoryQueryRow));
    },
    ...liveCatalogQueryOptions,
  });
}

export function useProducts(opts?: { brandId?: Brand; categoryId?: string }) {
  return useQuery({
    queryKey: ['products', opts?.brandId, opts?.categoryId],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true).order('name');
      if (opts?.brandId) query = query.eq('brand_id', opts.brandId);
      if (opts?.categoryId) query = query.eq('category_id', opts.categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((product) => mapProduct(product as ProductQueryRow));
    },
    ...liveCatalogQueryOptions,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .or('is_popular.eq.true,is_new.eq.true')
        .limit(6);
      if (error) throw error;
      return (data ?? []).map((product) => mapProduct(product as ProductQueryRow));
    },
    ...liveCatalogQueryOptions,
  });
}

export function useBeverages() {
  return useQuery({
    queryKey: ['products', 'beverages'],
    queryFn: async () => {
      const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
      if (categoriesError) throw categoriesError;

      const beverageCategoryIds = (categories ?? [])
        .filter((category) => isBeverageCategory(category as CategoryQueryRow))
        .map((category) => category.id);

      if (beverageCategoryIds.length === 0) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('category_id', beverageCategoryIds)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((product) => mapProduct(product as ProductQueryRow));
    },
    ...liveCatalogQueryOptions,
  });
}

export function useIngredients(type?: Ingredient['type'], options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['ingredients', type],
    queryFn: async () => {
      let query = supabase.from('ingredients').select('*').eq('is_active', true).order('name');
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((ingredient) => mapIngredient(ingredient as IngredientQueryRow));
    },
    ...liveCatalogQueryOptions,
    enabled: options?.enabled,
  });
}

export function useBowlRules() {
  return useQuery({
    queryKey: ['bowl_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bowl_rules').select('*').order('price_cents');
      if (error) throw error;
      return (data ?? []).map(
        (rule): BowlSizeRule => ({
          size: rule.size as BowlSizeRule['size'],
          name: rule.name,
          price: rule.price_cents,
          maxBases: rule.bases,
          maxProteins: rule.proteins,
          maxAcompanantes: rule.accompaniments,
          maxSauces: rule.size === 'large' ? 3 : rule.size === 'medium' ? 2 : 1,
          maxComplementos: rule.size === 'large' ? 3 : rule.size === 'medium' ? 2 : 1,
        }),
      );
    },
    ...liveCatalogQueryOptions,
  });
}

export function useWhatsAppNumber() {
  return useSettingValue('whatsapp_number');
}

export function useBusinessHours() {
  return useSettingValue('business_hours');
}

export function useAddress() {
  return useSettingValue('address');
}

export function useInstagramUrl() {
  return useSettingValue('instagram_url');
}

export function useFacebookUrl() {
  return useSettingValue('facebook_url');
}

export function useBeverageCategories() {
  return useQuery({
    queryKey: ['categories', 'beverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return (data ?? [])
        .filter((category) => isBeverageCategory(category as CategoryQueryRow))
        .map((category) => mapCategory(category as CategoryQueryRow));
    },
    ...liveCatalogQueryOptions,
  });
}

export function useActiveDeliveryZones() {
  return useQuery({
    queryKey: ['delivery_zones', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('id,name,fee_cents')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((zone): DeliveryZone => ({
        id: zone.id,
        name: zone.name,
        feeCents: zone.fee_cents,
      }));
    },
    ...liveCatalogQueryOptions,
    refetchInterval: 1000 * 30,
  });
}

export function useSettingValue(key: string) {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    ...liveCatalogQueryOptions,
  });
}

export function usePromotions() {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Promotion[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['settings', 'business'],
    queryFn: async () => {
      const keys = BUSINESS_SETTING_DEFINITIONS.map((setting) => setting.key);
      const { data, error } = await supabase
        .from('settings')
        .select('key,value')
        .in('key', keys)
        .order('key');
      if (error) throw error;
      return mapBusinessSettings((data as SettingQueryRow[] | null) ?? []);
    },
    placeholderData: EMPTY_BUSINESS_SETTINGS,
    ...liveCatalogQueryOptions,
  });
}

export function useTopProducts(limit = 4) {
  const { data: allProducts } = useProducts();

  return useQuery({
    queryKey: ['top-products', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('product_id')
        .limit(500);

      if (error || !data || data.length < 4) {
        return (allProducts ?? [])
          .filter(p => p.imageUrl)
          .slice(0, limit);
      }

      const counts: Record<string, number> = {};
      data.forEach(item => {
        if (!item.product_id) return;
        counts[item.product_id] = (counts[item.product_id] ?? 0) + 1;
      });

      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      const topProducts = topIds
        .map(id => (allProducts ?? []).find(p => p.id === id && p.imageUrl))
        .filter((p): p is Product => p !== undefined);

      if (topProducts.length < limit) {
        const fallback = (allProducts ?? [])
          .filter(p => p.imageUrl && !topIds.includes(p.id))
          .slice(0, limit - topProducts.length);
        return [...topProducts, ...fallback];
      }

      return topProducts;
    },
    enabled: !!allProducts,
    staleTime: 1000 * 60 * 15,
  });
}
