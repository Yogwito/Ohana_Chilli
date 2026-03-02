import type { CustomBowl } from '@/types';

export function calculateBowlPrice(bowl: CustomBowl): number {
  let price = bowl.size.price;
  bowl.proteins.forEach(protein => {
    if (protein.price) price += protein.price;
  });
  return price;
}
