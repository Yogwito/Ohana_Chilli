import type { BowlExtra, CustomBowl, Ingredient } from '@/types';
import { extraPrice, isGenericExtra } from './bowlConfiguration';

export interface BowlUpsell {
  ingredient: Ingredient;
  source: BowlExtra['source'];
  tariff?: Ingredient;
  price: number;
}

/** Paid suggestions use the active catalog and never consume included slots. */
export function getBowlUpsells(
  bowl: CustomBowl,
  ingredients: Ingredient[],
): BowlUpsell[] {
  const recommendations: BowlUpsell[] = [];
  const protein = bowl.proteins.find((selected) =>
    ingredients.some(
      (current) =>
        current.id === selected.id &&
        current.type === 'protein' &&
        !isGenericExtra(current),
    ),
  );
  if (protein) {
    const ingredient = ingredients.find(
      (current) => current.id === protein.id,
    )!;
    const tariff = ingredients.find(
      (current) => current.type === 'protein' && isGenericExtra(current),
    );
    const source = ingredient.price ? 'catalog' : tariff ? 'generic' : 'upsell';
    recommendations.push({
      ingredient,
      source,
      tariff: source === 'generic' ? tariff : undefined,
      price: extraPrice(
        ingredient,
        source,
        source === 'generic' ? tariff : undefined,
      ),
    });
  }
  const premium = ingredients
    .filter(
      (ingredient) =>
        ingredient.type !== 'base' &&
        !isGenericExtra(ingredient) &&
        (ingredient.price || 0) > 0 &&
        ingredient.id !== protein?.id,
    )
    .sort((a, b) => {
      const cheese = (ingredient: Ingredient) =>
        /queso.*frito/i.test(ingredient.name) ? 0 : 1;
      return (
        cheese(a) - cheese(b) || a.price! - b.price! || a.id.localeCompare(b.id)
      );
    });
  for (const ingredient of premium.slice(0, 2 - recommendations.length)) {
    recommendations.push({
      ingredient,
      source: 'catalog',
      price: extraPrice(ingredient, 'catalog'),
    });
  }
  return recommendations;
}
