/** Column names required on every user-data and event table for Drive sync. */
export const SYNC_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

/** Deterministic natural-key ID prefix for daily gratitude rows. */
export const GRATITUDE_ID_PREFIX = 'shukr:';

/** Deterministic natural-key ID prefix for favorite rows. */
export const FAVORITE_ID_PREFIX = 'fav:';

/** Deterministic natural-key ID prefix for weekly/monthly verse assignment rows. */
export const ASSIGNMENT_ID_PREFIX = 'assign:';

/** Suffix identifying append-only event tables checked by the schema guard. */
export const EVENT_TABLE_SUFFIX = '_events';
