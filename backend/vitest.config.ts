import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

if ('bun' in process.versions) {
  throw new Error(
    'Run tests through the package scripts under real Node (e.g. `bun run test`), never with `bun --bun` or `bun test`.',
  );
}

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
