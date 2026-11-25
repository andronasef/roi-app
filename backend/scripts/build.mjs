#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

if (process.versions.bun) {
  throw new Error(
    'backend/scripts/build.mjs must run under real Node, not Bun.',
  );
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, '..');
const tscOutDir = resolve(backendRoot, '.build-tsc');
const distDir = resolve(backendRoot, 'dist');
const tscBin = resolve(backendRoot, '../node_modules/typescript/bin/tsc');

rmSync(tscOutDir, { recursive: true, force: true });
rmSync(distDir, { recursive: true, force: true });

try {
  execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.build.json'], {
    cwd: backendRoot,
    stdio: 'inherit',
  });

  const sharedEntry = resolve(tscOutDir, 'shared/src/index.js');

  /** @type {esbuild.Plugin} */
  const resolveWorkspaceSharedPlugin = {
    name: 'resolve-roi-shared',
    setup(build) {
      build.onResolve({ filter: /^@roi\/shared$/ }, () => ({
        path: sharedEntry,
      }));
    },
  };

  await esbuild.build({
    entryPoints: {
      main: resolve(tscOutDir, 'backend/src/main.js'),
      seed: resolve(tscOutDir, 'backend/src/scripts/seed.js'),
      backup: resolve(tscOutDir, 'backend/src/scripts/backup.js'),
      restore: resolve(tscOutDir, 'backend/src/scripts/restore.js'),
    },
    outdir: distDir,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    packages: 'external',
    sourcemap: true,
    alias: {
      '@roi/shared': sharedEntry,
    },
    plugins: [resolveWorkspaceSharedPlugin],
    logLevel: 'info',
  });

  const mainBundle = readFileSync(resolve(distDir, 'main.cjs'), 'utf8');
  if (!mainBundle.includes('design:paramtypes')) {
    throw new Error(
      'Build verification failed: dist/main.cjs is missing NestJS design:paramtypes decorator metadata.',
    );
  }
} finally {
  rmSync(tscOutDir, { recursive: true, force: true });
}
