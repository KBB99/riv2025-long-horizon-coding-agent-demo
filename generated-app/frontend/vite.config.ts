import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";
import { createRequire } from "module";

// Monorepo root for resolving hoisted dependencies
const rootDir = path.resolve(__dirname, '..');

// Create a require function rooted in the monorepo root for package resolution
const rootRequire = createRequire(path.resolve(rootDir, 'package.json'));

/**
 * Vite plugin that resolves bare module imports from the monorepo root node_modules.
 * Only active during production builds (Rollup). The dev server uses esbuild which
 * handles monorepo resolution correctly on its own.
 */
function monorepoResolve(): Plugin {
  let isBuild = false;

  return {
    name: 'monorepo-resolve',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    resolveId(source) {
      // Only activate during build (Rollup needs help; esbuild/dev is fine)
      if (!isBuild) return null;

      // Skip relative/absolute paths and our aliases
      if (!source || source.startsWith('.') || source.startsWith('/') ||
          source.startsWith('\0') || source.startsWith('@/') ||
          source.startsWith('@canopy/')) {
        return null;
      }

      try {
        const resolved = rootRequire.resolve(source);
        return resolved;
      } catch {
        return null;
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [monorepoResolve(), react(), tailwindcss()],
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
