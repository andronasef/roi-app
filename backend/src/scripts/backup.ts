import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { loadEnv } from '../config/env';
import { BACKEND_DB_FILENAME } from '../db/client';

export interface RunBackupOptions {
  readonly dbPath: string;
  readonly outPath?: string;
  readonly backupDir?: string;
  readonly retentionCount?: number;
}

export interface BackupResult {
  readonly outPath: string;
  readonly bytes: number;
  readonly pruned: readonly string[];
}

function buildTimestampedBackupName(): string {
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const suffix = randomBytes(2).toString('hex');
  return `roi-backup-${stamp}-${suffix}.sqlite`;
}

function isPathInsideDir(targetPath: string, parentDir: string): boolean {
  const normalizedParent = parentDir.endsWith(sep) ? parentDir : `${parentDir}${sep}`;
  return targetPath.startsWith(normalizedParent);
}

/**
 * Create a WAL-safe, integrity-verified online SQLite snapshot via `VACUUM INTO`
 * and optionally prune older `.sqlite` backups beyond `retentionCount` (D-07, BE-06).
 */
export function runBackup(options: RunBackupOptions): BackupResult {
  const resolvedDbPath = resolve(options.dbPath);
  if (!existsSync(resolvedDbPath)) {
    throw new Error(`Source database does not exist: ${resolvedDbPath}`);
  }

  const resolvedBackupDir = resolve(
    options.backupDir ??
      (options.outPath
        ? dirname(resolve(options.outPath))
        : join(dirname(resolvedDbPath), 'backups')),
  );
  const resolvedOutPath = resolve(
    options.outPath ?? join(resolvedBackupDir, buildTimestampedBackupName()),
  );

  if (resolvedOutPath === resolvedDbPath) {
    throw new Error('Backup output path must not overwrite the active database');
  }
  if (!isPathInsideDir(resolvedOutPath, resolvedBackupDir)) {
    throw new Error(
      `Backup path must remain inside backup directory (${resolvedBackupDir}): ${resolvedOutPath}`,
    );
  }
  if (existsSync(resolvedOutPath)) {
    throw new Error(`Backup target already exists: ${resolvedOutPath}`);
  }

  mkdirSync(dirname(resolvedOutPath), { recursive: true });

  const sourceDb = new Database(resolvedDbPath);
  try {
    sourceDb.pragma('busy_timeout = 5000');
    const escapedOutPath = resolvedOutPath.replaceAll("'", "''");
    sourceDb.exec(`VACUUM INTO '${escapedOutPath}'`);
  } finally {
    sourceDb.close();
  }

  const verifyDb = new Database(resolvedOutPath, { readonly: true });
  try {
    const integrity = verifyDb.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`Backup integrity check failed: ${String(integrity)}`);
    }
  } catch (error) {
    if (existsSync(resolvedOutPath)) {
      unlinkSync(resolvedOutPath);
    }
    throw error;
  } finally {
    verifyDb.close();
  }

  const bytes = statSync(resolvedOutPath).size;
  const pruned: string[] = [];

  if (options.retentionCount !== undefined) {
    if (!Number.isInteger(options.retentionCount) || options.retentionCount < 1) {
      throw new Error('retentionCount must be a positive integer');
    }

    const dbFilename = basename(resolvedDbPath);
    const dbDir = dirname(resolvedDbPath);
    const candidates = readdirSync(resolvedBackupDir)
      .filter((entry) => {
        if (!entry.endsWith('.sqlite')) {
          return false;
        }
        if (resolvedBackupDir === dbDir && entry === dbFilename) {
          return false;
        }
        return statSync(join(resolvedBackupDir, entry)).isFile();
      })
      .map((entry) => {
        const fullPath = join(resolvedBackupDir, entry);
        return {
          fullPath,
          mtimeMs: statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => {
        if (b.mtimeMs !== a.mtimeMs) {
          return b.mtimeMs - a.mtimeMs;
        }
        return b.fullPath.localeCompare(a.fullPath);
      });

    for (const stale of candidates.slice(options.retentionCount)) {
      if (stale.fullPath === resolvedOutPath) {
        continue;
      }
      unlinkSync(stale.fullPath);
      pruned.push(stale.fullPath);
    }
  }

  return {
    outPath: resolvedOutPath,
    bytes,
    pruned,
  };
}

function parseBackupCliArgs(argv: readonly string[]): RunBackupOptions {
  const env = loadEnv(process.env);
  let dbPath = join(resolve(env.DATA_DIR), BACKEND_DB_FILENAME);
  let outPath: string | undefined;
  let backupDir: string | undefined;
  let retentionCount: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--db') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing path after --db');
      }
      dbPath = next;
      i += 1;
    } else if (arg?.startsWith('--db=')) {
      dbPath = arg.slice('--db='.length);
    } else if (arg === '--out') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing path after --out');
      }
      outPath = next;
      i += 1;
    } else if (arg?.startsWith('--out=')) {
      outPath = arg.slice('--out='.length);
    } else if (arg === '--backup-dir') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing path after --backup-dir');
      }
      backupDir = next;
      i += 1;
    } else if (arg?.startsWith('--backup-dir=')) {
      backupDir = arg.slice('--backup-dir='.length);
    } else if (arg === '--keep') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing count after --keep');
      }
      retentionCount = Number(next);
      i += 1;
    } else if (arg?.startsWith('--keep=')) {
      retentionCount = Number(arg.slice('--keep='.length));
    }
  }

  return { dbPath, outPath, backupDir, retentionCount };
}

function isCliEntrypoint(): boolean {
  if (process.env.VITEST === 'true') {
    return false;
  }
  if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    return require.main === module;
  }
  try {
    if (
      typeof import.meta !== 'undefined' &&
      typeof import.meta.url === 'string' &&
      process.argv[1]
    ) {
      return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
    }
  } catch {
    // Ignore when import.meta.url is unavailable in bundled CJS contexts.
  }
  return false;
}

if (isCliEntrypoint()) {
  try {
    const result = runBackup(parseBackupCliArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      `Backup failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
