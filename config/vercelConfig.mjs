// Builds the Vercel project config. Pure: takes env, returns the object vercel.ts exports.
// The Supabase origin is derived from VITE_SUPABASE_URL so previews/staging never hardcode production.
// Wompi needs no CSP entry while checkout is a full-page redirect (window.location.assign) to checkout.wompi.co;
// add script-src/frame-src/connect-src entries only if the widget or Wompi API is ever called from the browser.

export function supabaseOrigin(url) {
  if (!url) throw new Error('VITE_SUPABASE_URL is required to build the CSP');
  const { protocol, host } = new URL(url);
  if (protocol !== 'https:') throw new Error('VITE_SUPABASE_URL must be https');
  return host;
}

export function buildCsp(env) {
  const host = supabaseOrigin(env.VITE_SUPABASE_URL);
  return [
    "default-src 'self'",
    "script-src 'self' 'sha256-rSvSjS75pySV57OPY84dhS6FUKEHlSoTR9EA/dOx0Bo=' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https://${host} wss://${host} https://challenges.cloudflare.com https://api.unsplash.com`,
    'frame-src https://challenges.cloudflare.com',
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function buildVercelConfig(env) {
  return {
    framework: 'vite',
    rewrites: [{ source: '/(.*)', destination: '/index.html' }],
    headers: [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: buildCsp(env) },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      ],
    }],
  };
}
