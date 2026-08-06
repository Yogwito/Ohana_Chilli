import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_BUSINESS_SETTINGS,
  mapBusinessSettings,
  isBusinessOpenNow,
} from '@/domain/businessSettings';
import {
  isBeverageCategory,
  mapPublicCatalogResponse,
  type PublicCatalog,
} from '@/domain/publicCatalog';
import type { Brand, DeliveryZone, Ingredient, Promotion } from '@/types';

export const PUBLIC_CATALOG_QUERY_KEY = ['public-catalog'] as const;

const liveCatalogQueryOptions = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
};

async function fetchPublicCatalog(): Promise<PublicCatalog> {
  const { data, error } = await supabase.rpc('get_public_catalog');
  if (error) throw error;
  return mapPublicCatalogResponse(data);
}

function usePublicCatalog<T>(select: (catalog: PublicCatalog) => T, options?: { enabled?: boolean; staleTime?: number }) {
  return useQuery({
    queryKey: PUBLIC_CATALOG_QUERY_KEY,
    queryFn: fetchPublicCatalog,
    select,
    ...liveCatalogQueryOptions,
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? liveCatalogQueryOptions.staleTime,
  });
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
  return usePublicCatalog(
    (catalog) => brandId
      ? catalog.categories.filter((category) => category.brand === brandId)
      : catalog.categories,
  );
}

export function useProducts(opts?: { brandId?: Brand; categoryId?: string }) {
  return usePublicCatalog((catalog) => catalog.products.filter((product) => {
    if (opts?.brandId && product.brand !== opts.brandId) return false;
    if (opts?.categoryId && product.categoryId !== opts.categoryId) return false;
    return true;
  }));
}

export function useFeaturedProducts() {
  return usePublicCatalog((catalog) => catalog.products
    .filter((product) => product.isPopular || product.isNew)
    .slice(0, 6));
}

export function useBeverages() {
  return usePublicCatalog((catalog) => {
    const beverageCategoryIds = new Set(
      catalog.categories.filter(isBeverageCategory).map((category) => category.id),
    );
    return catalog.products.filter((product) => beverageCategoryIds.has(product.categoryId));
  });
}

export function useIngredients(type?: Ingredient['type'], options?: { enabled?: boolean }) {
  return usePublicCatalog(
    (catalog) => type
      ? catalog.ingredients.filter((ingredient) => ingredient.type === type)
      : catalog.ingredients,
    options,
  );
}

export function useBowlRules() {
  return usePublicCatalog((catalog) => catalog.bowlRules);
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
  return usePublicCatalog((catalog) => catalog.categories.filter(isBeverageCategory));
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
  return usePublicCatalog(
    (catalog) => catalog.settings.find((setting) => setting.key === key)?.value ?? null,
  );
}

function activePromotionsForToday(promotions: Promotion[]) {
  const today = new Date().getDay();
  return promotions.filter((promotion) => {
    if (!promotion.days_of_week || promotion.days_of_week.length === 0) return true;
    return promotion.days_of_week.includes(today);
  });
}

export function usePromotions() {
  return usePublicCatalog(
    (catalog) => activePromotionsForToday(catalog.promotions),
    { staleTime: 5 * 60 * 1000 },
  );
}

export function useBusinessSettings() {
  const query = usePublicCatalog((catalog) => mapBusinessSettings(catalog.settings));
  return { ...query, data: query.data ?? EMPTY_BUSINESS_SETTINGS };
}

export function useBannerSettings() {
  return usePublicCatalog((catalog) => {
    const settings = Object.fromEntries(catalog.settings.map((setting) => [setting.key, setting.value]));
    return {
      enabled: settings.banner_enabled === 'true',
      message: settings.banner_message ?? 'Estamos cerrados por ahora.',
      color: settings.banner_color ?? 'warning',
    };
  }, { staleTime: 1000 * 30 });
}

export function useProductDefaultIngredients(productId: string | null) {
  return useQuery({
    queryKey: ['product-default-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_default_ingredients')
        .select('*')
        .order('product_id')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 10,
    select: (rows) => productId ? rows.filter((row) => row.product_id === productId) : [],
  });
}

export function useBusinessOpenStatus() {
  const { data: settings } = useBusinessSettings();
  const { data: enforceRaw } = useSettingValue('business_hours_enforce');

  const isEnforced = enforceRaw === 'true';
  const isOpen = settings ? isBusinessOpenNow(settings) : null;

  return {
    isOpen,
    isEnforced,
    isClosed: isEnforced && isOpen === false,
    hoursConfigured: isOpen !== null,
  };
}
