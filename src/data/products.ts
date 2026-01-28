import { Product, Category, Ingredient, BowlSizeRule, Modifier } from '@/types';

// Categories
export const categories: Category[] = [
  // Ohana Categories
  { id: 'ohana-premade', name: 'Bowls Preparados', brand: 'ohana', slug: 'premade', icon: '🥗' },
  { id: 'ohana-custom', name: 'Arma tu Bowl', brand: 'ohana', slug: 'custom', icon: '✨' },
  
  // Chilli Categories
  { id: 'chilli-burgers', name: 'Hamburguesas', brand: 'chilli', slug: 'burgers', icon: '🍔' },
  { id: 'chilli-hotdogs', name: 'Hot Dogs', brand: 'chilli', slug: 'hotdogs', icon: '🌭' },
  { id: 'chilli-fries', name: 'Papas Fritas', brand: 'chilli', slug: 'fries', icon: '🍟' },
  { id: 'chilli-mazorcadas', name: 'Mazorcadas', brand: 'chilli', slug: 'mazorcadas', icon: '🌽' },
  { id: 'chilli-nachos', name: 'Nachos', brand: 'chilli', slug: 'nachos', icon: '🧀' },
  
  // Beverages
  { id: 'beverages-sodas', name: 'Refrescos', brand: 'ohana', slug: 'sodas', icon: '🥤' },
  { id: 'beverages-juices', name: 'Jugos Naturales', brand: 'ohana', slug: 'juices', icon: '🧃' },
  { id: 'beverages-water', name: 'Agua', brand: 'ohana', slug: 'water', icon: '💧' },
];

// Bowl Size Rules
export const bowlSizeRules: BowlSizeRule[] = [
  { size: 'small', name: 'Pequeño', price: 89, maxBases: 1, maxProteins: 1, maxAcompanantes: 4 },
  { size: 'medium', name: 'Mediano', price: 119, maxBases: 1, maxProteins: 2, maxAcompanantes: 5 },
  { size: 'large', name: 'Grande', price: 149, maxBases: 2, maxProteins: 2, maxAcompanantes: 6 },
];

// Ingredients for Bowl Builder
export const ingredients: Ingredient[] = [
  // Bases
  { id: 'base-rice', name: 'Arroz Blanco', type: 'base', calories: 130 },
  { id: 'base-brown-rice', name: 'Arroz Integral', type: 'base', calories: 110, isGlutenFree: true },
  { id: 'base-quinoa', name: 'Quinoa', type: 'base', calories: 120, isVegan: true, isGlutenFree: true },
  { id: 'base-lettuce', name: 'Mix de Lechugas', type: 'base', calories: 15, isVegan: true, isGlutenFree: true },
  { id: 'base-spinach', name: 'Espinaca Baby', type: 'base', calories: 20, isVegan: true, isGlutenFree: true },
  
  // Proteins
  { id: 'protein-chicken', name: 'Pollo a la Plancha', type: 'protein', calories: 165, isGlutenFree: true },
  { id: 'protein-salmon', name: 'Salmón', type: 'protein', calories: 180, isGlutenFree: true, price: 25 },
  { id: 'protein-tuna', name: 'Atún Sellado', type: 'protein', calories: 150, isGlutenFree: true, price: 20 },
  { id: 'protein-shrimp', name: 'Camarones', type: 'protein', calories: 100, isGlutenFree: true, price: 30 },
  { id: 'protein-tofu', name: 'Tofu Marinado', type: 'protein', calories: 80, isVegan: true, isGlutenFree: true },
  { id: 'protein-beef', name: 'Carne Asada', type: 'protein', calories: 200, isGlutenFree: true, price: 15 },
  
  // Acompañantes
  { id: 'acc-avocado', name: 'Aguacate', type: 'acompanante', calories: 80, isVegan: true, isGlutenFree: true },
  { id: 'acc-corn', name: 'Elote', type: 'acompanante', calories: 40, isVegan: true, isGlutenFree: true },
  { id: 'acc-edamame', name: 'Edamame', type: 'acompanante', calories: 60, isVegan: true, isGlutenFree: true },
  { id: 'acc-cucumber', name: 'Pepino', type: 'acompanante', calories: 10, isVegan: true, isGlutenFree: true },
  { id: 'acc-tomato', name: 'Tomate Cherry', type: 'acompanante', calories: 15, isVegan: true, isGlutenFree: true },
  { id: 'acc-carrot', name: 'Zanahoria Rallada', type: 'acompanante', calories: 25, isVegan: true, isGlutenFree: true },
  { id: 'acc-cabbage', name: 'Col Morada', type: 'acompanante', calories: 15, isVegan: true, isGlutenFree: true },
  { id: 'acc-mango', name: 'Mango', type: 'acompanante', calories: 35, isVegan: true, isGlutenFree: true },
  { id: 'acc-beans', name: 'Frijoles Negros', type: 'acompanante', calories: 70, isVegan: true, isGlutenFree: true },
  { id: 'acc-chickpeas', name: 'Garbanzos', type: 'acompanante', calories: 65, isVegan: true, isGlutenFree: true },
  { id: 'acc-seaweed', name: 'Alga Wakame', type: 'acompanante', calories: 5, isVegan: true, isGlutenFree: true },
  { id: 'acc-pineapple', name: 'Piña', type: 'acompanante', calories: 30, isVegan: true, isGlutenFree: true },
  
  // Sauces
  { id: 'sauce-sesame', name: 'Ajonjolí', type: 'sauce', isVegan: true },
  { id: 'sauce-sriracha', name: 'Sriracha Mayo', type: 'sauce' },
  { id: 'sauce-teriyaki', name: 'Teriyaki', type: 'sauce', isVegan: true },
  { id: 'sauce-chipotle', name: 'Chipotle', type: 'sauce' },
  { id: 'sauce-citrus', name: 'Cítrica', type: 'sauce', isVegan: true, isGlutenFree: true },
];

// Ohana Premade Bowls
export const ohanaProducts: Product[] = [
  {
    id: 'ohana-1',
    name: 'Bowl Hawaiano',
    description: 'Salmón fresco, arroz de sushi, aguacate, mango, edamame y salsa de ajonjolí',
    price: 159,
    brand: 'ohana',
    categoryId: 'ohana-premade',
    ingredients: ['Salmón', 'Arroz', 'Aguacate', 'Mango', 'Edamame'],
    calories: 520,
    isPopular: true,
  },
  {
    id: 'ohana-2',
    name: 'Bowl Mediterráneo',
    description: 'Pollo a la plancha, quinoa, pepino, tomate cherry, garbanzos y aderezo cítrico',
    price: 139,
    brand: 'ohana',
    categoryId: 'ohana-premade',
    ingredients: ['Pollo', 'Quinoa', 'Pepino', 'Tomate', 'Garbanzos'],
    calories: 450,
    isGlutenFree: true,
  },
  {
    id: 'ohana-3',
    name: 'Bowl Vegano Power',
    description: 'Tofu marinado, arroz integral, aguacate, edamame, col morada y salsa teriyaki',
    price: 129,
    brand: 'ohana',
    categoryId: 'ohana-premade',
    ingredients: ['Tofu', 'Arroz Integral', 'Aguacate', 'Edamame', 'Col'],
    calories: 380,
    isVegan: true,
    isGlutenFree: true,
    isNew: true,
  },
  {
    id: 'ohana-4',
    name: 'Bowl Tropical',
    description: 'Camarones al limón, arroz blanco, mango, piña, zanahoria y salsa chipotle',
    price: 169,
    brand: 'ohana',
    categoryId: 'ohana-premade',
    ingredients: ['Camarones', 'Arroz', 'Mango', 'Piña', 'Zanahoria'],
    calories: 420,
    isPopular: true,
  },
  {
    id: 'ohana-5',
    name: 'Bowl Tex-Mex',
    description: 'Carne asada, arroz, frijoles negros, elote, aguacate y salsa chipotle',
    price: 149,
    brand: 'ohana',
    categoryId: 'ohana-premade',
    ingredients: ['Carne', 'Arroz', 'Frijoles', 'Elote', 'Aguacate'],
    calories: 580,
    isGlutenFree: true,
  },
  {
    id: 'ohana-6',
    name: 'Bowl Atún Spicy',
    description: 'Atún sellado, mix de lechugas, pepino, wakame, mango y sriracha mayo',
    price: 159,
    brand: 'ohana',
    categoryId: 'ohana-premade',
    ingredients: ['Atún', 'Lechugas', 'Pepino', 'Wakame', 'Mango'],
    calories: 390,
    isNew: true,
  },
];

// Chilli Products
export const chilliProducts: Product[] = [
  // Burgers
  {
    id: 'chilli-burger-1',
    name: 'Chilli Burger Clásica',
    description: 'Carne de res 150g, queso cheddar, lechuga, tomate, cebolla y nuestra salsa especial',
    price: 89,
    brand: 'chilli',
    categoryId: 'chilli-burgers',
    calories: 650,
    isPopular: true,
  },
  {
    id: 'chilli-burger-2',
    name: 'Doble Chilli',
    description: 'Doble carne 300g, doble queso, tocino crujiente, jalapeños y salsa BBQ',
    price: 129,
    brand: 'chilli',
    categoryId: 'chilli-burgers',
    calories: 980,
    isPopular: true,
  },
  {
    id: 'chilli-burger-3',
    name: 'Burger Crispy Chicken',
    description: 'Pechuga empanizada, queso suizo, lechuga, tomate y mayonesa de chipotle',
    price: 95,
    brand: 'chilli',
    categoryId: 'chilli-burgers',
    calories: 720,
  },
  {
    id: 'chilli-burger-4',
    name: 'Mushroom Swiss',
    description: 'Carne de res, champiñones salteados, queso suizo y salsa de la casa',
    price: 109,
    brand: 'chilli',
    categoryId: 'chilli-burgers',
    calories: 680,
    isNew: true,
  },
  
  // Hot Dogs
  {
    id: 'chilli-hotdog-1',
    name: 'Hot Dog Clásico',
    description: 'Salchicha jumbo, mostaza, ketchup y cebolla picada',
    price: 49,
    brand: 'chilli',
    categoryId: 'chilli-hotdogs',
    calories: 380,
  },
  {
    id: 'chilli-hotdog-2',
    name: 'Chilli Dog',
    description: 'Salchicha jumbo, chili con carne, queso fundido y jalapeños',
    price: 69,
    brand: 'chilli',
    categoryId: 'chilli-hotdogs',
    calories: 520,
    isPopular: true,
  },
  {
    id: 'chilli-hotdog-3',
    name: 'Hot Dog Bacon Lover',
    description: 'Salchicha jumbo envuelta en tocino, queso y cebolla caramelizada',
    price: 75,
    brand: 'chilli',
    categoryId: 'chilli-hotdogs',
    calories: 580,
  },
  
  // Fries
  {
    id: 'chilli-fries-1',
    name: 'Papas Clásicas',
    description: 'Crujientes papas fritas con sal',
    price: 39,
    brand: 'chilli',
    categoryId: 'chilli-fries',
    calories: 320,
  },
  {
    id: 'chilli-fries-2',
    name: 'Chilli Cheese Fries',
    description: 'Papas con chili con carne, queso cheddar fundido y jalapeños',
    price: 69,
    brand: 'chilli',
    categoryId: 'chilli-fries',
    calories: 580,
    isPopular: true,
  },
  {
    id: 'chilli-fries-3',
    name: 'Loaded Fries',
    description: 'Papas con tocino, queso, crema y cebollín',
    price: 79,
    brand: 'chilli',
    categoryId: 'chilli-fries',
    calories: 620,
  },
  
  // Mazorcadas
  {
    id: 'chilli-mazorcada-1',
    name: 'Mazorcada Clásica',
    description: 'Elote asado con mayonesa, queso cotija, chile y limón',
    price: 45,
    brand: 'chilli',
    categoryId: 'chilli-mazorcadas',
    calories: 280,
    isPopular: true,
  },
  {
    id: 'chilli-mazorcada-2',
    name: 'Mazorcada Chilli',
    description: 'Elote asado con chili, queso fundido y chipotle',
    price: 55,
    brand: 'chilli',
    categoryId: 'chilli-mazorcadas',
    calories: 340,
  },
  
  // Nachos
  {
    id: 'chilli-nachos-1',
    name: 'Nachos Clásicos',
    description: 'Totopos con queso fundido, jalapeños, crema y guacamole',
    price: 79,
    brand: 'chilli',
    categoryId: 'chilli-nachos',
    calories: 680,
  },
  {
    id: 'chilli-nachos-2',
    name: 'Nachos Supremos',
    description: 'Totopos con carne, pollo, queso, frijoles, crema, guacamole y pico de gallo',
    price: 119,
    brand: 'chilli',
    categoryId: 'chilli-nachos',
    calories: 920,
    isPopular: true,
  },
];

// Beverages
export const beverages: Product[] = [
  // Sodas
  { id: 'bev-1', name: 'Coca-Cola', description: 'Refresco 355ml', price: 25, brand: 'ohana', categoryId: 'beverages-sodas', calories: 140 },
  { id: 'bev-2', name: 'Coca-Cola Zero', description: 'Refresco sin azúcar 355ml', price: 25, brand: 'ohana', categoryId: 'beverages-sodas', calories: 0 },
  { id: 'bev-3', name: 'Sprite', description: 'Refresco de lima-limón 355ml', price: 25, brand: 'ohana', categoryId: 'beverages-sodas', calories: 130 },
  { id: 'bev-4', name: 'Fanta Naranja', description: 'Refresco de naranja 355ml', price: 25, brand: 'ohana', categoryId: 'beverages-sodas', calories: 150 },
  
  // Juices
  { id: 'bev-5', name: 'Jugo Verde', description: 'Espinaca, manzana, pepino, jengibre y limón', price: 55, brand: 'ohana', categoryId: 'beverages-juices', calories: 120, isVegan: true },
  { id: 'bev-6', name: 'Jugo de Naranja', description: 'Naranja natural recién exprimida', price: 45, brand: 'ohana', categoryId: 'beverages-juices', calories: 110, isVegan: true },
  { id: 'bev-7', name: 'Limonada Natural', description: 'Limón fresco, agua y un toque de menta', price: 35, brand: 'ohana', categoryId: 'beverages-juices', calories: 80, isVegan: true },
  { id: 'bev-8', name: 'Smoothie Tropical', description: 'Mango, piña, plátano y leche de coco', price: 65, brand: 'ohana', categoryId: 'beverages-juices', calories: 220, isVegan: true },
  
  // Water
  { id: 'bev-9', name: 'Agua Natural', description: 'Botella 500ml', price: 20, brand: 'ohana', categoryId: 'beverages-water', calories: 0 },
  { id: 'bev-10', name: 'Agua Mineral', description: 'Topo Chico 355ml', price: 25, brand: 'ohana', categoryId: 'beverages-water', calories: 0 },
];

// All products combined
export const allProducts: Product[] = [...ohanaProducts, ...chilliProducts, ...beverages];

// Product modifiers
export const modifiers: Modifier[] = [
  { id: 'mod-extra-cheese', name: 'Extra Queso', price: 15, productId: 'chilli-burger-1' },
  { id: 'mod-bacon', name: 'Agregar Tocino', price: 20, productId: 'chilli-burger-1' },
  { id: 'mod-avocado', name: 'Agregar Aguacate', price: 25, productId: 'chilli-burger-1' },
  { id: 'mod-large-drink', name: 'Bebida Grande', price: 10, productId: 'bev-1' },
];

// Helper functions
export const getProductsByBrand = (brand: 'ohana' | 'chilli'): Product[] => {
  if (brand === 'ohana') return ohanaProducts;
  return chilliProducts;
};

export const getProductsByCategory = (categoryId: string): Product[] => {
  return allProducts.filter(p => p.categoryId === categoryId);
};

export const getCategoriesByBrand = (brand: 'ohana' | 'chilli'): Category[] => {
  return categories.filter(c => c.brand === brand);
};

export const getIngredientsByType = (type: Ingredient['type']): Ingredient[] => {
  return ingredients.filter(i => i.type === type);
};

export const getFeaturedProducts = (): Product[] => {
  return allProducts.filter(p => p.isPopular || p.isNew).slice(0, 6);
};

export const getBeverageCategories = (): Category[] => {
  return categories.filter(c => c.id.startsWith('beverages'));
};
