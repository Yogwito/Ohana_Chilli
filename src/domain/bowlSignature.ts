import type { CustomBowl, Ingredient } from '@/types';

function collectIngredients(bowl: CustomBowl): Ingredient[] {
  return [
    ...bowl.bases,
    ...bowl.proteins,
    ...bowl.acompanantes,
    ...(bowl.sauces ?? []),
    ...(bowl.complementos ?? []),
  ];
}

/**
 * Deterministic identity for a custom bowl so identical configurations merge
 * in the cart by quantity. Catalog selections compare by ingredient id (with
 * repetition — two "Pollo al panko" are two slots); synthetic builder extras
 * (`extra-*`, whose ids are random uids) compare by name|charge instead.
 * Everything is sorted so array order never affects identity. Notes make the
 * item unique on purpose: a bowl "sin cebolla en la nota" is not the same
 * line as one without the note.
 */
export function getCustomBowlSignature(bowl: CustomBowl): string {
  const all = collectIngredients(bowl);
  const catalogIds = all
    .filter((ing) => !ing.id.startsWith('extra-'))
    .map((ing) => ing.id)
    .sort();
  const extras = all
    .filter((ing) => ing.id.startsWith('extra-'))
    .map((ing) => `${ing.name.trim()}|${ing.price ?? 0}`)
    .sort();

  return JSON.stringify({
    size: bowl.size.size,
    catalogIds,
    extras,
    notes: (bowl.notes ?? '').trim(),
  });
}
