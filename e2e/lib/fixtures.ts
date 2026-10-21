import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';
import { PROD_REF } from './guard.mjs';
import { ARTIFACTS, MOCK, readDiscovery, type Discovery } from './data';
import { mockTables } from './mock/fixtures';
import { installSupabaseMock } from './mock/router';
import type { OrderRow, Row } from './types';

export interface WaCapture { url: string; text: string | null; via: string }

export interface Report {
  scenario: string;
  expected?: number | null;
  ui?: number | null;
  whatsapp?: number | null;
  db?: number | null;
  notes: string[];
}

export interface Ctx {
  discovery: Discovery;
  report: Report;
  /** create_order_with_items vistos desde el navegador (staging y mock). */
  rpcCalls: Row[];
  mockOrders: OrderRow[];
  waFromRoutes: WaCapture[];
  customerName: (scenario: string) => string;
  waCaptured: () => Promise<WaCapture[]>;
}

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const WA_RE = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i;

/** Corre ANTES que cualquier script de la app: nunca deja abrir WhatsApp. */
function waInitScript() {
  const isWa = (u: string) => /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i.test(u);
  const w = window as unknown as { __waCaptured: { url: string; text: string | null; via: string }[] };
  w.__waCaptured = [];
  const rec = (raw: string, via: string) => {
    let text: string | null = null;
    try { text = new URL(raw, location.href).searchParams.get('text'); } catch { /* whatsapp:// */ }
    w.__waCaptured.push({ url: raw, text, via });
  };
  const origOpen = window.open.bind(window);
  window.open = ((url?: string | URL, ...rest: unknown[]) => {
    const u = url == null ? '' : String(url);
    if (isWa(u)) { rec(u, 'window.open'); return null; }
    return origOpen(url as string, ...(rest as [string?, string?]));
  }) as typeof window.open;
  const onClick = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (a && isWa(a.href)) { e.preventDefault(); e.stopImmediatePropagation(); rec(a.href, 'click'); }
  };
  window.addEventListener('click', onClick, true);
  window.addEventListener('auxclick', onClick, true);
  // window.location.href = 'https://wa.me/...' (handoff móvil) → Navigation API.
  const nav = (window as unknown as { navigation?: EventTarget }).navigation;
  nav?.addEventListener('navigate', (e: Event) => {
    const ev = e as Event & { destination: { url: string }; cancelable: boolean };
    if (isWa(ev.destination.url) && ev.cancelable) { ev.preventDefault(); rec(ev.destination.url, 'navigate'); }
  });
}

export const test = base.extend<{ ctx: Ctx }>({
  ctx: [async ({ page, context }, use, testInfo) => {
    const discovery = readDiscovery();
    const report: Report = { scenario: testInfo.title, notes: [] };
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const rpcCalls: Row[] = [];
    const mockOrders: OrderRow[] = [];
    const waFromRoutes: WaCapture[] = [];

    await context.addInitScript(waInitScript);
    // Red de seguridad a nivel de red: WhatsApp y PRODUCCIÓN jamás salen.
    await context.route(/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//, (route) => {
      const u = route.request().url();
      waFromRoutes.push({ url: u, text: new URL(u).searchParams.get('text'), via: 'route-abort' });
      return route.abort('blockedbyclient');
    });
    await context.route(new RegExp(PROD_REF), (route) => {
      failedRequests.push(`BLOQUEADO PROD: ${route.request().url()}`);
      return route.abort('blockedbyclient');
    });
    context.on('page', (p) => { if (p !== page && WA_RE.test(p.url())) void p.close(); });

    const unmocked: string[] = [];
    if (MOCK) await installSupabaseMock(page, { tables: mockTables(), orders: mockOrders, unmocked });

    page.on('request', (req) => {
      if (req.url().includes('/rest/v1/rpc/create_order_with_items')) {
        try { rpcCalls.push(req.postDataJSON()); } catch { rpcCalls.push({}); }
      }
    });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => {
      const why = r.failure()?.errorText ?? '';
      if (why.includes('blockedbyclient') && WA_RE.test(r.url())) return;
      failedRequests.push(`${r.method()} ${r.url()} — ${why}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });

    const ctx: Ctx = {
      discovery, report, rpcCalls, mockOrders, waFromRoutes,
      customerName: (scenario) => `E2E-TEST-${process.env.E2E_RUN_ID}-${scenario}-${testInfo.project.name}`,
      waCaptured: async () => [
        ...(await page.evaluate(() => (window as unknown as { __waCaptured?: WaCapture[] }).__waCaptured ?? []).catch(() => [])),
        ...waFromRoutes,
      ],
    };

    await use(ctx);

    if (unmocked.length) report.notes.push(`sin mock: ${[...new Set(unmocked)].join(', ')}`);
    const dir = path.join(ARTIFACTS, 'results');
    fs.mkdirSync(dir, { recursive: true });
    const status = testInfo.status === testInfo.expectedStatus
      ? (testInfo.status === 'skipped' ? 'SALTADO' : testInfo.expectedStatus === 'failed' ? 'FALLA ESPERADA' : 'OK')
      : 'FALLÓ';
    const skipReason = testInfo.annotations.find((a) => a.type === 'skip')?.description;
    const error = testInfo.errors[0]?.message?.replace(ANSI_RE, '').split('\n').slice(0, 3).join(' ')
      ?? skipReason ?? '';
    fs.writeFileSync(
      path.join(dir, `${testInfo.project.name}-${testInfo.title.replace(/[^\w-]+/g, '_')}.json`),
      JSON.stringify({ ...report, project: testInfo.project.name, status, error, consoleErrors, failedRequests }, null, 2),
    );
    await testInfo.attach('diagnostico.json', {
      contentType: 'application/json',
      body: JSON.stringify({ consoleErrors, failedRequests, rpcCalls, notes: report.notes }, null, 2),
    });
  }, { auto: true }],
});

export { expect };
export type { Page };
