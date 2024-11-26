import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Importa path para configurar el alias
import { VitePWA } from "vite-plugin-pwa"; // Importa el plugin PWA

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PAGATODO",
        short_name: "PAGATODO",
        description: "Administra tus presupuestos y pagos fácilmente.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Alias para la carpeta src
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
