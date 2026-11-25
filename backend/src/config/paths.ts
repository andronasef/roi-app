import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function isBackendRoot(candidate: string): boolean {
  return (
    existsSync(join(candidate, 'drizzle')) || existsSync(join(candidate, 'package.json'))
  );
}

function getModuleDir(): string | undefined {
  if (typeof __dirname === 'string') {
    return __dirname;
  }
  try {
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string') {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Ignore when import.meta.url is unavailable in bundled CJS contexts.
  }
  return undefined;
}

/**
 * Resolve the backend workspace root reliably across:
 * - BACKEND_ROOT env override (Docker / custom deployments)
 * - ESM Vitest (`backend/src/config/paths.ts`, depth 2 -> `../..`)
 * - Bundled CJS (`backend/dist/*.cjs`, depth 1 -> `..`)
 * - Process working directory fallbacks
 */
export function resolveBackendRoot(): string {
  const envRoot = process.env.BACKEND_ROOT?.trim();
  if (envRoot) {
    return resolve(envRoot);
  }

  const candidates: string[] = [];
  const moduleDir = getModuleDir();
  if (moduleDir) {
    candidates.push(resolve(moduleDir, '..'), resolve(moduleDir, '../..'));
  }

  const cwd = process.cwd();
  candidates.push(join(cwd, 'backend'), cwd);

  for (const candidate of candidates) {
    if (isBackendRoot(candidate)) {
      return candidate;
    }
  }

  return resolve(cwd);
}

/** Resolve a path relative to the backend workspace root. */
export function resolveBackendPath(...segments: string[]): string {
  return join(resolveBackendRoot(), ...segments);
}
