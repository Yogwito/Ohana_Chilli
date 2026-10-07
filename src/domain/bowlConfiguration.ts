import { z } from 'zod';
import type { BowlExtra, BowlSizeRule, CustomBowl, Ingredient } from '@/types';

export const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['base', 'protein', 'acompanante', 'sauce', 'topping']),
  price: z.number().int().nonnegative().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
});
const extraSchema = z.object({
  ingredient: ingredientSchema,
  quantity: z.number().int().positive(),
  source: z.enum(['catalog', 'generic', 'upsell', 'suggestion', 'legacy']),
  tariffId: z.string().optional(),
  unitPrice: z.number().int().nonnegative(),
});
export const bowlSchema = z.object({
  size: z.object({
    size: z.enum(['small', 'medium', 'large']),
    name: z.string(),
    price: z.number().int().nonnegative(),
    maxBases: z.number().int().nonnegative(),
    maxProteins: z.number().int().nonnegative(),
    maxAcompanantes: z.number().int().nonnegative(),
    maxSauces: z.number().int().nonnegative(),
    maxComplementos: z.number().int().nonnegative(),
  }),
  bases: z.array(ingredientSchema),
  proteins: z.array(ingredientSchema),
  acompanantes: z.array(ingredientSchema),
  sauces: z.array(ingredientSchema).default([]),
  complementos: z.array(ingredientSchema).default([]),
  extras: z.array(extraSchema).default([]),
  notes: z.string().optional(),
  reviewIssues: z.array(z.string()).optional(),
});
export const sections = [
  { key: 'bases', type: 'base', label: 'Bases', max: 'maxBases', min: 1 },
  {
    key: 'proteins',
    type: 'protein',
    label: 'Proteínas',
    max: 'maxProteins',
    min: 1,
  },
  {
    key: 'acompanantes',
    type: 'acompanante',
    label: 'Acompañantes',
    max: 'maxAcompanantes',
    min: 0,
  },
  { key: 'sauces', type: 'sauce', label: 'Salsas', max: 'maxSauces', min: 0 },
  {
    key: 'complementos',
    type: 'topping',
    label: 'Complementos',
    max: 'maxComplementos',
    min: 0,
  },
] as const;
const normalized = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const GENERIC_EXTRA_IDS = new Set([
  'protein-proteina-adicional',
  'acompanante-adicional',
  'topping-complemento-adicional',
]);
// Canonical IDs remain generic even when an administrator changes their display name.
// Only generic slots open a selector. A concrete food never acts as a tariff for another food.
export function isGenericExtra(i: Ingredient) {
  return (
    GENERIC_EXTRA_IDS.has(i.id) ||
    [
      'proteina adicional',
      'proteina extra',
      'acompanante adicional',
      'acompanante extra',
      'complemento adicional',
      'complemento extra',
    ].includes(normalized(i.name))
  );
}
export function extraPrice(
  i: Ingredient,
  source: BowlExtra['source'],
  tariff?: Ingredient,
) {
  if (source === 'catalog') return i.price || 0;
  if (tariff) return tariff.price || (tariff.type === 'protein' ? 5000 : 3000);
  if ((i.price || 0) > 0) return i.price!;
  return i.type === 'protein'
    ? 5000
    : i.type === 'sauce'
      ? 2000
      : i.type === 'topping'
        ? 500
        : source === 'upsell'
          ? 2000
          : 3000;
}
export function validateBowl(
  bowl: CustomBowl,
  sizes?: BowlSizeRule[],
  ingredients?: Ingredient[],
) {
  const issues: { section: string; message: string }[] = [];
  if (!bowlSchema.safeParse(bowl).success)
    return [
      {
        section: 'size',
        message: 'La configuración guardada necesita revisión.',
      },
    ];
  if (sizes && !sizes.some((s) => s.size === bowl.size.size))
    issues.push({
      section: 'size',
      message: 'Este tamaño ya no está disponible.',
    });
  for (const s of sections) {
    const items = bowl[s.key] || [];
    if (items.length < s.min)
      issues.push({
        section: s.key,
        message: `Elige al menos una opción en ${s.label.toLowerCase()}.`,
      });
    if (items.length > bowl.size[s.max])
      issues.push({
        section: s.key,
        message: `Ajusta ${s.label.toLowerCase()}: el tamaño permite hasta ${bowl.size[s.max]}.`,
      });
    if (
      s.type === 'acompanante' &&
      items.some((i) => items.filter((x) => x.id === i.id).length > 3)
    )
      issues.push({
        section: s.key,
        message: 'Puedes incluir hasta tres porciones del mismo acompañante.',
      });
    if (
      items.some(
        (i) =>
          i.type !== s.type ||
          (ingredients &&
            !ingredients.some((x) => x.id === i.id && x.type === s.type)) ||
          isGenericExtra(i),
      )
    )
      issues.push({
        section: s.key,
        message: `Revisa las opciones no disponibles en ${s.label.toLowerCase()}.`,
      });
  }
  for (const extra of bowl.extras || []) {
    if (extra.source === 'legacy')
      issues.push({
        section: 'extras',
        message: `Revisa la tarifa antigua de ${extra.ingredient.name}. Quita esa porción y selecciónala nuevamente.`,
      });
    if (
      isGenericExtra(extra.ingredient) ||
      (ingredients &&
        !ingredients.some(
          (i) =>
            i.id === extra.ingredient.id && i.type === extra.ingredient.type,
        )) ||
      (extra.tariffId &&
        ingredients &&
        !ingredients.some((i) => i.id === extra.tariffId && isGenericExtra(i)))
    )
      issues.push({
        section: 'extras',
        message: `Revisa el extra ${extra.ingredient.name}: ya no está disponible.`,
      });
  }
  for (const message of bowl.reviewIssues || [])
    issues.push({ section: 'extras', message });
  return issues;
}
export function reconcileBowl(
  input: CustomBowl,
  sizes: BowlSizeRule[],
  ingredients: Ingredient[],
): CustomBowl {
  const bowl = bowlSchema.parse(input) as CustomBowl;
  const issues: string[] = [];
  const extras: BowlExtra[] = (bowl.extras || []).map((e) => ({ ...e }));
  const next = {
    ...bowl,
    size: sizes.find((s) => s.size === bowl.size.size) || bowl.size,
    extras,
  };
  for (const s of sections) {
    next[s.key] = (bowl[s.key] || []).flatMap((item) => {
      const current = ingredients.find((i) => i.id === item.id);
      if (current) {
        if (
          current.type !== 'base' &&
          current.price &&
          !isGenericExtra(current)
        ) {
          const found = extras.find(
            (e) => e.ingredient.id === current.id && e.source === 'catalog',
          );
          if (found) found.quantity += 1;
          else
            extras.push({
              ingredient: current,
              quantity: 1,
              source: 'catalog',
              unitPrice: current.price,
            });
          return [];
        }
        return [current];
      }
      if (/^extra-/.test(item.id)) {
        const name = item.name
          .replace(/^(Proteína|Acompañante|Complemento|Salsa) extra:\s*/i, '')
          .replace(/\s*\(\+.*\)$/, '');
        const matches = ingredients.filter(
          (i) =>
            i.type === item.type &&
            normalized(i.name) === normalized(name) &&
            !isGenericExtra(i),
        );
        const knownPrices =
          item.type === 'protein'
            ? [5000]
            : item.type === 'acompanante'
              ? [2000, 3000]
              : item.type === 'topping'
                ? [500, 3000]
                : [2000];
        const configuredPrices = ingredients
          .filter(
            (i) =>
              i.type === item.type &&
              (isGenericExtra(i) || normalized(i.name) === normalized(name)),
          )
          .map((i) => i.price || 0);
        if (
          matches.length === 1 &&
          (item.price || 0) > 0 &&
          [...knownPrices, ...configuredPrices].includes(item.price!)
        ) {
          const ingredient = matches[0];
          const tariffs = ingredients.filter(
            (i) => i.type === item.type && isGenericExtra(i),
          );
          const usesGeneric =
            item.type === 'protein' ||
            ((item.type === 'acompanante' || item.type === 'topping') &&
              item.price === 3000);
          const source: BowlExtra['source'] =
            ingredient.price === item.price
              ? 'catalog'
              : usesGeneric
                ? 'generic'
                : item.type === 'acompanante'
                  ? 'upsell'
                  : 'suggestion';
          if (source === 'generic' && tariffs.length !== 1) {
            issues.push(
              `No pudimos verificar la tarifa del extra antiguo ${item.name}. Quítalo o selecciónalo nuevamente.`,
            );
            return [item];
          }
          const tariff = source === 'generic' ? tariffs[0] : undefined;
          extras.push({
            ingredient,
            quantity: 1,
            source,
            tariffId: tariff?.id,
            unitPrice: extraPrice(ingredient, source, tariff),
          });
          return [];
        }
        issues.push(
          `No pudimos identificar el extra antiguo ${item.name}. Quítalo o selecciónalo nuevamente.`,
        );
      }
      return [item];
    });
  }
  next.extras = extras.map((extra) => {
    const ingredient =
      ingredients.find((i) => i.id === extra.ingredient.id) || extra.ingredient;
    const tariff = extra.tariffId
      ? ingredients.find((i) => i.id === extra.tariffId)
      : undefined;
    return {
      ...extra,
      ingredient,
      unitPrice:
        extra.source === 'legacy' || (extra.tariffId && !tariff)
          ? extra.unitPrice
          : extraPrice(ingredient, extra.source, tariff),
    };
  });
  next.reviewIssues = issues;
  return next;
}
