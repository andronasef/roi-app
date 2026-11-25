import { toArabicDigits } from '@roi/shared';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

import { SPIKE_CHECK_TIMEOUT_MS } from '@/constants/spike';
import { MIN_TOUCH } from '@/constants/theme';
import {
  AUTOMATIC_CHECKS,
  getDeviceLocaleTag,
  getTelemetryConsent,
  runGoogleSignInCheck,
  sendSpikeTestEvent,
  throwSpikeSentinelError,
  toggleTelemetryConsent,
  triggerSpikeTestCrash,
} from '@/features/spike/rows';
import {
  runChecks,
  summaryLine,
  type SpikeCheckResult,
} from '@/features/spike/runner';
import ar from '@/locales/ar.json';

const CHECK_TITLES: Record<string, string> = {
  spikeRowRtl: ar.spikeRowRtl,
  spikeRowFonts: ar.spikeRowFonts,
  spikeRowMmkv: ar.spikeRowMmkv,
  spikeRowSqlite: ar.spikeRowSqlite,
  spikeRowReanimated: ar.spikeRowReanimated,
  spikeRowFsrs: ar.spikeRowFsrs,
  spikeRowFirebase: ar.spikeRowFirebase,
  spikeRowWidget: ar.spikeRowWidget,
};

type ManualStatus = 'idle' | 'running' | 'pass' | 'fail';

export default function SpikeScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [results, setResults] = useState<SpikeCheckResult[]>([]);
  const [running, setRunning] = useState(true);
  const [consentEnabled, setConsentEnabled] = useState(getTelemetryConsent);
  const [eventSent, setEventSent] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<ManualStatus>('idle');
  const [googleError, setGoogleError] = useState<string | null>(null);

  const localeTag = getDeviceLocaleTag();

  const runAllChecks = useCallback(async () => {
    const nextResults = await runChecks(
      AUTOMATIC_CHECKS,
      SPIKE_CHECK_TIMEOUT_MS,
    );
    return nextResults;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void runAllChecks().then((nextResults) => {
      if (cancelled) {
        return;
      }
      setResults(nextResults);
      setRunning(false);
      console.log(summaryLine(Platform.OS, nextResults));
    });
    return () => {
      cancelled = true;
    };
  }, [runAllChecks]);

  const handleRerun = async () => {
    setRunning(true);
    try {
      const nextResults = await runAllChecks();
      setResults(nextResults);
      console.log(summaryLine(Platform.OS, nextResults));
    } catch {
      console.warn('spike rerun failed');
    } finally {
      setRunning(false);
    }
  };

  const handleToggleConsent = async (next: boolean) => {
    try {
      await toggleTelemetryConsent(next);
      setConsentEnabled(next);
    } catch {
      console.warn('telemetry consent update failed');
      setConsentEnabled(getTelemetryConsent());
    }
  };

  const handleSendTestEvent = async () => {
    try {
      await sendSpikeTestEvent();
      setEventSent(true);
    } catch {
      console.warn('spike test event failed');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleStatus('running');
    setGoogleError(null);
    try {
      const ok = await runGoogleSignInCheck();
      setGoogleStatus(ok ? 'pass' : 'fail');
    } catch (error) {
      setGoogleStatus('fail');
      setGoogleError(
        error instanceof Error ? error.message.slice(0, 160) : String(error),
      );
    }
  };

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const currentSummaryLine = summaryLine(Platform.OS, results);

  const googleStatusText =
    googleStatus === 'pass'
      ? ar.spikeStatusPass
      : googleStatus === 'fail'
        ? ar.spikeStatusFail
        : googleStatus === 'running'
          ? ar.spikeRunning
          : ar.spikeStatusPending;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 py-10 gap-4"
    >
      {from === 'widget' ? (
        <View className="rounded-2xl border border-accent bg-card px-4 py-3">
          <Text className="text-center text-base font-bold text-foreground">
            {ar.spikeFromWidgetBanner}
          </Text>
        </View>
      ) : null}

      <Text
        accessibilityRole="header"
        className="text-center text-2xl font-bold text-foreground"
      >
        {ar.spikeTitle}
      </Text>

      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4">
        <Text testID={currentSummaryLine} className="text-base font-bold text-foreground">
          {running
            ? ar.spikeRunning
            : `${ar.spikeSummaryLabel}: ${toArabicDigits(passCount)} ${ar.spikePassCountLabel} · ${toArabicDigits(failCount)} ${ar.spikeFailCountLabel}`}
        </Text>
        <Pressable
          onPress={() => void handleRerun()}
          accessibilityRole="button"
          accessibilityLabel={ar.spikeRerun}
          style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH }}
          className="items-center justify-center rounded-xl bg-primary px-4 py-2"
        >
          <Text className="text-sm font-medium text-primary-foreground">
            {ar.spikeRerun}
          </Text>
        </Pressable>
      </View>

      <View className="gap-2.5">
        {results.map((result) => {
          const title = CHECK_TITLES[result.titleKey] ?? result.titleKey;
          const isPass = result.status === 'pass';
          return (
            <View
              key={result.id}
              className="gap-1 rounded-2xl border border-border bg-card p-3.5"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-medium text-foreground">
                  {title}
                </Text>
                <Text
                  className={`text-sm font-bold ${
                    isPass ? 'text-accent' : 'text-destructive'
                  }`}
                >
                  {isPass ? ar.spikeStatusPass : ar.spikeStatusFail}
                </Text>
              </View>
              {result.id === 'rtl' ? (
                <Text className="text-xs text-muted-foreground">
                  {`${ar.spikeLocaleLabel}: ${localeTag}`}
                </Text>
              ) : null}
              {result.reason ? (
                <Text className="text-xs text-destructive">
                  {result.reason}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="mt-2 gap-3 rounded-2xl border border-border bg-card p-4">
        <Text
          accessibilityRole="header"
          className="text-base font-bold text-foreground"
        >
          {ar.spikeManualHeading}
        </Text>

        <View
          style={{ minHeight: MIN_TOUCH }}
          className="flex-row items-center justify-between gap-3"
        >
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {ar.spikeManualConsent}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {consentEnabled ? ar.spikeManualConsentOn : ar.spikeManualConsentOff}
            </Text>
          </View>
          <Switch
            value={consentEnabled}
            onValueChange={(next) => void handleToggleConsent(next)}
            accessibilityRole="switch"
            accessibilityLabel={ar.spikeManualConsent}
          />
        </View>

        <Pressable
          onPress={() => void handleSendTestEvent()}
          accessibilityRole="button"
          accessibilityLabel={ar.spikeManualTestEvent}
          style={{ minHeight: MIN_TOUCH }}
          className="flex-row items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5"
        >
          <Text className="text-sm font-medium text-foreground">
            {ar.spikeManualTestEvent}
          </Text>
          {eventSent ? (
            <Text className="text-xs font-bold text-accent">
              {ar.spikeManualEventSent}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={triggerSpikeTestCrash}
          accessibilityRole="button"
          accessibilityLabel={ar.spikeManualTestCrash}
          style={{ minHeight: MIN_TOUCH }}
          className="items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5"
        >
          <Text className="text-sm font-medium text-foreground">
            {ar.spikeManualTestCrash}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => throwSpikeSentinelError()}
          accessibilityRole="button"
          accessibilityLabel={ar.spikeManualSentinelError}
          style={{ minHeight: MIN_TOUCH }}
          className="items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5"
        >
          <Text className="text-sm font-medium text-foreground">
            {ar.spikeManualSentinelError}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void handleGoogleSignIn()}
          accessibilityRole="button"
          accessibilityLabel={ar.spikeManualGoogleSignIn}
          style={{ minHeight: MIN_TOUCH }}
          className="flex-row items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5"
        >
          <Text className="text-sm font-medium text-foreground">
            {ar.spikeManualGoogleSignIn}
          </Text>
          <Text className="text-xs font-bold text-muted-foreground">
            {googleStatusText}
          </Text>
        </Pressable>
        {googleError ? (
          <Text className="text-xs text-destructive">{googleError}</Text>
        ) : null}

        <View className="rounded-xl border border-border bg-background p-3">
          <Text className="text-xs leading-5 text-muted-foreground">
            {ar.spikeManualWidgetInstructions}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
