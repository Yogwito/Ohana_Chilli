import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { DEFAULT_SITE_URL, PUBLIC_ROUTES, PRIVATE_PATHS } from "./src/config/siteConstants";

// Injects the canonical origin into index.html and emits sitemap.xml / robots.txt
// from the single site config (src/config/siteConstants.ts + VITE_SITE_URL).
function siteSeo(siteUrl: string): Plugin {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_ROUTES.map(
    (r) => `  <url>\n    <loc>${siteUrl}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
  ).join("\n")}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\n${PRIVATE_PATHS.map((p) => `Disallow: ${p}`).join("\n")}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  return {
    name: "site-seo",
    transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", siteUrl),
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/sitemap.xml") { res.setHeader("Content-Type", "application/xml"); return res.end(sitemap); }
        if (req.url === "/robots.txt") { res.setHeader("Content-Type", "text/plain"); return res.end(robots); }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  return {
    server: { host: "::", port: 8080, hmr: { overlay: false } },
    plugins: [react(), siteSeo(siteUrl), mode === "development" && componentTagger()].filter(Boolean),
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-supabase": ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
