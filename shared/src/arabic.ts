// Explicit code-point ranges only (no \p{} classes, no Intl — Hermes compatibility).
const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]/g;
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g;

export const NAME_TOKEN = '{الاسم}';

export const EGYPTIAN_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

export interface PersonalizeItem {
  readonly text: string;
  readonly textFemale?: string | null;
}

export interface PersonalizeProfile {
  readonly name?: string;
  readonly gender?: 'male' | 'female';
}

/** Normalize Arabic text for diacritic-, digit-, bidi-, and variant-insensitive matching. */
export function normalizeArabic(input: string): string {
  const nfc = typeof input.normalize === 'function' ? input.normalize('NFC') : input;
  return nfc
    .replace(BIDI_CONTROLS, '')
    .replace(ARABIC_MARKS, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Return true when the normalized query is empty or appears in the normalized haystack. */
export function matches(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeArabic(query);
  if (normalizedQuery === '') {
    return true;
  }
  return normalizeArabic(haystack).includes(normalizedQuery);
}

/** Convert ASCII digits 0-9 to Arabic-Indic digits while leaving non-digits untouched. */
export function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}

/** Format a local Date as `<day> <Arabic month> <year>` in Arabic-Indic digits. */
export function formatArabicDate(
  date: Date,
  months: readonly string[] = EGYPTIAN_MONTHS,
): string {
  const monthIndex = date.getMonth();
  const month = months[monthIndex] ?? EGYPTIAN_MONTHS[monthIndex] ?? '';
  return `${toArabicDigits(date.getDate())} ${month} ${toArabicDigits(date.getFullYear())}`;
}

/** Select male/female text variant and substitute or strip NAME_TOKEN safely. */
export function personalize(item: PersonalizeItem, profile: PersonalizeProfile): string {
  const raw = profile.gender === 'female' && item.textFemale ? item.textFemale : item.text;
  const name = profile.name?.trim();
  if (name) {
    return raw.replaceAll(NAME_TOKEN, () => name);
  }
  return raw.replaceAll(NAME_TOKEN, '').replace(/\s{2,}/g, ' ').trim();
}
