/** Format a local Date as YYYY-MM-DD using local calendar components. */
export function localDateKey(_d: Date): string {
  return '';
}

/** Return the localDateKey of the most recent weekStart day (0=Sun..6=Sat, default Saturday) on or before d. */
export function weekKey(_d: Date, weekStart = 6): string {
  void weekStart;
  return '';
}

/** Format a local Date as YYYY-MM using local calendar components. */
export function monthKey(_d: Date): string {
  return '';
}

/** Deterministically pick an item from items using FNV-1a + mulberry32 from seed. */
export function seededPick<T>(items: readonly T[], _seed: string): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[0];
}
