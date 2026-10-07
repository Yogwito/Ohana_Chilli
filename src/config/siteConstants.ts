// Pure constants (no import.meta) so vite.config.ts can import them too.
export const DEFAULT_SITE_URL = 'https://ohanabowls.com';
export const SITE_NAME = 'Ohana Bowls';

/** Indexable public routes (feeds sitemap.xml). Private paths are never listed. */
export const PUBLIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/bebidas', changefreq: 'weekly', priority: '0.7' },
  { path: '/nosotros', changefreq: 'monthly', priority: '0.5' },
  { path: '/contacto', changefreq: 'monthly', priority: '0.5' },
];

/** Never indexed: robots.txt Disallow + <meta robots noindex>. */
export const PRIVATE_PATHS = ['/admin', '/checkout', '/pedidos', '/pedido/'];
