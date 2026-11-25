---
phase: 03-admin-panel-moderation
plan: 05
subsystem: ui
tags: [react, tailwindcss, shadcn, rtl, a11y, wcag, components]

requires:
  - phase: 03-admin-panel-moderation
    plan: 04
    provides: Tailwind v4 warm-paper theme tokens in admin/src/index.css, cn() helper in admin/src/lib/utils.ts, and jsdom Vitest setup
provides:
  - All 14 warm-paper Tailwind v4 UI primitives in admin/src/components/ui/ with strictly logical RTL/LTR CSS utilities and WCAG 44px touch targets
  - Non-dismissible Dialog mode (dismissible={false}) for blocking ReauthModal and AlertDialog confirmations
  - Shared ToasterProvider, Toaster, useToast, and toast.success/toast.error viewport positioned at bottom-4 end-4
  - jsdom component and accessibility test coverage in admin/src/__tests__/ui-primitives.test.tsx
affects: [03-06, 03-07, 03-08, 03-09]

actuals:
  tokens: 14331
  tasks: 2
  commits: 2

commits: 2
plan_head_before: d991842c93df39cdd43fcb71bf5bc3da9b1bb001
plan_head_after: 43bdb83b495b02539eedb021841c4be69bc9a7aa

tech-stack:
  added: []
  patterns:
    - "Zero-extra-dependency shadcn-style React 19 primitives using clsx + tailwind-merge (cn), class-variance-authority, and lucide-react"
    - "Strictly logical Tailwind CSS utilities (ms-*, me-*, ps-*, pe-*, start-*, end-*, text-start) with zero physical directional classes and zero positive tracking-* on Arabic UI"
    - "Explicit dismissible={false} guard on Dialog/AlertDialog and pure React children rendering (zero dangerouslySetInnerHTML) per T-03-10"

key-files:
  created:
    - admin/src/components/ui/button.tsx
    - admin/src/components/ui/input.tsx
    - admin/src/components/ui/label.tsx
    - admin/src/components/ui/switch.tsx
    - admin/src/components/ui/badge.tsx
    - admin/src/components/ui/card.tsx
    - admin/src/components/ui/skeleton.tsx
    - admin/src/components/ui/tabs.tsx
    - admin/src/components/ui/dialog.tsx
    - admin/src/components/ui/alert-dialog.tsx
    - admin/src/components/ui/table.tsx
    - admin/src/components/ui/select.tsx
    - admin/src/components/ui/tooltip.tsx
    - admin/src/components/ui/toaster.tsx
    - admin/src/__tests__/ui-primitives.test.tsx
  modified: []

key-decisions:
  - "Pre-collected SelectItem labels via React.Children traversal in Select so SelectValue displays the selected option label immediately before SelectContent opens."
  - "Backed ToasterProvider/toast with React.useSyncExternalStore so imperative toast.success()/toast.error() calls and useToast() share a single always-mounted aria-live region at bottom-4 end-4."

patterns-established:
  - "All interactive controls (Button, Input, Switch, TabsTrigger, SelectTrigger, SelectItem, Dialog/Toaster icon dismiss buttons) enforce min-h-[44px] and focus-visible:ring-2 focus-visible:ring-accent."
  - "All 14 UI primitives render props strictly as React children/JSX text with zero dangerouslySetInnerHTML."

requirements-completed: [ADM-01]

duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 05: Warm-Paper Admin UI Primitives Summary

**14 accessible warm-paper Tailwind 4 UI primitives in `admin/src/components/ui/` with strictly logical RTL/LTR CSS utilities, WCAG 44px hit targets, non-dismissible dialog mode, and jsdom component tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-25T16:18:00Z
- **Completed:** 2026-11-25T16:22:00Z
- **Tasks:** 2
- **Files created:** 15 (14 UI primitive modules + 1 Vitest component test suite)

## Accomplishments
- Implemented core form, display, and feedback primitives (`button.tsx`, `input.tsx`, `label.tsx`, `switch.tsx`, `badge.tsx`, `card.tsx`, `skeleton.tsx`) styled with `@theme inline` warm-paper tokens, `min-h-[44px]` touch targets, `focus-visible:ring-2 focus-visible:ring-accent`, `loading` spinner guard on `Button`, and keyboard Space/Enter + logical RTL/LTR thumb translation on `Switch`.
- Implemented overlay, navigation, data, and notification primitives (`tabs.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `table.tsx`, `select.tsx`, `tooltip.tsx`, `toaster.tsx`) with `role="tablist"`/`role="tab"`, `role="dialog"`/`role="alertdialog"` + `dismissible={false}` guard (`T-03-10`), `text-start` + `ps-4 pe-4` tables, RTL-centered tooltips, and `ToasterProvider` + `toast.success`/`toast.error` fixed at `bottom-4 end-4`.
- Added `admin/src/__tests__/ui-primitives.test.tsx` verifying all 14 primitives under jsdom, plus verified zero physical directional utilities (`ml-*`/`mr-*`/`pl-*`/`pr-*`/`left-*`/`right-*`/`text-left`/`text-right`), zero `tracking-*`, and zero `dangerouslySetInnerHTML`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create core form, card, badge, switch, and skeleton UI primitives** - `874b550` (feat)
2. **Task 2: Create tabs, dialog, alert-dialog, table, select, tooltip, and toaster UI primitives** - `43bdb83` (feat)

## Files Created/Modified
- `admin/src/components/ui/button.tsx` - `Button` + `buttonVariants` (`default`, `secondary`, `outline`, `ghost`, `destructive`; `sm`/`md`/`icon`; `loading` spinner disabling clicks).
- `admin/src/components/ui/input.tsx` - `Input` supporting `dir="rtl"` / `lang="ar"` pass-through and `min-h-[44px]`.
- `admin/src/components/ui/label.tsx` - `Label` paired via `htmlFor` with `text-sm font-bold text-foreground`.
- `admin/src/components/ui/switch.tsx` - Accessible `Switch` (`role="switch"`, `aria-checked`, Space/Enter/click toggle, `ltr:`/`rtl:` logical thumb translate, `min-h-[44px] min-w-[44px]`).
- `admin/src/components/ui/badge.tsx` - `Badge` + `badgeVariants` (`default`, `accent`, `secondary`, `destructive`, `warning`).
- `admin/src/components/ui/card.tsx` - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- `admin/src/components/ui/skeleton.tsx` - `Skeleton` pulse placeholder using `bg-muted` (`#E9E0CE`).
- `admin/src/components/ui/tabs.tsx` - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` with `role="tablist"`, `role="tab"`, `aria-selected`, and `min-h-[44px]`.
- `admin/src/components/ui/dialog.tsx` - Portal `Dialog` suite with `role="dialog"`, `aria-modal="true"`, Escape/backdrop dismiss, and `dismissible={false}` mode for blocking `ReauthModal`.
- `admin/src/components/ui/alert-dialog.tsx` - Portal `AlertDialog` suite with `role="alertdialog"`, `aria-modal="true"`, `AlertDialogAction`, and `AlertDialogCancel`.
- `admin/src/components/ui/table.tsx` - `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` using strictly `text-start`, `ps-4`, `pe-4`.
- `admin/src/components/ui/select.tsx` - `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` supporting `dir` inheritance and `min-h-[44px]`.
- `admin/src/components/ui/tooltip.tsx` - `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` with `aria-describedby` and RTL/LTR centered positioning.
- `admin/src/components/ui/toaster.tsx` - `ToasterProvider`, `Toaster`, `useToast`, and `toast.success`/`toast.error` fixed at `bottom-4 end-4`.
- `admin/src/__tests__/ui-primitives.test.tsx` - 8 jsdom tests exercising all 14 UI primitives.

## Decisions Made
- Pre-collected `SelectItem` labels via recursive `React.Children` traversal inside `Select` so `SelectValue` renders the active label on initial mount even while `SelectContent` is closed.
- Used `React.useSyncExternalStore` in `toaster.tsx` with a persistent `aria-live="polite"` region (`hidden` when empty, `pointer-events-none` container with `pointer-events-auto` cards) so both imperative `toast.success()`/`toast.error()` and `useToast()` stay synchronized.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added jsdom test suite for all 14 UI primitives**
- **Found during:** Task 2
- **Issue:** `admin/src/__tests__/` only had `shared.test.ts` and `i18n-utils.test.tsx`; none of the 14 new UI primitives had runtime DOM/accessibility tests.
- **Fix:** Added `admin/src/__tests__/ui-primitives.test.tsx` testing `Button` loading guard, `Input`/`Label`/`Card`/`Badge`/`Skeleton`, `Switch` keyboard & click toggling, `Tabs`, `Dialog` `dismissible={false}` & Escape behavior, `AlertDialog`, `Table` + `Select`, `Tooltip` `aria-describedby`, and `ToasterProvider` + `toast.success`/`toast.error`.
- **Files modified:** `admin/src/__tests__/ui-primitives.test.tsx`
- **Verification:** `bun run test -- --project @roi/admin` passed 15/15 tests across 3 files.
- **Committed in:** `43bdb83` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 test coverage addition)
**Impact on plan:** Strengthens Task 2 verification under jsdom with zero scope creep.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plans `03-06` (`ReauthModal`, `LoginPage`, `AdminShell`), `03-07` (`RichContentEditor`, `LivePreviewCard`, `ItemEditorPage`), and `03-08` (`CatalogPage`, `ModerationQueuePage`, `SuggestionReviewPage`, `AuditLogPage`) can now import all 14 primitives from `@/components/ui/*`.

---
*Phase: 03-admin-panel-moderation*
*Completed: 2026-11-25*

## Self-Check: PASSED

- Verified all 14 UI primitive files under `admin/src/components/ui/` and `admin/src/__tests__/ui-primitives.test.tsx` exist on disk.
- Verified zero physical horizontal Tailwind utilities (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-l-*`, `border-r-*`, `rounded-l-*`, `rounded-r-*`), zero `tracking-*`, and zero `dangerouslySetInnerHTML` in `admin/src/components/ui/*.tsx`.
- Verified `bun run typecheck` exited 0 across `tsconfig.json`, `admin/tsconfig.json`, and `app/tsconfig.json`.
- Verified `bun run test -- --project @roi/admin` passed 3 test files, 15 tests.
- Verified task commits `874b550` and `43bdb83` are ancestors of `HEAD`.
