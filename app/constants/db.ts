/** Column names required on every user-data and event table for Drive sync. */
export const SYNC_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

/** Deterministic natural-key ID prefix for daily gratitude rows. */
export const GRATITUDE_ID_PREFIX = 'shukr:';

/** Suffix identifying append-only event tables checked by the schema guard. */
export const EVENT_TABLE_SUFFIX = '_events';
