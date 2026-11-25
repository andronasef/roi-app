import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

if ('bun' in process.versions) {
  throw new Error(
    'Run tests through the package scripts under real Node (e.g. `bun run test`), never with `bun --bun` or `bun test`.',
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
