import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Category, Ingredient, BowlSizeRule, Brand, DeliveryZone } from '@/types';

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
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('*');
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
      let query = supabase.from('categories').select('*');
      if (brandId) query = query.eq('brand_id', brandId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((c): Category => ({
        id: c.id,
        name: c.name,
        brand: c.brand_id as Brand,
        slug: c.slug ?? '',
        icon: c.icon ?? undefined,
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useProducts(opts?: { brandId?: Brand; categoryId?: string }) {
  return useQuery({
    queryKey: ['products', opts?.brandId, opts?.categoryId],
    queryFn: async () => {
      let query = supabase.from('products').select('*');
      if (opts?.brandId) query = query.eq('brand_id', opts.brandId);
      if (opts?.categoryId) query = query.eq('category_id', opts.categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapProduct);
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
        .or('is_popular.eq.true,is_new.eq.true')
        .limit(6);
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useBeverages() {
  return useQuery({
    queryKey: ['products', 'beverages'],
    queryFn: async () => {
      const { data: beverageCategories, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .or('slug.eq.sodas,slug.eq.juices,slug.eq.water,slug.like.bebidas%,slug.like.cafe%');
      if (categoriesError) throw categoriesError;

      const categoryIds = (beverageCategories ?? []).map((c) => c.id);
      if (categoryIds.length === 0) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('category_id', categoryIds);
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useIngredients(type?: Ingredient['type']) {
  return useQuery({
    queryKey: ['ingredients', type],
    queryFn: async () => {
      let query = supabase.from('ingredients').select('*');
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((i): Ingredient => ({
        id: i.id,
        name: i.name,
        type: i.type as Ingredient['type'],
        price: i.price_cents > 0 ? i.price_cents : undefined,
        calories: i.calories ?? undefined,
        isVegan: i.is_vegan ?? false,
        isGlutenFree: i.is_gluten_free ?? false,
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useBowlRules() {
  return useQuery({
    queryKey: ['bowl_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bowl_rules').select('*');
      if (error) throw error;
      return (data ?? []).map((r): BowlSizeRule => ({
        size: r.size as BowlSizeRule['size'],
        name: r.name,
        price: r.price_cents,
        maxBases: r.bases,
        maxProteins: r.proteins,
        maxAcompanantes: r.accompaniments,
      }));
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
        .single();
      if (error) throw error;
      return data.value;
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useBeverageCategories() {
  return useQuery({
    queryKey: ['categories', 'beverages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or('slug.eq.sodas,slug.eq.juices,slug.eq.water,slug.like.bebidas%,slug.like.cafe%');
      if (error) throw error;
      return (data ?? []).map((c): Category => ({
        id: c.id,
        name: c.name,
        brand: c.brand_id as Brand,
        slug: c.slug ?? '',
        icon: c.icon ?? undefined,
      }));
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
    staleTime: 1000 * 60 * 10,
  });
}

function mapProduct(p: ProductQueryRow): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    price: p.price_cents,
    brand: p.brand_id as Brand,
    categoryId: p.category_id,
    
    ingredients: p.ingredients_list ?? undefined,
    calories: p.calories ?? undefined,
    isVegan: p.is_vegan ?? false,
    isGlutenFree: p.is_gluten_free ?? false,
    isPopular: p.is_popular ?? false,
    isNew: p.is_new ?? false,
  };
}
