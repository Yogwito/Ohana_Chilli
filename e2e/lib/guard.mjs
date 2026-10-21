// Guardia de entorno compartida por playwright.config.ts, global-setup y cleanup.mjs.
// Aborta si hay cualquier señal de PRODUCCIÓN o si el destino no es STAGING.
import fs from 'node:fs';
import path from 'node:path';

export const STAGING_REF = 'mbnedymxjplngwqkaabi';
export const PROD_REF = 'naoqsypqqgjhdudenevx';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return { exists: false, raw: '', vars: out };
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return { exists: true, raw, vars: out };
}

/** Decodifica el payload de un JWT sin verificar firma (solo para leer `ref`). */
export function jwtRef(token) {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return payload.ref ?? null;
  } catch {
    return undefined;
  }
}

/**
 * Resuelve la URL/clave efectivas tal como lo haría Vite en modo development:
 * env del proceso > .env.development.local > .env.local > .env.development > .env
 */
export function resolveSupabaseEnv() {
  const files = ['.env.development.local', '.env.local', '.env.development', '.env'].map((name) => ({
    name,
    ...parseEnvFile(path.join(ROOT, name)),
  }));
  const pick = (key) => {
    if (process.env[key]) return { value: process.env[key], source: `env ${key}` };
    for (const f of files) if (f.vars[key]) return { value: f.vars[key], source: f.name };
    return { value: '', source: 'ninguna' };
  };
  return { url: pick('VITE_SUPABASE_URL'), key: pick('VITE_SUPABASE_PUBLISHABLE_KEY'), files };
}

/**
 * Lanza Error si el entorno no es inequívocamente STAGING.
 * @param {{ requireServiceKey?: boolean }} opts
 */
export function assertStaging({ requireServiceKey = false } = {}) {
  const problems = [];
  const { url, key, files } = resolveSupabaseEnv();
  const mock = process.env.E2E_MOCK === '1';

  if (!url.value.includes(STAGING_REF)) problems.push(`VITE_SUPABASE_URL efectiva (${url.source}) no contiene ${STAGING_REF}`);
  if (url.value.includes(PROD_REF)) problems.push(`VITE_SUPABASE_URL efectiva (${url.source}) apunta a PRODUCCIÓN`);

  const envLocal = files.find((f) => f.name === '.env.local');
  if (!mock && !process.env.VITE_SUPABASE_URL) {
    if (!envLocal.exists) problems.push('.env.local no existe');
    else if (!envLocal.raw.includes(STAGING_REF)) problems.push(`.env.local no contiene ${STAGING_REF}`);
  }
  for (const f of files.filter((f) => f.name !== '.env')) {
    if (f.raw.includes(PROD_REF)) problems.push(`${f.name} contiene la ref de PRODUCCIÓN ${PROD_REF}`);
  }
  for (const [k, v] of Object.entries(process.env)) {
    if ((k.startsWith('VITE_') || k.startsWith('E2E_') || k.startsWith('SUPABASE')) && String(v).includes(PROD_REF)) {
      problems.push(`variable de entorno ${k} contiene la ref de PRODUCCIÓN`);
    }
  }
  const anonRef = jwtRef(key.value);
  if (!mock && anonRef !== null && anonRef !== STAGING_REF) {
    problems.push(`VITE_SUPABASE_PUBLISHABLE_KEY (${key.source}) es de otro proyecto (ref=${anonRef})`);
  }

  const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY ?? '';
  if (requireServiceKey && !mock) {
    if (!serviceKey) problems.push('Falta E2E_SUPABASE_SERVICE_KEY');
    else {
      const ref = jwtRef(serviceKey);
      if (ref !== STAGING_REF) problems.push(`E2E_SUPABASE_SERVICE_KEY no es de staging (ref=${ref === null ? 'no-JWT' : ref})`);
    }
  }
  if (serviceKey.includes(PROD_REF)) problems.push('E2E_SUPABASE_SERVICE_KEY menciona producción');

  if (problems.length) {
    throw new Error(`\n[E2E GUARD] Abortado — el entorno no es STAGING seguro:\n  - ${problems.join('\n  - ')}\n`);
  }
  return { url: url.value, anonKey: key.value, serviceKey, mock };
}
