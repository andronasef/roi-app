import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ALLOWED_EVENTS,
  ERROR_CODES,
  PRAYER_SENTINEL,
} from '../../constants/telemetry';
import { scrubError } from '../telemetry-scrub';

const APP_ROOT = path.resolve(__dirname, '../..');

describe('scrubError', () => {
  it('strips single-line sentinel message and preserves original stack frames', () => {
    const original = new Error(PRAYER_SENTINEL);
    const originalFrames = (original.stack ?? '')
      .split(/\r?\n/)
      .filter((line) => /^\s+at\s/.test(line));

    const scrubbed = scrubError(original);

    expect(scrubbed).toBeInstanceOf(Error);
    expect(scrubbed.message).toBe(ERROR_CODES.E_UNCAUGHT);
    expect(scrubbed.stack).not.toContain(PRAYER_SENTINEL);
    expect(scrubbed.stack?.split(/\r?\n/)[0]).toBe(
      `Error: ${ERROR_CODES.E_UNCAUGHT}`,
    );
    expect(originalFrames.length).toBeGreaterThan(0);
    for (const frame of originalFrames) {
      expect(scrubbed.stack).toContain(frame);
    }
  });

  it('strips multi-line error messages including sentinel text while keeping frames', () => {
    const line2 = 'sensitive user name';
    const line3 = 'sensitive verse text';
    const original = new Error(`${PRAYER_SENTINEL}\n${line2}\n${line3}`);
    const originalFrames = (original.stack ?? '')
      .split(/\r?\n/)
      .filter((line) => /^\s+at\s/.test(line));

    const scrubbed = scrubError(original);

    expect(scrubbed.message).toBe(ERROR_CODES.E_UNCAUGHT);
    expect(scrubbed.stack).not.toContain(PRAYER_SENTINEL);
    expect(scrubbed.stack).not.toContain(line2);
    expect(scrubbed.stack).not.toContain(line3);
    expect(originalFrames.length).toBeGreaterThan(0);
    for (const frame of originalFrames) {
      expect(scrubbed.stack).toContain(frame);
    }
  });

  it('preserves known ERROR_CODES messages and strips non-exact suffixes', () => {
    for (const code of Object.values(ERROR_CODES)) {
      const original = new Error(code);
      const scrubbed = scrubError(original);
      expect(scrubbed.message).toBe(code);
      expect(scrubbed.stack?.split(/\r?\n/)[0]).toBe(`Error: ${code}`);
    }

    const polluted = scrubError(
      new Error(`${ERROR_CODES.E_MIGRATION}: extra leaked text`),
    );
    expect(polluted.message).toBe(ERROR_CODES.E_UNCAUGHT);
    expect(polluted.stack).not.toContain('extra leaked text');
  });

  it('maps thrown strings, numbers, and undefined to E_UNCAUGHT', () => {
    for (const thrown of ['secret prayer text', 12345, undefined, null]) {
      const scrubbed = scrubError(thrown);
      expect(scrubbed).toBeInstanceOf(Error);
      expect(scrubbed.message).toBe(ERROR_CODES.E_UNCAUGHT);
      expect(scrubbed.stack).not.toContain('secret prayer text');
    }
  });
});

describe('telemetry closed event list & choke point', () => {
  it('enforces valid GA4 event names with no reserved prefixes', () => {
    const validEventPattern = /^[a-z][a-z0-9_]{0,39}$/;
    const forbiddenPrefixes = ['firebase_', 'google_', 'ga_'];

    expect(ALLOWED_EVENTS.length).toBeGreaterThan(0);
    for (const eventName of ALLOWED_EVENTS) {
      expect(eventName).toMatch(validEventPattern);
      for (const prefix of forbiddenPrefixes) {
        expect(eventName.startsWith(prefix)).toBe(false);
      }
    }
  });

  it('passes no parameters object to logEvent inside track()', () => {
    const source = fs.readFileSync(
      path.join(APP_ROOT, 'services', 'telemetry.ts'),
      'utf8',
    );
    const trackMatch = source.match(
      /export function track\([\s\S]*?\n\}/,
    );
    expect(trackMatch).not.toBeNull();
    expect(trackMatch?.[0]).toMatch(
      /logEvent\(\s*getAnalytics\(\)\s*,\s*name\s*\)/,
    );
  });

  it('disables analytics/crashlytics auto-collection, screen reporting, ad-id, and personalization in firebase.json', () => {
    const firebaseJson = JSON.parse(
      fs.readFileSync(path.join(APP_ROOT, 'firebase.json'), 'utf8'),
    ) as {
      'react-native'?: Record<string, unknown>;
    };

    const rnConfig = firebaseJson['react-native'];
    expect(rnConfig).toBeDefined();
    expect(rnConfig?.analytics_auto_collection_enabled).toBe(false);
    expect(rnConfig?.crashlytics_auto_collection_enabled).toBe(false);
    expect(rnConfig?.google_analytics_automatic_screen_reporting_enabled).toBe(
      false,
    );
    expect(rnConfig?.google_analytics_adid_collection_enabled).toBe(false);
    expect(rnConfig?.analytics_default_allow_ad_personalization_signals).toBe(
      false,
    );
  });
});
