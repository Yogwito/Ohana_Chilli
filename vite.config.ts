import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        // Agrupación por límite funcional, no por paquete: separa lo que
        // cambia poco (runtime de React, cliente de Supabase, GSAP) del código
        // de la tienda, que se reescribe en cada despliegue. Evita tanto el
        // bulto único de 842 kB como una lluvia de chunks diminutos.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (/[\\/]node_modules[\\/]gsap[\\/]/.test(id)) return "gsap-vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
