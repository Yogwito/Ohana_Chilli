/**
 * Modelo CANÓNICO de customización — única fuente de verdad para identidad,
 * precio de display, resumen y serialización de pedidos en todos los tipos
 * de producto (comida, bebidas con sabor, combos y bowls personalizados).
 *
 * Reglas del modelo:
 *  - Serializable a JSON puro (sin funciones, Sets, Maps ni tipos de React).
 *  - IDs siempre que existan + nombres para legibilidad histórica.
 *  - Dinero en pesos colombianos enteros. Cantidades explícitas.
 *  - Colecciones vacías con defaults estables ([] / null / '').
 *
 * El cálculo de precio aquí es SOLO para display: `create_order_with_items`
 * re-valida todo server-side y sigue siendo la autoridad. Este módulo no
 * debilita ni reemplaza esa validación.
 */
import type { CustomBowl, ProductCustomization } from '@/types';
import { formatPrice } from './formatPrice';

// ─── Tipos canónicos ─────────────────────────────────────────────────────────

export interface CustomizationSelection {
  id: string;
  name: string;
  quantity: number;
  unitExtraPrice: number;
}

export interface CanonicalVariant {
  id: string;
  name: string;
  priceDelta: number;
}

/**
 * Reservado para combos con selección de bebida como opción propia. Hoy los
 * combos del catálogo son un SKU por bebida y su sabor viaja en `variant`,
 * así que este campo es siempre null; existe para que agregar combos
 * configurables no cambie la forma del modelo.
 */
export interface CanonicalComboSelection {
  optionId: string;
  optionName: string;
  beverageProductId: string | null;
  beverageName: string | null;
  beverageVariantId: string | null;
  beverageVariantName: string | null;
  priceDelta: number;
}

export interface CanonicalAddon {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CanonicalRemovedIngredient {
  id: string;
  name: string;
}

export interface CanonicalBowlSelections {
  bases: CustomizationSelection[];
  proteins: CustomizationSelection[];
  accompaniments: CustomizationSelection[];
  sauces: CustomizationSelection[];
  complements: CustomizationSelection[];
}

export interface CanonicalBowl {
  sizeId: string;
  sizeName: string;
  basePrice: number;
  selections: CanonicalBowlSelections;
}

export interface CanonicalCustomization {
  variant: CanonicalVariant | null;
  comboSelection: CanonicalComboSelection | null;
  addons: CanonicalAddon[];
  removedIngredients: CanonicalRemovedIngredient[];
  bowl: CanonicalBowl | null;
  note: string;
}

const BOWL_GROUPS: Array<keyof CanonicalBowlSelections> = [
  'bases',
  'proteins',
  'accompaniments',
  'sauces',
  'complements',
];

/** Prefijo de los extras premium sintéticos del Bowl Builder (uid aleatorio). */
const SYNTHETIC_EXTRA_PREFIX = 'extra-';

const cleanText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const toInt = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

export function emptyCustomization(): CanonicalCustomization {
  return {
    variant: null,
    comboSelection: null,
    addons: [],
    removedIngredients: [],
    bowl: null,
    note: '',
  };
}

// ─── Normalización ───────────────────────────────────────────────────────────

function normalizeSelections(list: CustomizationSelection[]): CustomizationSelection[] {
  const merged = new Map<string, CustomizationSelection>();
  for (const raw of list) {
    const id = cleanText(raw.id);
    const name = cleanText(raw.name);
    const quantity = toInt(raw.quantity);
    if (!id || !name || quantity <= 0) continue;
    const unitExtraPrice = Math.max(0, toInt(raw.unitExtraPrice));
    // Los extras sintéticos del builder llevan uid aleatorio: dos unidades del
    // mismo extra deben fusionarse por contenido, no separarse por uid.
    const key = id.startsWith(SYNTHETIC_EXTRA_PREFIX) ? `syn|${name}|${unitExtraPrice}` : id;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      merged.set(key, { id, name, quantity, unitExtraPrice });
    }
  }
  return Array.from(merged.values()).sort((a, b) =>
    `${a.id}|${a.name}`.localeCompare(`${b.id}|${b.name}`),
  );
}

/**
 * Normaliza a la forma canónica estable: nombres limpios, cantidades > 0,
 * duplicados fusionados sumando cantidad, arrays ordenados por id — el mismo
 * resultado sin importar el orden en que el cliente hizo clic.
 */
export function normalizeCustomization(
  input?: Partial<CanonicalCustomization> | null,
): CanonicalCustomization {
  if (!input) return emptyCustomization();

  const variant = input.variant && cleanText(input.variant.id) && cleanText(input.variant.name)
    ? {
        id: cleanText(input.variant.id),
        name: cleanText(input.variant.name),
        priceDelta: Math.max(0, toInt(input.variant.priceDelta)),
      }
    : null;

  const comboSelection = input.comboSelection && cleanText(input.comboSelection.optionId)
    ? {
        optionId: cleanText(input.comboSelection.optionId),
        optionName: cleanText(input.comboSelection.optionName),
        beverageProductId: cleanText(input.comboSelection.beverageProductId) || null,
        beverageName: cleanText(input.comboSelection.beverageName) || null,
        beverageVariantId: cleanText(input.comboSelection.beverageVariantId) || null,
        beverageVariantName: cleanText(input.comboSelection.beverageVariantName) || null,
        priceDelta: Math.max(0, toInt(input.comboSelection.priceDelta)),
      }
    : null;

  const addonsMerged = new Map<string, CanonicalAddon>();
  for (const raw of input.addons ?? []) {
    const id = cleanText(raw?.id);
    const name = cleanText(raw?.name);
    const quantity = toInt(raw?.quantity);
    if (!id || !name || quantity <= 0) continue;
    const existing = addonsMerged.get(id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      addonsMerged.set(id, { id, name, quantity, unitPrice: Math.max(0, toInt(raw?.unitPrice)) });
    }
  }
  const addons = Array.from(addonsMerged.values()).sort((a, b) => a.id.localeCompare(b.id));

  const removedMap = new Map<string, CanonicalRemovedIngredient>();
  for (const raw of input.removedIngredients ?? []) {
    const name = cleanText(raw?.name);
    const id = cleanText(raw?.id) || name;
    if (!name) continue;
    removedMap.set(id, { id, name });
  }
  const removedIngredients = Array.from(removedMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  let bowl: CanonicalBowl | null = null;
  if (input.bowl && cleanText(input.bowl.sizeId)) {
    bowl = {
      sizeId: cleanText(input.bowl.sizeId),
      sizeName: cleanText(input.bowl.sizeName),
      basePrice: Math.max(0, toInt(input.bowl.basePrice)),
      selections: BOWL_GROUPS.reduce((acc, group) => {
        acc[group] = normalizeSelections(input.bowl?.selections?.[group] ?? []);
        return acc;
      }, {} as CanonicalBowlSelections),
    };
  }

  return { variant, comboSelection, addons, removedIngredients, bowl, note: cleanText(input.note) };
}

// ─── Validación ──────────────────────────────────────────────────────────────

/** Chequeo de forma previo al checkout; devuelve los problemas encontrados. */
export function validateCustomization(c: CanonicalCustomization): string[] {
  const issues: string[] = [];
  for (const addon of c.addons) {
    if (!Number.isInteger(addon.quantity) || addon.quantity <= 0) {
      issues.push(`Cantidad inválida en adicional "${addon.name}"`);
    }
    if (addon.unitPrice < 0) issues.push(`Precio negativo en adicional "${addon.name}"`);
  }
  if (c.bowl) {
    if (!c.bowl.sizeId) issues.push('Bowl sin tamaño');
    for (const group of BOWL_GROUPS) {
      for (const sel of c.bowl.selections[group]) {
        if (!Number.isInteger(sel.quantity) || sel.quantity <= 0) {
          issues.push(`Cantidad inválida en "${sel.name}"`);
        }
      }
    }
  }
  return issues;
}

// ─── Precio (solo display; el servidor re-valida) ────────────────────────────

export function calculateCustomizationTotal(
  baseProductPrice: number,
  customization?: Partial<CanonicalCustomization> | null,
): number {
  const c = normalizeCustomization(customization);
  const base = c.bowl ? c.bowl.basePrice : baseProductPrice;
  const addonsTotal = c.addons.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
  const bowlExtras = c.bowl
    ? BOWL_GROUPS.reduce(
        (sum, group) =>
          sum + c.bowl!.selections[group].reduce((s, sel) => s + sel.quantity * sel.unitExtraPrice, 0),
        0,
      )
    : 0;
  return base
    + (c.variant?.priceDelta ?? 0)
    + (c.comboSelection?.priceDelta ?? 0)
    + addonsTotal
    + bowlExtras;
}

// ─── Identidad determinística ────────────────────────────────────────────────

/**
 * Firma estable de un item de carrito: mismo producto + misma customización
 * canónica → misma firma (merge por cantidad). El orden de selección nunca
 * afecta el resultado. Las notas hacen único al item a propósito.
 */
export function createCustomizationSignature(
  productKey: string,
  customization?: Partial<CanonicalCustomization> | null,
): string {
  const c = normalizeCustomization(customization);
  return JSON.stringify({
    product: productKey,
    variant: c.variant ? c.variant.id : null,
    combo: c.comboSelection
      ? [c.comboSelection.optionId, c.comboSelection.beverageVariantId]
      : null,
    addons: c.addons.map((a) => [a.id, a.quantity, a.unitPrice]),
    removed: c.removedIngredients.map((r) => r.id),
    bowl: c.bowl
      ? {
          size: c.bowl.sizeId,
          selections: BOWL_GROUPS.map((group) =>
            c.bowl!.selections[group].map((s) => [
              s.id.startsWith(SYNTHETIC_EXTRA_PREFIX) ? `syn|${s.name}|${s.unitExtraPrice}` : s.id,
              s.quantity,
            ]),
          ),
        }
      : null,
    note: c.note,
  });
}

// ─── Resumen compartido (carrito, checkout, WhatsApp, admin) ─────────────────

const BOWL_GROUP_LABELS: Record<keyof CanonicalBowlSelections, string> = {
  bases: 'Base',
  proteins: 'Proteínas',
  accompaniments: 'Acompañantes',
  sauces: 'Salsas',
  complements: 'Complementos',
};

function formatSelection(sel: CustomizationSelection): string {
  const qty = sel.quantity > 1 ? ` x${sel.quantity}` : '';
  const extra = sel.unitExtraPrice > 0
    ? ` (+${formatPrice(sel.unitExtraPrice * sel.quantity)})`
    : '';
  return `${sel.name}${qty}${extra}`;
}

/** Único formateador de detalle: todas las superficies muestran lo mismo. */
export function formatCustomizationSummary(
  customization?: Partial<CanonicalCustomization> | null,
): string[] {
  const c = normalizeCustomization(customization);
  const lines: string[] = [];

  if (c.variant) lines.push(`Sabor: ${c.variant.name}`);

  if (c.comboSelection) {
    const combo = [
      c.comboSelection.beverageName ?? c.comboSelection.optionName,
      c.comboSelection.beverageVariantName ? `(${c.comboSelection.beverageVariantName})` : '',
    ].filter(Boolean).join(' ');
    lines.push(`Bebida del combo: ${combo}`);
  }

  if (c.bowl) {
    lines.push(`Tamaño: ${c.bowl.sizeName || c.bowl.sizeId}`);
    for (const group of BOWL_GROUPS) {
      const selections = c.bowl.selections[group];
      if (selections.length > 0) {
        lines.push(`${BOWL_GROUP_LABELS[group]}: ${selections.map(formatSelection).join(', ')}`);
      }
    }
  }

  if (c.removedIngredients.length > 0) {
    lines.push(`Sin: ${c.removedIngredients.map((r) => r.name).join(', ')}`);
  }

  if (c.addons.length > 0) {
    const addons = c.addons
      .map((a) =>
        a.quantity > 1
          ? `${a.name} x${a.quantity} (+${formatPrice(a.unitPrice * a.quantity)})`
          : `${a.name} (+${formatPrice(a.unitPrice)})`,
      )
      .join(', ');
    lines.push(`Adicionales: ${addons}`);
  }

  if (c.note) lines.push(`Nota: ${c.note}`);

  return lines;
}

// ─── Serialización para la orden (contrato vivo de la RPC) ───────────────────

interface OrderCustomizationPayload {
  variant: CanonicalVariant | null;
  comboSelection: CanonicalComboSelection | null;
  addons: CanonicalAddon[];
  removedIngredients: CanonicalRemovedIngredient[];
  note: string;
  /**
   * Proyección para `create_order_with_items`: la RPC valida cada entrada de
   * `extras` contra el catálogo por id y suma una unidad por entrada, así que
   * las cantidades se expanden a copias. No cambiar sin migrar la RPC.
   */
  extras: Array<{ id: string; name: string; price: number }>;
}

export interface OrderItemDetailsPayload {
  product_id?: string;
  notes?: string;
  customizations?: OrderCustomizationPayload;
  // Bloque legible de bowls (histórico/admin) + bloque validado por la RPC
  size?: string;
  bases?: string[];
  proteins?: string[];
  acompanantes?: string[];
  sauces?: string[];
  complementos?: string[];
  validation?: {
    size: string;
    ingredient_ids: string[];
    extras: Array<{ name: string; charge: number }>;
  };
}

const BOWL_GROUP_TO_LEGACY: Record<keyof CanonicalBowlSelections, keyof Pick<
  OrderItemDetailsPayload, 'bases' | 'proteins' | 'acompanantes' | 'sauces' | 'complementos'
>> = {
  bases: 'bases',
  proteins: 'proteins',
  accompaniments: 'acompanantes',
  sauces: 'sauces',
  complements: 'complementos',
};

/**
 * Serializa la customización al `details` del order_item, manteniendo el
 * contrato EXACTO que valida la RPC viva (customizations.extras expandidos,
 * validation.ingredient_ids repetidos) y agregando el bloque canónico con
 * cantidades para lectura histórica y del admin.
 */
export function serializeCustomizationForOrder(
  customization: Partial<CanonicalCustomization> | null | undefined,
  meta: { productId?: string; notes?: string },
): OrderItemDetailsPayload {
  const c = normalizeCustomization(customization);
  const details: OrderItemDetailsPayload = {};

  if (meta.notes) details.notes = meta.notes;

  if (c.bowl) {
    details.size = c.bowl.sizeName || c.bowl.sizeId;
    const ingredientIds: string[] = [];
    const validationExtras: Array<{ name: string; charge: number }> = [];

    for (const group of BOWL_GROUPS) {
      const legacyKey = BOWL_GROUP_TO_LEGACY[group];
      const names: string[] = [];
      for (const sel of c.bowl.selections[group]) {
        for (let i = 0; i < sel.quantity; i++) {
          names.push(sel.name);
          if (sel.id.startsWith(SYNTHETIC_EXTRA_PREFIX)) {
            validationExtras.push({ name: sel.name, charge: sel.unitExtraPrice });
          } else {
            ingredientIds.push(sel.id);
          }
        }
      }
      if (names.length > 0) details[legacyKey] = names;
    }

    details.validation = {
      size: c.bowl.sizeId,
      ingredient_ids: ingredientIds,
      extras: validationExtras,
    };
  }

  if (meta.productId) details.product_id = meta.productId;

  const hasProductCustomization =
    c.variant || c.comboSelection || c.addons.length > 0 || c.removedIngredients.length > 0 || c.note;
  if (hasProductCustomization || meta.productId) {
    details.customizations = {
      variant: c.variant,
      comboSelection: c.comboSelection,
      addons: c.addons,
      removedIngredients: c.removedIngredients,
      note: c.note,
      extras: c.addons.flatMap((a) =>
        Array.from({ length: a.quantity }, () => ({ id: a.id, name: a.name, price: a.unitPrice })),
      ),
    };
  }

  return details;
}

// ─── Lectura de `details` históricos (admin / historial) ─────────────────────

/**
 * Reconstruye un canónico best-effort desde el JSON `details` de un
 * order_item, aceptando tanto el formato canónico nuevo (addons con cantidad)
 * como los históricos (extras expandidos, remociones como strings, bowls como
 * arrays de nombres). Nunca lanza: entrada malformada → customización vacía.
 */
export function customizationFromOrderDetails(details: unknown): CanonicalCustomization {
  if (!details || typeof details !== 'object') return emptyCustomization();
  const d = details as Record<string, unknown>;
  const raw = (d.customizations && typeof d.customizations === 'object'
    ? d.customizations
    : {}) as Record<string, unknown>;

  const addonsSource = Array.isArray(raw.addons) && raw.addons.length > 0
    ? (raw.addons as CanonicalAddon[])
    : Array.isArray(raw.extras)
      ? (raw.extras as Array<{ id?: string; name?: string; price?: number }>).map((e) => ({
          id: e?.id ?? '',
          name: e?.name ?? '',
          quantity: 1,
          unitPrice: toInt(e?.price),
        }))
      : [];

  const removedSource = Array.isArray(raw.removedIngredients)
    ? (raw.removedIngredients as Array<string | CanonicalRemovedIngredient>).map((r) =>
        typeof r === 'string' ? { id: r, name: r } : { id: r?.id ?? r?.name ?? '', name: r?.name ?? '' },
      )
    : [];

  const namesToSelections = (value: unknown): CustomizationSelection[] =>
    Array.isArray(value)
      ? (value as string[]).map((name) => ({
          id: String(name ?? ''),
          name: String(name ?? ''),
          quantity: 1,
          unitExtraPrice: 0,
        }))
      : [];

  const bowl = typeof d.size === 'string' && d.size
    ? {
        sizeId: String(d.size),
        sizeName: String(d.size),
        basePrice: 0, // el precio histórico vive en unit_price_cents del item
        selections: {
          bases: namesToSelections(d.bases),
          proteins: namesToSelections(d.proteins),
          accompaniments: namesToSelections(d.acompanantes),
          sauces: namesToSelections(d.sauces),
          complements: namesToSelections(d.complementos),
        },
      }
    : null;

  return normalizeCustomization({
    variant: (raw.variant ?? null) as CanonicalVariant | null,
    comboSelection: (raw.comboSelection ?? null) as CanonicalComboSelection | null,
    addons: addonsSource,
    removedIngredients: removedSource,
    bowl,
    note: typeof raw.note === 'string' ? raw.note : typeof d.notes === 'string' ? d.notes : '',
  });
}

// ─── Adapters de compatibilidad (aislados; ruta de retiro documentada) ───────
//
// El UI y el almacenamiento del carrito siguen produciendo las formas legacy
// (`ProductCustomization` con extras expandidos y `CustomBowl` con arrays de
// Ingredient repetidos). Estos adapters las elevan al modelo canónico en las
// fronteras. Retiro previsto: cuando ProductDrawer y BowlBuilder emitan
// CanonicalCustomization directamente, estos adapters y los campos legacy de
// CartItem pueden eliminarse (buscar usos de estas dos funciones).

export function canonicalFromLegacyProduct(
  legacy?: ProductCustomization | null,
): CanonicalCustomization {
  if (!legacy) return emptyCustomization();
  return normalizeCustomization({
    variant: legacy.variant
      ? {
          id: legacy.variant.id,
          name: legacy.variant.name,
          priceDelta: legacy.variant.priceDelta ?? 0,
        }
      : null,
    addons: (legacy.extras ?? []).map((extra) => ({
      id: extra.id,
      name: extra.name,
      quantity: 1, // copias expandidas → el normalizador fusiona sumando
      unitPrice: extra.price,
    })),
    removedIngredients: (legacy.removedIngredients ?? []).map((name) => ({ id: name, name })),
    note: legacy.note ?? '',
  });
}

export function canonicalFromCustomBowl(bowl?: CustomBowl | null): CanonicalCustomization {
  if (!bowl) return emptyCustomization();
  const group = (list: Array<{ id: string; name: string; price?: number }> | undefined) =>
    (list ?? []).map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: 1, // repetición por duplicados → el normalizador agrupa
      unitExtraPrice: ing.price ?? 0,
    }));

  return normalizeCustomization({
    bowl: {
      sizeId: bowl.size.size,
      sizeName: bowl.size.name,
      basePrice: bowl.size.price,
      selections: {
        bases: group(bowl.bases),
        proteins: group(bowl.proteins),
        accompaniments: group(bowl.acompanantes),
        sauces: group(bowl.sauces),
        complements: group(bowl.complementos),
      },
    },
    note: bowl.notes ?? '',
  });
}
