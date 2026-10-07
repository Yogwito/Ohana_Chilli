import type { Product } from '@/types';
import { MENU_IMAGE_OVERRIDES } from '@/domain/menuImages';

const REMOTE_IMAGE_URL_RE = /^https?:\/\//i;
const ROOT_RELATIVE_IMAGE_URL_RE = /^\//;
const DATA_IMAGE_URL_RE = /^data:image\//i;
const BARE_FILENAME_RE = /^[^/]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

// Product-specific overrides live here until catalog images are fully managed in admin.
const KNOWN_BAD_PRODUCT_IMAGE_IDS = new Set<string>([
  'chilli-burger-veggie',
]);

// ID-based overrides: local images take priority over any Supabase image_url.
// Used for products whose catalog image_url points to a generic/incorrect stock photo.
const PRODUCT_IMAGE_OVERRIDES = MENU_IMAGE_OVERRIDES;

type ProductImageSource = Pick<Product, 'id' | 'imageUrl'>;

export const PRODUCT_IMAGE_PLACEHOLDER_SRC = '/placeholder.svg';

export function resolveProductImageUrl(product: ProductImageSource): string | undefined {
  if (PRODUCT_IMAGE_OVERRIDES[product.id]) {
    return PRODUCT_IMAGE_OVERRIDES[product.id];
  }

  const rawImageUrl = product.imageUrl?.trim();

  if (!rawImageUrl || KNOWN_BAD_PRODUCT_IMAGE_IDS.has(product.id)) {
    return undefined;
  }

  if (BARE_FILENAME_RE.test(rawImageUrl)) {
    return undefined;
  }

  if (
    REMOTE_IMAGE_URL_RE.test(rawImageUrl)
    || ROOT_RELATIVE_IMAGE_URL_RE.test(rawImageUrl)
    || DATA_IMAGE_URL_RE.test(rawImageUrl)
  ) {
    return rawImageUrl;
  }

  return undefined;
}

export function getProductImageFallbackInitial(product: Pick<Product, 'name'>): string {
  return product.name.trim().charAt(0).toUpperCase() || '?';
}

function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const ADDITIONAL_INGREDIENT_IMAGE_MAP: Record<string, string> = {
  'guacamole': '/images/menu/adicionales-guacamole.webp',
  'papa francesa': '/images/menu/adicionales-papa-francesa.webp',
  'papas francesas': '/images/menu/adicionales-papa-francesa.webp',
  'papas a la francesa': '/images/menu/adicionales-papa-francesa.webp',
  'pepinillos': '/images/menu/adicionales-pepinillos.webp',
  'queso': '/images/menu/adicionales-queso.webp',
  'queso rallado': '/images/menu/ingredientes-queso-rallado.webp',
  'queso frito': '/images/menu/adicionales-queso-frito.webp',
  'tocineta': '/images/menu/adicionales-tocineta.webp',
};

export function getAdditionalIngredientImageUrl(name: string): string | undefined {
  const key = normalizeIngredientName(name);
  if (ADDITIONAL_INGREDIENT_IMAGE_MAP[key]) return ADDITIONAL_INGREDIENT_IMAGE_MAP[key];
  // Partial match: check if any key starts with the normalized name
  const partialKey = Object.keys(ADDITIONAL_INGREDIENT_IMAGE_MAP).find(k => k.startsWith(key) || key.startsWith(k));
  return partialKey ? ADDITIONAL_INGREDIENT_IMAGE_MAP[partialKey] : undefined;
}
