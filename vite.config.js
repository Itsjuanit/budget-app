import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Importa path para configurar el alias

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Alias para la carpeta src
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
