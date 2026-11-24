const MAX_FUTURE_SKEW_MS = 86_400_000;

export interface SyncRow {
  id: string;
  updatedAt: number;
  deletedAt: number | null;
}

function pickWinner<T extends SyncRow>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? a : b;
  }
  const aDeleted = a.deletedAt !== null;
  const bDeleted = b.deletedAt !== null;
  if (aDeleted !== bDeleted) {
    return aDeleted ? a : b;
  }
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

/** Merge local and remote sync rows using per-record LWW with tombstone tie-break and future-clock clamping. */
export function mergeRecords<T extends SyncRow>(
  local: readonly T[],
  remote: readonly T[],
  now: number,
): T[] {
  const cap = now + MAX_FUTURE_SKEW_MS;
  const merged = new Map<string, T>();
  for (const raw of [...local, ...remote]) {
    const row = raw.updatedAt > cap ? { ...raw, updatedAt: now } : raw;
    const existing = merged.get(row.id);
    merged.set(row.id, existing ? pickWinner(existing, row) : row);
  }
  return [...merged.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
