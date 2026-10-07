import { describe, expect, it } from 'vitest';
import {
  bowlSchema,
  extraPrice,
  isGenericExtra,
  reconcileBowl,
  validateBowl,
} from '@/domain/bowlConfiguration';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import { calculateBowlPrice } from '@/domain/bowlPricing';
import { formatBowlDetail } from '@/domain/bowlSummary';
import { generateWhatsAppMessage } from '@/domain/whatsapp';
import type { BowlSizeRule, CustomBowl, Ingredient, CartState } from '@/types';
const size: BowlSizeRule = {
  size: 'small',
  name: 'Pequeño',
  price: 23900,
  maxBases: 1,
  maxProteins: 2,
  maxAcompanantes: 4,
  maxSauces: 2,
  maxComplementos: 1,
};
const rice: Ingredient = { id: 'rice', name: 'Arroz', type: 'base' };
const chicken: Ingredient = { id: 'chicken', name: 'Pollo', type: 'protein' };
const corn: Ingredient = { id: 'corn', name: 'Maíz', type: 'acompanante' };
const cheese: Ingredient = {
  id: 'cheese',
  name: 'Queso Frito',
  type: 'topping',
  price: 6000,
};
const generic: Ingredient = {
  id: 'generic',
  name: 'Proteína adicional',
  type: 'protein',
  price: 5500,
};
const catalog = [rice, chicken, corn, cheese, generic];
const recipe = (): CustomBowl => ({
  size,
  bases: [rice],
  proteins: [chicken],
  acompanantes: [],
  sauces: [],
  complementos: [],
  extras: [],
});
const state = (bowl: CustomBowl): CartState => ({
  items: [
    {
      id: 'bowl',
      brand: 'ohana',
      type: 'custom-bowl',
      customBowl: bowl,
      quantity: 2,
      unitPrice: calculateBowlPrice(bowl),
      totalPrice: calculateBowlPrice(bowl) * 2,
    },
  ],
  subtotal: calculateBowlPrice(bowl) * 2,
  total: calculateBowlPrice(bowl) * 2,
});
describe('bowl configuration', () => {
  it('allows fewer included portions without discount, but requires base and protein', () => {
    expect(validateBowl(recipe(), [size], catalog)).toEqual([]);
    expect(calculateBowlPrice(recipe())).toBe(23900);
    expect(validateBowl({ ...recipe(), proteins: [] })[0].section).toBe(
      'proteins',
    );
    expect(validateBowl({ ...recipe(), bases: [] })[0].section).toBe('bases');
  });
  it('preserves existing tariff contexts and concrete premium prices', () => {
    expect(extraPrice(corn, 'upsell')).toBe(2000);
    expect(extraPrice(corn, 'generic')).toBe(3000);
    expect(extraPrice({ ...corn, type: 'sauce' }, 'suggestion')).toBe(2000);
    expect(extraPrice({ ...corn, type: 'topping' }, 'suggestion')).toBe(500);
    expect(extraPrice(chicken, 'generic', generic)).toBe(5500);
    expect(extraPrice(cheese, 'catalog')).toBe(6000);
    expect(isGenericExtra(cheese)).toBe(false);
    expect(isGenericExtra(generic)).toBe(true);
    expect(isGenericExtra({ ...cheese, name: 'Tocineta extra' })).toBe(false);
  });
  it('keeps real extras across reconciliation and updates their configured tariff', () => {
    const bowl = {
      ...recipe(),
      extras: [
        {
          ingredient: chicken,
          quantity: 2,
          source: 'generic' as const,
          tariffId: generic.id,
          unitPrice: 5500,
        },
      ],
    };
    const current = reconcileCartWithCatalog(state(bowl), {
      products: [],
      bowlRules: [size],
      ingredients: catalog,
    });
    expect(current.items).toHaveLength(1);
    expect(current.items[0].reviewIssues).toEqual([]);
    expect(current.total).toBe(69800);
    const updated = reconcileBowl(
      bowl,
      [size],
      catalog.map((i) => (i.id === generic.id ? { ...i, price: 6500 } : i)),
    );
    expect(calculateBowlPrice(updated)).toBe(36900);
    expect(updated.proteins).toHaveLength(1);
  });
  it('retains unavailable ingredients with an actionable issue instead of removing the bowl', () => {
    const result = reconcileCartWithCatalog(
      state({
        ...recipe(),
        extras: [
          {
            ingredient: cheese,
            quantity: 1,
            source: 'catalog',
            unitPrice: 6000,
          },
        ],
      }),
      { products: [], bowlRules: [size], ingredients: [rice, chicken] },
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].reviewIssues.join(' ')).toMatch(/Queso Frito/);
  });
  it('rejects a removed generic tariff and changed category', () => {
    const bowl = {
      ...recipe(),
      extras: [
        {
          ingredient: chicken,
          quantity: 1,
          source: 'generic' as const,
          tariffId: generic.id,
          unitPrice: 5500,
        },
      ],
    };
    expect(
      validateBowl(bowl, [size], [rice, chicken]).some(
        (i) => i.section === 'extras',
      ),
    ).toBe(true);
    expect(
      validateBowl({ ...recipe(), bases: [chicken] }).some(
        (i) => i.section === 'bases',
      ),
    ).toBe(true);
  });
  it('flags reduced limits and excessive repeated accompaniments', () => {
    expect(
      validateBowl({
        ...recipe(),
        size: { ...size, maxProteins: 1 },
        proteins: [chicken, chicken],
      }).some((i) => i.section === 'proteins'),
    ).toBe(true);
    expect(
      validateBowl({
        ...recipe(),
        acompanantes: [corn, corn, corn, corn],
      }).some((i) => /tres/.test(i.message)),
    ).toBe(true);
  });
  it('migrates uniquely identifiable legacy extras without counting them as included', () => {
    const legacy = {
      ...recipe(),
      proteins: [
        chicken,
        {
          ...chicken,
          id: 'extra-123',
          name: 'Proteína extra: Pollo (+$5.000)',
          price: 5000,
        },
      ],
    };
    const migrated = reconcileBowl(legacy, [size], catalog);
    expect(migrated.proteins).toEqual([chicken]);
    expect(migrated.extras).toEqual([
      {
        ingredient: chicken,
        quantity: 1,
        source: 'generic',
        tariffId: generic.id,
        unitPrice: 5500,
      },
    ]);
    expect(calculateBowlPrice(migrated)).toBe(29400);
    expect(validateBowl(migrated, [size], catalog)).toEqual([]);
  });
  it('does not guess ambiguous legacy extras and keeps the bowl marked for review', () => {
    const legacy = {
      ...recipe(),
      proteins: [
        chicken,
        {
          ...chicken,
          id: 'extra-123',
          name: 'Proteína extra: Pollo',
          price: 5000,
        },
      ],
    };
    const migrated = reconcileBowl(
      legacy,
      [size],
      [...catalog, { ...chicken, id: 'chicken2' }],
    );
    expect(migrated.reviewIssues).toHaveLength(1);
    expect(validateBowl(migrated, [size], catalog).length).toBeGreaterThan(0);
  });
  it('validates stored structure and quantities', () => {
    expect(bowlSchema.safeParse({}).success).toBe(false);
    expect(
      bowlSchema.safeParse({
        ...recipe(),
        extras: [
          {
            ingredient: chicken,
            quantity: 0,
            source: 'generic',
            unitPrice: 5000,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('includes extras quantities and charges in summaries and WhatsApp', () => {
    const bowl = {
      ...recipe(),
      extras: [
        {
          ingredient: cheese,
          quantity: 2,
          source: 'catalog' as const,
          unitPrice: 6000,
        },
      ],
    };
    expect(formatBowlDetail(bowl)).toMatch(/Queso Frito x2/);
    const message = generateWhatsAppMessage(state(bowl).items, 71800, {
      name: 'Prueba',
      phone: '3000000000',
      orderType: 'pickup',
      orderId: 'test',
    });
    expect(message).toMatch(/2x Bowl/);
    expect(message).toMatch(/Queso Frito x2/);
    expect(message).toMatch(/12\.000/);
  });
  it('preserves paid bases as base portions and moves old concrete premiums to extras', () => {
    const paidBase = {
      ...rice,
      id: 'paid-base',
      name: 'Papas a la francesa',
      price: 6000,
    };
    const migrated = reconcileBowl(
      { ...recipe(), bases: [paidBase], complementos: [cheese] },
      [size],
      [...catalog, paidBase],
    );
    expect(migrated.bases).toEqual([paidBase]);
    expect(migrated.complementos).toEqual([]);
    expect(migrated.extras?.[0].ingredient.id).toBe(cheese.id);
    expect(calculateBowlPrice(migrated)).toBe(35900);
    expect(validateBowl(migrated, [size], [...catalog, paidBase])).toEqual([]);
  });
  it('requires review when the origin or price of an old surcharge is not identifiable', () => {
    const legacy = {
      ...recipe(),
      proteins: [
        chicken,
        {
          ...chicken,
          id: 'extra-old',
          name: 'Proteína extra: Pollo',
          price: 5001,
        },
      ],
    };
    expect(reconcileBowl(legacy, [size], catalog).reviewIssues?.length).toBe(1);
    expect(
      reconcileBowl(
        {
          ...legacy,
          proteins: [chicken, { ...legacy.proteins[1], price: 5000 }],
        },
        [size],
        [rice, chicken],
      ).reviewIssues?.length,
    ).toBe(1);
  });
  it('recognizes generic slots by stable catalog ID even after a label change', () => {
    expect(
      isGenericExtra({
        ...generic,
        id: 'protein-proteina-adicional',
        name: 'Otra porción de proteína',
      }),
    ).toBe(true);
  });
});
