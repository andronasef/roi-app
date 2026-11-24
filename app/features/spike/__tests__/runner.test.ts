import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runChecks,
  summaryLine,
  type SpikeCheck,
  type SpikeCheckResult,
} from '../runner';

describe('spike check runner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports pass for passing checks and fail when a check returns false', async () => {
    const checks: SpikeCheck[] = [
      { id: 'ok', titleKey: 'spikeRowOk', run: async () => true },
      { id: 'nope', titleKey: 'spikeRowNope', run: async () => false },
    ];

    const results = await runChecks(checks, 1000);

    expect(results).toEqual([
      { id: 'ok', titleKey: 'spikeRowOk', status: 'pass' },
      {
        id: 'nope',
        titleKey: 'spikeRowNope',
        status: 'fail',
        reason: 'check returned false',
      },
    ]);
  });

  it('truncates thrown error messages to 200 characters', async () => {
    const longError = 'x'.repeat(260);
    const checks: SpikeCheck[] = [
      {
        id: 'boom',
        titleKey: 'spikeRowBoom',
        run: async () => {
          throw new Error(longError);
        },
      },
    ];

    const results = await runChecks(checks, 1000);

    expect(results[0]?.status).toBe('fail');
    expect(results[0]?.reason).toHaveLength(200);
    expect(results[0]?.reason).toBe('x'.repeat(200));
  });

  it('fails with reason timeout when a check exceeds timeoutMs', async () => {
    vi.useFakeTimers();

    const checks: SpikeCheck[] = [
      {
        id: 'slow',
        titleKey: 'spikeRowSlow',
        run: () => new Promise<boolean>(() => {}),
      },
    ];

    const promise = runChecks(checks, 5000);
    await vi.advanceTimersByTimeAsync(5000);
    const results = await promise;

    expect(results).toEqual([
      {
        id: 'slow',
        titleKey: 'spikeRowSlow',
        status: 'fail',
        reason: 'timeout',
      },
    ]);
  });

  it('formats summaryLine exactly without leaking failure reasons', () => {
    const results: SpikeCheckResult[] = [
      { id: 'a', titleKey: 'k1', status: 'pass' },
      { id: 'b', titleKey: 'k2', status: 'pass' },
      {
        id: 'c',
        titleKey: 'k3',
        status: 'fail',
        reason: 'SECRET_REASON_MUST_NOT_APPEAR',
      },
    ];

    const line = summaryLine('ios', results);

    expect(line).toBe('SPIKE_RESULT ios pass=2 fail=1');
    expect(line).not.toContain('SECRET_REASON_MUST_NOT_APPEAR');
  });
});
