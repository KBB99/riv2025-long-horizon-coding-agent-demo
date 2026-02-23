import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// Monorepo root for resolving hoisted dependencies
const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@canopy/shared": path.resolve(rootDir, "shared/src"),
    },
  },
  server: {
    port: 6174,
    host: '0.0.0.0',
    strictPort: true,
    fs: {
      allow: [rootDir],
    },
  },
});
