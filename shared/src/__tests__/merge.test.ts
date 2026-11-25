import { describe, expect, it } from 'vitest';
import { mergeRecords, type SyncRow } from '../merge';

interface TestRow extends SyncRow {
  body: string;
}

const NOW = 1_795_552_000_000;
const DAY_MS = 86_400_000;

describe('mergeRecords', () => {
  it('is commutative: merge(a, b) deep-equals merge(b, a)', () => {
    const a: TestRow[] = [
      { id: '2', updatedAt: 100, deletedAt: null, body: 'b' },
      { id: '1', updatedAt: 200, deletedAt: null, body: 'a1' },
    ];
    const b: TestRow[] = [
      { id: '1', updatedAt: 200, deletedAt: null, body: 'a2' },
      { id: '3', updatedAt: 150, deletedAt: 150, body: 'c' },
    ];
    expect(mergeRecords(a, b, NOW)).toEqual(mergeRecords(b, a, NOW));
  });

  it('converges on a full tie regardless of per-device key order', () => {
    // Device 1 holds x with Drizzle key order and receives y in JSON order; device 2 holds the reverse.
    const d1 = mergeRecords(
      [{ id: '1', updatedAt: 100, deletedAt: null, body: 'x' }],
      [{ body: 'y', deletedAt: null, updatedAt: 100, id: '1' }],
      NOW,
    );
    const d2 = mergeRecords(
      [{ body: 'y', deletedAt: null, updatedAt: 100, id: '1' }],
      [{ id: '1', updatedAt: 100, deletedAt: null, body: 'x' }],
      NOW,
    );
    const d2b = mergeRecords(
      [{ id: '1', updatedAt: 100, deletedAt: null, body: 'y' }],
      [{ body: 'x', deletedAt: null, updatedAt: 100, id: '1' }],
      NOW,
    );
    expect(d1[0]?.body).toBe(d2[0]?.body);
    expect(d1[0]?.body).toBe(d2b[0]?.body);
  });

  it('is idempotent: merge(a, a) equals a sorted by id', () => {
    const a: TestRow[] = [
      { id: 'z', updatedAt: 100, deletedAt: null, body: 'last' },
      { id: 'a', updatedAt: 200, deletedAt: null, body: 'first' },
    ];
    expect(mergeRecords(a, a, NOW)).toEqual([a[1], a[0]]);
  });

  it('is associative over shuffled inputs', () => {
    const a: TestRow[] = [
      { id: '2', updatedAt: 100, deletedAt: null, body: 'a2' },
      { id: '1', updatedAt: 300, deletedAt: null, body: 'a1' },
    ];
    const b: TestRow[] = [
      { id: '3', updatedAt: 200, deletedAt: null, body: 'b3' },
      { id: '2', updatedAt: 100, deletedAt: 100, body: 'b2' },
    ];
    const c: TestRow[] = [
      { id: '1', updatedAt: 250, deletedAt: 250, body: 'c1' },
      { id: '4', updatedAt: 400, deletedAt: null, body: 'c4' },
    ];

    const leftAssoc = mergeRecords(mergeRecords(a, b, NOW), c, NOW);
    const rightAssoc = mergeRecords(a, mergeRecords(b, c, NOW), NOW);
    const shuffled = mergeRecords([...c].reverse(), mergeRecords([...b].reverse(), [...a].reverse(), NOW), NOW);

    expect(leftAssoc).toEqual(rightAssoc);
    expect(shuffled).toEqual(leftAssoc);
  });

  it('lets a tombstone win an edit with the same updatedAt', () => {
    const edit: TestRow = { id: '1', updatedAt: 500, deletedAt: null, body: 'edited' };
    const tomb: TestRow = { id: '1', updatedAt: 500, deletedAt: 500, body: 'edited' };

    expect(mergeRecords([edit], [tomb], NOW)).toEqual([tomb]);
    expect(mergeRecords([tomb], [edit], NOW)).toEqual([tomb]);
  });

  it('lets a newer edit beat an older tombstone', () => {
    const olderTomb: TestRow = { id: '1', updatedAt: 500, deletedAt: 500, body: 'v1' };
    const newerEdit: TestRow = { id: '1', updatedAt: 600, deletedAt: null, body: 'v2' };

    expect(mergeRecords([olderTomb], [newerEdit], NOW)).toEqual([newerEdit]);
    expect(mergeRecords([newerEdit], [olderTomb], NOW)).toEqual([newerEdit]);
  });

  it('clamps rows whose updatedAt is more than one day ahead of now to now', () => {
    const future: TestRow = { id: '1', updatedAt: NOW + DAY_MS + 1, deletedAt: null, body: 'future' };
    const honestNewer: TestRow = { id: '1', updatedAt: NOW + 1000, deletedAt: null, body: 'honest' };
    const withinSkew: TestRow = { id: '2', updatedAt: NOW + DAY_MS, deletedAt: null, body: 'skew' };

    const merged = mergeRecords([future, withinSkew], [honestNewer], NOW);
    expect(merged).toEqual([honestNewer, withinSkew]);
  });

  it('unions append-only event rows from two devices by id', () => {
    const devA: SyncRow[] = [
      { id: 'ev-1', updatedAt: 100, deletedAt: null },
      { id: 'ev-2', updatedAt: 200, deletedAt: null },
    ];
    const devB: SyncRow[] = [
      { id: 'ev-2', updatedAt: 200, deletedAt: null },
      { id: 'ev-3', updatedAt: 300, deletedAt: null },
    ];
    expect(mergeRecords(devA, devB, NOW)).toEqual([
      { id: 'ev-1', updatedAt: 100, deletedAt: null },
      { id: 'ev-2', updatedAt: 200, deletedAt: null },
      { id: 'ev-3', updatedAt: 300, deletedAt: null },
    ]);
  });
});
