import { describe, expect, it } from 'vitest';
import {
  calculateProductUnitPrice,
  formatProductCustomizationLines,
  getProductCustomizationKey,
  normalizeProductCustomization,
} from '@/domain/productCustomizations';
import { getCustomBowlSignature } from '@/domain/bowlSignature';
import type { CustomBowl, Ingredient, ProductCustomization } from '@/types';

const HATSU_ROJO = { id: 'var-rojo', name: 'Rojo — Frutos rojos', priceDelta: 0 };
const HATSU_VERDE = { id: 'var-verde', name: 'Verde — Yuzu y manzanilla', priceDelta: 0 };

const customization = (overrides: Partial<ProductCustomization> = {}): ProductCustomization => ({
  removedIngredients: [],
  extras: [],
  note: '',
  extraTotal: 0,
  ...overrides,
});

describe('variantes (sabores) en la identidad del carrito', () => {
  it('mismo sabor produce la misma clave → merge por cantidad', () => {
    const a = getProductCustomizationKey(customization({ variant: HATSU_ROJO }));
    const b = getProductCustomizationKey(customization({ variant: { ...HATSU_ROJO } }));
    expect(a).toBe(b);
  });

  it('sabores distintos producen claves distintas → items separados', () => {
    const rojo = getProductCustomizationKey(customization({ variant: HATSU_ROJO }));
    const verde = getProductCustomizationKey(customization({ variant: HATSU_VERDE }));
    expect(rojo).not.toBe(verde);
  });

  it('la variante sola hace que la customización no sea vacía', () => {
    const normalized = normalizeProductCustomization(customization({ variant: HATSU_ROJO }));
    expect(normalized?.variant?.id).toBe('var-rojo');
  });

  it('el recargo de variante se suma al precio unitario', () => {
    const withDelta = customization({ variant: { id: 'v', name: 'Premium', priceDelta: 1500 } });
    expect(calculateProductUnitPrice(8500, withDelta)).toBe(10000);
  });

  it('el sabor aparece en las líneas de detalle (checkout / WhatsApp)', () => {
    const lines = formatProductCustomizationLines(customization({ variant: HATSU_ROJO }));
    expect(lines).toContain('Sabor: Rojo — Frutos rojos');
  });
});

describe('adicionales repetidos con cantidad', () => {
  const doubleTocineta = customization({
    extras: [
      { id: 'addon-tocineta', name: 'Tocineta', price: 4500 },
      { id: 'addon-tocineta', name: 'Tocineta', price: 4500 },
      { id: 'addon-queso', name: 'Queso', price: 3500 },
    ],
    extraTotal: 12500,
  });

  it('multiplica el precio por cantidad (2x tocineta + queso)', () => {
    expect(calculateProductUnitPrice(24900, doubleTocineta)).toBe(24900 + 4500 * 2 + 3500);
  });

  it('agrupa repetidos como xN en el detalle', () => {
    const lines = formatProductCustomizationLines(doubleTocineta);
    const extrasLine = lines.find((l) => l.startsWith('Adicionales:'));
    expect(extrasLine).toContain('Tocineta x2');
    expect(extrasLine).toContain('Queso');
  });

  it('cantidades distintas de adicionales → identidades distintas', () => {
    const single = customization({
      extras: [{ id: 'addon-tocineta', name: 'Tocineta', price: 4500 }],
      extraTotal: 4500,
    });
    expect(getProductCustomizationKey(single)).not.toBe(getProductCustomizationKey(doubleTocineta));
  });

  it('el orden de los extras no altera la identidad', () => {
    const reversed = customization({
      extras: [...doubleTocineta.extras].reverse(),
      extraTotal: doubleTocineta.extraTotal,
    });
    expect(getProductCustomizationKey(reversed)).toBe(getProductCustomizationKey(doubleTocineta));
  });
});

describe('remoción de ingredientes', () => {
  it('remociones distintas → identidades distintas; sin efecto en precio', () => {
    const sinTomate = customization({ removedIngredients: ['Tomate'] });
    const sinCebolla = customization({ removedIngredients: ['Cebolla'] });
    expect(getProductCustomizationKey(sinTomate)).not.toBe(getProductCustomizationKey(sinCebolla));
    expect(calculateProductUnitPrice(24900, sinTomate)).toBe(24900);
    expect(formatProductCustomizationLines(sinTomate)).toContain('Sin: Tomate');
  });

  it('el orden de las remociones no altera la identidad', () => {
    const a = customization({ removedIngredients: ['Tomate', 'Cebolla'] });
    const b = customization({ removedIngredients: ['Cebolla', 'Tomate'] });
    expect(getProductCustomizationKey(a)).toBe(getProductCustomizationKey(b));
  });
});

describe('firma determinística de bowls personalizados', () => {
  const ing = (id: string, name: string, price = 0): Ingredient => ({
    id,
    name,
    type: 'protein',
    price,
  });

  const baseBowl = (overrides: Partial<CustomBowl> = {}): CustomBowl => ({
    size: {
      size: 'large', name: 'Grande', price: 32900,
      maxBases: 1, maxProteins: 3, maxAcompanantes: 6, maxSauces: 3, maxComplementos: 3,
    },
    bases: [ing('base-arroz', 'Arroz')],
    proteins: [ing('prot-pollo', 'Pollo'), ing('prot-res', 'Res')],
    acompanantes: [ing('acomp-maiz', 'Maíz')],
    sauces: [],
    complementos: [],
    ...overrides,
  });

  it('configuraciones idénticas → misma firma (mergean), sin importar orden', () => {
    const a = baseBowl();
    const b = baseBowl({ proteins: [ing('prot-res', 'Res'), ing('prot-pollo', 'Pollo')] });
    expect(getCustomBowlSignature(a)).toBe(getCustomBowlSignature(b));
  });

  it('ingrediente repetido consume dos slots y cambia la firma', () => {
    const doublePollo = baseBowl({ proteins: [ing('prot-pollo', 'Pollo'), ing('prot-pollo', 'Pollo')] });
    expect(getCustomBowlSignature(doublePollo)).not.toBe(getCustomBowlSignature(baseBowl()));
  });

  it('extras sintéticos comparan por nombre|precio, no por uid aleatorio', () => {
    const extraA = ing('extra-111-aaa', 'Proteína extra: Chicharrón (+$5.000)', 5000);
    const extraB = ing('extra-222-bbb', 'Proteína extra: Chicharrón (+$5.000)', 5000);
    const a = baseBowl({ proteins: [ing('prot-pollo', 'Pollo'), extraA] });
    const b = baseBowl({ proteins: [ing('prot-pollo', 'Pollo'), extraB] });
    expect(getCustomBowlSignature(a)).toBe(getCustomBowlSignature(b));
  });

  it('las notas hacen único al bowl', () => {
    const a = baseBowl({ notes: 'sin cilantro' });
    expect(getCustomBowlSignature(a)).not.toBe(getCustomBowlSignature(baseBowl()));
  });

  it('tamaños distintos → firmas distintas', () => {
    const medium = baseBowl({
      size: {
        size: 'medium', name: 'Mediano', price: 27900,
        maxBases: 1, maxProteins: 2, maxAcompanantes: 5, maxSauces: 2, maxComplementos: 2,
      },
    });
    expect(getCustomBowlSignature(medium)).not.toBe(getCustomBowlSignature(baseBowl()));
  });
});
