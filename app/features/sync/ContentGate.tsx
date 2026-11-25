import type { SnapshotType } from '@roi/shared';
import * as Network from 'expo-network';
import { useSegments } from 'expo-router';
import { WifiOff } from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Pressable, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { DEV_TOOLS_ENABLED } from '../../constants/app';
import { CONTENT_STAGES } from '../../constants/sync';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import ar from '../../locales/ar.json';
import { track } from '../../services/telemetry';
import { db, deviceClock } from '../db/client';
import { createSyncApiClient } from './api';
import { runDeltaSyncIfDue } from './delta-sync';
import { readSyncState, runFirstDownload } from './first-download';
import { createExpoStagingStore } from './staging';

export type DownloadStatus = 'idle' | 'downloading' | 'paused' | 'error';

export type GateMode =
  | 'ready'
  | 'offline_empty'
  | 'downloading'
  | 'paused'
  | 'error';

export interface DeriveGateModeInput {
  lastContentVersion: number;
  isOnline: boolean;
  downloadStatus: DownloadStatus;
}

const STAGE_LABELS: Record<SnapshotType, string> = {
  verses: ar.stageVerses,
  names_of_god: ar.stageNamesOfGod,
  blessings: ar.stageBlessings,
};

/** Allow deferred Phase 1 (dev) spike/torture deep links offline when DEV_TOOLS_ENABLED is true (D-13). */
export function shouldBypassContentGate(
  devEnabled: boolean,
  segments: readonly string[],
): boolean {
  return Boolean(devEnabled) && segments[0] === '(dev)';
}

/** Resolve the visible gate mode from local contentVersion, connectivity, and active download state. */
export function deriveGateMode({
  lastContentVersion,
  isOnline,
  downloadStatus,
}: DeriveGateModeInput): GateMode {
  if (lastContentVersion > 0) {
    return 'ready';
  }
  if (
    downloadStatus === 'downloading' ||
    downloadStatus === 'paused' ||
    downloadStatus === 'error'
  ) {
    return downloadStatus;
  }
  return isOnline ? 'downloading' : 'offline_empty';
}

/** Map active snapshot stage to its calm Egyptian Arabic label without percentages or byte counts (D-01). */
export function getStageLabel(stage: SnapshotType): string {
  return STAGE_LABELS[stage];
}

/** Map active snapshot stage (1..3) to a deterministic 1/3, 2/3, 3/3 progress fraction. */
export function getStageProgressFraction(stage: SnapshotType): number {
  const index = CONTENT_STAGES.indexOf(stage);
  const step = index >= 0 ? index + 1 : 1;
  return step / CONTENT_STAGES.length;
}

function isNetworkOnline(state: Network.NetworkState): boolean {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

function resolveInitialStage(completed: readonly SnapshotType[]): SnapshotType {
  const next = CONTENT_STAGES.find((stage) => !completed.includes(stage));
  return next ?? CONTENT_STAGES[CONTENT_STAGES.length - 1];
}

/**
 * Root content gate:
 * - Passes through immediately when DEV_TOOLS_ENABLED && segments[0] === '(dev)' (D-13).
 * - Launches offline immediately once lastContentVersion > 0 and triggers silent 6h delta sync when online (D-03).
 * - Before first download completes, shows Offline Gate or resumable 3-stage calm progress bar (HOME-06, HOME-07).
 */
export function ContentGate({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const networkState = Network.useNetworkState();
  const isOnline = isNetworkOnline(networkState);
  const isBypassed = shouldBypassContentGate(DEV_TOOLS_ENABLED, segments);

  const [lastContentVersion, setLastContentVersion] = useState<number>(
    () => readSyncState(db).lastContentVersion,
  );
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [activeStage, setActiveStage] = useState<SnapshotType>('verses');

  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
  const deltaCheckedThisOnlineRef = useRef(false);
  // Bumped on every return to foreground so the (6h-throttled) delta check re-arms without a restart.
  const [foregroundTick, setForegroundTick] = useState(0);

  const startDownload = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setDownloadStatus('downloading');
    try {
      track('first_download_started');
    } catch {
      // Telemetry failure must never block content download.
    }

    try {
      const result = await runFirstDownload({
        db,
        clock: deviceClock,
        api: createSyncApiClient(),
        staging: createExpoStagingStore(),
        signal: controller.signal,
        onProgress: (stage) => {
          setActiveStage(stage);
        },
      });
      try {
        track('first_download_completed');
      } catch {
        // Telemetry failure must never block completion transition.
      }
      setLastContentVersion(result.contentVersion);
      setDownloadStatus('idle');
    } catch {
      const latestNet = await Network.getNetworkStateAsync().catch(() => null);
      const onlineAfterFailure = latestNet
        ? isNetworkOnline(latestNet)
        : isOnlineRef.current;
      setDownloadStatus(onlineAfterFailure ? 'error' : 'paused');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      inFlightRef.current = false;
    }
  }, []);

  // Restore paused staging checkpoint on mount if an earlier download was interrupted.
  useEffect(() => {
    if (lastContentVersion > 0) {
      return;
    }
    let cancelled = false;
    void createExpoStagingStore()
      .readManifest()
      .then((manifest) => {
        if (cancelled || !manifest || manifest.completed.length === 0) {
          return;
        }
        setActiveStage(resolveInitialStage(manifest.completed));
        if (!inFlightRef.current && !isOnlineRef.current) {
          setDownloadStatus((prev) => (prev === 'idle' ? 'paused' : prev));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lastContentVersion]);

  // Interrupt an active request promptly if connectivity drops mid-batch.
  useEffect(() => {
    if (!isOnline) {
      deltaCheckedThisOnlineRef.current = false;
      if (inFlightRef.current && abortRef.current) {
        abortRef.current.abort();
      }
    }
  }, [isOnline]);

  // Auto-start or auto-resume first download when online (D-02).
  useEffect(() => {
    if (isBypassed || lastContentVersion > 0 || !isOnline) {
      return;
    }
    if (downloadStatus === 'idle' || downloadStatus === 'paused') {
      void startDownload();
    }
  }, [isBypassed, lastContentVersion, isOnline, downloadStatus, startDownload]);

  // Silent background 6h delta sync once library is initialized and online (D-03).
  useEffect(() => {
    if (isBypassed || lastContentVersion <= 0 || !isOnline) {
      return;
    }
    if (deltaCheckedThisOnlineRef.current) {
      return;
    }
    deltaCheckedThisOnlineRef.current = true;
    void runDeltaSyncIfDue({
      db,
      clock: deviceClock,
      api: createSyncApiClient(),
      isOnline: true,
    })
      .then((result) => {
        if (result.status === 'reset') {
          // Server lineage was rewound; the auto-start effect re-runs first download from version 0.
          setLastContentVersion(0);
        }
      })
      .catch(() => {});
  }, [isBypassed, lastContentVersion, isOnline, foregroundTick]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        deltaCheckedThisOnlineRef.current = false;
        setForegroundTick((tick) => tick + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  // Abort any pending download request on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleRetry = useCallback(async () => {
    const net = await Network.getNetworkStateAsync().catch(() => null);
    if (!net || !isNetworkOnline(net)) {
      return;
    }
    void startDownload();
  }, [startDownload]);

  const targetFraction = getStageProgressFraction(activeStage);
  const progress = useSharedValue(targetFraction);

  useEffect(() => {
    progress.value = withTiming(targetFraction, {
      duration: 300,
      reduceMotion: ReduceMotion.System,
    });
  }, [progress, targetFraction]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 1000) / 10}%`,
  }));

  if (isBypassed) {
    return <>{children}</>;
  }

  const mode = deriveGateMode({
    lastContentVersion,
    isOnline,
    downloadStatus,
  });

  if (mode === 'ready') {
    return <>{children}</>;
  }

  if (mode === 'offline_empty') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 py-8">
        <View className="w-full items-center gap-4 rounded-2xl border border-border bg-card p-6">
          <Icon as={WifiOff} size={32} className="text-accent" />
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="text-center text-xl font-bold text-foreground"
          >
            {ar.offlineGateTitle}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            {ar.offlineGateBody}
          </Text>
          <Pressable
            onPress={() => {
              void handleRetry();
            }}
            accessibilityRole="button"
            accessibilityLabel={ar.retryButton}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary px-6 py-3"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              {ar.retryButton}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const stageLabel = getStageLabel(activeStage);
  const stageStep = CONTENT_STAGES.indexOf(activeStage) + 1;

  return (
    <View className="flex-1 items-center justify-center bg-background px-6 py-8">
      <View className="w-full items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-center text-xl font-bold text-foreground"
        >
          {ar.downloadingTitle}
        </Text>
        <Text className="text-center text-base text-foreground">
          {stageLabel}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={stageLabel}
          accessibilityValue={{
            min: 0,
            max: CONTENT_STAGES.length,
            now: stageStep > 0 ? stageStep : 1,
          }}
          className="h-3 w-full flex-row overflow-hidden rounded-full bg-muted"
        >
          <Animated.View
            className="h-full rounded-full bg-accent"
            style={animatedBarStyle}
          />
        </View>

        {mode === 'paused' ? (
          <>
            <Text className="text-center text-sm text-muted-foreground">
              {ar.downloadPausedNotice}
            </Text>
            <Pressable
              onPress={() => {
                void handleRetry();
              }}
              accessibilityRole="button"
              accessibilityLabel={ar.retryButton}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary px-6 py-3"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                {ar.retryButton}
              </Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'error' ? (
          <>
            <Text className="text-center text-sm text-destructive">
              {ar.downloadErrorNotice}
            </Text>
            <Pressable
              onPress={() => {
                void handleRetry();
              }}
              accessibilityRole="button"
              accessibilityLabel={ar.retryButton}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary px-6 py-3"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                {ar.retryButton}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}
