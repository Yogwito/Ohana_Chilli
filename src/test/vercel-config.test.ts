import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCsp, buildVercelConfig } from '../../config/vercelConfig.mjs';

const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';
const srcFiles = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? srcFiles(p) : /\.(ts|tsx)$/.test(p) && !p.includes('/test/') ? [p] : [];
});

describe('vercel config CSP', () => {
  it('derives the Supabase origin from VITE_SUPABASE_URL', () => {
    const connect = directive(buildCsp({ VITE_SUPABASE_URL: 'https://stagingref.supabase.co' }), 'connect-src');
    expect(connect).toContain('https://stagingref.supabase.co');
    expect(connect).toContain('wss://stagingref.supabase.co');
    expect(connect).not.toMatch(/naoqsypqqgjhdudenevx/);
  });

  it('fails the build without a valid https VITE_SUPABASE_URL', () => {
    expect(() => buildVercelConfig({})).toThrow(/VITE_SUPABASE_URL/);
    expect(() => buildCsp({ VITE_SUPABASE_URL: 'http://x.supabase.co' })).toThrow(/https/);
  });

  it('allows any Wompi origin the browser code calls', () => {
    const csp = buildCsp({ VITE_SUPABASE_URL: 'https://x.supabase.co' });
    const origins = new Set(srcFiles('src').flatMap((f) => readFileSync(f, 'utf8').match(/https:\/\/[a-z.-]*wompi\.co/g) ?? []));
    // Today checkout redirects to a URL built server-side, so the frontend references no Wompi origin.
    for (const origin of origins) expect(directive(csp, 'connect-src') + directive(csp, 'frame-src') + directive(csp, 'script-src')).toContain(origin);
  });
});
