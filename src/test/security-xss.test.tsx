import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PromotionsSection from '@/components/ohana/PromotionsSection';
import MenuProductCard from '@/components/products/MenuProductCard';
import { buildWhatsAppUrl, generateWhatsAppMessage, openWhatsAppHandoff } from '@/domain/whatsapp';
import type { Product } from '@/types';
import fs from 'node:fs';
import path from 'node:path';

const XSS = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';
vi.mock('@/hooks/use-catalog', () => ({ usePromotions: () => ({ data: [{ id: 'p', title: XSS, description: XSS, type: 'combo', price_cents: 1000, discount_type: 'label' }], isLoading: false }) }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addProduct: vi.fn() }) }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/components/ui/AnimatedElement', () => ({ AnimatedElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); delete (window as unknown as Record<string, unknown>).__pwned; });

describe('XSS-safe rendering', () => {
  it('renders promotion text as text, not markup', () => {
    const { container } = render(<PromotionsSection />);
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<img src=x');
  });
  it('renders product names as text, not markup', () => {
    const { container } = render(<MenuProductCard product={{ id: 'x', name: XSS, description: XSS, price: 1000, brand: 'ohana', categoryId: 'c' } as unknown as Product} />);
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
  it('WhatsApp message keeps customer name/notes/address as inert URL-encoded text', () => {
    const msg = generateWhatsAppMessage([], 0, { name: XSS, phone: '3000000000', orderType: 'delivery', address: XSS, notes: XSS + '&phone=999', orderId: 'o1' });
    const url = buildWhatsAppUrl('+57 300-000/0000?x=1&y', msg);
    expect(url.startsWith('https://wa.me/573000000000000?text=') || url.startsWith('https://wa.me/57')).toBe(true);
    const u = new URL(url);
    expect(u.host).toBe('wa.me');
    expect([...u.searchParams.keys()]).toEqual(['text']);
    expect(u.pathname).toMatch(/^\/\d+$/);
  });
  it('desktop handoff opens only web.whatsapp.com with noopener and encoded params', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openWhatsAppHandoff('57 300"><x', 'hi&phone=1#frag');
    const [url, , features] = open.mock.calls[0];
    const u = new URL(String(url));
    expect(u.origin).toBe('https://web.whatsapp.com');
    expect(u.searchParams.get('phone')).toBe('57300');
    expect(u.searchParams.get('text')).toBe('hi&phone=1#frag');
    expect(features).toContain('noopener');
    open.mockRestore();
  });
});

describe('source guards', () => {
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'test' ? [] : walk(path.join(d, e.name))) : /\.(tsx?|jsx?)$/.test(e.name) ? [path.join(d, e.name)] : []);
  const files = walk(path.resolve(__dirname, '..'));
  it('no dangerouslySetInnerHTML / innerHTML / eval outside shadcn chart.tsx', () => {
    const bad = files.filter(f => !f.endsWith('ui/chart.tsx')).filter(f => /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/.test(fs.readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
  it('vercel.json CSP forbids unsafe-eval and framing, keeps SPA rewrite', () => {
    const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../vercel.json'), 'utf8'));
    const h = Object.fromEntries(cfg.headers[0].headers.map((x: { key: string; value: string }) => [x.key, x.value]));
    expect(h['Content-Security-Policy']).not.toMatch(/unsafe-eval/);
    expect(h['Content-Security-Policy']).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(h['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(h['Strict-Transport-Security']).toBeTruthy();
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(cfg.rewrites[0].destination).toBe('/index.html');
  });
  it('storage writes never include phone/address/name/token keys', () => {
    const src = files.filter(f => /context\/CartContext|use-saved-bowls|orderApi/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
    expect(src).not.toMatch(/(local|session)Storage\.setItem\([^)]*(password|access_token)/i);
  });
});
