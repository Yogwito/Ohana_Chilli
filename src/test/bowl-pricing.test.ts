import { describe, expect, it } from 'vitest';
import { calculateBowlExtraCharges, calculateBowlPrice, EXTRA_PROTEIN_PRICE, EXTRA_TOPPING_PRICE, getBowlChargeLines } from '@/domain/bowlPricing';
import { getBowlSummaryRows } from '@/domain/bowlSummary';
import type { CustomBowl } from '@/types';

describe('bowl pricing', () => {
  it('applies fallback charges for legacy extra items and explicit prices for premium toppings', () => {
    const bowl: CustomBowl = {
      size: {
        size: 'medium',
        name: 'Mediano',
        price: 27900,
        maxBases: 1,
        maxProteins: 2,
        maxAcompanantes: 2,
        maxSauces: 2,
        maxComplementos: 2,
      },
      bases: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
      proteins: [{ id: 'protein-extra', name: 'Proteína adicional', type: 'protein' }],
      acompanantes: [{ id: 'acomp-extra', name: 'Acompañante adicional', type: 'acompanante' }],
      sauces: [],
      complementos: [
        { id: 'top-queso', name: 'Queso Frito', type: 'topping', price: 6000 },
        { id: 'top-queso', name: 'Queso Frito', type: 'topping', price: 6000 },
      ],
    };

    expect(calculateBowlExtraCharges(bowl)).toBe(EXTRA_PROTEIN_PRICE + EXTRA_TOPPING_PRICE + 12000);
    expect(calculateBowlPrice(bowl)).toBe(47900);

    expect(getBowlChargeLines(bowl)).toEqual([
      { label: 'Proteína adicional', quantity: 1, unitAmount: EXTRA_PROTEIN_PRICE, amount: EXTRA_PROTEIN_PRICE },
      { label: 'Acompañante adicional', quantity: 1, unitAmount: EXTRA_TOPPING_PRICE, amount: EXTRA_TOPPING_PRICE },
      { label: 'Queso Frito', quantity: 2, unitAmount: 6000, amount: 12000 },
    ]);
  });

  it('groups repeated ingredients in the summary output', () => {
    const bowl: CustomBowl = {
      size: {
        size: 'small',
        name: 'Pequeño',
        price: 23900,
        maxBases: 1,
        maxProteins: 2,
        maxAcompanantes: 1,
        maxSauces: 1,
        maxComplementos: 1,
      },
      bases: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
      proteins: [
        { id: 'protein-pollo', name: 'Pollo', type: 'protein' },
        { id: 'protein-pollo', name: 'Pollo', type: 'protein' },
      ],
      acompanantes: [{ id: 'acomp-maiz', name: 'Maíz', type: 'acompanante' }],
      sauces: [],
      complementos: [],
    };

    const proteinRow = getBowlSummaryRows(bowl).find((row) => row.label === 'Proteínas');

    expect(proteinRow?.value).toBe('Pollo x2');
  });
});
