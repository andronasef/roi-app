import { describe, expect, it } from 'vitest';
import { localDateKey, monthKey, seededPick, weekKey } from '../period';

describe('localDateKey and monthKey', () => {
  it('formats local date components without UTC conversion', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 0, 5, 23, 59, 59))).toBe('2026-01-05');
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01');
  });
});

describe('weekKey', () => {
  it.each([
    { y: 2026, m: 10, d: 24, expected: '2026-11-21' }, // Tue 2026-11-24
    { y: 2026, m: 10, d: 21, expected: '2026-11-21' }, // Sat 2026-11-21
    { y: 2026, m: 10, d: 27, expected: '2026-11-21' }, // Fri 2026-11-27
    { y: 2026, m: 10, d: 28, expected: '2026-11-28' }, // Sat 2026-11-28
    { y: 2026, m: 10, d: 1, expected: '2026-10-31' },  // Sun 2026-11-01 (US DST fallback)
    { y: 2026, m: 0, d: 1, expected: '2025-12-27' },   // Thu 2026-01-01 (cross-year)
    { y: 2026, m: 9, d: 30, expected: '2026-10-24' },  // Fri 2026-10-30
  ])('computes Saturday-start week key for $y-$m-$d -> $expected', ({ y, m, d, expected }) => {
    expect(weekKey(new Date(y, m, d))).toBe(expected);
    expect(weekKey(new Date(y, m, d, 23, 45))).toBe(expected);
  });
});

describe('seededPick', () => {
  it('returns frozen deterministic index for pinned seeds', () => {
    const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const seven = [0, 1, 2, 3, 4, 5, 6];
    expect(seededPick(ten, 'verse:2026-11-21')).toBe(8);
    expect(seededPick(ten, 'verse:2026-11-28')).toBe(9);
    expect(seededPick(seven, 'name:2026-11')).toBe(1);
  });

  it('returns undefined for an empty list', () => {
    expect(seededPick([], 'verse:2026-11-21')).toBeUndefined();
  });
});
