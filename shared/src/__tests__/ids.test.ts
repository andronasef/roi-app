import { describe, expect, it } from 'vitest';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { uuidv7 } from '../ids';

const fixedRand = (fill: number) => (n: number) => new Uint8Array(n).fill(fill);

describe('uuidv7', () => {
  it('produces valid RFC 9562 version 7 UUIDs cross-checked by uuid package', () => {
    const id = uuidv7(1_795_552_189_123, fixedRand(0xab));
    expect(uuidValidate(id)).toBe(true);
    expect(uuidVersion(id)).toBe(7);
  });

  it('encodes now in milliseconds in the first 12 lowercase hex digits', () => {
    const now = 0x0193_9a4b_cdef;
    const id = uuidv7(now, fixedRand(0x55));
    const compact = id.replace(/-/g, '');
    expect(compact.slice(0, 12)).toBe('01939a4bcdef');
    expect(id).toBe(id.toLowerCase());
  });

  it('maintains lexicographical sort order over 100 increasing timestamps', () => {
    const base = 1_795_552_000_000;
    const ids = Array.from({ length: 100 }, (_, i) => uuidv7(base + i, fixedRand(0xff - (i % 16))));
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(100);
  });

  it('is deterministic for the same now and injected rand and varies with rand', () => {
    const now = 1_795_552_189_000;
    const a = uuidv7(now, fixedRand(0x12));
    const b = uuidv7(now, fixedRand(0x12));
    const c = uuidv7(now, fixedRand(0x34));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
