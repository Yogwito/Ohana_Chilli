import type { ProductCustomization, ProductCustomizationExtra } from '@/types';
import { formatPrice } from './formatPrice';

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function normalizeExtra(extra: ProductCustomizationExtra) {
  const legacyPrice = (extra as ProductCustomizationExtra & { price_cents?: number }).price_cents;
  const price = Number.isFinite(extra.price) ? extra.price : Number(legacyPrice ?? 0);
  const name = normalizeText(extra.name);
  const id = normalizeText(extra.id) || name;

  if (!name) return null;

  return { id, name, price };
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
  const extraTotal = extras.reduce((sum, extra) => sum + extra.price, 0);

  if (removedIngredients.length === 0 && extras.length === 0 && !note) {
    return undefined;
  }

  return { removedIngredients, extras, note, extraTotal };
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
  });
}

export function calculateProductUnitPrice(
  basePrice: number,
  customizations?: ProductCustomization | null,
) {
  const normalized = normalizeProductCustomization(customizations);
  return basePrice + (normalized?.extraTotal ?? 0);
}

export function formatProductCustomizationLines(customizations?: ProductCustomization | null) {
  const normalized = normalizeProductCustomization(customizations);
  if (!normalized) return [];

  const lines: string[] = [];

  if (normalized.removedIngredients.length > 0) {
    lines.push(`Sin: ${normalized.removedIngredients.join(', ')}`);
  }

  if (normalized.extras.length > 0) {
    const extras = normalized.extras
      .map((extra) => `${extra.name} (+${formatPrice(extra.price)})`)
      .join(', ');
    lines.push(`Adicionales: ${extras}`);
  }

  if (normalized.note) {
    lines.push(`Nota: ${normalized.note}`);
  }

  return lines;
}
