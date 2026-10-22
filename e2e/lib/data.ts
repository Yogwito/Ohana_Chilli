/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertStaging } from './guard.mjs';
import { mockTables } from './mock/fixtures';
import { publicCatalog } from './mock/rpc';
import type { OrderRow, Row, Tables } from './types';

export const MOCK = process.env.E2E_MOCK === '1';
export const ARTIFACTS = path.resolve(process.cwd(), 'e2e', 'artifacts');
export const DISCOVERY_FILE = path.join(ARTIFACTS, 'discovery.json');

let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  if (MOCK) throw new Error('adminClient no disponible en mock');
  if (!admin) {
    const { url, serviceKey } = assertStaging({ requireServiceKey: true });
    admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

const TABLE_NAMES: (keyof Tables)[] = [
  'brands', 'categories', 'products', 'product_default_ingredients', 'product_variants',
  'ingredients', 'bowl_rules', 'promotions', 'delivery_zones', 'settings',
];

export async function loadTables(): Promise<{ tables: Tables; catalog: any; warnings: string[] }> {
  const warnings: string[] = [];
  if (MOCK) {
    const tables = mockTables();
    return { tables, catalog: publicCatalog(tables), warnings };
  }
  const db = adminClient();
  const tables = {} as Tables;
  for (const name of TABLE_NAMES) {
    const { data, error } = await db.from(name).select('*');
    if (error) {
      warnings.push(`No se pudo leer ${name}: ${error.message}`);
      (tables as any)[name] = [];
    } else (tables as any)[name] = data ?? [];
  }
  const { data: catalog, error } = await db.rpc('get_public_catalog');
  if (error) warnings.push(`get_public_catalog falló con service role: ${error.message}`);
  return { tables, catalog: catalog ?? publicCatalog(tables), warnings };
}

// Port de src/domain/bowlPricing.ts#getIngredientExtraCharge (sobre filas crudas).
export function ingredientCharge(row: Row): number {
  if ((row.price_cents ?? 0) > 0) return row.price_cents;
  const n = String(row.name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!n.includes('adicional') && !n.includes('extra')) return 0;
  if (row.type === 'protein') return 5000;
  if (['acompanante', 'topping', 'sauce', 'base'].includes(row.type)) return 3000;
  return 0;
}

export interface Pick<T> { value: T | null; reason?: string }
export interface ProductPick { id: string; name: string; price: number }
export interface Discovery {
  mode: 'mock' | 'staging';
  generatedAt: string;
  warnings: string[];
  whatsappNumber: string | null;
  hoursEnforced: boolean;
  simple: Pick<ProductPick>;
  extras: Pick<ProductPick & { extras: { id: string; name: string; price: number }[] }>;
  hatsu: Pick<ProductPick & { variants: { id: string; name: string; delta: number }[] }>;
  bowl: Pick<{
    size: { size: string; name: string; price: number; bases: number; proteins: number; accompaniments: number };
    /** Todos los tamaños (más barato primero) para los escenarios de bowl complejo. */
    sizes: { size: string; name: string; price: number; bases: number; proteins: number; accompaniments: number }[];
    bases: string[]; proteins: string[]; acompanantes: string[]; sauces: string[]; complementos: string[];
    premiumProtein: { name: string; charge: number };
    premiumSauce: { name: string; charge: number };
    premiumComplemento: { name: string; charge: number };
    expectedPrice: number;
  }>;
  combo: Pick<{ id: string; title: string; price: number }>;
  zone: Pick<{ id: string; name: string; fee: number }>;
}

export function discover(tables: Tables, catalog: any, warnings: string[]): Discovery {
  const nowMs = Date.now();
  const catProducts: Row[] = (catalog?.products ?? []).filter((p: Row) => p.is_active !== false);
  const publicIds = new Set(catProducts.map((p) => p.id));
  const nameCount = new Map<string, number>();
  catProducts.forEach((p) => nameCount.set(p.name, (nameCount.get(p.name) ?? 0) + 1));
  const visible = catProducts.filter((p) => p.category_id !== 'ohana-arma-tu-bowl' && nameCount.get(p.name) === 1 && p.price_cents > 0);
  const pdiBy = (id: string) => tables.product_default_ingredients.filter((r) => r.product_id === id);
  const variantsBy = (id: string) => tables.product_variants.filter((v) => v.product_id === id && v.is_active);
  const settings = Object.fromEntries((catalog?.settings ?? tables.settings).map((s: Row) => [s.key, s.value]));

  const simpleRow = visible.find((p) => pdiBy(p.id).length === 0 && variantsBy(p.id).length === 0 && !/hatsu/i.test(p.name));
  const extrasRow = visible.find((p) => pdiBy(p.id).filter((r) => r.is_extra && r.extra_price_cents > 0).length >= 2
    && (variantsBy(p.id).length === 0 || variantsBy(p.id).some((v) => v.price_delta_cents === 0)));
  const hatsuRow = catProducts.find((p) => /hatsu.*400/i.test(p.name) && publicIds.has(p.id));
  const hatsuVariants = hatsuRow ? variantsBy(hatsuRow.id) : [];

  // Bowl
  const ings: Row[] = (catalog?.ingredients ?? []).filter((i: Row) => i.is_active !== false);
  const free = (type: string) => ings.filter((i) => i.type === type && ingredientCharge(i) === 0);
  const premium = (type: string) => ings.filter((i) => i.type === type && ingredientCharge(i) > 0);
  const rules: Row[] = [...(catalog?.bowl_rules ?? [])].sort((a, b) => a.price_cents - b.price_cents);
  let bowl: Discovery['bowl'] = { value: null, reason: 'sin bowl_rules' };
  if (rules.length) {
    const r = rules[0];
    const missing: string[] = [];
    if (!free('base').length) missing.push('bases incluidas');
    if (!free('protein').length) missing.push('proteínas incluidas');
    if (!premium('protein').length) missing.push('proteína premium (cargo > 0)');
    if (free('acompanante').length < Math.ceil(r.accompaniments / Math.min(3, r.accompaniments))) missing.push('acompañantes incluidos');
    if (!premium('sauce').length) missing.push('salsa premium');
    if (!premium('topping').length || !free('topping').length) missing.push('complemento premium + uno gratis');
    if (missing.length) bowl = { value: null, reason: `faltan datos para bowl: ${missing.join(', ')}` };
    else {
      const pp = premium('protein')[0];
      const ps = premium('sauce')[0];
      const pc = premium('topping')[0];
      const names = (rows: Row[]) => rows.map((x) => x.name);
      bowl = {
        value: {
          size: { size: r.size, name: r.name, price: r.price_cents, bases: r.bases, proteins: r.proteins, accompaniments: r.accompaniments },
          sizes: rules.map((x) => ({ size: x.size, name: x.name, price: x.price_cents, bases: x.bases, proteins: x.proteins, accompaniments: x.accompaniments })),
          bases: names(free('base')), proteins: names(free('protein')), acompanantes: names(free('acompanante')),
          sauces: names(free('sauce')), complementos: names(free('topping')),
          premiumProtein: { name: pp.name, charge: ingredientCharge(pp) },
          premiumSauce: { name: ps.name, charge: ingredientCharge(ps) },
          premiumComplemento: { name: pc.name, charge: ingredientCharge(pc) },
          expectedPrice: r.price_cents + ingredientCharge(pp) + ingredientCharge(ps) + ingredientCharge(pc),
        },
      };
    }
  }

  const today = new Date().getDay();
  const comboRow = (catalog?.promotions ?? []).find((pr: Row) => pr.is_active && pr.type === 'combo' && pr.price_cents != null
    && (!pr.starts_at || Date.parse(pr.starts_at) <= nowMs) && (!pr.ends_at || Date.parse(pr.ends_at) >= nowMs + 3_600_000)
    && (!pr.days_of_week?.length || pr.days_of_week.includes(today)));
  const zones = tables.delivery_zones.filter((z) => z.is_active && z.fee_cents > 0);
  const zoneRow = zones.find((z) => zones.filter((o) => o.name.toLowerCase().includes(z.name.toLowerCase())).length === 1) ?? zones[0];

  const pp = (p: Row | undefined): ProductPick | null => (p ? { id: p.id, name: p.name, price: p.price_cents } : null);
  return {
    mode: MOCK ? 'mock' : 'staging',
    generatedAt: new Date().toISOString(),
    warnings,
    whatsappNumber: settings.whatsapp_number ?? null,
    hoursEnforced: settings.business_hours_enforce === 'true',
    simple: simpleRow ? { value: pp(simpleRow) } : { value: null, reason: 'no hay producto activo sin extras ni variantes' },
    extras: extrasRow
      ? { value: { ...pp(extrasRow)!, extras: pdiBy(extrasRow.id).filter((r) => r.is_extra && r.extra_price_cents > 0)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).slice(0, 2)
          .map((r) => ({ id: r.id, name: r.ingredient_name, price: r.extra_price_cents })) } }
      : { value: null, reason: 'no hay producto con >= 2 product_default_ingredients is_extra' },
    hatsu: !hatsuRow
      ? { value: null, reason: "no hay producto público con nombre ilike '%hatsu%400%'" }
      : !hatsuVariants.some((v) => v.price_delta_cents === 0)
        ? { value: null, reason: `${hatsuRow.name} no tiene variantes activas con delta 0 (el servidor exigirá sabor)` }
        : { value: { ...pp(hatsuRow)!, variants: hatsuVariants.map((v) => ({ id: v.id, name: v.name, delta: v.price_delta_cents })) } },
    bowl,
    combo: comboRow ? { value: { id: comboRow.id, title: comboRow.title, price: comboRow.price_cents } }
      : { value: null, reason: 'no hay promoción combo vigente hoy con price_cents' },
    zone: zoneRow ? { value: { id: zoneRow.id, name: zoneRow.name, fee: zoneRow.fee_cents } }
      : { value: null, reason: 'no hay delivery_zones activa con fee_cents > 0' },
  };
}

export function readDiscovery(): Discovery {
  return JSON.parse(fs.readFileSync(DISCOVERY_FILE, 'utf8'));
}

/** Consulta pedidos por nombre exacto. En mock lee el store del worker. */
export async function findOrders(name: string, mockStore?: OrderRow[]): Promise<OrderRow[]> {
  if (MOCK) return (mockStore ?? []).filter((o) => o.customer_name === name);
  const { data, error } = await adminClient()
    .from('orders')
    .select('id, customer_name, phone, order_type, address, delivery_zone, delivery_fee_cents, total_cents, notes, created_at, order_items(*)')
    .eq('customer_name', name);
  if (error) throw new Error(`Consulta de orders falló: ${error.message}`);
  return (data ?? []) as OrderRow[];
}
