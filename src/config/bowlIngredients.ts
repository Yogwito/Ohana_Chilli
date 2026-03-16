import type { BowlSizeRule, Ingredient } from '@/types';

interface OfficialIngredientConfig {
  name: string;
  type: Ingredient['type'];
  price?: number;
}

export const OFFICIAL_BOWL_SIZES: BowlSizeRule[] = [
  {
    size: 'small',
    name: 'Pequeño',
    price: 23900,
    maxBases: 1,
    maxProteins: 1,
    maxAcompanantes: 4,
    maxSauces: 1,
    maxComplementos: 1,
  },
  {
    size: 'medium',
    name: 'Mediano',
    price: 27900,
    maxBases: 1,
    maxProteins: 2,
    maxAcompanantes: 5,
    maxSauces: 2,
    maxComplementos: 2,
  },
  {
    size: 'large',
    name: 'Grande',
    price: 32900,
    maxBases: 1,
    maxProteins: 3,
    maxAcompanantes: 6,
    maxSauces: 3,
    maxComplementos: 3,
  },
];

const OFFICIAL_BOWL_INGREDIENTS: Record<Ingredient['type'], OfficialIngredientConfig[]> = {
  base: [
    { name: 'Lechuga', type: 'base' },
    { name: 'Pasta pesto', type: 'base' },
    { name: 'Arroz blanco', type: 'base' },
    { name: 'Arroz al wok', type: 'base' },
    { name: 'Nachos', type: 'base' },
    { name: 'Papas a la francesa', type: 'base', price: 6000 },
  ],
  protein: [
    { name: 'Res molida', type: 'protein' },
    { name: 'Cerdo a la naranja', type: 'protein' },
    { name: 'Chicharrón', type: 'protein' },
    { name: 'Proteína veggie', type: 'protein' },
    { name: 'Pollo agridulce', type: 'protein' },
    { name: 'Pollo al panko', type: 'protein' },
    { name: 'Pollo con chimichurri', type: 'protein' },
    { name: 'Proteína adicional', type: 'protein', price: 5000 },
  ],
  acompanante: [
    { name: 'Frijol', type: 'acompanante' },
    { name: 'Pimentón agridulce', type: 'acompanante' },
    { name: 'Garbanzos horneados', type: 'acompanante' },
    { name: 'Cebolla caramelizada', type: 'acompanante' },
    { name: 'Cebolla encurtida', type: 'acompanante' },
    { name: 'Pico de gallo', type: 'acompanante' },
    { name: 'Pepino agridulce', type: 'acompanante' },
    { name: 'Queso rallado', type: 'acompanante' },
    { name: 'Ripio de papa', type: 'acompanante' },
    { name: 'Piña asada', type: 'acompanante' },
    { name: 'Zucchini', type: 'acompanante' },
    { name: 'Maicitos', type: 'acompanante' },
    { name: 'Tomate', type: 'acompanante' },
    { name: 'Maduritos', type: 'acompanante' },
    { name: 'Guacamole', type: 'acompanante' },
    { name: 'Acompañante adicional', type: 'acompanante', price: 3000 },
  ],
  sauce: [
    { name: 'BBQ Honey', type: 'sauce' },
    { name: 'Mayo cilantro', type: 'sauce' },
    { name: 'Salsa de ajo', type: 'sauce' },
    { name: 'Crema agria', type: 'sauce' },
    { name: 'Cebolla dulce', type: 'sauce' },
    { name: 'Buffalo', type: 'sauce' },
    { name: 'Ohana chipotle', type: 'sauce' },
    { name: 'Chimichurri blanco', type: 'sauce' },
  ],
  topping: [
    { name: 'Pimienta roja', type: 'topping' },
    { name: 'Pimienta negra', type: 'topping' },
    { name: 'Ajonjolí', type: 'topping' },
    { name: 'Crutones de pan', type: 'topping' },
    { name: 'Choclitos triturados', type: 'topping' },
    { name: 'Doritos triturados', type: 'topping' },
    { name: 'Páprika', type: 'topping' },
    { name: 'Maní', type: 'topping' },
    { name: 'Croqueta veggie', type: 'topping', price: 5000 },
    { name: 'Queso frito', type: 'topping', price: 6000 },
  ],
};

function slugifyIngredientName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getOfficialBowlSizes(): BowlSizeRule[] {
  return OFFICIAL_BOWL_SIZES.map((size) => ({ ...size }));
}

export function getOfficialIngredients(type: Ingredient['type']): Ingredient[] {
  return OFFICIAL_BOWL_INGREDIENTS[type].map((ingredient) => ({
    id: `${type}-${slugifyIngredientName(ingredient.name)}`,
    name: ingredient.name,
    type: ingredient.type,
    price: ingredient.price,
  }));
}
