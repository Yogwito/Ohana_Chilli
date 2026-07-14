import type { Product, ProductCustomization, ProductCustomizationExtra } from '@/types';
import { formatPrice } from './formatPrice';

type ProductCategoryMetadata = Product & {
  category_id?: string | null;
  categorySlug?: string | null;
  category_slug?: string | null;
  categoryName?: string | null;
  category_name?: string | null;
  category?: {
    slug?: string | null;
    name?: string | null;
  } | null;
};

const BEVERAGE_CATEGORY_TERMS = new Set([
  'agua',
  'aguas',
  'bebida',
  'bebidas',
  'cafe',
  'cafes',
  'gaseosa',
  'gaseosas',
  'jugo',
  'jugos',
  'limonada',
  'limonadas',
  'soda',
  'sodas',
  'te',
]);

const SIMPLE_ADDON_CATEGORY_TERMS = new Set([
  'adicional',
  'adicionales',
  'acompanante',
  'acompanantes',
  'extra',
  'extras',
]);

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function normalizeCategorySignal(value: string | null | undefined) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getCategoryTerms(value: string | null | undefined) {
  const normalized = normalizeCategorySignal(value);
  return normalized ? normalized.split('-').filter(Boolean) : [];
}

function hasAnyCategoryTerm(value: string | null | undefined, terms: Set<string>) {
  return getCategoryTerms(value).some((term) => terms.has(term));
}

export function isProductCustomizable(product: Product): boolean {
  const metadata = product as ProductCategoryMetadata;
  const categorySignals = [
    metadata.categorySlug,
    metadata.category_slug,
    metadata.category?.slug,
    metadata.categoryName,
    metadata.category_name,
    metadata.category?.name,
    metadata.categoryId,
    metadata.category_id,
  ];

  if (categorySignals.some((signal) => hasAnyCategoryTerm(signal, BEVERAGE_CATEGORY_TERMS))) {
    return false;
  }

  if (categorySignals.some((signal) => hasAnyCategoryTerm(signal, SIMPLE_ADDON_CATEGORY_TERMS))) {
    return false;
  }

  return true;
}

function normalizeExtra(extra: ProductCustomizationExtra) {
  const legacyPrice = (extra as ProductCustomizationExtra & { price_cents?: number }).price_cents;
  const price = Number.isFinite(extra.price) ? extra.price : Number(legacyPrice ?? 0);
  const name = normalizeText(extra.name);
  const id = normalizeText(extra.id) || name;

  if (!name) return null;

  return { id, name, price };
}

function normalizeVariant(variant?: ProductCustomization['variant'] | null) {
  if (!variant) return undefined;
  const id = normalizeText(variant.id);
  const name = normalizeText(variant.name);
  if (!id || !name) return undefined;
  const priceDelta = Number.isFinite(variant.priceDelta) ? Number(variant.priceDelta) : 0;
  return { id, name, priceDelta };
}

export function normalizeProductCustomization(
  customizations?: ProductCustomization | null,
): ProductCustomization | undefined {
  if (!customizations) return undefined;

  const removedSource = customizations.removedIngredients ?? [];
  const extrasSource = customizations.extras ?? [];
  const removedIngredients = Array.from(
    new Set(removedSource.map(normalizeText).filter(Boolean)),
  );
  const extras = extrasSource
    .map(normalizeExtra)
    .filter((extra): extra is ProductCustomizationExtra => Boolean(extra));
  const note = normalizeText(customizations.note);
  const variant = normalizeVariant(customizations.variant);
  const extraTotal = extras.reduce((sum, extra) => sum + extra.price, 0);

  if (removedIngredients.length === 0 && extras.length === 0 && !note && !variant) {
    return undefined;
  }

  return { removedIngredients, extras, note, extraTotal, variant };
}

export function getProductCustomizationKey(customizations?: ProductCustomization | null) {
  const normalized = normalizeProductCustomization(customizations);
  if (!normalized) return '';

  const sortedRemoved = [...normalized.removedIngredients].sort();
  const sortedExtras = [...normalized.extras].sort((a, b) => {
    const left = `${a.id}|${a.name}|${a.price}`;
    const right = `${b.id}|${b.name}|${b.price}`;
    return left.localeCompare(right);
  });

  return JSON.stringify({
    removedIngredients: sortedRemoved,
    extras: sortedExtras,
    note: normalized.note,
    variant: normalized.variant ? normalized.variant.id : null,
  });
}

export function calculateProductUnitPrice(
  basePrice: number,
  customizations?: ProductCustomization | null,
) {
  const normalized = normalizeProductCustomization(customizations);
  return basePrice + (normalized?.extraTotal ?? 0) + (normalized?.variant?.priceDelta ?? 0);
}

export function formatProductCustomizationLines(customizations?: ProductCustomization | null) {
  const normalized = normalizeProductCustomization(customizations);
  if (!normalized) return [];

  const lines: string[] = [];

  if (normalized.variant) {
    lines.push(`Sabor: ${normalized.variant.name}`);
  }

  if (normalized.removedIngredients.length > 0) {
    lines.push(`Sin: ${normalized.removedIngredients.join(', ')}`);
  }

  if (normalized.extras.length > 0) {
    // Repeated add-ons (double bacon…) collapse to "Tocineta x2 (+$9.000)"
    const grouped = new Map<string, { name: string; price: number; qty: number }>();
    for (const extra of normalized.extras) {
      const key = `${extra.id}|${extra.name}|${extra.price}`;
      const entry = grouped.get(key);
      if (entry) entry.qty += 1;
      else grouped.set(key, { name: extra.name, price: extra.price, qty: 1 });
    }
    const extras = Array.from(grouped.values())
      .map((e) =>
        e.qty > 1
          ? `${e.name} x${e.qty} (+${formatPrice(e.price * e.qty)})`
          : `${e.name} (+${formatPrice(e.price)})`,
      )
      .join(', ');
    lines.push(`Adicionales: ${extras}`);
  }

  if (normalized.note) {
    lines.push(`Nota: ${normalized.note}`);
  }

  return lines;
}
