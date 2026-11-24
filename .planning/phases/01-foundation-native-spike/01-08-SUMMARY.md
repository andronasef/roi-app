---
phase: 01-foundation-native-spike
plan: 08
subsystem: styling-storage
tags: [nativewind, tailwindcss, mmkv, theme, rtl, accessibility]

requires:
  - phase: 01-foundation-native-spike
    provides: Drizzle baseline migration, Arabic locales, and prebuild native config (01-07)
provides:
  - NativeWind 4 warm paper light/dark HSL CSS-variable tokens (app/global.css, app/tailwind.config.js)
  - Single MMKV instance (app/services/storage.ts) with typed preference getters/setters
  - Theme preference constants (app/constants/theme.ts) and useThemePreference hook
  - Accessible three-way system/light/dark radio switch on the home screen
affects: [01-09, 01-10, 01-14, 01-15, 01-16]

actuals:
  tasks: 2
  commits: 2
  plan_head_before: fc09b1b
  plan_head_after: 6546f0a

tech-stack:
  added: []
  patterns:
    - "Warm paper HSL CSS variables in global.css (:root and .dark:root) mapped to semantic Tailwind tokens with darkMode: 'class'"
    - "Single MMKV instance via createMMKV({ id: 'roi-preferences' }) storing UI preferences only"
    - "useThemePreference subscribes to MMKV value changes and updates NativeWind colorScheme.set()"

key-files:
  created:
    - app/tailwind.config.js
    - app/global.css
    - app/nativewind-env.d.ts
    - app/types/css.d.ts
    - app/constants/theme.ts
    - app/services/storage.ts
    - app/hooks/use-theme-preference.ts
  modified:
    - app/tsconfig.json
    - app/babel.config.js
    - app/metro.config.js
    - app/app/_layout.tsx
    - app/locales/ar.json
    - app/app/index.tsx

key-decisions:
  - "Added app/types/css.d.ts for '*.css' module imports and included it in app/tsconfig.json so tsc resolves '../global.css' cleanly"
  - "Preserved bun isolated linker babel-preset-expo resolution alongside NativeWind jsxImportSource and css-interop plugin, and preserved .sql bundling in Metro withNativeWind"

patterns-established:
  - "All color tokens live as HSL triples in app/global.css; non-color theme constants live in app/constants/theme.ts"
  - "Radio group options use min-h-[44px] min-w-[44px] touch targets, accessibilityRole='radio', accessibilityLabel, and accessibilityState={{ checked }}"

requirements-completed: [FND-05]

coverage:
  - id: D1
    description: "NativeWind 4 warm paper CSS-variable tokens and MMKV preference storage compile on iOS and Android without losing SQL bundling"
    requirement: "FND-05"
    verification:
      - kind: other
        ref: "cd app && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Accessible three-way system/light/dark switch on home screen persisted in MMKV"
    requirement: "FND-05"
    verification:
      - kind: other
        ref: "cd app && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 08: NativeWind Warm Paper Theme & MMKV Storage Summary

**Configured NativeWind 4 warm paper light/dark CSS-variable tokens, single MMKV preference storage (`roi-preferences`), and an accessible three-way Arabic theme switch on the home screen**

## Performance

- **Duration:** 8 min
- **Completed:** 2026-11-24
- **Tasks:** 2
- **Files modified:** 13 (7 created, 6 modified)

## Accomplishments
- Added warm paper light (`FAF6EC`/`2B2620`) and dark (`1E1B17`/`EDE6D6`) HSL tokens with muted gold/olive accent (`8A7A3B`/`C2B26A`) in `app/global.css` and semantic color mappings (`darkMode: 'class'`, `fontFamily.sans: ['IBMPlexSansArabic-Regular']`) in `app/tailwind.config.js`.
- Updated `app/babel.config.js` (NativeWind `jsxImportSource` + `nativewind/babel` while preserving bun isolated `babel-preset-expo` path and `.sql` `inline-import`) and `app/metro.config.js` (`withNativeWind(..., { input: './global.css' })` while preserving `.sql` `sourceExts`).
- Created `app/constants/theme.ts` (`THEME_OPTIONS`, `THEME_DEFAULT`) and `app/services/storage.ts` (`createMMKV({ id: 'roi-preferences' })` with typed getters/setters for `theme`, `scriptureStep`, and `scriptureFont`).
- Applied stored theme preference on startup in `app/app/_layout.tsx`, created `app/hooks/use-theme-preference.ts`, added Arabic theme and Scripture slider strings in `app/locales/ar.json`, and rendered an accessible `radiogroup`/`radio` switch (`>= 44x44` targets) in `app/app/index.tsx`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer - NativeWind CSS-variable tokens, MMKV preference storage and startup apply** - `4708c10` (feat)
2. **Task 2: Theme preference hook, Arabic theme and Scripture strings, accessible home switch** - `6546f0a` (feat)

## Files Created/Modified
- `app/tailwind.config.js` - NativeWind preset, `darkMode: 'class'`, sans font family, semantic HSL colors
- `app/global.css` - Tailwind directives plus `:root` and `.dark:root` warm paper HSL variables
- `app/nativewind-env.d.ts` - NativeWind TypeScript reference
- `app/types/css.d.ts` - CSS module declaration for `../global.css` import
- `app/tsconfig.json` - Included `types/**/*.d.ts`
- `app/babel.config.js` - NativeWind JSX import source and babel plugin alongside `.sql` inline-import
- `app/metro.config.js` - Wrapped Metro config with `withNativeWind` while preserving `.sql` extension
- `app/constants/theme.ts` - `THEME_OPTIONS`, `ThemePreference`, `THEME_DEFAULT`
- `app/services/storage.ts` - Single MMKV instance and typed preference accessors
- `app/hooks/use-theme-preference.ts` - Reactive hook syncing MMKV and NativeWind `colorScheme`
- `app/locales/ar.json` - Added `themeLabel`, `themeSystem`, `themeLight`, `themeDark`, `scriptureSizeLabel`, `scriptureSizeOutOf`
- `app/app/_layout.tsx` - Imported `../global.css` and applied stored theme on mount
- `app/app/index.tsx` - Replaced inline styles with NativeWind classes and added accessible theme radio switch

## Decisions Made
- Added `app/types/css.d.ts` so strict `tsc` resolves `import '../global.css'` without errors.
- Used `colorScheme.set()` from `nativewind` in both `_layout.tsx` and `use-theme-preference.ts`; on-device visual verification of class-based dark mode on SDK 58 happens in plans `01-15` and `01-16`.

## Deviations from Plan
- None in scope; `app/types/css.d.ts` and `app/tsconfig.json` were added cleanly as part of Task 1 TypeScript support for `global.css`.

## Issues Encountered
- Initial Task 1 commit ran cleanly; Task 2 edits were verified after quota reset with `expo export` (iOS + Android), `expo lint --max-warnings 0`, and `bun run typecheck`.

## User Setup Required
None.

## Next Phase Readiness
- Wave 8 (`01-09`: bundled Arabic fonts, 5-step Scripture size slider, Reusables `Dialog` & `Select`) is unblocked.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*
