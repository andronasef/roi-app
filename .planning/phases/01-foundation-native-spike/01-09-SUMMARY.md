---
phase: 01-foundation-native-spike
plan: 09
subsystem: fonts-scripture-ui
tags: [expo-font, arabic-fonts, slider, scripture, reusables, rtl, accessibility]

requires:
  - phase: 01-foundation-native-spike
    provides: NativeWind warm paper tokens, MMKV preferences, and approved package pins (01-01, 01-08)
provides:
  - Seven PostScript-named Arabic TTF fonts (Amiri, Scheherazade New, IBM Plex Sans Arabic) and three OFL licenses
  - expo-font and react-native-android-widget font configuration in app/app.json
  - ScriptureSizeProvider, Scripture text component, and 5-step ScriptureSizeSlider persisted in MMKV
  - React Native Reusables Dialog and Select at exact 01-01 pins with logical RTL classes and PortalHost
affects: [01-10, 01-13, 01-14, 01-15, 01-16]

actuals:
  tasks: 2
  commits: 2
  plan_head_before: 8f603c0
  plan_head_after: dd78647

tech-stack:
  added:
    - "@react-native-community/slider@5.2.1"
    - "@rn-primitives/dialog@1.5.2"
    - "@rn-primitives/select@1.5.2"
    - "@rn-primitives/portal@1.5.3"
    - "@rn-primitives/slot@1.5.2"
    - "class-variance-authority@0.7.1"
    - "clsx@2.1.1"
    - "tailwind-merge@2.6.2"
    - "tailwindcss-animate@1.0.7"
    - "lucide-react-native@0.577.0"
  patterns:
    - "PostScript-named TTF files bundled via expo-font and shared with react-native-android-widget"
    - "Single ScriptureSizeProvider context syncing 5-step size (18, 20, 23, 27, 32) and candidate font to MMKV"
    - "Reusables owned source converted to logical RTL utilities (start/end/ps/pe/ms/me/text-start) with zero tracking-* classes"

key-files:
  created:
    - app/assets/fonts/Amiri-Regular.ttf
    - app/assets/fonts/Amiri-Bold.ttf
    - app/assets/fonts/Amiri-OFL.txt
    - app/assets/fonts/ScheherazadeNew-Regular.ttf
    - app/assets/fonts/ScheherazadeNew-Bold.ttf
    - app/assets/fonts/ScheherazadeNew-OFL.txt
    - app/assets/fonts/IBMPlexSansArabic-Regular.ttf
    - app/assets/fonts/IBMPlexSansArabic-Medium.ttf
    - app/assets/fonts/IBMPlexSansArabic-Bold.ttf
    - app/assets/fonts/IBMPlexSansArabic-OFL.txt
    - app/features/scripture/scripture.tsx
    - app/components.json
    - app/components/ui/dialog.tsx
    - app/components/ui/select.tsx
    - app/components/ui/text.tsx
    - app/components/ui/icon.tsx
    - app/components/ui/native-only-animated-view.tsx
    - app/lib/utils.ts
  modified:
    - app/app.json
    - app/constants/theme.ts
    - app/app/_layout.tsx
    - app/app/index.tsx
    - app/locales/ar.json
    - app/package.json
    - bun.lock

key-decisions:
  - "Converted all physical-direction utilities and removed tracking-tight classes from Reusables UI components to preserve Arabic shaping and RTL"
  - "Added accessibilityRole='button' and Arabic close label from app/locales/ar.json on DialogPrimitive.Close"

patterns-established:
  - "All Scripture text renders via <Scripture> with writingDirection='rtl', maxFontSizeMultiplier=1.3, and zero letterSpacing"

requirements-completed: [FND-02]

coverage:
  - id: D1
    description: "Seven PostScript-named Arabic TTF fonts bundled and 5-step Scripture size slider persisted in MMKV"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "cd app && bunx expo install --check && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reusables Dialog and Select copied at exact 01-01 pins with logical RTL classes and PortalHost"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "cd app && bunx expo install --check && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 09: Bundled Arabic Fonts, Scripture Slider & Reusables Summary

**Bundled 7 PostScript-named Arabic TTF fonts (`Amiri`, `Scheherazade New`, `IBM Plex Sans Arabic`), implemented `ScriptureSizeProvider`/`Scripture`/`ScriptureSizeSlider` persisted in MMKV, and installed Reusables `Dialog` and `Select` at exact `01-01` pins with logical RTL classes**

## Performance

- **Duration:** 6 min
- **Completed:** 2026-11-25
- **Tasks:** 2
- **Files modified:** 25 (18 created, 7 modified)

## Font SHA-256 Checksums (from google/fonts)

- `Amiri-Regular.ttf`: `ab391c4147d054c48976e98322ad0eefe1427aa0e0502a12a4c75d80a70cfcd7`
- `Amiri-Bold.ttf`: `cfccb794268e7d573d857e6d6a67f89cf8a053e8ffd85dfa0c8ec1bb36fc4827`
- `ScheherazadeNew-Regular.ttf`: `794bac8dc9e83d1d620bc471ea694f5f31d0965ce8006490a79dfc51a2d283b3`
- `ScheherazadeNew-Bold.ttf`: `91363517a63dbc7448b5814226d33d845b26b32a461cd159ea0b3f23c7effd2d`
- `IBMPlexSansArabic-Regular.ttf`: `6f611412270a132bbac838da9259d4c68569b4175f3b3b8fa3fa36a30b56dab9`
- `IBMPlexSansArabic-Medium.ttf`: `b8363ab9f733dfa4f8e96b8b2102c24b5cf4110fb96d1d3d9a9412f6fb49cf74`
- `IBMPlexSansArabic-Bold.ttf`: `691e0c891a38637ae6bbdb69700f8042cb0724a137bee615068ffdb92244f61f`

## Accomplishments
- Downloaded all 7 TTFs and 3 OFL license files from `google/fonts` into `app/assets/fonts/` and configured `expo-font` and `react-native-android-widget` (`Amiri-Regular.ttf`, `IBMPlexSansArabic-Regular.ttf`) in `app/app.json`.
- Populated `FONT_FAMILIES`, `SCRIPTURE_SIZES` (`[18, 20, 23, 27, 32]`), `SCRIPTURE_STEP_DEFAULT`, `SCRIPTURE_LINE_HEIGHT`, `SCRIPTURE_SLIDER_INVERTED`, `MAX_FONT_SIZE_MULTIPLIER`, and `MIN_TOUCH` in `app/constants/theme.ts`.
- Built `ScriptureSizeProvider`, `useScriptureSize`, `Scripture`, and `ScriptureSizeSlider` (`@react-native-community/slider@5.2.1`) in `app/features/scripture/scripture.tsx`, wired `ScriptureSizeProvider` in `app/app/_layout.tsx`, and rendered `ps23-1` with the slider on `app/app/index.tsx`.
- Ran `@react-native-reusables/cli@0.7.1 add dialog select`, created `app/lib/utils.ts`, pinned all 9 Reusables/UI packages to exact `01-01` versions while keeping `tailwindcss@3.4.19` and `nativewind@4.2.7`, converted physical-direction utilities (`left-0 right-0`, `right-4`, `sm:text-left`, `pl-2 pr-8`, `right-2`, `border-l-2 pl-3 sm:pl-6`) to logical forms, removed `tracking-tight`, and rendered `<PortalHost />` in `app/app/_layout.tsx`.

## Task Commits

1. **Task 1: Bundled Arabic fonts and 5-step Scripture size slider (D-06)** - `cead953` (feat)
2. **Task 2: Reusables Dialog and Select at the exact 01-01 pins with logical RTL classes** - `dd78647` (feat)

## Deviations from Plan
- Created `app/lib/utils.ts` and explicitly ran `bun add` for the full 9-package `01-01` Reusables set because `@react-native-reusables/cli@0.7.1` only wrote `package.json` entries for `@rn-primitives/*` and copied the 5 UI files.

## Next Phase Readiness
- Wave 9 (`01-10`: dev-gated torture-fixtures screen and static guard tests) is unblocked.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
