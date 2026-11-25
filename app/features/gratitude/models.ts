import { EGYPTIAN_MONTHS, toArabicDigits } from '@roi/shared';
import { z } from 'zod';

/** Nightly gratitude reminder settings (D-11, D-12). */
export const gratitudeReminderSchema = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export type GratitudeReminderSettings = z.infer<typeof gratitudeReminderSchema>;

/** Opt-in by default OFF, preset 21:00 (D-12). */
export const DEFAULT_GRATITUDE_REMINDER: GratitudeReminderSettings = {
  enabled: false,
  hour: 21,
  minute: 0,
};

/** Minimal row shape needed to group past entries. */
export interface GratitudeListRow {
  localDate: string;
  body: string;
  deletedAt: number | null;
}

export interface GratitudeMonthGroup<T extends GratitudeListRow = GratitudeListRow> {
  monthKey: string;
  monthLabel: string;
  items: T[];
}

/** Append one more gratitude item on a new line inside the single daily card (D-09). */
export function appendGratitudeLine(
  existing: string,
  addition: string,
): string {
  const added = addition.trim();
  if (existing.trim().length === 0) {
    return added;
  }
  const base = existing.replace(/\s+$/, '');
  return added.length === 0 ? `${base}\n` : `${base}\n${added}`;
}

const PREFILL_SNIPPET_MAX = 80;

/** Answered-prayer -> gratitude prefill text (D-07, UI-SPEC Copywriting Contract). */
export function formatAnsweredPrefill(
  body: string,
  personName: string | null,
  outcome: string | null,
): string {
  const trimmedOutcome = outcome?.trim();
  if (trimmedOutcome) {
    const person = personName?.trim() || 'عام';
    return `الحمد لله على استجابة الصلاة (${person}): ${trimmedOutcome}`;
  }
  const flat = body.trim().replace(/\s+/g, ' ');
  const snippet =
    flat.length > PREFILL_SNIPPET_MAX
      ? `${flat.slice(0, PREFILL_SNIPPET_MAX).trimEnd()}…`
      : flat;
  return `الحمد لله على استجابة الصلاة: ${snippet}`;
}

/**
 * Group non-empty past days by YYYY-MM, newest month and day first (D-08).
 * Today, tombstoned rows and blank bodies are excluded.
 */
export function groupGratitudeByMonth<T extends GratitudeListRow>(
  rows: readonly T[],
  todayKey: string,
): GratitudeMonthGroup<T>[] {
  const byMonth = new Map<string, T[]>();
  for (const row of rows) {
    if (
      row.deletedAt !== null ||
      row.localDate === todayKey ||
      row.body.trim() === ''
    ) {
      continue;
    }
    const key = row.localDate.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      byMonth.set(key, [row]);
    }
  }

  return [...byMonth.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => {
      const [year, month] = monthKey.split('-');
      return {
        monthKey,
        monthLabel: `${EGYPTIAN_MONTHS[Number(month) - 1] ?? ''} ${toArabicDigits(Number(year))}`,
        items: byMonth
          .get(monthKey)!
          .sort((a, b) => b.localDate.localeCompare(a.localDate)),
      };
    });
}
