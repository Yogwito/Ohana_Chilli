import type { Product } from '@/types';

const DISH_CATEGORIES = new Set([
  'ohana-bowls-sugeridos', 'chilli-burgers', 'chilli-fries-salchipapas',
  'chilli-hot-dogs', 'chilli-mazorcadas-corn-bowls', 'chilli-nachos',
]);
const EDITORIAL_IDS = [
  '7460dcd8-cfe1-e147-4be0-2b66c4d1da62', // Paisa
  'be1fa199-5029-433f-7ccf-8fce38116665', // Teriyaki
  'c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', // Americana
];

/** Input is the active catalog returned by useProducts; never reintroduce cached products. */
export function selectFeaturedProducts(products: Product[]): Product[] {
  const dishes = products.filter(product => DISH_CATEGORIES.has(product.categoryId));
  const candidates = [
    ...dishes.filter(product => product.isPopular),
    ...EDITORIAL_IDS.flatMap(id => dishes.filter(product => product.id === id)),
    ...dishes,
  ];
  return [...new Map(candidates.map(product => [product.id, product])).values()].slice(0, 3);
}
