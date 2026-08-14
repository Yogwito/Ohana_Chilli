import type { Product } from '@/types';

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
const PRODUCT_IMAGE_OVERRIDES: Record<string, string> = {
  '7460dcd8-cfe1-e147-4be0-2b66c4d1da62': '/images/menu/paisa-bowl.webp',
  '2eb0b812-0be0-9912-8e34-ac26513276cf': '/images/menu/pulled-pork-bowl.webp',
  'edfc2bdb-d986-d364-5080-a7868f942bf4': '/images/menu/veggie-bowl.webp',
  'c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a': '/images/menu/americana.webp',
  'abf6980b-d497-990b-fc8b-20803dbddb4f': '/images/menu/chilli-burger.webp',
  '10f70e4e-febc-7e30-5b18-82247596262b': '/images/menu/doble-chilli.webp',
  '446beb63-71b7-7242-3797-db75472451d9': '/images/menu/veggie-burger.webp',
  '9f0aade8-f57c-b4b5-fb79-20d18c28300a': '/images/menu/salchipapa-chilli.webp',
  '1232c37b-9b66-78d2-43af-285c23ddcd7b': '/images/menu/salchipapa.webp',
  'f2a45986-aaf1-99be-dec5-ef0266dc77fb': '/images/menu/pulled-pork-fries.webp',
  '2422e354-e353-b8ca-626d-a97d577ca8cc': '/images/menu/perro-americano.webp',
  '7b30fcd1-3614-a851-de5d-41f88318070f': '/images/menu/perro-americano.webp',
  '5aa7e78f-c8fa-7fea-ed5e-336b33c84f60': '/images/menu/mazorcada-costilla.webp',
  'fcf4f05b-26ba-08a5-cc65-eb993db78e95': '/images/menu/mazorcada-mixta.webp',
  'cc24c60a-0a37-c3cf-83fc-5457548e8e88': '/images/menu/nachos.webp',
  'a6a7b74e-8cc4-6f8e-32ce-889b317fe54d': '/images/menu/combo-bretana.webp',
  '4191c0dd-132f-f886-3492-6bcbe585de6f': '/images/menu/combo-cerveza.webp',
  '3ee32c8a-6094-00d9-463b-2f90a15d3abf': '/images/menu/combo-gaseosa.webp',
  '757dedc2-0103-e0b7-437d-d9c5a0a989f2': '/images/menu/combo-hatsu.webp',
  '7e822e94-6abd-9200-4f30-0ea75bce9ba2': '/images/menu/combo-soda-hatsu.webp',
  '0e5871af-a29c-9aa0-adb5-5062a63cf436': '/images/menu/bowl-grande.webp',
  '08e6d253-4d1c-2029-d9f0-d0de87df7986': '/images/menu/bowl-mediano.webp',
  '6464f48d-b65b-3285-a5b7-33ed3ddaa501': '/images/menu/bowl-pequeno.webp',
  '5af1e6c3-c1c0-0fad-e128-333ca3bd8400': '/images/menu/bowl-veggie-builder.webp',
  '4ee1bd89-86b1-8def-a5a5-796e8a89cb7f': '/images/menu/coca-cola.webp',
  'a224968d-1f25-bf83-321d-50f7c417a2a7': '/images/menu/coca-cola-zero.webp',
  '23e44c1b-fe27-251a-0759-74f798d65e53': '/images/adicionales/03_guacamole.png',     // Guacamole
  '3d9f5e71-d95c-7b13-5898-33a0c9e8e04e': '/images/adicionales/04_papas_francesa.png', // Papa Francesa
  '978c1802-ff11-1e54-8ea9-7995664d91a9': '/images/adicionales/05_pepinillos.png',      // Pepinillos
  '178e8c3b-d5c8-8faf-271f-8b785a801e07': '/images/adicionales/01_queso.png',           // Queso
  '12135ae7-32db-9903-7179-f48581e8b8cc': '/images/adicionales/02_queso_frito.png',     // Queso Frito
  '7e9a2544-4712-8633-f844-0766c82a2a01': '/images/adicionales/06_tocineta.png',        // Tocineta
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
  'guacamole': '/images/adicionales/03_guacamole.png',
  'papa francesa': '/images/adicionales/04_papas_francesa.png',
  'papas francesas': '/images/adicionales/04_papas_francesa.png',
  'papas a la francesa': '/images/adicionales/04_papas_francesa.png',
  'pepinillos': '/images/adicionales/05_pepinillos.png',
  'queso': '/images/adicionales/01_queso.png',
  'queso rallado': '/images/adicionales/01_queso.png',
  'queso frito': '/images/adicionales/02_queso_frito.png',
  'tocineta': '/images/adicionales/06_tocineta.png',
};

export function getAdditionalIngredientImageUrl(name: string): string | undefined {
  const key = normalizeIngredientName(name);
  if (ADDITIONAL_INGREDIENT_IMAGE_MAP[key]) return ADDITIONAL_INGREDIENT_IMAGE_MAP[key];
  // Partial match: check if any key starts with the normalized name
  const partialKey = Object.keys(ADDITIONAL_INGREDIENT_IMAGE_MAP).find(k => k.startsWith(key) || key.startsWith(k));
  return partialKey ? ADDITIONAL_INGREDIENT_IMAGE_MAP[partialKey] : undefined;
}

/**
 * Variantes responsive de las fotos locales del menú.
 *
 * Los originales de `/images/menu` son cuadrados de 1024–1200 px (128–172 KiB)
 * y se pintan en tarjetas de 108–132 px. Junto a cada original existen ahora
 * `<nombre>-400.webp` y `<nombre>-800.webp`; esto devuelve el `srcSet` para que
 * el navegador elija. Para cualquier otra URL (remota, adicionales, data:)
 * devuelve `undefined` y el `<img>` se queda con su `src` de siempre.
 */
export function getProductImageSrcSet(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = /^\/images\/menu\/([^/]+)\.webp$/.exec(url);
  if (!match) return undefined;
  const base = `/images/menu/${match[1]}`;
  return `${base}-400.webp 400w, ${base}-800.webp 800w, ${url} 1024w`;
}
