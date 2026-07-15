import { describe, expect, it } from 'vitest';
import {
  calculateCustomizationTotal,
  canonicalFromCustomBowl,
  canonicalFromLegacyProduct,
  createCustomizationSignature,
  customizationFromOrderDetails,
  formatCustomizationSummary,
  normalizeCustomization,
  serializeCustomizationForOrder,
  validateCustomization,
} from '@/domain/customization';
import { formatPrice } from '@/domain/formatPrice';
import type { CustomBowl, Ingredient, ProductCustomization } from '@/types';

const ing = (id: string, name: string, price = 0): Ingredient => ({ id, name, type: 'protein', price });

const bowl = (overrides: Partial<CustomBowl> = {}): CustomBowl => ({
  size: {
    size: 'large', name: 'Grande', price: 32900,
    maxBases: 1, maxProteins: 3, maxAcompanantes: 6, maxSauces: 3, maxComplementos: 3,
  },
  bases: [ing('base-arroz', 'Arroz')],
  proteins: [ing('prot-pollo', 'Pollo'), ing('prot-pollo', 'Pollo')], // repetido = 2 slots
  acompanantes: [ing('acomp-maiz', 'Maíz')],
  sauces: [],
  complementos: [],
  ...overrides,
});

describe('normalización canónica', () => {
  it('el orden de clic no altera el resultado (queso/tocineta en distinto orden)', () => {
    const a = normalizeCustomization({
      addons: [
        { id: 'addon-queso', name: 'Queso', quantity: 1, unitPrice: 3500 },
        { id: 'addon-tocineta', name: 'Tocineta', quantity: 2, unitPrice: 4500 },
      ],
    });
    const b = normalizeCustomization({
      addons: [
        { id: 'addon-tocineta', name: 'Tocineta', quantity: 2, unitPrice: 4500 },
        { id: 'addon-queso', name: 'Queso', quantity: 1, unitPrice: 3500 },
      ],
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('adicionales duplicados se fusionan sumando cantidad', () => {
    const c = normalizeCustomization({
      addons: [
        { id: 'addon-tocineta', name: 'Tocineta', quantity: 1, unitPrice: 4500 },
        { id: 'addon-tocineta', name: 'Tocineta', quantity: 2, unitPrice: 4500 },
      ],
    });
    expect(c.addons).toHaveLength(1);
    expect(c.addons[0].quantity).toBe(3);
  });

  it('las cantidades cero o negativas se eliminan', () => {
    const c = normalizeCustomization({
      addons: [
        { id: 'a', name: 'A', quantity: 0, unitPrice: 100 },
        { id: 'b', name: 'B', quantity: -2, unitPrice: 100 },
        { id: 'c', name: 'C', quantity: 1, unitPrice: 100 },
      ],
    });
    expect(c.addons.map((a) => a.id)).toEqual(['c']);
  });

  it('las selecciones repetidas del bowl se preservan vía cantidad', () => {
    const c = canonicalFromCustomBowl(bowl());
    const pollo = c.bowl!.selections.proteins.find((s) => s.id === 'prot-pollo');
    expect(pollo?.quantity).toBe(2);
  });

  it('defaults estables: entrada nula → colecciones vacías', () => {
    const c = normalizeCustomization(null);
    expect(c).toEqual({
      variant: null, comboSelection: null, addons: [], removedIngredients: [], bowl: null, note: '',
    });
  });
});

describe('cálculo de precio centralizado', () => {
  it('multiplica cantidad de adicional y suma delta de variante', () => {
    const total = calculateCustomizationTotal(24900, {
      variant: { id: 'v', name: 'Premium', priceDelta: 1500 },
      addons: [{ id: 'addon-tocineta', name: 'Tocineta', quantity: 2, unitPrice: 4500 }],
    });
    expect(total).toBe(24900 + 1500 + 9000);
  });

  it('bowl: precio del tamaño + extras premium por cantidad', () => {
    const withExtras = bowl({
      proteins: [
        ing('prot-pollo', 'Pollo'),
        ing('extra-123-abc', 'Proteína extra: Chicharrón (+$5.000)', 5000),
        ing('extra-456-def', 'Proteína extra: Chicharrón (+$5.000)', 5000),
      ],
    });
    const total = calculateCustomizationTotal(0, canonicalFromCustomBowl(withExtras));
    expect(total).toBe(32900 + 10000);
  });

  it('delta de comboSelection se suma cuando exista', () => {
    const total = calculateCustomizationTotal(10600, {
      comboSelection: {
        optionId: 'opt', optionName: 'Con Hatsu', beverageProductId: null,
        beverageName: 'Hatsu', beverageVariantId: null, beverageVariantName: 'Rojo', priceDelta: 4300,
      },
    });
    expect(total).toBe(14900);
  });
});

describe('identidad única para todos los tipos', () => {
  it('misma config → misma firma; distinto sabor → distinta', () => {
    const base = { variant: { id: 'rojo', name: 'Rojo', priceDelta: 0 } };
    expect(createCustomizationSignature('hatsu', base))
      .toBe(createCustomizationSignature('hatsu', { ...base }));
    expect(createCustomizationSignature('hatsu', base))
      .not.toBe(createCustomizationSignature('hatsu', { variant: { id: 'verde', name: 'Verde', priceDelta: 0 } }));
  });

  it('remociones distintas y cantidades de adicionales distintas separan', () => {
    const sinTomate = { removedIngredients: [{ id: 'tomate', name: 'Tomate' }] };
    const sinCebolla = { removedIngredients: [{ id: 'cebolla', name: 'Cebolla' }] };
    expect(createCustomizationSignature('p', sinTomate)).not.toBe(createCustomizationSignature('p', sinCebolla));

    const x1 = { addons: [{ id: 'a', name: 'A', quantity: 1, unitPrice: 100 }] };
    const x2 = { addons: [{ id: 'a', name: 'A', quantity: 2, unitPrice: 100 }] };
    expect(createCustomizationSignature('p', x1)).not.toBe(createCustomizationSignature('p', x2));
  });

  it('bowl: orden de selección no afecta; cantidad sí; uid sintético no', () => {
    const a = canonicalFromCustomBowl(bowl({ proteins: [ing('p1', 'Pollo'), ing('p2', 'Res')] }));
    const b = canonicalFromCustomBowl(bowl({ proteins: [ing('p2', 'Res'), ing('p1', 'Pollo')] }));
    expect(createCustomizationSignature('custom-bowl', a)).toBe(createCustomizationSignature('custom-bowl', b));

    const single = canonicalFromCustomBowl(bowl({ proteins: [ing('p1', 'Pollo')] }));
    const double = canonicalFromCustomBowl(bowl({ proteins: [ing('p1', 'Pollo'), ing('p1', 'Pollo')] }));
    expect(createCustomizationSignature('custom-bowl', single))
      .not.toBe(createCustomizationSignature('custom-bowl', double));

    const uidA = canonicalFromCustomBowl(bowl({ sauces: [ing('extra-1-a', 'Salsa extra: BBQ (+$2.000)', 2000)] }));
    const uidB = canonicalFromCustomBowl(bowl({ sauces: [ing('extra-2-b', 'Salsa extra: BBQ (+$2.000)', 2000)] }));
    expect(createCustomizationSignature('custom-bowl', uidA)).toBe(createCustomizationSignature('custom-bowl', uidB));
  });
});

describe('migración desde formas legacy', () => {
  it('ProductCustomization con extras expandidos → addons con cantidad', () => {
    const legacy: ProductCustomization = {
      removedIngredients: ['Tomate'],
      extras: [
        { id: 'addon-tocineta', name: 'Tocineta', price: 4500 },
        { id: 'addon-tocineta', name: 'Tocineta', price: 4500 },
      ],
      note: 'bien cocido',
      extraTotal: 9000,
      variant: { id: 'rojo', name: 'Rojo — Frutos rojos', priceDelta: 0 },
    };
    const c = canonicalFromLegacyProduct(legacy);
    expect(c.addons).toEqual([{ id: 'addon-tocineta', name: 'Tocineta', quantity: 2, unitPrice: 4500 }]);
    expect(c.removedIngredients).toEqual([{ id: 'Tomate', name: 'Tomate' }]);
    expect(c.variant?.id).toBe('rojo');
    expect(c.note).toBe('bien cocido');
    // precio idéntico al cálculo legacy (base + extraTotal + delta)
    expect(calculateCustomizationTotal(24900, c)).toBe(24900 + 9000);
  });

  it('CustomBowl legacy → bowl canónico con cantidades', () => {
    const c = canonicalFromCustomBowl(bowl({ notes: 'sin cilantro' }));
    expect(c.bowl?.sizeId).toBe('large');
    expect(c.bowl?.basePrice).toBe(32900);
    expect(c.note).toBe('sin cilantro');
  });

  it('entrada malformada nunca crashea', () => {
    expect(() => canonicalFromLegacyProduct(undefined)).not.toThrow();
    expect(() => canonicalFromCustomBowl(null)).not.toThrow();
    expect(() => customizationFromOrderDetails('garbage')).not.toThrow();
    expect(() => customizationFromOrderDetails({ customizations: 42 })).not.toThrow();
  });
});

describe('resumen compartido', () => {
  it('una sola salida para carrito/checkout/WhatsApp/admin', () => {
    const lines = formatCustomizationSummary({
      variant: { id: 'rojo', name: 'Rojo — Frutos rojos', priceDelta: 0 },
      removedIngredients: [{ id: 'tomate', name: 'Tomate' }],
      addons: [{ id: 'a', name: 'Tocineta', quantity: 2, unitPrice: 4500 }],
      note: 'sin hielo',
    });
    expect(lines).toEqual([
      'Sabor: Rojo — Frutos rojos',
      'Sin: Tomate',
      `Adicionales: Tocineta x2 (+${formatPrice(9000)})`,
      'Nota: sin hielo',
    ]);
  });

  it('bowl con extras premium y repeticiones', () => {
    const c = canonicalFromCustomBowl(bowl({
      proteins: [ing('p1', 'Pollo'), ing('p1', 'Pollo'), ing('extra-1-x', 'Proteína extra: Res (+$5.000)', 5000)],
    }));
    const lines = formatCustomizationSummary(c);
    expect(lines[0]).toBe('Tamaño: Grande');
    expect(lines.find((l) => l.startsWith('Proteínas'))).toContain('Pollo x2');
    expect(lines.find((l) => l.startsWith('Proteínas'))).toContain(`(+${formatPrice(5000)})`);
  });
});

describe('serialización para la orden (contrato de la RPC intacto)', () => {
  it('producto: ids canónicos preservados + extras expandidos para el servidor', () => {
    const details = serializeCustomizationForOrder(
      canonicalFromLegacyProduct({
        removedIngredients: [], note: '', extraTotal: 9000,
        extras: [
          { id: 'addon-uuid-1', name: 'Tocineta', price: 4500 },
          { id: 'addon-uuid-1', name: 'Tocineta', price: 4500 },
        ],
        variant: { id: 'variant-uuid', name: 'Rojo', priceDelta: 0 },
      }),
      { productId: 'product-uuid', notes: 'nota' },
    );
    expect(details.product_id).toBe('product-uuid');
    expect(details.customizations?.variant?.id).toBe('variant-uuid');
    // el servidor valida por entrada expandida: 2 copias, precio de catálogo
    expect(details.customizations?.extras).toHaveLength(2);
    expect(details.customizations?.extras[0]).toEqual({ id: 'addon-uuid-1', name: 'Tocineta', price: 4500 });
    // el bloque canónico con cantidad queda para lectura histórica
    expect(details.customizations?.addons).toEqual([
      { id: 'addon-uuid-1', name: 'Tocineta', quantity: 2, unitPrice: 4500 },
    ]);
  });

  it('bowl: validation.ingredient_ids repetidos + extras por nombre|cargo', () => {
    const details = serializeCustomizationForOrder(
      canonicalFromCustomBowl(bowl({
        proteins: [ing('p1', 'Pollo'), ing('p1', 'Pollo'), ing('extra-9-z', 'Proteína extra: Res (+$5.000)', 5000)],
      })),
      { notes: undefined },
    );
    expect(details.validation?.size).toBe('large');
    expect(details.validation?.ingredient_ids.filter((id) => id === 'p1')).toHaveLength(2);
    expect(details.validation?.extras).toEqual([{ name: 'Proteína extra: Res (+$5.000)', charge: 5000 }]);
    // bloque legible por nombres se conserva (repetir pedido / historial)
    expect(details.proteins?.filter((n) => n === 'Pollo')).toHaveLength(2);
    expect(details.size).toBe('Grande');
  });

  it('roundtrip: details de orden → canónico legible en admin', () => {
    const c = canonicalFromLegacyProduct({
      removedIngredients: ['Cebolla'], note: '', extraTotal: 4500,
      extras: [{ id: 'a1', name: 'Tocineta', price: 4500 }],
      variant: { id: 'v1', name: 'Verde', priceDelta: 0 },
    });
    const details = serializeCustomizationForOrder(c, { productId: 'p1' });
    const restored = customizationFromOrderDetails(details);
    expect(formatCustomizationSummary(restored)).toEqual(formatCustomizationSummary(c));
  });

  it('details legacy (extras expandidos, sin addons) también se leen', () => {
    const legacyDetails = {
      product_id: 'p1',
      customizations: {
        variant: { id: 'v', name: 'Rojo', priceDelta: 0 },
        removedIngredients: ['Tomate'],
        extras: [
          { id: 'a', name: 'Queso', price: 3500 },
          { id: 'a', name: 'Queso', price: 3500 },
        ],
        note: '',
      },
    };
    const c = customizationFromOrderDetails(legacyDetails);
    expect(c.addons).toEqual([{ id: 'a', name: 'Queso', quantity: 2, unitPrice: 3500 }]);
    expect(c.removedIngredients[0].name).toBe('Tomate');
  });
});

describe('validación de forma', () => {
  it('acepta customización válida y rechaza cantidades corruptas', () => {
    expect(validateCustomization(normalizeCustomization({
      addons: [{ id: 'a', name: 'A', quantity: 2, unitPrice: 100 }],
    }))).toEqual([]);
    // la normalización ya elimina qty<=0; validate cubre objetos construidos a mano
    expect(validateCustomization({
      variant: null, comboSelection: null, bowl: null, note: '',
      removedIngredients: [],
      addons: [{ id: 'a', name: 'A', quantity: 1.5, unitPrice: 100 }],
    })).toHaveLength(1);
  });
});
