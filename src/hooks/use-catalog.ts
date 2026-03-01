import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveImage } from '@/lib/image-map';
import type { Product, Category, Ingredient, BowlSizeRule, Brand } from '@/types';

// ─── Brands ───────────────────────────────────────────
export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('*');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

// ─── Categories ───────────────────────────────────────
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

// ─── Products ─────────────────────────────────────────
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .like('category_id', 'beverages-%');
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Ingredients ──────────────────────────────────────
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

// ─── Bowl Rules ───────────────────────────────────────
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

// ─── Settings ─────────────────────────────────────────
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

// ─── Beverage Categories ──────────────────────────────
export function useBeverageCategories() {
  return useQuery({
    queryKey: ['categories', 'beverages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .like('id', 'beverages-%');
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

// ─── Helpers ──────────────────────────────────────────
function mapProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    price: p.price_cents,
    brand: p.brand_id as Brand,
    categoryId: p.category_id,
    image: resolveImage(p.image_url),
    ingredients: p.ingredients_list ?? undefined,
    calories: p.calories ?? undefined,
    isVegan: p.is_vegan ?? false,
    isGlutenFree: p.is_gluten_free ?? false,
    isPopular: p.is_popular ?? false,
    isNew: p.is_new ?? false,
  };
}
