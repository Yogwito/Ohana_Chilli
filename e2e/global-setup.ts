import fs from 'node:fs';
import type { FullConfig } from '@playwright/test';
import { PROD_REF, STAGING_REF, assertStaging, jwtRef } from './lib/guard.mjs';
import { ARTIFACTS, DISCOVERY_FILE, discover, loadTables } from './lib/data';

export default async function globalSetup(config: FullConfig) {
  assertStaging({ requireServiceKey: true });
  fs.mkdirSync(`${ARTIFACTS}/results`, { recursive: true });
  for (const f of fs.readdirSync(`${ARTIFACTS}/results`)) fs.rmSync(`${ARTIFACTS}/results/${f}`);

  // Segunda guardia: lo que REALMENTE sirve Vite (puede ser un dev server reutilizado).
  const baseURL = config.projects[0].use.baseURL ?? 'http://127.0.0.1:5179';
  const res = await fetch(`${baseURL}/src/integrations/supabase/client.ts`);
  const served = await res.text();
  const env = JSON.parse(served.match(/import\.meta\.env = (\{.*?\});/)?.[1] ?? '{}');
  const servedUrl = String(env.VITE_SUPABASE_URL ?? '');
  const servedKeyRef = jwtRef(String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''));
  for (const [k, v] of Object.entries(env)) {
    if (String(v).includes(PROD_REF)) console.log(`  AVISO: el dev server expone ${k} con la ref de PRODUCCIÓN (no la usa el cliente Supabase).`);
  }
  if (!servedUrl.includes(STAGING_REF) || servedUrl.includes(PROD_REF) || (servedKeyRef && servedKeyRef !== STAGING_REF)) {
    throw new Error(
      `[E2E GUARD] El dev server en ${baseURL} NO sirve la URL de staging (¿servidor reutilizado con otra config?). ` +
        'Detén cualquier `npm run dev` en el puerto 5179 y vuelve a correr.',
    );
  }

  const { tables, catalog, warnings } = await loadTables();
  const discovery = discover(tables, catalog, warnings);
  fs.writeFileSync(DISCOVERY_FILE, JSON.stringify(discovery, null, 2));
  const line = (k: string, p: { value: unknown; reason?: string }) =>
    console.log(`  ${k.padEnd(7)} ${p.value ? 'OK' : `SALTAR — ${p.reason}`}`);
  console.log(`\n[E2E] Modo ${discovery.mode}. Datos descubiertos:`);
  (['simple', 'extras', 'hatsu', 'bowl', 'combo', 'zone'] as const).forEach((k) => line(k, discovery[k]));
  warnings.forEach((w) => console.log(`  AVISO: ${w}`));
  if (discovery.hoursEnforced) console.log('  AVISO: business_hours_enforce=true; fuera de horario el checkout se bloqueará.');
}
