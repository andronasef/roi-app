import { ERROR_CODES } from '../constants/telemetry';

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set(
  Object.values(ERROR_CODES),
);

/**
 * Replaces arbitrary error messages and non-frame stack text with a known error
 * code while preserving original JS stack frame lines for diagnostics.
 */
export function scrubError(value: unknown): Error {
  const rawMessage = value instanceof Error ? value.message : undefined;
  const code =
    typeof rawMessage === 'string' && KNOWN_ERROR_CODES.has(rawMessage)
      ? rawMessage
      : ERROR_CODES.E_UNCAUGHT;

  const scrubbed = new Error(code);
  const firstLine = scrubbed.stack?.split(/\r?\n/, 1)[0] ?? `Error: ${code}`;

  if (value instanceof Error && typeof value.stack === 'string') {
    const frames = value.stack
      .split(/\r?\n/)
      .filter((line) => /^\s+at\s/.test(line));
    scrubbed.stack =
      frames.length > 0 ? [firstLine, ...frames].join('\n') : firstLine;
  } else {
    scrubbed.stack = firstLine;
  }

  return scrubbed;
}
