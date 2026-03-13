import type { CustomBowl } from '@/types';

export function calculateBowlPrice(bowl: CustomBowl): number {
  let price = bowl.size.price;
  [...bowl.bases, ...bowl.proteins, ...bowl.acompanantes, ...(bowl.sauces ?? []), ...(bowl.complementos ?? [])].forEach((item) => {
    if (item.price) price += item.price;
  });
  return price;
}
