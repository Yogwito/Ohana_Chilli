/* Start local Vite with VITE_TURNSTILE_SITE_KEY set to a test value.
 * Run: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/test-purchase-browser.cjs
 * Uses installed Chrome. Every remote request is intercepted; no production writes.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.BROWSER_TEST_ORIGIN || 'http://localhost:8089';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local server required');

async function scenario(browser, recovery) {
  const page = await browser.newPage({ viewport: { width: recovery ? 390 : 768, height: 900 } });
  let fail = recovery;
  const creates = [];
  const price = recovery ? 18000 : 19000;
  const receipt = { items: [{ name: 'Combo QA', quantity: 1, unit_price_cents: price, details: {} }], total: price, delivery_fee: 0, delivery_zone: null };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (!url.hostname.endsWith('.supabase.co')) return route.fulfill({ status: 200, body: '' });
    let body = [];
    if (url.pathname.includes('/promotions')) body = [{ id: 'qa-promo', type: 'combo', title: 'Combo QA', price_cents: 18000, is_active: true }];
    else if (url.pathname.includes('/settings')) body = [{ key: 'whatsapp_number', value: '573001234567' }];
    else if (url.pathname.includes('/order-api/quote')) body = { ...receipt, subtotal: price, fingerprint: 'a'.repeat(64) };
    else if (url.pathname.includes('/order-api/create')) {
      creates.push(route.request().postDataJSON());
      if (fail) return route.abort();
      await new Promise(resolve => setTimeout(resolve, 400));
      body = { id: '11111111-1111-1111-1111-111111111111', total: price, receipt };
    } else if (url.pathname.includes('/order-api/track')) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'tracking_not_found' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(() => {
    window.turnstile = { render(element, options) { element.textContent = 'Bot fixture'; options.callback('fixture'); return 'qa'; }, remove() {} };
  });
  try {
    await page.goto(origin);
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ohana-bowls-cart') || '{}').items?.length === 1);
    await page.goto(`${origin}/checkout`);
    await page.getByText('Combo QA', { exact: true }).first().waitFor({ state: 'attached' });
    await page.getByLabel('Nombre completo').fill('Cliente QA');
    await page.getByLabel('Teléfono', { exact: true }).fill('3001234567');
    await page.getByText('Recoger en tienda', { exact: true }).click();
    await page.getByRole('checkbox').check();
    const submit = page.getByRole('button', { name: 'Crear pedido y abrir WhatsApp' });
    await submit.click();
    if (recovery) {
      await page.getByText('Hay un pedido pendiente de confirmar').waitFor();
      assert.equal(creates.length, 1);
      await page.reload();
      const retry = page.getByRole('button', { name: 'Reenviar solicitud original' });
      await retry.waitFor();
      assert.equal(await page.getByLabel('Nombre completo').inputValue(), 'Cliente QA');
      await page.screenshot({ path: 'output/playwright/correction-uncertain-reload.png', fullPage: true });
      fail = false;
      await retry.dblclick();
      await page.waitForURL('**/pedido/**');
      assert.equal(creates.length, 2, 'Double click must send only one retry');
      assert.equal(creates[0].idempotency_key, creates[1].idempotency_key);
      assert.deepEqual(creates[0].request, creates[1].request);
    } else {
      await page.getByRole('button', { name: 'Acepto el presupuesto; volver a confirmar' }).waitFor();
      assert.equal(creates.length, 0, 'Changed quote requires consent');
      await page.getByRole('button', { name: 'Acepto el presupuesto; volver a confirmar' }).click();
      await submit.dblclick();
      await page.getByRole('heading', { name: '¡Pedido creado!' }).waitFor();
      assert.equal(creates.length, 1);
      await page.screenshot({ path: 'output/playwright/correction-combo-confirmation-tablet.png', fullPage: true });
    }
    assert.equal(creates[0].request.items[0].type, 'promotion');
    assert.equal(creates[0].request.items[0].promotion_id, 'qa-promo');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('ohana-pending-order:v1')), null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    console.log(JSON.stringify({ scenario: recovery ? 'H01+H04 mobile uncertain reload' : 'H01 tablet changed quote + receipt', passed: true, createRequests: creates.length }));
  } finally { await page.close(); }
}
(async () => {
  fs.mkdirSync('output/playwright', { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  });
  try { await scenario(browser, true); await scenario(browser, false); } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
