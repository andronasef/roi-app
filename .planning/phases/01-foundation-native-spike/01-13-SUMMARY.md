---
phase: 01-foundation-native-spike
plan: 13
subsystem: home-widgets
tags: [expo-widgets, react-native-android-widget, swift-ui, deep-linking, rtl]

requires:
  - phase: 01-foundation-native-spike
    provides: Widget config plugins (01-07), widget fonts (01-09), static guards (01-10)
provides:
  - ROUTES.spike, SPIKE_WIDGET_URL, and SETTINGS_KEYS.SPIKE_WIDGET in app/constants/app.ts
  - Android react-native-android-widget view, SQLite headless handler, pre-router registration, and pushSpikeWidget
  - iOS expo-widgets RoiSpike layout with inline widgetURL and update.ios.ts pushSpikeWidget
  - Static entry-order, URL, scheme-drift, and platform parity tests in app/features/widgets/__tests__/widgets.test.ts
affects: [01-14, 01-15, 01-16]

actuals:
  tasks: 2
  commits: 1
  plan_head_before: 5f80eae
  plan_head_after: b88ba47

tech-stack:
  added: []
  patterns:
    - "Platform-split widget push API: update.ts (Android requestWidgetUpdate) and update.ios.ts (iOS RoiSpike.updateSnapshot)"
    - "Android headless handler registered before expo-router/entry in app/index.ts using a separate expo-sqlite connection"
    - "iOS expo-widgets 'widget' directive function kept free of app imports and guarded against scheme drift"

key-files:
  created:
    - app/features/widgets/android/SpikeWidget.tsx
    - app/features/widgets/android/task-handler.tsx
    - app/features/widgets/android/register.ts
    - app/features/widgets/update.ts
    - app/features/widgets/update.ios.ts
    - app/features/widgets/ios/RoiSpike.tsx
    - app/features/widgets/__tests__/widgets.test.ts
  modified:
    - app/constants/app.ts
    - app/index.ts

key-decisions:
  - "Used @expo/ui 58.0.29 trailing alignment (VStack alignment='trailing', frame alignment, multilineTextAlignment='trailing', environment('locale', 'ar')) because EnvironmentConfig in SDK 58 exposes locale rather than layoutDirection"
  - "Opened a dedicated expo-sqlite connection in task-handler.tsx with useNewConnection: true and guaranteed close in finally"

patterns-established:
  - "Both platforms expose identical pushSpikeWidget(count: number) signature"

requirements-completed: [FND-09]

coverage:
  - id: D1
    description: "Android widget view, headless SQLite handler, pre-router registration, and pushSpikeWidget"
    requirement: "FND-09"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app && cd app && bunx expo export --platform android --output-dir dist/01-13/android && bun run lint"
        status: pass
    human_judgment: false
  - id: D2
    description: "iOS expo-widgets layout with inline widgetURL, pushSpikeWidget, and scheme-drift tests"
    requirement: "FND-09"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app && cd app && bunx expo export --platform ios --output-dir dist/01-13/ios && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 13: Android & iOS Spike Widgets Summary

**Built the Android `react-native-android-widget` spike widget with headless SQLite task handler, the iOS `expo-widgets` `RoiSpike` widget with inline `widgetURL`, unified `pushSpikeWidget(count)`, and static drift/registration tests**

## Accomplishments
- Added `ROUTES.spike`, `SPIKE_WIDGET_URL`, and `SETTINGS_KEYS.SPIKE_WIDGET` in `app/constants/app.ts`.
- Built Android `SpikeWidget.tsx`, `task-handler.tsx`, `register.ts`, `update.ts`, and imported `./features/widgets/android/register` before `'expo-router/entry'` in `app/index.ts`.
- Built iOS `RoiSpike.tsx` (`'widget'` directive, `@expo/ui/swift-ui` trailing RTL alignment, `containerBackground`, `widgetURL('roi://spike?from=widget')`) and `update.ios.ts`, plus `widgets.test.ts` (4/4 passing).

## Next Phase Readiness
- Wave 11 (`01-14` dev spike screen) is unblocked for the widget update row and `from=widget` banner.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
