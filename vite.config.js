import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/la-batalla-de-somme/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"]
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    minify: "esbuild",
    chunkSizeWarningLimit: 1200
  }
});
