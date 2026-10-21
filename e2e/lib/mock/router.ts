import type { Page, Route } from '@playwright/test';
import type { OrderRow, Row, Tables } from '../types';
import { RpcError, createOrderWithItems, publicCatalog } from './rpc';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Aplica filtros PostgREST simples (`col=eq.x`, `col=ilike.*x*`) usados por la app. */
function applyFilters(rows: Row[], params: URLSearchParams) {
  let out = rows;
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const m = raw.match(/^(not\.)?(eq|neq|ilike|in)\.(.*)$/);
    if (!m) continue;
    const [, neg, op, val] = m;
    const test = (r: Row) => {
      const cell = r[key];
      if (op === 'eq') return String(cell) === val;
      if (op === 'neq') return String(cell) !== val;
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').includes(String(cell));
      const re = new RegExp(`^${val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
      return re.test(String(cell ?? ''));
    };
    out = out.filter((r) => (neg ? !test(r) : test(r)));
  }
  const limit = params.get('limit');
  return limit ? out.slice(0, Number(limit)) : out;
}

export interface MockOptions {
  tables: Tables;
  orders: OrderRow[];
  /** Llamado con cada invocación de create_order_with_items (args crudos). */
  onCreateOrder?: (args: Row) => void;
  unmocked: string[];
}

export async function installSupabaseMock(page: Page, opts: MockOptions) {
  const { tables, orders } = opts;
  const json = (route: Route, status: number, body: unknown, headers: Record<string, string> = {}) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', ...headers },
      body: JSON.stringify(body),
    });

  await page.route(/^https:\/\/[a-z0-9]+\.supabase\.co\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === 'OPTIONS') return json(route, 204, {});

    if (url.pathname.startsWith('/storage/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX });
    }
    if (url.pathname.startsWith('/auth/')) return json(route, 200, {});

    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc) {
      const args = req.postDataJSON() ?? {};
      if (rpc[1] === 'get_public_catalog') return json(route, 200, publicCatalog(tables));
      if (rpc[1] === 'create_order_with_items') {
        opts.onCreateOrder?.(args);
        try {
          const id = createOrderWithItems(tables, args, orders);
          return json(route, 200, id);
        } catch (e) {
          if (e instanceof RpcError) {
            return json(route, 400, { code: 'P0001', details: null, hint: null, message: e.message });
          }
          throw e;
        }
      }
    }

    const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
    if (table) {
      if (method === 'POST' && table === 'analytics_events') return json(route, 201, null);
      if (method === 'GET' || method === 'HEAD') {
        let source: Row[] | undefined = (tables as unknown as Record<string, Row[]>)[table];
        if (table === 'orders') source = orders.map(({ order_items: _items, ...o }) => o);
        if (table === 'order_items') source = orders.flatMap((o) => o.order_items);
        if (source) {
          const rows = applyFilters(source, url.searchParams);
          const accept = req.headers()['accept'] ?? '';
          if (accept.includes('vnd.pgrst.object')) {
            if (rows.length !== 1) {
              return json(route, 406, { code: 'PGRST116', details: `The result contains ${rows.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' });
            }
            return json(route, 200, rows[0]);
          }
          return json(route, 200, rows, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
        }
      }
    }

    opts.unmocked.push(`${method} ${url.pathname}${url.search}`);
    return json(route, 404, { code: 'E2E_MOCK', message: `Sin mock para ${method} ${url.pathname}` });
  });
}
