import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        appearanceBridge: path.resolve(__dirname, "appearance-bridge.html"),
      },
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          markdown: ["marked", "katex"],
          highlight: ["./src/lib/highlight"],
        },
      },
    },
  },
});
