import {
  SPIKE_CHECK_TIMEOUT_MS,
  SPIKE_LOG_PREFIX,
} from '../../constants/spike';

export type SpikeCheckStatus = 'pass' | 'fail';

export interface SpikeCheck {
  readonly id: string;
  readonly titleKey: string;
  readonly run: () => Promise<boolean>;
}

export interface SpikeCheckResult {
  readonly id: string;
  readonly titleKey: string;
  readonly status: SpikeCheckStatus;
  readonly reason?: string;
}

const MAX_REASON_LENGTH = 200;

function formatFailureReason(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message || error.name
      : typeof error === 'string'
        ? error
        : String(error);
  return raw.slice(0, MAX_REASON_LENGTH);
}

export async function runChecks(
  checks: readonly SpikeCheck[],
  timeoutMs: number = SPIKE_CHECK_TIMEOUT_MS,
): Promise<SpikeCheckResult[]> {
  const results: SpikeCheckResult[] = [];

  for (const check of checks) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const passed = await Promise.race([
        check.run(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error('timeout'));
          }, timeoutMs);
        }),
      ]);

      if (passed) {
        results.push({
          id: check.id,
          titleKey: check.titleKey,
          status: 'pass',
        });
      } else {
        results.push({
          id: check.id,
          titleKey: check.titleKey,
          status: 'fail',
          reason: 'check returned false',
        });
      }
    } catch (error) {
      results.push({
        id: check.id,
        titleKey: check.titleKey,
        status: 'fail',
        reason: formatFailureReason(error),
      });
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  return results;
}

export function summaryLine(
  platform: string,
  results: readonly SpikeCheckResult[],
): string {
  let passCount = 0;
  let failCount = 0;
  for (const result of results) {
    if (result.status === 'pass') {
      passCount += 1;
    } else {
      failCount += 1;
    }
  }
  return `${SPIKE_LOG_PREFIX} ${platform} pass=${passCount} fail=${failCount}`;
}
