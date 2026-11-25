---
phase: 03-admin-panel-moderation
plan: 07
subsystem: ui
tags: [tiptap, prosemirror, react-hook-form, zod, markdown, rtl, personalize]

requires:
  - phase: 03-admin-panel-moderation
    plan: 05
    provides: Warm-paper UI primitives (Switch, Tooltip, AlertDialog, Card, Input, Toaster) and bilingual copy
  - phase: 03-admin-panel-moderation
    plan: 06
    provides: I18nProvider/AdminShell and credentialed GraphQL client (state survives re-auth modal)
provides:
  - Pure ProseMirror-JSON <-> Markdown-subset / verse plain-text serializers
  - Shared-schema content form validation (brace rule, verseRef blank->null, female-required, one-sided predicate)
  - Tiptap 3 atomic draggable {الاسم} chip node and mode-aware RichContentEditor locked to dir=rtl
  - LivePreviewCard powered by personalize() from @roi/shared
  - Reusable ItemEditorPage (create / edit / suggestion promotion) for verses, names of God, blessings
affects: [03-08, 03-09]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

commits: 3
plan_head_before: 8eba39cd6e4ba5360fb30c375a7cfdd36390f32d
plan_head_after: 6dc090eaed6ff54e86a656cd09409bf0fd56949e

tech-stack:
  added: []
  patterns:
    - "Inline marks serialize with asterisk-run toggle semantics (1=italic, 2=bold, 3=both) so adjacent transitions are never ambiguous; edge whitespace is kept outside marks so CommonMark still bolds"
    - "Editor value sync compares serialize(editor.getJSON()) to the incoming value, so own echoes never reset content or caret"
    - "Hidden female draft lives in react-hook-form state; textFemale is nulled only inside the submit handler"

key-files:
  created:
    - admin/src/lib/markdown-serializer.ts
    - admin/src/lib/validation.ts
    - admin/src/components/editor/NameTokenExtension.ts
    - admin/src/components/editor/NameChipView.tsx
    - admin/src/components/editor/RichContentEditor.tsx
    - admin/src/components/editor/LivePreviewCard.tsx
    - admin/src/pages/ItemEditorPage.tsx
    - admin/src/__tests__/markdown-serializer.test.ts
    - admin/src/__tests__/validation.test.ts
    - admin/src/__tests__/chip-editor.test.tsx
    - admin/src/__tests__/live-preview.test.tsx
    - admin/src/__tests__/item-editor.test.tsx
  modified: []

key-decisions:
  - "No @tiptap/markdown: hand-written serializer (Pattern 1); round-trip unit-tested including escapes for literal * # > - and backslash"
  - "ItemEditorPage takes onSubmitPayload and returns a normalized ContentPayload; GraphQL wiring and routing are left to plan 03-08. ItemEditorWorkspace is an alias export"
  - "Plain-text clipboards (no text/html) become paragraphs + chips in both modes; verse mode additionally ignores HTML entirely"

patterns-established:
  - "Editor/preview always set dir=rtl lang=ar independent of the shell language (D-12)"

requirements-completed: [ADM-03, ADM-04, ADM-05, ADM-06]

duration: 25min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 07: Chip Editor, Validation, Live Preview and ItemEditorPage Summary

**Tiptap 3 atomic {الاسم} chip editor over deterministic Markdown-subset serializers, shared-Zod validation with a non-blocking one-sided warning, and a personalize()-driven live preview inside a reusable ItemEditorPage**

## Accomplishments
- `markdown-serializer.ts`: `parseContentToDoc` / `serializeDocToContent` for `verse` (plain, zero syntax) and `rich` (bold, italic, H2, H3, bullets, blockquote, hard break, chip). No nbsp or entities; empty paragraphs collapse.
- `validation.ts`: `createContentFormSchema(kind)` / `contentFormSchema` built on `@roi/shared` (`blessingItemSchema.shape.*`, `personalizedTextSchema`); blank verseRef becomes `null` before shared validation; hidden female drafts are not validated; `hasOneSidedNameToken`.
- `NameTokenNode` + `NameChipView`: inline atomic draggable chip rendered as an accent pill (never the raw token), `renderText` returns `{الاسم}`, `nodePasteRule` plus `handlePaste` convert pasted tokens.
- `RichContentEditor`: StarterKit trimmed to the allowed constructs, 44px aria-labelled Tooltip toolbar, `dir="rtl" lang="ar"` locked.
- `LivePreviewCard`: `personalize()` parity, test-name input, neutral clear, M/F toggle, Amiri 20px verses, safe React rendering of the Markdown subset (no `dangerouslySetInnerHTML`), verseRef footer hidden when empty.
- `ItemEditorPage`: minimal fields only (D-08), M/F switch with non-destructive draft, amber warning that never disables Save, spinner while submitting, success/error toasts, form kept on failed mutation, unsaved-changes AlertDialog.
- Tests: 5 new suites (serializer, validation, chip editor, live preview, item editor). Admin suite 78/78; `bun run typecheck` and `bun run --cwd admin build` pass.

## Task Commits
1. **Task 1: Serializer and shared Zod validation** - `e352859`
2. **Task 2: Chip extension, RichContentEditor, LivePreviewCard** - `805cdc7`
3. **Task 3: ItemEditorPage** - `6dc090e`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] StarterKit has no `listKeyboardShortcuts` option in Tiptap 3.35**
- **Found during:** Task 2 typecheck
- **Fix:** Removed it; `listItem` is still disabled in verse mode.
- **Commit:** 805cdc7

**2. [Rule 2 - Missing functionality] Mark delimiters and block-start characters needed escaping**
- **Issue:** Literal `*`, `\`, and a line-leading `#`, `>`, `- ` typed by an admin would be re-parsed as formatting on reload and by mobile.
- **Fix:** Serializer escapes them (backslash) and the parser unescapes; edge whitespace is moved outside marks so `**x **` never emits an invalid bold.
- **Commit:** e352859

**3. [Scope note] `optionalVerseRefSchema` is not exported from `@roi/shared`**
- Used `blessingItemSchema.shape.verseRef` (the same schema) instead of changing shared. No shared edits.

**4. [Scope note] Plain-text paste in rich mode**
- The plan only required `{الاسم}` conversion; the handler now treats any plain-text-only clipboard (no `text/html`) the same way, which also made tests deterministic under jsdom.
- **Commit:** 6dc090e

**5. [Scope note] TDD commits**
- Tests and implementation for each task landed in a single commit per task rather than separate RED/GREEN commits.

**Total deviations:** 2 auto-fixed, 3 notes; no architectural change, no new packages.

## Known Stubs

None. `ItemEditorPage` is data-source agnostic by design (`onSubmitPayload`, `initialValues`); plan 03-08 supplies routes and mutations.

## Threat Flags

None. No new network surface and no new dependencies (T-03-SC). T-03-13: preview renders only React elements (tested with an `<img onerror>` payload). T-03-14: disallowed StarterKit extensions are off; verse paste is plain text; `personalizedTextSchema` runs before submit.

## Notes
- jsdom needs `Range.getClientRects/getBoundingClientRect` and `document.elementFromPoint` stubs for ProseMirror; they live in the editor test files' `beforeAll`.
- Real drag-and-drop of the chip (CLAUDE.md regression: drag mid-sentence, undo/redo, male-to-female copy) cannot be exercised in jsdom. The node is `draggable: true` and the view does not intercept drag events, but this needs a browser smoke test, along with RTL/tashkeel visual checks (UI-SPEC `long-text` backstop).
- Backspace atomic deletion is tested via a DOM selection around the chip plus a Backspace keydown.

## Self-Check: PASSED

- All 12 files listed under key-files.created exist on disk.
- Commits `e352859`, `805cdc7`, `6dc090e` are ancestors of HEAD; `git rev-list --count` from the plan base = 3.
