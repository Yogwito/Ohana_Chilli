import type { CustomBowl, Ingredient } from '@/types';

export function getBowlChargeableIngredients(bowl: CustomBowl): Ingredient[] {
  return [
    ...bowl.bases,
    ...bowl.proteins,
    ...bowl.acompanantes,
    ...(bowl.sauces ?? []),
    ...(bowl.complementos ?? []),
  ].filter((item) => (item.price ?? 0) > 0);
}

export function calculateBowlExtraCharges(bowl: CustomBowl): number {
  return getBowlChargeableIngredients(bowl).reduce((sum, item) => sum + (item.price ?? 0), 0);
}

export function calculateBowlPrice(bowl: CustomBowl): number {
  return bowl.size.price + calculateBowlExtraCharges(bowl);
}
