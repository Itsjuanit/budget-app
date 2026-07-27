import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Importa path para configurar el alias
import { VitePWA } from "vite-plugin-pwa"; // Importa el plugin PWA

// Puerto del servidor de desarrollo. Cambiá este valor si necesitás otro.
const DEV_PORT = 3000;

export default defineConfig({
  server: {
    port: DEV_PORT,
    strictPort: true, // Falla en vez de saltar a otro puerto silenciosamente
  },
  preview: {
    port: DEV_PORT,
    strictPort: true,
  },
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
        background_color: "#1a1a2e",
        theme_color: "#1a1a2e",
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
        screenshots: [
          {
            src: "/screenshots/desktop-screenshot.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "/screenshots/mobile-screenshot.png",
            sizes: "720x1280",
            type: "image/png",
            form_factor: "narrow",
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
  build: {
    rollupOptions: {
      output: {
        // Separa las librerías pesadas del bundle principal para que el navegador
        // pueda cachearlas entre deploys.
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/analytics"],
          charts: ["chart.js/auto"],
        },
      },
    },
  },
});
