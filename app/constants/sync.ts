import type { SnapshotType } from '@roi/shared';

/** Ordered first-download content stages persisted to staging one by one. */
export const CONTENT_STAGES = [
  'verses',
  'names_of_god',
  'blessings',
] as const satisfies readonly SnapshotType[];

/** Minimum interval between silent background delta sync checks (6 hours). */
export const DELTA_SYNC_THROTTLE_MS = 6 * 60 * 60 * 1000;

/** Subdirectory inside Paths.document holding resumable snapshot downloads. */
export const STAGING_DIR_NAME = 'content-staging';

/** Checkpoint manifest filename inside STAGING_DIR_NAME. */
export const STAGING_MANIFEST_FILE = 'manifest.json';

/** Per-request network timeout in milliseconds for snapshot and GraphQL calls. */
export const SYNC_REQUEST_TIMEOUT_MS = 15_000;
