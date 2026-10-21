/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export interface Tables {
  brands: Row[];
  categories: Row[];
  products: Row[];
  product_default_ingredients: Row[];
  product_variants: Row[];
  ingredients: Row[];
  bowl_rules: Row[];
  promotions: Row[];
  delivery_zones: Row[];
  settings: Row[];
}

export interface OrderRow {
  id: string;
  customer_name: string;
  phone: string;
  order_type: string;
  address: string | null;
  delivery_zone: string | null;
  delivery_fee_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  order_items: Row[];
}
