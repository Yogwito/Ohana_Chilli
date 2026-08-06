import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const deferProductionStyles = {
  name: "defer-production-styles",
  transformIndexHtml: {
    order: "post" as const,
    handler(html: string) {
      const stylesheet = /<link rel="stylesheet" crossorigin href="([^"]+)">/g;
      const deferred = html.replace(stylesheet, (_match, href: string) => [
        `<link rel="preload" as="style" href="${href}">`,
        `<link rel="stylesheet" href="${href}" media="print" onload="this.onload=null;this.media='all';document.documentElement.classList.add('app-styles-ready')">`,
        `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
      ].join("\n    "));

      if (deferred === html) return html;

      return deferred.replace(
        "</head>",
        `<style>#root{visibility:hidden}html.app-styles-ready #root{visibility:visible}</style>\n` +
          `<script>window.setTimeout(function(){document.documentElement.classList.add('app-styles-ready')},3000)</script>\n  </head>`,
      );
    },
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    command === "build" && deferProductionStyles,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
