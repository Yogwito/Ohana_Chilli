import type { Product } from '@/types';

const REMOTE_IMAGE_URL_RE = /^https?:\/\//i;
const ROOT_RELATIVE_IMAGE_URL_RE = /^\//;
const DATA_IMAGE_URL_RE = /^data:image\//i;
const BARE_FILENAME_RE = /^[^/]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

// Product-specific overrides live here until catalog images are fully managed in admin.
const KNOWN_BAD_PRODUCT_IMAGE_IDS = new Set<string>([
  'chilli-burger-veggie',
  'be1fa199-5029-433f-7ccf-8fce38116665', // TERIYAKI Bowl stock-photo placeholder
  '1232c37b-9b66-78d2-43af-285c23ddcd7b', // Salchipapa stock-photo placeholder
  '446beb63-71b7-7242-3797-db75472451d9', // Hamburguesa VEGGIE stock-photo placeholder
  'edfc2bdb-d986-d364-5080-a7868f942bf4', // Hamburguesa VEGGIE stock-photo placeholder
  '2422e354-e353-b8ca-626d-a97d577ca8cc', // Hot Dog Americano stock-photo placeholder
]);

// ID-based overrides: local images take priority over any Supabase image_url.
// Used for products whose catalog image_url points to a generic/incorrect stock photo.
const PRODUCT_IMAGE_OVERRIDES: Record<string, string> = {
  '23e44c1b-fe27-251a-0759-74f798d65e53': '/images/adicionales/03_guacamole.webp',     // Guacamole
  '3d9f5e71-d95c-7b13-5898-33a0c9e8e04e': '/images/adicionales/04_papas_francesa.webp', // Papa Francesa
  '978c1802-ff11-1e54-8ea9-7995664d91a9': '/images/adicionales/05_pepinillos.webp',      // Pepinillos
  '178e8c3b-d5c8-8faf-271f-8b785a801e07': '/images/adicionales/01_queso.webp',           // Queso
  '12135ae7-32db-9903-7179-f48581e8b8cc': '/images/adicionales/02_queso_frito.webp',     // Queso Frito
  '7e9a2544-4712-8633-f844-0766c82a2a01': '/images/adicionales/06_tocineta.webp',        // Tocineta
};

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
  'guacamole': '/images/adicionales/03_guacamole.webp',
  'papa francesa': '/images/adicionales/04_papas_francesa.webp',
  'papas francesas': '/images/adicionales/04_papas_francesa.webp',
  'papas a la francesa': '/images/adicionales/04_papas_francesa.webp',
  'pepinillos': '/images/adicionales/05_pepinillos.webp',
  'queso': '/images/adicionales/01_queso.webp',
  'queso rallado': '/images/adicionales/01_queso.webp',
  'queso frito': '/images/adicionales/02_queso_frito.webp',
  'tocineta': '/images/adicionales/06_tocineta.webp',
};

export function getAdditionalIngredientImageUrl(name: string): string | undefined {
  const key = normalizeIngredientName(name);
  if (ADDITIONAL_INGREDIENT_IMAGE_MAP[key]) return ADDITIONAL_INGREDIENT_IMAGE_MAP[key];
  // Partial match: check if any key starts with the normalized name
  const partialKey = Object.keys(ADDITIONAL_INGREDIENT_IMAGE_MAP).find(k => k.startsWith(key) || key.startsWith(k));
  return partialKey ? ADDITIONAL_INGREDIENT_IMAGE_MAP[partialKey] : undefined;
}
