// Brand Types
export type Brand = 'ohana';

// Product Category Types
export interface Category {
  id: string;
  name: string;
  brand: Brand;
  slug: string;
  icon?: string;
}

// Delivery Zone Types
export interface DeliveryZone {
  id: string;
  name: string;
  feeCents: number;
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
}

// Bowl Size Rules
export interface BowlSizeRule {
  size: 'small' | 'medium' | 'large';
  name: string;
  price: number;
  maxBases: number;
  maxProteins: number;
  maxAcompanantes: number;
  maxSauces: number;
  maxComplementos: number;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: Brand;
  categoryId: string;
  imageUrl?: string;
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
  complementos?: Ingredient[];
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

// Promotion Types
export interface Promotion {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'label';
  discount_value: number;
  badge_text?: string;
  image_url?: string;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  sort_order: number;
  created_at: string;
}

// Order Types
export interface CustomerInfo {
  name: string;
  phone: string;
  orderType: 'pickup' | 'delivery';
  address?: string;
  deliveryZone?: string;
  deliveryFeeCents?: number;
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
export type BowlBuilderStep = 'size' | 'bases' | 'proteins' | 'acompanantes' | 'salsas' | 'complementos' | 'summary';
