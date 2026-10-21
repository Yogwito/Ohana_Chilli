import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ARTIFACTS, MOCK } from './lib/data';

interface ResultRow {
  scenario: string; project: string; status: string; expected?: number | null; ui?: number | null;
  whatsapp?: number | null; db?: number | null; error?: string; consoleErrors: string[]; failedRequests: string[]; notes: string[];
}

const fmt = (n?: number | null) => (n == null ? '—' : `$${n.toLocaleString('es-CO')}`);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 220);

export default async function globalTeardown() {
  const dir = path.join(ARTIFACTS, 'results');
  const rows: ResultRow[] = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    : [];
  rows.sort((a, b) => a.scenario.localeCompare(b.scenario, 'es', { numeric: true }) || a.project.localeCompare(b.project));
  const lines = [
    `# Resultados E2E — ${MOCK ? 'MOCK (sin red)' : 'STAGING mbnedymxjplngwqkaabi'}`,
    '',
    `Run: ${process.env.E2E_RUN_ID ?? '?'} · generado ${new Date().toISOString()}`,
    '',
    '| Escenario | Viewport | Estado | Esperado | UI | WhatsApp | DB orders.total_cents | Error / motivo |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${cell(r.scenario)} | ${r.project} | ${r.status} | ${fmt(r.expected)} | ${fmt(r.ui)} | ${fmt(r.whatsapp)} | ${fmt(r.db)} | ${cell(r.error ?? '')} |`),
    '',
    '## Notas, errores de consola y requests fallidos por test',
    '',
  ];
  for (const r of rows) {
    if (!r.notes.length && !r.consoleErrors.length && !r.failedRequests.length) continue;
    lines.push(`### ${r.scenario} · ${r.project}`);
    r.notes.forEach((n) => lines.push(`- nota: ${n}`));
    r.consoleErrors.forEach((n) => lines.push(`- consola: \`${n.slice(0, 300)}\``));
    r.failedRequests.forEach((n) => lines.push(`- request fallido: \`${n.slice(0, 300)}\``));
    lines.push('');
  }
  fs.writeFileSync(path.join(ARTIFACTS, 'summary.md'), lines.join('\n'));
  console.log(`\n[E2E] Resumen: ${path.join(ARTIFACTS, 'summary.md')}`);

  if (!MOCK && process.env.E2E_KEEP_ORDERS !== '1') {
    try {
      execFileSync(process.execPath, [path.resolve(process.cwd(), 'e2e', 'cleanup.mjs')], { stdio: 'inherit' });
    } catch {
      console.error('[E2E] cleanup.mjs falló; córrelo a mano: node e2e/cleanup.mjs');
    }
  }
}
