import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BowlSizeRule, Brand, Category, DeliveryZone, Ingredient, Product } from '@/types';

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

function mapProduct(row: ProductQueryRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: row.price_cents,
    brand: row.brand_id as Brand,
    categoryId: row.category_id,
    imageUrl: row.image_url ?? undefined,
    ingredients: row.ingredients_list ?? undefined,
    calories: row.calories ?? undefined,
    isVegan: row.is_vegan ?? false,
    isGlutenFree: row.is_gluten_free ?? false,
    isPopular: row.is_popular ?? false,
    isNew: row.is_new ?? false,
  };
}

function mapCategory(row: CategoryQueryRow): Category {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand_id as Brand,
    slug: row.slug ?? '',
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
      let query = supabase.from('categories').select('*').order('name');
      if (brandId) query = query.eq('brand_id', brandId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((category) => mapCategory(category as CategoryQueryRow));
    },
    staleTime: 1000 * 60 * 30,
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
    staleTime: 1000 * 60 * 10,
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
    staleTime: 1000 * 60 * 10,
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
    staleTime: 1000 * 60 * 10,
  });
}

export function useIngredients(type?: Ingredient['type']) {
  return useQuery({
    queryKey: ['ingredients', type],
    queryFn: async () => {
      let query = supabase.from('ingredients').select('*').eq('is_active', true).order('name');
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((ingredient) => mapIngredient(ingredient as IngredientQueryRow));
    },
    staleTime: 1000 * 60 * 30,
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
    staleTime: 1000 * 60 * 30,
  });
}

export function useWhatsAppNumber() {
  return useQuery({
    queryKey: ['settings', 'whatsapp_number'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'whatsapp_number')
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    staleTime: 1000 * 60 * 60,
  });
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
    staleTime: 1000 * 60 * 30,
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
    staleTime: 0,
    refetchInterval: 1000 * 30,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
