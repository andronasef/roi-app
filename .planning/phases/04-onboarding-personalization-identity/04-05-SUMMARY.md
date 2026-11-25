---
phase: 04-onboarding-personalization-identity
plan: 05
subsystem: ui
tags: [leyaana, markdown, react-native-marked, expo-clipboard, favorites, rtl, arabic, personalization]

requires:
  - phase: 04-onboarding-personalization-identity
    provides: Drizzle 0002 verse_assignments/favorites/personal_items schema and assignments engine (04-02), ProfileProvider and uiCopy (04-03)
  - phase: 02-content-backend-first-download
    provides: ContentRefreshContext and local public verses, names_of_god, and blessings tables
provides:
  - Deterministic daily Name of God and Blessing pickers, diacritic-insensitive Arabic catalog search, and chronological Favorites hydration
  - Markdown plain-text stripper, recipient-prompt detector, and verse/article clipboard copy formatters
  - Custom RTL warm-paper RoiMarkdownRenderer and useMarkdown() MarkdownBody component (no FlatList, no tappable links/images)
  - Recipient-aware CopyVerseDialog ("الآية دي ليك ولا هتبعتها لحد؟") with gender and optional recipient name preview
  - 4-tab LeyaanaScreen (الآيات | أسماء الله | البركات | المفضلة), /leyaana, /leyaana/history (السجل), and /leyaana/browse (تصفح الكل)
affects: [04-07, 05-memorization, 08-drive-sync]

actuals:
  tokens: 21718
  tasks: 3
  commits: 3
  plan_head_before: e7128805aa72cd8c600cc60fd0290ceecb17f875
  plan_head_after: e443476a9aff0a2a543d48b3e98b771578ad155e
commits: 3

tech-stack:
  added: []
  patterns:
    - "useMarkdown() + RoiMarkdownRenderer subclass inside plain View (avoiding nested FlatList and disabling link/image rendering)"
    - "useMemo + refreshTick + useFocusEffect + useContentVersion() SQLite refresh pattern avoiding synchronous setState in useEffect"
    - "Shared useCopiedToast and CopiedToast pill with expo-clipboard setStringAsync and recipient-aware CopyVerseDialog"

key-files:
  created:
    - app/features/leyaana/catalog.ts
    - app/features/leyaana/copy.ts
    - app/features/leyaana/__tests__/catalog-copy.test.ts
    - app/features/leyaana/MarkdownBody.tsx
    - app/features/leyaana/CopyVerseDialog.tsx
    - app/features/leyaana/LeyaanaScreen.tsx
    - app/app/leyaana/index.tsx
    - app/app/leyaana/history.tsx
    - app/app/leyaana/browse.tsx
  modified: []

key-decisions:
  - "Exposed headerRight and renderTabExtra props on LeyaanaScreen so Plan 04-07 can attach the '+ أضف عنصر' CTA and personal-item sections without refactoring the 4-tab container."
  - "Used a refreshTick counter incremented by useFocusEffect and user mutations alongside useMemo over [refreshTick, contentVersion] to refresh SQLite reads without triggering react-hooks/set-state-in-effect."

patterns-established:
  - "All react-native-marked rendering goes through MarkdownBody + RoiMarkdownRenderer using logical RTL blockquote borders and IBMPlexSansArabic-* font families."
  - "All verse/article copy actions route through copy.ts formatters, CopyVerseDialog (when needsRecipientPrompt is true), and expo-clipboard."

requirements-completed: [ME-01, ME-02, ME-03, ME-04, ME-05, ME-06, ME-07, PERS-02, PERS-03, PERS-04]

coverage:
  - id: D1
    description: "Deterministic daily Name of God and Blessing pickers, diacritic-insensitive Arabic search, and hydrated Favorites aggregator"
    requirements: [ME-04, ME-05, ME-06]
    verification:
      - kind: unit
        ref: "app/features/leyaana/__tests__/catalog-copy.test.ts#picks deterministic daily Name of God and Blessing, returns null when empty, and searches ignoring diacritics/variants"
        status: pass
      - kind: unit
        ref: "app/features/leyaana/__tests__/catalog-copy.test.ts#hydrates starred public and personal favorites newest-first, filters by kind, and skips tombstoned sources"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recipient-aware verse copy detection, Markdown stripper, and formatted clipboard copy composition"
    requirements: [ME-07, PERS-02, PERS-03]
    verification:
      - kind: unit
        ref: "app/features/leyaana/__tests__/catalog-copy.test.ts#detects recipient prompt need, strips Markdown cleanly, and formats verse & article copy text"
        status: pass
    human_judgment: false
  - id: D3
    description: "Custom RTL MarkdownBody (no FlatList, no tappable links/images), CopyVerseDialog, 4-tab LeyaanaScreen, /leyaana/history, and /leyaana/browse"
    requirements: [ME-01, ME-02, ME-03, ME-04, ME-05, ME-06, ME-07, PERS-04]
    verification:
      - kind: static
        ref: "app/__tests__/guards.test.ts"
        status: pass
      - kind: typecheck
        ref: "bun run typecheck"
        status: pass
      - kind: lint
        ref: "cd app && bun run lint"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-25
status: complete
---

# Phase 04 Plan 05: 4-Tab ليا أنا, History, Browse-All, RTL Markdown & Recipient-Aware Copy Summary

**Built the 4-tab **ليا أنا** screen (**الآيات | أسماء الله | البركات | المفضلة**), **السجل** snapshot history route, **تصفح الكل** searchable library route, custom RTL warm-paper `useMarkdown()` renderer (`MarkdownBody.tsx`), chronological Favorites ⭐, and recipient-aware `expo-clipboard` copy flow (`CopyVerseDialog.tsx` + `"اتنسخت"` toast)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-25T23:12:00+02:00
- **Completed:** 2026-11-25T23:17:15+02:00
- **Tasks:** 3
- **Files created:** 9

## Accomplishments
- Implemented `app/features/leyaana/catalog.ts` (`listLiveNamesOfGod`, `listLiveBlessings`, `pickDailyNameOfGod`, `pickDailyBlessing`, `searchNamesOfGod`, `searchBlessings`, `listHydratedFavorites`) and `app/features/leyaana/copy.ts` (`stripMarkdownForCopy`, `needsRecipientPrompt`, `formatVerseForCopy`, `formatArticleForCopy`) with full Vitest SQLite coverage in `app/features/leyaana/__tests__/catalog-copy.test.ts`.
- Built `app/features/leyaana/MarkdownBody.tsx` (`RoiMarkdownRenderer` + `MarkdownBody` via `useMarkdown()` without `FlatList` nesting, logical RTL `border-s-2 ps-4 pe-3` blockquotes, explicit `IBMPlexSansArabic-*` fonts, and links/images disabled per `T-04-07`) and `app/features/leyaana/CopyVerseDialog.tsx` (`"الآية دي ليك ولا هتبعتها لحد؟"` with `"ليا أنا"` vs `"هبعتها لحد"` recipient gender/name live `<Scripture>` preview).
- Built `app/features/leyaana/LeyaanaScreen.tsx`, `app/app/leyaana/index.tsx`, `app/app/leyaana/history.tsx` (**السجل**), and `app/app/leyaana/browse.tsx` (**تصفح الكل**) with Saturday-to-Friday & Egyptian month badges, ⭐ favorite toggles, kind filter chips, diacritic-insensitive search, rich-text card modal, and 2-second `"اتنسخت"` toast.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement catalog queries, Markdown stripper, recipient-aware copy composer, and unit tests** - `46a7f0b` (feat)
2. **Task 2: Build custom RTL warm-paper MarkdownBody (react-native-marked) and CopyVerseDialog** - `d4082ba` (feat)
3. **Task 3: Build 4-tab LeyaanaScreen, /leyaana, /leyaana/history, and /leyaana/browse routes** - `e443476` (feat)

## Files Created/Modified
- `app/features/leyaana/catalog.ts` - Daily deterministic pickers, Arabic search helpers, and chronological public+personal Favorites aggregator.
- `app/features/leyaana/copy.ts` - Markdown plain-text stripper, recipient-prompt detector, and verse/article copy formatters.
- `app/features/leyaana/__tests__/catalog-copy.test.ts` - Vitest suite testing daily picks, Arabic variant search, favorite hydration + orphan safety, Markdown stripping, and copy formatting.
- `app/features/leyaana/MarkdownBody.tsx` - Custom RTL warm-paper `react-native-marked` `useMarkdown()` renderer with links converted to plain text and images disabled.
- `app/features/leyaana/CopyVerseDialog.tsx` - Recipient-aware verse copy `Dialog` with live personalized `<Scripture>` preview.
- `app/features/leyaana/LeyaanaScreen.tsx` - 4-tab **ليا أنا** container with `headerRight` / `renderTabExtra` extension slots, `useCopiedToast`, `CopiedToast`, and `formatPeriodBadge`.
- `app/app/leyaana/index.tsx` - `/leyaana` route rendering `<LeyaanaScreen />`.
- `app/app/leyaana/history.tsx` - `/leyaana/history` (**السجل**) route displaying persisted verse assignment snapshots newest-first.
- `app/app/leyaana/browse.tsx` - `/leyaana/browse` (**تصفح الكل**) searchable Names of God / Blessings list and full rich-text card `Dialog`.

## Decisions Made
- Exposed `headerRight` and `renderTabExtra` props on `LeyaanaScreen` so Plan `04-07` can wire the `"+ أضف عنصر"` header CTA and personal items sections cleanly.
- Switched screen SQLite reads in `LeyaanaScreen.tsx`, `history.tsx`, and `browse.tsx` to `useMemo` keyed on `[refreshTick, contentVersion]` (bumped by `useFocusEffect` and favorite toggles) instead of calling `setState` inside `useEffect`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed multiline regex eating blank lines before blockquotes in `stripMarkdownForCopy`**
- **Found during:** Task 1 (`catalog-copy.test.ts` TDD verification)
- **Issue:** `\s{0,3}` at the start of line-anchored Markdown prefix regexes matched preceding `\n` blank lines before `> اقتباس`.
- **Fix:** Replaced `\s` with `[ \t]` in line-start prefix regexes so blank paragraph separators remain intact.
- **Files modified:** `app/features/leyaana/copy.ts`
- **Commit:** `46a7f0b`

**2. [Rule 1 - Bug] Removed `right-side` comment substring flagged by RTL static guard and switched SQLite effect refreshes to `useMemo` + `refreshTick`**
- **Found during:** Task 3 verification (`guards.test.ts` and `expo lint --max-warnings 0`)
- **Issue:** A JSDoc comment containing `right-side` matched `guards.test.ts`'s `right-` physical-direction pattern, and `useEffect(() => { refresh(); }, [contentVersion])` triggered `react-hooks/set-state-in-effect` in `history.tsx` and `browse.tsx`.
- **Fix:** Reworded comment to `trailing`, and refactored `LeyaanaScreen.tsx`, `history.tsx`, and `browse.tsx` to derive SQLite snapshots via `useMemo` keyed on `[refreshTick, contentVersion]`.
- **Files modified:** `app/features/leyaana/LeyaanaScreen.tsx`, `app/app/leyaana/history.tsx`, `app/app/leyaana/browse.tsx`
- **Commit:** `e443476`

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- **ليا أنا** 4-tab UI, history route, browse-all route, RTL Markdown renderer, and recipient-aware copy flow are complete and verified.
- `LeyaanaScreen` exposes `headerRight` and `renderTabExtra` for Plan `04-07` (`PersonalItemDialog` + `"اقترح للكل"`).

## Self-Check: PASSED
- Verified all 9 created files exist on disk.
- Verified commits `46a7f0b`, `d4082ba`, and `e443476` are ancestors of `HEAD`.
- Verified `bun run test -- --project @roi/app --project @roi/shared` (22 files / 159 tests passed), `bun run typecheck` (passed), and `cd app && bun run lint` (passed with 0 warnings).

---
*Phase: 04-onboarding-personalization-identity*
*Completed: 2026-11-25*
