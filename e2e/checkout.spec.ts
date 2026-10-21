/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page, TestInfo } from '@playwright/test';
import { test, expect, type Ctx } from './lib/fixtures';
import { findOrders, MOCK } from './lib/data';
import {
  addCombo, addProduct, buildBowl, fillCheckout, goToCheckout, gotoHome, money, readUiTotal,
  selectZone, shot, submit, submitButton,
} from './lib/ui';

const PHONE = '+57 300 000 0000';
const CART_KEY = 'ohana-bowls-cart'; // clave real en src/context/CartContext.tsx

interface Line { label: string; qty: number; productId?: string; extraIds?: string[]; bowl?: boolean }

function need<T>(pick: { value: T | null; reason?: string }, what: string): T {
  test.skip(!pick.value, `Sin datos en ${MOCK ? 'mock' : 'staging'} para ${what}: ${pick.reason}`);
  return pick.value as T;
}

/** Tras "¡Pedido creado!": captura WhatsApp por todas las vías y verifica texto + DB. */
async function verifySuccess(page: Page, testInfo: TestInfo, ctx: Ctx, o: {
  name: string; expected: number; ui: number; lines: Line[]; delivery?: { zone: string; fee: number };
}) {
  const isMobile = testInfo.project.name === 'mobile';
  if (isMobile) {
    // Móvil: la app NO abre sola; el CTA es <a href="https://wa.me/...">.
    const link = page.getByRole('link', { name: 'Abrir WhatsApp' });
    await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/);
    await link.click();
  } else {
    // Desktop: la app abre WhatsApp Web UNA vez sola (openWhatsAppHandoff tras crear el pedido).
    // La segunda captura es el clic del test en "Abrir WhatsApp Web", no la app.
    await expect.poll(async () => (await ctx.waCaptured()).length).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    expect((await ctx.waCaptured()).length, 'la app abre WhatsApp Web una sola vez').toBe(1);
    await page.getByRole('button', { name: 'Abrir WhatsApp Web' }).click();
  }
  await expect.poll(async () => (await ctx.waCaptured()).length).toBeGreaterThan(isMobile ? 0 : 1);
  const caps = await ctx.waCaptured();
  ctx.report.notes.push(`WhatsApp capturado vía: ${caps.map((c) => `${c.via}→${new URL(c.url).host}`).join(', ')}`);
  expect(caps.every((c) => c.text === caps[0].text), 'todas las vías llevan el mismo texto').toBe(true);
  const text = caps[0].text ?? '';
  await testInfo.attach('whatsapp.txt', { body: text, contentType: 'text/plain' });

  // Fallback "Copiar mensaje"
  await page.getByRole('button', { name: 'Copiar mensaje' }).click();
  await expect(page.getByText(/Mensaje copiado al portapapeles|Selecciona y copia el mensaje manualmente/)).toBeVisible();

  expect(text).toContain(`Cliente: ${o.name}`);
  for (const l of o.lines) expect(text, `WhatsApp incluye "${l.qty}x ${l.label}"`).toContain(`${l.qty}x ${l.label}`);
  const waTotal = money(text.match(/^TOTAL: (.*)$/m)?.[1]);
  ctx.report.whatsapp = waTotal;
  if (o.delivery) expect(money(text.match(/^Domicilio: (.*)$/m)?.[1])).toBe(o.delivery.fee);

  // DB
  let orders = await findOrders(o.name, ctx.mockOrders);
  for (let i = 0; i < 10 && orders.length === 0; i++) { await page.waitForTimeout(500); orders = await findOrders(o.name, ctx.mockOrders); }
  expect(orders, `exactamente 1 pedido con customer_name=${o.name}`).toHaveLength(1);
  const order = orders[0];
  ctx.report.db = order.total_cents;
  expect(order.total_cents).toBe(o.expected);
  expect(o.ui).toBe(o.expected);
  expect(waTotal).toBe(o.expected);
  if (o.delivery) {
    expect(order.delivery_fee_cents).toBe(o.delivery.fee);
    expect(order.delivery_zone).toBe(o.delivery.zone);
  }
  expect(order.order_items).toHaveLength(o.lines.length);
  for (const l of o.lines) {
    const item = order.order_items.find((it: any) => (l.bowl ? !!it.details?.validation : it.details?.product_id === l.productId));
    expect(item, `order_item para ${l.label}`).toBeTruthy();
    expect(item!.quantity).toBe(l.qty);
    if (l.extraIds) {
      const ids = (item!.details?.customizations?.extras ?? []).map((e: any) => e.id).sort();
      expect(ids).toEqual([...l.extraIds].sort());
    }
    if (l.bowl) {
      const v = item!.details.validation;
      expect(v.size).toBeTruthy();
      expect(Array.isArray(v.ingredient_ids) && v.ingredient_ids.length > 0).toBe(true);
      expect(Array.isArray(v.extras)).toBe(true);
    }
  }
}

async function runOrder(page: Page, testInfo: TestInfo, ctx: Ctx, scenario: string, o: {
  lines: Line[]; expected: number; delivery?: { name: string; fee: number };
}) {
  const name = ctx.customerName(scenario);
  ctx.report.expected = o.expected;
  await goToCheckout(page, testInfo, scenario);
  await fillCheckout(page, { name, phone: PHONE, orderType: o.delivery ? 'delivery' : 'pickup', zone: o.delivery });
  const ui = await readUiTotal(page);
  ctx.report.ui = ui;
  await shot(page, testInfo, `checkout-${scenario}`);
  const r = await submit(page);
  if (!r.created) throw new Error(`El pedido no se creó: ${r.error}`);
  await verifySuccess(page, testInfo, ctx, {
    name, expected: o.expected, ui, lines: o.lines,
    delivery: o.delivery ? { zone: o.delivery.name, fee: o.delivery.fee } : undefined,
  });
}

/** Reescribe la llamada a create_order_with_items antes de que salga del navegador. */
async function tamperRpc(page: Page, mutate: (args: any) => void) {
  await page.route('**/rest/v1/rpc/create_order_with_items', async (route) => {
    const args = route.request().postDataJSON();
    mutate(args);
    await route.fallback({ postData: JSON.stringify(args) });
  });
}

async function expectRejected(page: Page, testInfo: TestInfo, ctx: Ctx, name: string, shotName: string, re: RegExp) {
  const r = await submit(page);
  await page.getByRole('alert').filter({ hasText: 'No pudimos enviar tu pedido' }).scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, testInfo, shotName);
  expect(r.created, 'el pedido manipulado NO debe crearse').toBe(false);
  ctx.report.notes.push(`error mostrado: ${r.error}`);
  expect(r.serverError ?? '', 'causa exacta devuelta por la RPC').toMatch(re);
  expect(r.error, 'el aviso explica al cliente qué hacer').toMatch(/precios de tu carrito cambiaron|Quita ese producto/);
  expect(await findOrders(name, ctx.mockOrders), 'sin pedido en DB').toHaveLength(0);
}

test.describe('checkout E2E', () => {
  test.beforeEach(async ({ page }) => { await gotoHome(page); });

  test('01 producto simple', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    await addProduct(page, p.name);
    await runOrder(page, testInfo, ctx, 's01', { lines: [{ label: p.name, qty: 1, productId: p.id }], expected: p.price });
  });

  test('02 producto con 2 extras', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.extras, 'producto con extras');
    await addProduct(page, p.name, p.extras.map((e) => e.name));
    const expected = p.price + p.extras.reduce((s, e) => s + e.price, 0);
    await runOrder(page, testInfo, ctx, 's02', {
      lines: [{ label: p.name, qty: 1, productId: p.id, extraIds: p.extras.map((e) => e.id) }], expected,
    });
  });

  test('03 Hatsu 400 ml con variantes delta 0', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.hatsu, 'Hatsu 400 ml');
    ctx.report.notes.push(`variantes: ${p.variants.join(', ')}`);
    await addProduct(page, p.name);
    await runOrder(page, testInfo, ctx, 's03', { lines: [{ label: p.name, qty: 1, productId: p.id }], expected: p.price });
  });

  test('04 bowl con proteína extra, salsa y complemento pago', async ({ page, ctx }, testInfo) => {
    const b = need(ctx.discovery.bowl, 'bowl');
    const ui = await buildBowl(page, b);
    expect(ui, 'precio del bowl en el builder').toBe(b.expectedPrice);
    await runOrder(page, testInfo, ctx, 's04', { lines: [{ label: `Bowl ${b.size.name}`, qty: 1, bowl: true }], expected: b.expectedPrice });
  });

  test('05 promoción combo vigente', async ({ page, ctx }, testInfo) => {
    const c = need(ctx.discovery.combo, 'combo');
    await addCombo(page, c.title);
    await runOrder(page, testInfo, ctx, 's05', { lines: [{ label: c.title, qty: 1, productId: `promo-${c.id}` }], expected: c.price });
  });

  test('06 carrito mixto', async ({ page, ctx }, testInfo) => {
    const d = ctx.discovery;
    const lines: Line[] = [];
    let expected = 0;
    if (d.simple.value) { await addProduct(page, d.simple.value.name); await addProduct(page, d.simple.value.name); lines.push({ label: d.simple.value.name, qty: 2, productId: d.simple.value.id }); expected += 2 * d.simple.value.price; }
    if (d.extras.value) {
      const p = d.extras.value;
      await addProduct(page, p.name, p.extras.map((e) => e.name));
      lines.push({ label: p.name, qty: 1, productId: p.id, extraIds: p.extras.map((e) => e.id) });
      expected += p.price + p.extras.reduce((s, e) => s + e.price, 0);
    }
    if (d.hatsu.value) { await addProduct(page, d.hatsu.value.name); lines.push({ label: d.hatsu.value.name, qty: 1, productId: d.hatsu.value.id }); expected += d.hatsu.value.price; }
    if (d.combo.value) { await addCombo(page, d.combo.value.title); lines.push({ label: d.combo.value.title, qty: 1, productId: `promo-${d.combo.value.id}` }); expected += d.combo.value.price; }
    if (d.bowl.value) { await buildBowl(page, d.bowl.value); lines.push({ label: `Bowl ${d.bowl.value.size.name}`, qty: 1, bowl: true }); expected += d.bowl.value.expectedPrice; }
    test.skip(lines.length < 2, 'menos de 2 tipos de ítem disponibles');
    ctx.report.notes.push(`ítems: ${lines.map((l) => `${l.qty}x ${l.label}`).join(' + ')}`);
    await runOrder(page, testInfo, ctx, 's06', { lines, expected });
  });

  test('07a precio manipulado en localStorage', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    const name = ctx.customerName('s07a');
    await addProduct(page, p.name);
    await page.evaluate(([key, delta]) => {
      const cart = JSON.parse(localStorage.getItem(key as string)!);
      cart.items[0].unitPrice -= delta as number;
      cart.items[0].totalPrice = cart.items[0].unitPrice * cart.items[0].quantity;
      cart.items[0].product.price -= delta as number;
      cart.subtotal = cart.total = cart.items[0].totalPrice;
      localStorage.setItem(key as string, JSON.stringify(cart));
    }, [CART_KEY, 1000]);
    await page.goto('/checkout');
    await fillCheckout(page, { name, phone: PHONE, orderType: 'pickup' });
    await expect.poll(() => readUiTotal(page)).toBe(p.price); // el carrito se re-cotiza contra el catálogo
    const ui = await readUiTotal(page);
    ctx.report.expected = p.price;
    ctx.report.ui = ui;
    await shot(page, testInfo, 'manipulacion-localstorage');
    const r = await submit(page);
    const orders = await findOrders(name, ctx.mockOrders);
    if (r.created) {
      ctx.report.notes.push('el cliente corrigió el precio al recargar (reconcileCartWithCatalog); el pedido se creó al precio real');
      expect(orders).toHaveLength(1);
      ctx.report.db = orders[0].total_cents;
      expect(orders[0].total_cents, 'nunca por debajo del precio real').toBe(p.price);
    } else {
      ctx.report.notes.push(`rechazado: ${r.error}`);
      expect(r.error).toMatch(/Precio no coincide|Total no coincide/);
      expect(orders).toHaveLength(0);
    }
  });

  test('07b precio unitario manipulado en la request → Precio no coincide', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    const name = ctx.customerName('s07b');
    await addProduct(page, p.name);
    await tamperRpc(page, (a) => { a.p_items[0].unit_price_cents -= 1000; a.p_total_cents -= 1000; });
    await goToCheckout(page, testInfo, 's07b');
    await fillCheckout(page, { name, phone: PHONE, orderType: 'pickup' });
    ctx.report.expected = p.price - 1000;
    await expectRejected(page, testInfo, ctx, name, 'manipulacion-error', /Precio no coincide/);
  });

  test('07c total manipulado en la request → Total no coincide', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    const name = ctx.customerName('s07c');
    await addProduct(page, p.name);
    await tamperRpc(page, (a) => { a.p_total_cents -= 1000; });
    await goToCheckout(page, testInfo, 's07c');
    await fillCheckout(page, { name, phone: PHONE, orderType: 'pickup' });
    ctx.report.expected = p.price - 1000;
    await expectRejected(page, testInfo, ctx, name, 'manipulacion-total-error', /Total no coincide/);
  });

  test('07d recargo de bowl rebajado → rechazado', async ({ page, ctx }, testInfo) => {
    // Requiere supabase/hotfix/2026-10-21b_bowl_surcharge.sql aplicado: el servidor calcula el
    // recargo desde source_id e ignora el charge declarado, así que el precio rebajado no cuadra.
    const b = need(ctx.discovery.bowl, 'bowl');
    const name = ctx.customerName('s07d');
    await buildBowl(page, b);
    await tamperRpc(page, (a) => {
      const v = a.p_items[0].details.validation;
      const ex = v.extras.find((e: any) => e.charge > 500);
      if (!ex) return;
      const diff = ex.charge - 500;
      ex.charge = 500;
      a.p_items[0].unit_price_cents -= diff;
      a.p_total_cents -= diff;
    });
    await goToCheckout(page, testInfo, 's07d');
    await fillCheckout(page, { name, phone: PHONE, orderType: 'pickup' });
    await expectRejected(page, testInfo, ctx, name, 'manipulacion-bowl', /Recargo de bowl inválido|Precio no coincide|Total no coincide/);
  });

  test('05b combo sobrevive a una recarga', async ({ page, ctx }, testInfo) => {
    const c = need(ctx.discovery.combo, 'combo');
    await addCombo(page, c.title);
    await page.reload();
    await expect.poll(async () => page.evaluate((key) => {
      const cart = JSON.parse(localStorage.getItem(key) ?? '{"items":[]}');
      return cart.items.filter((i: any) => i.product?.id?.startsWith('promo-')).length;
    }, CART_KEY), { timeout: 10_000 }).toBe(1);
    await page.waitForTimeout(1500); // deja correr la reconciliación con el catálogo
    const left = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"items":[]}').items.length, CART_KEY);
    expect(left, 'el combo sigue en el carrito tras recargar').toBe(1);
    await runOrder(page, testInfo, ctx, 's05b', { lines: [{ label: c.title, qty: 1, productId: `promo-${c.id}` }], expected: c.price });
  });

  test('08a recoger en tienda (sin domicilio)', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    await addProduct(page, p.name);
    await runOrder(page, testInfo, ctx, 's08a', { lines: [{ label: p.name, qty: 1, productId: p.id }], expected: p.price });
  });

  test('08b domicilio a zona con tarifa', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    const z = need(ctx.discovery.zone, 'zona con tarifa');
    await addProduct(page, p.name);
    await runOrder(page, testInfo, ctx, 's08b', {
      lines: [{ label: p.name, qty: 1, productId: p.id }], expected: p.price + z.fee, delivery: { name: z.name, fee: z.fee },
    });
  });

  test('09 validaciones del formulario (sin llamar a la RPC)', async ({ page, ctx }, testInfo) => {
    const p = need(ctx.discovery.simple, 'producto simple');
    await addProduct(page, p.name);
    await goToCheckout(page, testInfo, 's09');
    const btn = submitButton(page);
    // Domicilio por defecto, sin zona ni términos → deshabilitado.
    await expect(btn).toBeDisabled();
    await expect(page.getByText('Acepta los términos para continuar')).toBeVisible();

    await page.getByRole('button', { name: /Recoger en tienda/ }).click();
    await page.locator('#terms').check();
    await expect(btn).toBeEnabled();
    await btn.click();
    await expect(page.getByText('El nombre debe tener al menos 2 caracteres')).toBeVisible();
    await expect(page.getByText('Ingresa un número de teléfono válido')).toBeVisible();
    await expect(page.getByText('Revisa los campos marcados antes de enviar tu pedido.')).toBeVisible();
    await shot(page, testInfo, 'validaciones');

    await page.locator('#name').fill(ctx.customerName('s09'));
    await page.locator('#phone').fill('123');
    await btn.click();
    await expect(page.getByText('Ingresa un número de teléfono válido')).toBeVisible();
    await expect(page.getByText('El nombre debe tener al menos 2 caracteres')).toHaveCount(0);

    if (ctx.discovery.zone.value) {
      await page.locator('#phone').fill(PHONE);
      await page.getByRole('button', { name: /Envío a domicilio/ }).click();
      await selectZone(page, ctx.discovery.zone.value.name);
      await btn.click();
      await expect(page.getByText('La dirección es requerida para entregas a domicilio')).toBeVisible();
    } else ctx.report.notes.push('sin zona: no se probó dirección vacía');

    await page.waitForTimeout(500);
    expect(ctx.rpcCalls, 'no debe llamarse create_order_with_items').toHaveLength(0);
    expect(await findOrders(ctx.customerName('s09'), ctx.mockOrders)).toHaveLength(0);
  });

  test('10 layout móvil: botón alcanzable y sin scroll horizontal', async ({ page, ctx }, testInfo) => {
    const noHScroll = () => page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    const home = await noHScroll();
    ctx.report.notes.push(`home scrollWidth=${home.sw} clientWidth=${home.cw}`);
    expect(home.sw, 'home sin scroll horizontal').toBeLessThanOrEqual(home.cw);

    const p = need(ctx.discovery.simple, 'producto simple');
    await addProduct(page, p.name);
    await goToCheckout(page, testInfo, 's10');
    await page.getByRole('button', { name: /Recoger en tienda/ }).click();
    await page.locator('#terms').check();
    const chk = await noHScroll();
    ctx.report.notes.push(`checkout scrollWidth=${chk.sw} clientWidth=${chk.cw}`);
    expect(chk.sw, 'checkout sin scroll horizontal').toBeLessThanOrEqual(chk.cw);

    const btn = submitButton(page);
    const hitTest = (block: ScrollLogicalPosition) => btn.evaluate((el, blk) => {
      el.scrollIntoView({ block: blk, behavior: 'instant' as ScrollBehavior });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      const nav = document.querySelector('nav[aria-label="Navegación móvil"]');
      return {
        inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
        reachable: !!hit && (hit === el || el.contains(hit)),
        coveredByNav: !!hit && !!nav && nav.contains(hit),
        hit: hit ? `${hit.tagName}.${String((hit as HTMLElement).className).slice(0, 40)}` : null,
      };
    }, block);

    const center = await hitTest('center');
    await shot(page, testInfo, 'checkout-boton');
    expect(center.inViewport).toBe(true);
    expect(center.reachable, `centro del botón pertenece al botón (hit=${center.hit})`).toBe(true);
    if (testInfo.project.name === 'mobile') {
      // Informativo: con el botón pegado al borde inferior (scroll "natural"), ¿lo tapa la barra fija?
      const edge = await hitTest('end');
      ctx.report.notes.push(`block:end → reachable=${edge.reachable} coveredByNav=${edge.coveredByNav} (hit=${edge.hit})`);
      expect(edge.coveredByNav, 'la barra inferior no tapa el botón con scroll-padding-bottom').toBe(false);
      expect(edge.reachable, `botón alcanzable pegado al borde (hit=${edge.hit})`).toBe(true);
      const atBottom = await btn.evaluate((el) => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const nav = document.querySelector('nav[aria-label="Navegación móvil"]')!.getBoundingClientRect();
        const main = document.querySelector('main')!.getBoundingClientRect();
        return { navTop: nav.top, mainBottom: main.bottom, btnBottom: el.getBoundingClientRect().bottom };
      });
      ctx.report.notes.push(`al fondo: nav.top=${Math.round(atBottom.navTop)} main.bottom=${Math.round(atBottom.mainBottom)}`);
    }
  });
});
