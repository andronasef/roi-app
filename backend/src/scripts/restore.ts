import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { loadEnv } from '../config/env';
import { BACKEND_DB_FILENAME } from '../db/client';

export interface RunRestoreOptions {
  readonly backupPath: string;
  readonly dbPath: string;
}

export interface RestoreResult {
  readonly restoredPath: string;
  readonly removedWalArtifacts: readonly string[];
}

function verifySqliteIntegrity(filePath: string, label: string): void {
  const sqlite = new Database(filePath, { readonly: true });
  try {
    const integrity = sqlite.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`${label} integrity check failed: ${String(integrity)}`);
    }
  } finally {
    sqlite.close();
  }
}

/**
 * Restore a SQLite database from an integrity-verified backup, replacing the
 * target file atomically and removing stale `-wal` / `-shm` sidecar files (D-07).
 */
export function runRestore(options: RunRestoreOptions): RestoreResult {
  const resolvedBackupPath = resolve(options.backupPath);
  const resolvedDbPath = resolve(options.dbPath);

  if (!existsSync(resolvedBackupPath) || !statSync(resolvedBackupPath).isFile()) {
    throw new Error(`Backup file does not exist: ${resolvedBackupPath}`);
  }
  if (resolvedBackupPath === resolvedDbPath) {
    throw new Error('Backup source and restore target must be distinct files');
  }

  verifySqliteIntegrity(resolvedBackupPath, 'Backup');

  mkdirSync(dirname(resolvedDbPath), { recursive: true });
  const tempRestorePath = `${resolvedDbPath}.restore-${process.pid}-${Date.now()}.tmp`;
  const removedWalArtifacts: string[] = [];

  try {
    copyFileSync(resolvedBackupPath, tempRestorePath);

    for (const suffix of ['-wal', '-shm'] as const) {
      const sidecar = `${resolvedDbPath}${suffix}`;
      if (existsSync(sidecar)) {
        unlinkSync(sidecar);
        removedWalArtifacts.push(sidecar);
      }
    }

    renameSync(tempRestorePath, resolvedDbPath);
  } catch (error) {
    if (existsSync(tempRestorePath)) {
      unlinkSync(tempRestorePath);
    }
    throw error;
  }

  verifySqliteIntegrity(resolvedDbPath, 'Restored database');

  return {
    restoredPath: resolvedDbPath,
    removedWalArtifacts,
  };
}

function parseRestoreCliArgs(argv: readonly string[]): RunRestoreOptions {
  const env = loadEnv(process.env);
  let dbPath = join(resolve(env.DATA_DIR), BACKEND_DB_FILENAME);
  let backupPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--backup') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing path after --backup');
      }
      backupPath = next;
      i += 1;
    } else if (arg?.startsWith('--backup=')) {
      backupPath = arg.slice('--backup='.length);
    } else if (arg === '--db') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing path after --db');
      }
      dbPath = next;
      i += 1;
    } else if (arg?.startsWith('--db=')) {
      dbPath = arg.slice('--db='.length);
    }
  }

  if (!backupPath) {
    throw new Error('Missing required --backup <path> argument');
  }

  return { backupPath, dbPath };
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
    const result = runRestore(parseRestoreCliArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.stderr.write(
      'Reminder: content_version is rewound to the backup. Clients ahead of it re-download from scratch; ' +
        'new edits reuse version numbers clients may have seen. Start the API only after the restore is final.\n',
    );
  } catch (error) {
    process.stderr.write(
      `Restore failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
