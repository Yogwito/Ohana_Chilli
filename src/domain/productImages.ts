import type { Product } from '@/types';

const REMOTE_IMAGE_URL_RE = /^https?:\/\//i;
const ROOT_RELATIVE_IMAGE_URL_RE = /^\//;
const DATA_IMAGE_URL_RE = /^data:image\//i;
const BARE_FILENAME_RE = /^[^/]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

// Product-specific overrides live here until catalog images are fully managed in admin.
const KNOWN_BAD_PRODUCT_IMAGE_IDS = new Set<string>([
  'chilli-burger-veggie',
]);

type ProductImageSource = Pick<Product, 'id' | 'imageUrl'>;

export const PRODUCT_IMAGE_PLACEHOLDER_SRC = '/placeholder.svg';

export function resolveProductImageUrl(product: ProductImageSource): string | undefined {
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
