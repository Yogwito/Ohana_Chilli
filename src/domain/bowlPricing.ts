import type { CustomBowl, Ingredient } from '@/types';

export interface BowlChargeLine {
  amount: number;
  label: string;
  quantity: number;
  unitAmount: number;
}

export const EXTRA_PROTEIN_PRICE = 5000;
export const EXTRA_TOPPING_PRICE = 3000;

function normalizeIngredientName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getIngredientExtraCharge(item: Ingredient): number {
  if ((item.price ?? 0) > 0) return item.price ?? 0;

  const normalizedName = normalizeIngredientName(item.name);
  const isExtraItem = normalizedName.includes('adicional') || normalizedName.includes('extra');

  if (!isExtraItem) return 0;

  if (item.type === 'protein') return EXTRA_PROTEIN_PRICE;
  if (item.type === 'acompanante' || item.type === 'topping' || item.type === 'sauce' || item.type === 'base') {
    return EXTRA_TOPPING_PRICE;
  }

  return 0;
}

function getBowlIngredients(bowl: CustomBowl): Ingredient[] {
  return [
    ...bowl.bases,
    ...bowl.proteins,
    ...bowl.acompanantes,
    ...(bowl.sauces ?? []),
    ...(bowl.complementos ?? []),
  ];
}

export function getBowlChargeableIngredients(bowl: CustomBowl): Ingredient[] {
  return getBowlIngredients(bowl).filter((item) => getIngredientExtraCharge(item) > 0);
}

export function getBowlChargeLines(bowl: CustomBowl): BowlChargeLine[] {
  const groupedCharges = new Map<string, BowlChargeLine>();

  getBowlChargeableIngredients(bowl).forEach((item) => {
    const unitAmount = getIngredientExtraCharge(item);
    const key = `${item.id}:${unitAmount}`;
    const current = groupedCharges.get(key);

    if (current) {
      current.quantity += 1;
      current.amount += unitAmount;
      return;
    }

    groupedCharges.set(key, {
      amount: unitAmount,
      label: item.name,
      quantity: 1,
      unitAmount,
    });
  });

  return Array.from(groupedCharges.values());
}

export function calculateBowlExtraCharges(bowl: CustomBowl): number {
  return getBowlChargeLines(bowl).reduce((sum, line) => sum + line.amount, 0);
}

export function calculateBowlPrice(bowl: CustomBowl): number {
  return bowl.size.price + calculateBowlExtraCharges(bowl);
}
