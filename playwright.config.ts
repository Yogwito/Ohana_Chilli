import { defineConfig } from '@playwright/test';
import { assertStaging } from './e2e/lib/guard.mjs';

// Guardia ANTES de arrancar nada: aborta si el destino no es staging.
assertStaging({ requireServiceKey: true });

process.env.E2E_RUN_ID ??= new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

const PORT = 5179;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MOCK = process.env.E2E_MOCK === '1';
// Solo para entornos sin `npx playwright install` (p. ej. el contenedor de CI de Claude).
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  outputDir: './e2e/artifacts/test-results',
  fullyParallel: false,
  workers: 1, // pedidos reales en staging: secuencial y predecible
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/artifacts/report', open: 'never' }],
    ['json', { outputFile: 'e2e/artifacts/results.json' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-CO',
    contextOptions: { reducedMotion: 'reduce' },
    timezoneId: 'America/Bogota',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: MOBILE_UA,
      },
    },
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: MOCK
      ? {
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://mbnedymxjplngwqkaabi.supabase.co',
          VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'e2e-mock-anon-key',
        }
      : {},
  },
});
