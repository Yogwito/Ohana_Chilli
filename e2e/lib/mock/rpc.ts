// Port JS de supabase/hotfix/2026-10-21_create_order_with_items.sql (misma lógica y mensajes),
// usado SOLO en E2E_MOCK=1. Si la SQL cambia, actualiza esto.
import type { OrderRow, Row, Tables } from '../types';
import { randomUUID } from 'node:crypto';

export class RpcError extends Error {}

const BOWL_WHITELIST = [500, 2000, 3000, 5000];

export function createOrderWithItems(t: Tables, args: Row, store: OrderRow[]): string {
  const raise = (m: string) => { throw new RpcError(m); };
  const name = args.p_customer_name;
  if (!name || String(name).trim().length < 2) raise('Nombre de cliente inválido');
  if (!args.p_phone || String(args.p_phone).replace(/\D/g, '').length < 7) raise('Teléfono inválido');
  if (!['pickup', 'delivery'].includes(args.p_order_type)) raise('Tipo de orden inválido');
  const items: Row[] = args.p_items;
  if (!Array.isArray(items) || items.length === 0) raise('La orden no tiene items');

  let fee = 0;
  if (args.p_order_type === 'delivery') {
    if (!args.p_address || String(args.p_address).trim().length < 5) raise('Dirección inválida para domicilio');
    const zone = t.delivery_zones.find((z) => z.is_active
      && String(z.name).trim().toLowerCase() === String(args.p_delivery_zone ?? '').trim().toLowerCase());
    if (!zone) raise(`Zona de entrega no disponible: ${args.p_delivery_zone}`);
    fee = zone.fee_cents;
  }
  if ((args.p_delivery_fee_cents ?? 0) !== fee) {
    raise(`Tarifa de domicilio no coincide (enviada ${args.p_delivery_fee_cents}, vigente ${fee})`);
  }

  let subtotal = 0;
  const nowMs = Date.now();
  for (const item of items) {
    const qty = Number(item.quantity ?? 0);
    if (qty < 1 || qty > 50) raise(`Cantidad inválida para ${item.name}`);
    const claimed = item.unit_price_cents ?? -1;
    const d = item.details ?? {};
    let unit = 0;
    let pid: string | null = null;

    if (d.product_id != null) {
      if (String(d.product_id).startsWith('promo-')) {
        const promoId = String(d.product_id).slice(6);
        const pr = t.promotions.find((x) => x.id === promoId && x.is_active && x.type === 'combo' && x.price_cents != null
          && (!x.starts_at || Date.parse(x.starts_at) <= nowMs) && (!x.ends_at || Date.parse(x.ends_at) >= nowMs));
        if (!pr) raise(`Promoción no disponible: ${item.name}`);
        unit = pr.price_cents;
      } else {
        const prod = t.products.find((x) => x.id === d.product_id && x.is_active);
        if (!prod) raise(`Producto no disponible: ${item.name}`);
        unit = prod.price_cents;
        pid = prod.id;
        const variantId = d.customizations?.variant?.id;
        const active = t.product_variants.filter((v) => v.product_id === pid && v.is_active);
        if (variantId != null) {
          const v = active.find((x) => x.id === variantId);
          if (!v) raise(`Sabor/variante no disponible para ${item.name}`);
          unit += v.price_delta_cents;
        } else if (active.length > 0 && !active.some((v) => v.price_delta_cents === 0)) {
          raise(`Falta seleccionar sabor para ${item.name}`);
        }
      }
      for (const extra of d.customizations?.extras ?? []) {
        let price: number | null = null;
        if (pid) {
          const x = t.product_default_ingredients.find((r) => r.id === extra.id && r.product_id === pid && r.is_extra);
          if (x) price = x.extra_price_cents;
        }
        if (price == null) {
          const p2 = t.products.find((r) => r.id === extra.id && r.is_active);
          if (p2) price = p2.price_cents;
        }
        if (price == null) raise(`Adicional no disponible: ${extra.name}`);
        unit += price;
      }
    } else if (d.validation != null) {
      const v = d.validation;
      const rule = t.bowl_rules.find((r) => r.size === v.size);
      if (!rule) raise('Tamaño de bowl inválido');
      unit = rule.price_cents;
      for (const id of v.ingredient_ids ?? []) {
        const i = t.ingredients.find((r) => r.id === id && r.is_active);
        if (!i) raise(`Ingrediente no disponible: ${id}`);
        unit += i.price_cents;
      }
      for (const extra of v.extras ?? []) {
        const charge = Number(extra.charge ?? -1);
        if (!BOWL_WHITELIST.includes(charge) && !t.ingredients.some((i) => i.is_active && i.price_cents > 0 && i.price_cents === charge)) {
          raise(`Recargo de bowl inválido: ${extra.name} (${charge})`);
        }
        unit += charge;
      }
    } else {
      raise(`Item sin datos de validación: ${item.name}`);
    }
    if (claimed !== unit) raise(`Precio no coincide para ${item.name} (enviado ${claimed}, vigente ${unit})`);
    subtotal += unit * qty;
  }
  if ((args.p_total_cents ?? -1) !== subtotal + fee) {
    raise(`Total no coincide (enviado ${args.p_total_cents}, vigente ${subtotal + fee})`);
  }

  const id = randomUUID();
  store.push({
    id, customer_name: String(name).trim(), phone: String(args.p_phone).trim(), order_type: args.p_order_type,
    address: args.p_address ?? null, delivery_zone: args.p_delivery_zone ?? null, delivery_fee_cents: fee,
    total_cents: subtotal + fee, notes: args.p_notes ?? null, created_at: new Date().toISOString(),
    order_items: items.map((it) => ({
      id: randomUUID(), order_id: id, brand_id: it.brand_id, name: it.name,
      unit_price_cents: it.unit_price_cents ?? 0, quantity: it.quantity ?? 1, details: it.details ?? null,
    })),
  });
  return id;
}

export function publicCatalog(t: Tables) {
  const pick = (r: Row, keys: string[]) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]));
  return {
    products: t.products.filter((p) => p.is_active),
    categories: t.categories,
    ingredients: t.ingredients.filter((i) => i.is_active),
    bowl_rules: t.bowl_rules,
    promotions: t.promotions.filter((p) => p.is_active),
    settings: t.settings.map((s) => pick(s, ['key', 'value'])),
  };
}
