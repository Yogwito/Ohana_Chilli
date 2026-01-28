// Brand Types
export type Brand = 'ohana' | 'chilli';

// Product Category Types
export interface Category {
  id: string;
  name: string;
  brand: Brand;
  slug: string;
  icon?: string;
}

// Ingredient Types for Bowl Builder
export interface Ingredient {
  id: string;
  name: string;
  type: 'base' | 'protein' | 'acompanante' | 'sauce' | 'topping';
  price?: number;
  calories?: number;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  image?: string;
}

// Bowl Size Rules
export interface BowlSizeRule {
  size: 'small' | 'medium' | 'large';
  name: string;
  price: number;
  maxBases: number;
  maxProteins: number;
  maxAcompanantes: number;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: Brand;
  categoryId: string;
  image?: string;
  ingredients?: string[];
  calories?: number;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}

// Product Modifier
export interface Modifier {
  id: string;
  name: string;
  price: number;
  productId: string;
}

// Custom Bowl Type
export interface CustomBowl {
  size: BowlSizeRule;
  bases: Ingredient[];
  proteins: Ingredient[];
  acompanantes: Ingredient[];
  sauces?: Ingredient[];
  notes?: string;
}

// Cart Item Types
export interface CartItem {
  id: string;
  brand: Brand;
  type: 'product' | 'custom-bowl';
  product?: Product;
  customBowl?: CustomBowl;
  modifiers?: Modifier[];
  quantity: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

// Cart State
export interface CartState {
  items: CartItem[];
  subtotal: number;
  total: number;
}

// Order Types
export interface CustomerInfo {
  name: string;
  phone: string;
  orderType: 'pickup' | 'delivery';
  address?: string;
  notes?: string;
}

export interface Order {
  id: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  total: number;
  createdAt: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
}

// Bowl Builder Step
export type BowlBuilderStep = 'size' | 'bases' | 'proteins' | 'acompanantes' | 'summary';
