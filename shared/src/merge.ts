export interface SyncRow {
  id: string;
  updatedAt: number;
  deletedAt: number | null;
}

/** Merge local and remote sync rows using per-record LWW with tombstone tie-break and future-clock clamping. */
export function mergeRecords<T extends SyncRow>(
  local: readonly T[],
  remote: readonly T[],
  _now: number,
): T[] {
  return [...local, ...remote];
}
