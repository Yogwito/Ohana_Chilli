import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import { ARTIFACTS, type Discovery } from './data';

export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "$ 28.000" → 28000 */
export const money = (s: string | null | undefined) => Number(String(s ?? '').replace(/[^\d]/g, '') || NaN);

export async function shot(page: Page, testInfo: TestInfo, name: string) {
  const dir = path.join(ARTIFACTS, 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

/** Hace scroll hasta que el locator exista (secciones diferidas por IntersectionObserver). */
export async function scrollUntil(page: Page, locator: Locator, maxSteps = 40) {
  for (let i = 0; i < maxSteps; i++) {
    if (await locator.count()) {
      await locator.first().scrollIntoViewIfNeeded();
      return;
    }
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.8)));
    await page.waitForTimeout(150);
  }
  throw new Error(`No apareció tras hacer scroll: ${locator}`);
}

export async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /nuevo favorito/i })).toBeVisible();
  // El catálogo cargó cuando aparece el contador de resultados del menú.
  await expect(page.getByText(/opciones para disfrutar/)).toBeVisible();
}

export async function addProduct(page: Page, name: string, extras: string[] = []) {
  const search = page.getByRole('searchbox', { name: 'Buscar en el menú' });
  await search.scrollIntoViewIfNeeded();
  await search.fill(name);
  const add = page.getByRole('button', { name: `Agregar ${name} al carrito`, exact: true });
  await add.scrollIntoViewIfNeeded();
  await add.click();

  const sheet = page.getByRole('dialog');
  const toast = page.getByText(`${name} agregado`, { exact: true });
  await expect(sheet.or(toast).first()).toBeVisible();
  if (await sheet.isVisible()) {
    await expect(sheet.getByText('Cargando opciones...')).toHaveCount(0);
    for (const extra of extras) {
      const row = sheet.getByText(extra, { exact: true }).locator('xpath=ancestor::div[.//button[@aria-label="Agregar"]][1]');
      await row.getByRole('button', { name: 'Agregar', exact: true }).click();
    }
    if (extras.length) await sheet.getByRole('button', { name: /^Agregar al carrito ·/ }).click();
    else await sheet.getByRole('button', { name: /^Agregar sin cambios/ }).first().click();
    await expect(sheet).toBeHidden();
    await expect(toast.first()).toBeVisible();
  }
  await search.fill('');
}

export async function addCombo(page: Page, title: string) {
  const titleEl = page.getByText(title, { exact: true });
  await scrollUntil(page, titleEl);
  const card = titleEl.first().locator('xpath=ancestor::div[.//button[normalize-space()="Agregar"]][1]');
  await card.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByText(`${title} agregado al carrito`)).toBeVisible();
}

export interface BowlOptions {
  /** Tamaño a usar (por defecto el más barato, b.size). */
  size?: NonNullable<Discovery['bowl']['value']>['size'];
  /** Veces que se agregan la proteína y el complemento premium (repetidos). */
  extras?: number;
  /** Llenar salsas y complementos incluidos hasta el máximo del tamaño. */
  fillOptional?: boolean;
}

/** Precio esperado del bowl armado con buildBowl(b, o) — mismo cálculo que bowlPricing.ts. */
export function expectedBowlPrice(b: NonNullable<Discovery['bowl']['value']>, o: BowlOptions = {}) {
  const n = o.extras ?? 1;
  return (o.size ?? b.size).price + n * b.premiumProtein.charge + b.premiumSauce.charge + n * b.premiumComplemento.charge;
}

export async function buildBowl(page: Page, b: NonNullable<Discovery['bowl']['value']>, o: BowlOptions = {}) {
  const size = o.size ?? b.size;
  const nExtras = o.extras ?? 1;
  const root = page.locator('#arma-tu-bowl');
  await scrollUntil(page, root.getByRole('tablist'));
  await root.locator('button[aria-pressed]').filter({ hasText: size.name }).first().click();
  const currentTab = async () => (await root.locator('[role=tab][aria-selected=true]').textContent())?.trim() ?? '';
  const next = root.getByRole('button', { name: /^(Siguiente|Omitir|Continuar)/ });

  const fillRequired = async (names: string[]) => {
    for (let guard = 0; guard < 12 && (await next.isDisabled()); guard++) {
      let clicked = false;
      for (const n of names) {
        const btn = root.getByRole('button', { name: `Agregar ${n}`, exact: true });
        if ((await btn.count()) && (await btn.first().isEnabled())) { await btn.first().click(); clicked = true; break; }
      }
      if (!clicked) throw new Error(`Bowl: no hay ingredientes habilitados para completar el paso (${names.join(', ')})`);
    }
  };
  // Agrega incluidos (ida y vuelta por la lista) hasta que ninguno quede habilitado = máximo del tamaño.
  const fillToMax = async (names: string[]) => {
    for (let guard = 0; guard < 12; guard++) {
      let clicked = false;
      for (const n of names) {
        const btn = root.getByRole('button', { name: `Agregar ${n}`, exact: true });
        if ((await btn.count()) && (await btn.first().isEnabled())) { await btn.first().click(); clicked = true; break; }
      }
      if (!clicked) return;
    }
  };
  const pickInSelector = async (heading: string, option: string) => {
    const box = root.getByText(heading, { exact: true }).locator('xpath=ancestor::div[2]');
    await box.getByRole('button', { name: option, exact: true }).click();
  };

  for (let guard = 0; guard < 12; guard++) {
    const step = await currentTab();
    if (step === 'Resumen') break;
    if (step === 'Bases') await fillRequired(b.bases);
    if (step === 'Proteínas') {
      await fillRequired(b.proteins);
      for (let i = 0; i < nExtras; i++) {
        await root.getByRole('button', { name: `Agregar ${b.premiumProtein.name}`, exact: true }).click();
        await pickInSelector('¿Cuál proteína extra quieres agregar?', b.proteins[i % b.proteins.length]);
      }
      await expect(root.getByText('Proteínas extra añadidas', { exact: false })).toBeVisible();
    }
    if (step === 'Acompañantes') await fillRequired(b.acompanantes);
    if (step === 'Salsas') {
      if (o.fillOptional) await fillToMax(b.sauces);
      await root.getByRole('button', { name: new RegExp(`^${esc(b.premiumSauce.name)}`) }).click();
      await expect(root.getByText('Salsas extra añadidas', { exact: false })).toBeVisible();
    }
    if (step === 'Complementos') {
      if (o.fillOptional) await fillToMax(b.complementos);
      for (let i = 0; i < nExtras; i++) {
        await root.getByRole('button', { name: new RegExp(`^${esc(b.premiumComplemento.name)}`) }).click();
        await pickInSelector('¿Qué complemento extra quieres?', b.complementos[i % b.complementos.length]);
      }
      await expect(root.getByText('Complementos extra añadidos', { exact: false })).toBeVisible();
    }
    await next.click();
    await expect.poll(currentTab).not.toBe(step);
  }
  expect(await currentTab()).toBe('Resumen');
  const total = money(await root.locator('span', { hasText: /^Total$/ }).locator('xpath=following-sibling::span[1]').textContent());
  await root.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await expect(page.getByText('Bowl personalizado agregado al carrito')).toBeVisible();
  return total;
}

export async function openCart(page: Page, testInfo: TestInfo) {
  const isMobile = testInfo.project.name === 'mobile';
  // Los toasts de sonner (abajo a la derecha) tapan la barra inferior móvil y se pausan con hover:
  // alejamos el puntero y esperamos a que se vayan (ver hallazgo en el reporte).
  await page.mouse.move(5, 5);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 12_000 });
  await page.getByRole('button', { name: isMobile ? 'Abrir carrito' : /^Abrir pedido/ }).first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('button', { name: 'Continuar pedido' })).toBeVisible();
  return drawer;
}

export async function goToCheckout(page: Page, testInfo: TestInfo, scenario: string) {
  const drawer = await openCart(page, testInfo);
  await page.waitForTimeout(300); // animación del Sheet
  await shot(page, testInfo, `cart-${scenario}`);
  await drawer.getByRole('button', { name: 'Continuar pedido' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Tu próximo buen momento.' })).toBeVisible();
}

export interface CheckoutForm {
  name: string;
  phone: string;
  orderType: 'pickup' | 'delivery';
  zone?: { name: string } | null;
  address?: string;
}

export async function fillCheckout(page: Page, f: CheckoutForm) {
  await page.locator('#name').fill(f.name);
  await page.locator('#phone').fill(f.phone);
  if (f.orderType === 'pickup') {
    await page.getByRole('button', { name: /Recoger en tienda/ }).click();
  } else {
    await page.getByRole('button', { name: /Envío a domicilio/ }).click();
    await page.locator('#address').fill(f.address ?? 'Calle 10 # 20-30 Apto 401 (PRUEBA E2E)');
    if (f.zone) await selectZone(page, f.zone.name);
  }
  await page.locator('#terms').check();
}

export async function selectZone(page: Page, zoneName: string) {
  await page.locator('#delivery-zone-search').fill(zoneName);
  await page.locator('#delivery-zone').click();
  await page.getByRole('option', { name: new RegExp(`^${esc(zoneName)} — `) }).click();
  await expect(page.getByText(new RegExp(`${esc(zoneName)} · Domicilio:`))).toBeVisible();
}

export const submitButton = (page: Page) => page.getByRole('button', { name: /Enviar por WhatsApp|Creando pedido|Cerrado/ });

export async function readUiTotal(page: Page) {
  return money(await page.locator('span', { hasText: /^Total$/ }).locator('xpath=following-sibling::span[1]').first().textContent());
}

export async function assertNotClosed(page: Page) {
  const txt = (await submitButton(page).textContent()) ?? '';
  if (/Cerrado/.test(txt)) throw new Error('El negocio está CERRADO (business_hours_enforce). Corre la suite en horario de atención o desactiva el enforce en staging.');
}

/** Envía y devuelve 'created' o el texto del error mostrado. */
export async function submit(page: Page): Promise<{ created: boolean; error?: string; serverError?: string }> {
  await assertNotClosed(page);
  // El aviso muestra un texto para el cliente (describeOrderError); el mensaje crudo de la RPC
  // se lee de la respuesta para poder afirmar la causa exacta del rechazo.
  let serverError: string | undefined;
  const onResponse = async (res: import('@playwright/test').Response) => {
    if (!res.url().includes('/rpc/create_order_with_items') || res.ok()) return;
    try { serverError = (await res.json())?.message; } catch { /* cuerpo no JSON */ }
  };
  page.on('response', onResponse);
  await submitButton(page).click();
  const ok = page.getByRole('heading', { name: '¡Pedido creado!' });
  const alert = page.getByRole('alert').filter({ hasText: 'No pudimos enviar tu pedido' });
  await expect(ok.or(alert).first()).toBeVisible({ timeout: 30_000 });
  page.off('response', onResponse);
  if (await ok.isVisible()) return { created: true };
  const shown = (await alert.textContent()) ?? '';
  return { created: false, error: [serverError, shown].filter(Boolean).join(' | '), serverError };
}
