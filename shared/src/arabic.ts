// Explicit code-point ranges only (no \p{} classes, no Intl — Hermes compatibility).
const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]/g;
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g;

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
