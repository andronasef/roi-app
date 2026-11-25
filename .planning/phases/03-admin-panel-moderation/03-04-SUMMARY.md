---
phase: 03-admin-panel-moderation
plan: 04
subsystem: ui
tags: [vite, react, tailwindcss, typescript, vitest, i18n, fonts, rtl]

requires:
  - phase: 03-admin-panel-moderation
    plan: 01
    provides: Owner-approved pinned dependencies for admin/ (including graphql@16.15.0, zod@4.6.7, @testing-library/dom@10.4.2)
provides:
  - Configured admin/ Vite 8 + React 19 + Tailwind 4 workspace with base '/admin/' and /graphql + /health dev proxy
  - Split root/admin/app TypeScript configurations validated by bun run typecheck
  - Vitest jsdom test environment with Node-only guard in admin/vitest.config.ts
  - Self-hosted Amiri and IBM Plex Sans Arabic (400/700) .ttf fonts in admin/public/fonts/ and warm-paper Tailwind 4 tokens in admin/src/index.css
  - cn() classname helper and bilingual AR/EN I18nProvider, useI18n, formatNumber, and formatTimestamp in admin/src/lib/i18n.ts
affects: [03-05, 03-06, 03-07, 03-08, 03-09]

actuals:
  tokens: 7302
  tasks: 2
  commits: 2

commits: 2
plan_head_before: 746f6b19724309f65615734d52f300c1b8f52601
plan_head_after: b1d639e3c4ec14d73bb753b187d16baae0abb6a2

tech-stack:
  added:
    - "react@19.3.1"
    - "react-dom@19.3.1"
    - "react-router@8.5.3"
    - "@tanstack/react-query@5.108.4"
    - "graphql-request@7.4.0"
    - "graphql@16.15.0"
    - "@react-oauth/google@0.13.5"
    - "@tiptap/react@3.35.0"
    - "@tiptap/starter-kit@3.35.0"
    - "@tiptap/pm@3.35.0"
    - "@tiptap/core@3.35.0"
    - "react-hook-form@7.92.0"
    - "@hookform/resolvers@7.0.9"
    - "zod@4.6.7"
    - "lucide-react@1.80.0"
    - "clsx@2.1.1"
    - "tailwind-merge@3.7.1"
    - "class-variance-authority@0.7.1"
    - "vite@8.3.8"
    - "@vitejs/plugin-react@6.3.0"
    - "tailwindcss@4.3.5"
    - "@tailwindcss/vite@4.3.5"
    - "@types/react@19.3.3"
    - "@types/react-dom@19.3.0"
    - "@testing-library/react@16.3.3"
    - "@testing-library/dom@10.4.2"
    - "@testing-library/user-event@14.6.13"
    - "jsdom@31.0.1"
  patterns:
    - "Split root tsconfig.json (shared/src, backend/src) and admin/tsconfig.json (DOM, react-jsx, vite/client, @/* alias)"
    - "Self-hosted 400/700 .ttf fonts served from /admin/fonts/ with zero external font CDN links under Helmet CSP"
    - "Bilingual AR/EN I18nProvider persisting 'roi_admin_lang' and syncing documentElement.lang + dir while keeping @roi/shared Arabic-Indic formatting"

key-files:
  created:
    - admin/tsconfig.json
    - admin/vite.config.ts
    - admin/vitest.config.ts
    - admin/index.html
    - admin/src/index.css
    - admin/public/fonts/Amiri-Regular.ttf
    - admin/public/fonts/Amiri-Bold.ttf
    - admin/public/fonts/IBMPlexSansArabic-Regular.ttf
    - admin/public/fonts/IBMPlexSansArabic-Bold.ttf
    - admin/src/lib/utils.ts
    - admin/src/lib/i18n.ts
    - admin/src/__tests__/i18n-utils.test.tsx
  modified:
    - tsconfig.json
    - package.json
    - admin/package.json
    - bun.lock

key-decisions:
  - "Scoped admin/tsconfig.json include to src/ and used fileURLToPath(new URL('./src', import.meta.url)) in vite.config.ts / vitest.config.ts so admin/ compiles cleanly without adding unapproved @types/node."
  - "Used React createElement inside admin/src/lib/i18n.ts to preserve the exact .ts module path specified in the plan while exporting I18nProvider."

patterns-established:
  - "Warm-paper palette tokens (#FAF5EB background, #F2EAD7 card, #E9E0CE secondary/muted, #DAD2C3 border, #8B7B3C accent, #2C2721 primary, #C23329 destructive, #B45309/#FFFBEB/#FCD34D warning) exposed via Tailwind v4 @theme inline."
  - "All numeric counts and timestamps route through formatNumber() and formatTimestamp() so Arabic mode uses toArabicDigits() and formatArabicDate() from @roi/shared."

requirements-completed: [ADM-01]

duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 04: Admin Workspace Scaffold, Warm-Paper Theme & Bilingual i18n Summary

**Isolated `admin/` Vite 8 + React 19 + Tailwind 4 workspace with split TypeScript/Vitest configuration, self-hosted Amiri/IBM Plex Sans Arabic fonts, warm-paper design tokens, and bilingual AR/EN `i18n` formatting**

## Performance

- **Duration:** 4 min (228s)
- **Started:** 2026-11-25T16:12:33Z
- **Completed:** 2026-11-25T16:16:21Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Installed all 28 owner-approved runtime and dev packages from `03-01-SUMMARY.md` into `admin/package.json` under Bun's isolated linker, preserving `graphql@16.15.0`, `zod@4.6.7`, and explicit `@testing-library/dom@10.4.2`, without hoisting Tailwind 4 into root or `app/`.
- Split `tsconfig.json` (removing `admin/src`) and created `admin/tsconfig.json` with `DOM`, `DOM.Iterable`, `react-jsx`, `vite/client`, and `@/*` path mapping, updating root `package.json#typecheck` to validate `tsconfig.json`, `admin/tsconfig.json`, and `app/tsconfig.json`.
- Configured `admin/vite.config.ts` (`base: '/admin/'`, `@tailwindcss/vite`, `@` alias, `/graphql` + `/health` proxy) and `admin/vitest.config.ts` (`jsdom`, `@vitejs/plugin-react`, Node-only guard), plus CSP-clean `admin/index.html` and Tailwind 4 warm-paper tokens in `admin/src/index.css`.
- Copied self-hosted `Amiri` (`400`/`700`) and `IBM Plex Sans Arabic` (`400`/`700`) `.ttf` fonts from `app/assets/fonts/` into `admin/public/fonts/`, added `cn()` in `admin/src/lib/utils.ts`, and implemented the full bilingual AR/EN Copywriting Contract, `I18nProvider`, `useI18n`, `formatNumber`, and `formatTimestamp` in `admin/src/lib/i18n.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install admin dependencies, split TypeScript/Vitest configs, and set up Tailwind 4 warm-paper theme** - `a20ec93` (chore)
2. **Task 2: Copy self-hosted Arabic fonts into admin/public/fonts/ and implement utils + bilingual AR/EN i18n** - `b1d639e` (feat)

## Files Created/Modified
- `admin/package.json` & `bun.lock` - Pinned React 19, Vite 8, Tailwind 4, Tiptap 3, `graphql@16.15.0`, `zod@4.6.7`, `@react-oauth/google`, and jsdom Testing Library deps plus `dev`/`build`/`preview` scripts.
- `tsconfig.json`, `package.json`, `admin/tsconfig.json` - Split root vs `admin/` TypeScript configurations and wired three-project `bun run typecheck`.
- `admin/vite.config.ts` & `admin/vitest.config.ts` - Vite 8 `/admin/` build + dev proxy and jsdom Vitest configuration with Bun runtime guard.
- `admin/index.html` & `admin/src/index.css` - CSP-clean HTML entry (zero third-party font CDNs), `@font-face` rules for `/admin/fonts/*.ttf`, and Tailwind v4 warm-paper `@theme inline` tokens.
- `admin/public/fonts/*` - Copied `Amiri-Regular.ttf`, `Amiri-Bold.ttf`, `IBMPlexSansArabic-Regular.ttf`, and `IBMPlexSansArabic-Bold.ttf`.
- `admin/src/lib/utils.ts` - `cn()` helper combining `clsx` and `tailwind-merge`.
- `admin/src/lib/i18n.ts` - `I18nProvider`, `useI18n`, `ADMIN_DICTIONARY`, `formatNumber`, and `formatTimestamp` backed by `@roi/shared` `toArabicDigits` and `formatArabicDate`.
- `admin/src/__tests__/i18n-utils.test.tsx` - Unit/component tests covering `cn()`, Arabic-Indic vs ASCII formatting, `roi_admin_lang` persistence, `documentElement` `lang`/`dir` syncing, and Copywriting Contract strings.

## Verification
- `bun run test -- --project @roi/shared --project @roi/backend --project @roi/admin`: 17 test files, 107 tests passed (`@roi/admin`: 2 files / 7 tests under `jsdom`, `@roi/shared`: 4 files / 57 tests, `@roi/backend`: 11 files / 43 tests).
- `bun run typecheck`: exited 0 across `tsconfig.json`, `admin/tsconfig.json`, and `app/tsconfig.json`.

## Decisions Made
- Kept `admin/tsconfig.json` scoped to `"include": ["src"]` and used standard `node:url` `fileURLToPath` in `vite.config.ts` / `vitest.config.ts` so `tsc -p admin/tsconfig.json` needs only approved browser/Vite types without installing `@types/node`.
- Implemented `I18nProvider` in `admin/src/lib/i18n.ts` using React `createElement` so the planned `.ts` file path stays exact without requiring a `.tsx` rename.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added unit and component tests for `utils.ts` and `i18n.ts`**
- **Found during:** Task 2
- **Issue:** Plan `03-04` specified verifying `admin/src/lib/utils.ts` and `admin/src/lib/i18n.ts` with Vitest, and only `shared.test.ts` existed in `admin/src/__tests__/`.
- **Fix:** Added `admin/src/__tests__/i18n-utils.test.tsx` testing `cn()`, `formatNumber()`, `formatTimestamp()`, `I18nProvider` default `'ar'`/`dir="rtl"`, `localStorage` persistence under `'roi_admin_lang'`, and Copywriting Contract completeness.
- **Files modified:** `admin/src/__tests__/i18n-utils.test.tsx`
- **Verification:** `bun run test -- --project @roi/admin` passed 7/7 tests across 2 files.
- **Committed in:** `b1d639e` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 test coverage addition)
**Impact on plan:** Strengthens Task 2 verification under jsdom with zero scope creep.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan `03-05` can now build shadcn-style Tailwind 4 logical-CSS UI primitives in `admin/src/components/ui/` using `@/lib/utils` (`cn`) and the warm-paper `@theme inline` tokens in `admin/src/index.css`.
- Plan `03-06` can wire `I18nProvider`, `AuthProvider`, `ReauthModal`, `LoginPage`, and `AdminShell` consuming `ADMIN_DICTIONARY`, `useI18n`, `formatNumber`, and `formatTimestamp`.

---
*Phase: 03-admin-panel-moderation*
*Completed: 2026-11-25*

## Self-Check: PASSED

- Verified all created artifacts and modified files exist on disk.
- Verified task commits `a20ec93` and `b1d639e` are ancestors of `HEAD`.
