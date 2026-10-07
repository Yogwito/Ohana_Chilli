import { DEFAULT_SITE_URL, SITE_NAME } from './siteConstants';

export { SITE_NAME, PUBLIC_ROUTES, PRIVATE_PATHS } from './siteConstants';

/** Single source of truth for the canonical origin. Override with VITE_SITE_URL. */
export const SITE_URL: string = (import.meta.env?.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
