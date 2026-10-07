// Vercel evaluates this at build time with the deployment's env vars (replaces vercel.json).
// Logic lives in config/vercelConfig.mjs so it can be tested.
import { buildVercelConfig } from './config/vercelConfig.mjs';

export const config = buildVercelConfig(process.env);
