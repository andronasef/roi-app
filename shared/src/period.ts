/** Format a local Date as YYYY-MM-DD using local calendar components. */
export function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Return the localDateKey of the most recent weekStart day (0=Sun..6=Sat, default Saturday) on or before d. */
export function weekKey(d: Date, weekStart = 6): string {
  const offset = (d.getDay() - weekStart + 7) % 7;
  return localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
}

/** Format a local Date as YYYY-MM using local calendar components. */
export function monthKey(d: Date): string {
  return localDateKey(d).slice(0, 7);
}

function fnv1a32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32First(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Deterministically pick an item from items using FNV-1a + mulberry32 from seed. */
export function seededPick<T>(items: readonly T[], seed: string): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  const r = mulberry32First(fnv1a32(seed));
  return items[Math.floor(r * items.length)];
}
