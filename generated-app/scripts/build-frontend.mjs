#!/usr/bin/env node
// Build script that sets NODE_PATH for monorepo package resolution
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

process.env.NODE_PATH = resolve(rootDir, 'node_modules');

try {
  execSync('npx vite build frontend', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: resolve(rootDir, 'node_modules') },
  });
} catch (e) {
  process.exit(1);
}
