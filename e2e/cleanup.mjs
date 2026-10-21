#!/usr/bin/env node
// Borra SOLO pedidos de prueba (customer_name LIKE 'E2E-TEST-%') en STAGING.
// order_items primero, luego orders. Se niega a correr fuera de staging.
import { createClient } from '@supabase/supabase-js';
import { assertStaging } from './lib/guard.mjs';

const PATTERN = 'E2E-TEST-%';

let env;
try {
  env = assertStaging({ requireServiceKey: true });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
if (env.mock) {
  console.log('[cleanup] E2E_MOCK=1: nada que limpiar (no hay base de datos).');
  process.exit(0);
}

const db = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function count() {
  const { data, error } = await db.from('orders').select('id').like('customer_name', PATTERN);
  if (error) throw new Error(`orders: ${error.message}`);
  const ids = data.map((r) => r.id);
  let items = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const { count: c, error: e } = await db.from('order_items').select('id', { count: 'exact', head: true }).in('order_id', ids.slice(i, i + 100));
    if (e) throw new Error(`order_items: ${e.message}`);
    items += c ?? 0;
  }
  return { ids, items };
}

try {
  const before = await count();
  console.log(`[cleanup] ANTES: ${before.ids.length} orders E2E-TEST-*, ${before.items} order_items`);
  for (let i = 0; i < before.ids.length; i += 100) {
    const chunk = before.ids.slice(i, i + 100);
    const { error: e1 } = await db.from('order_items').delete().in('order_id', chunk);
    if (e1) throw new Error(`borrando order_items: ${e1.message}`);
    // Doble filtro: id del lote Y patrón de nombre, para no tocar nada más.
    const { error: e2 } = await db.from('orders').delete().in('id', chunk).like('customer_name', PATTERN);
    if (e2) throw new Error(`borrando orders: ${e2.message}`);
  }
  const after = await count();
  console.log(`[cleanup] DESPUÉS: ${after.ids.length} orders E2E-TEST-*, ${after.items} order_items`);
  process.exit(after.ids.length === 0 ? 0 : 1);
} catch (e) {
  console.error(`[cleanup] ERROR: ${e.message}`);
  process.exit(1);
}
