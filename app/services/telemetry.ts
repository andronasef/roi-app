import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import { getApps } from '@react-native-firebase/app';
import {
  crash,
  getCrashlytics,
  recordError,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';

import type { AllowedEvent, ErrorCode } from '@/constants/telemetry';
import { scrubError } from '@/services/telemetry-scrub';

export interface TelemetryStatus {
  initialized: boolean;
  hasProjectId: boolean;
}

let scrubberInstalled = false;

/**
 * Ensures Crashlytics has installed its global uncaught JS handler, then wraps
 * ErrorUtils so every uncaught error is scrubbed to a known error code first
 * (release builds only; dev builds pass the original error through).
 */
export function installGlobalErrorScrubber(): void {
  if (scrubberInstalled) {
    return;
  }
  scrubberInstalled = true;

  getCrashlytics();

  if (typeof ErrorUtils === 'undefined') {
    return;
  }

  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    // Dev builds keep the real error so the red-box stays debuggable; scrubbing only protects data leaving the device.
    previousHandler(__DEV__ ? error : scrubError(error), isFatal);
  });
}

export function track(name: AllowedEvent): void {
  logEvent(getAnalytics(), name);
}

export function reportError(code: ErrorCode): void {
  recordError(getCrashlytics(), new Error(code));
}

export async function setTelemetryConsent(on: boolean): Promise<void> {
  await setAnalyticsCollectionEnabled(getAnalytics(), on);
  await setCrashlyticsCollectionEnabled(getCrashlytics(), on);
}

export function telemetryStatus(): TelemetryStatus {
  const defaultApp = getApps().find((app) => app.name === '[DEFAULT]');
  if (!defaultApp) {
    return { initialized: false, hasProjectId: false };
  }
  const projectId = defaultApp.options?.projectId;
  return {
    initialized: true,
    hasProjectId: typeof projectId === 'string' && projectId.trim().length > 0,
  };
}

export function testCrash(): void {
  crash(getCrashlytics());
}
