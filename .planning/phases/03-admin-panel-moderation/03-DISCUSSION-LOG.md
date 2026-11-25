# Phase 3: Admin Panel & Moderation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-25
**Phase:** 3-Admin Panel & Moderation
**Areas discussed:** Admin auth, allowlist & session expiry, Rich-text chip editor & validation rules, Suggestion moderation queue & promotion flow, Admin UI language, catalog management & deployment

---

## Admin auth, allowlist & session expiry

### Q1: How should the allowlist of authorized admin emails be managed?

| Option | Description | Selected |
|--------|-------------|----------|
| Env var only (`ADMIN_EMAILS` in Dokploy) | Simple, auditable, impossible to lock yourself out; adding/removing an admin is an env update + restart | ✓ |
| Env var + DB allowlist UI | Initial admins come from `ADMIN_EMAILS`, and admins can add/remove teammates from inside the panel | |
| You decide | Claude discretion | |

**User's choice:** Env var only (`ADMIN_EMAILS` in Dokploy)

### Q2: How should the short-lived admin session token work and how long should it last? (with follow-up clarification)

| Option | Description | Selected |
|--------|-------------|----------|
| Backend-signed short-lived JWT (30 min) in memory | Strict 30-min lifetime in JS memory; tab refresh asks to sign in again | |
| 7 days (`httpOnly` cookie / persisted session) | Bounded/expiring weekly session surviving refreshes | |
| 14 days (`httpOnly` cookie / persisted session) | Bounded/expiring 14-day session surviving refreshes before re-login is required | ✓ |
| 24 hours (persisted session) | Survives refreshes during a workday, expires next day | |
| 30 minutes in memory + silent Google re-auth | Short-lived per tab with silent GIS renewal | |

**User's choice:** 14 days (`httpOnly` cookie / persisted session)
**Notes:** User initially picked 30 min in memory, then clarified in Arabic that they expected a ~14-day session before Google re-login is required; follow-up question confirmed 14-day `httpOnly` persisted session.

### Q3: What should happen if the admin session expires while an admin is editing content?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-auth modal preserving unsaved edits | On 401 or expiry, open an in-page Google Sign-In modal without leaving the form | |
| Silent Google re-auth + modal fallback | Attempt silent GIS renewal and fall back to an in-page sign-in modal without leaving the form | ✓ |
| Redirect to login screen | Clear session and send admin back to the login page on expiry | |
| You decide | Claude discretion | |

**User's choice:** Silent Google re-auth + modal fallback

---

## Rich-text chip editor & validation rules

### Q1: What formatting and chip controls should each content type's editor support?

| Option | Description | Selected |
|--------|-------------|----------|
| Verses: plain text (with optional name chip); Names/Blessings: core Markdown (Bold, Italic, H2/H3, Bullet list, Blockquote) + name chip | Matches shared schemas (`verseItemSchema` uses `personalizedTextSchema`) and mobile `react-native-marked` renderer | ✓ |
| Verses: plain text only (verbatim Scripture, no name chip); Names/Blessings: core Markdown + name chip | Enforces verbatim Scripture while keeping personalization for Names/Blessings | |
| Names/Blessings: extended Markdown (add Numbered lists, Links, Divider); Verses: plain text + chip | Richer formatting options if articles need links or numbered points | |
| You decide | Claude discretion | |

**User's choice:** Verses: plain text (with optional name chip); Names/Blessings: core Markdown (Bold, Italic, H2/H3, Bullet list, Blockquote) + name chip

### Q2: If an admin types into the female field and then flips "Same text for male/female" back ON, what should happen?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide non-destructively during editing, clear `textFemale` to `null` on Save | Accidental switch flips don't lose typed female text; saving with the switch ON persists `textFemale: null` | ✓ |
| Confirm dialog before clearing if female field has text | Explicitly asks before discarding female text when flipping the switch back ON | |
| Clear female field immediately on toggle ON | Instant reset when switching back to single-text mode | |
| You decide | Claude discretion | |

**User's choice:** Hide non-destructively during editing, clear `textFemale` to `null` on Save

### Q3: When male and female versions exist and only one contains the name chip, how should the warning behave on Save?

| Option | Description | Selected |
|--------|-------------|----------|
| Non-blocking amber warning banner | Shows clearly under the editor while still letting the admin save intentionally | ✓ |
| Warning banner + "Save anyway?" confirmation step | Highlights the mismatch and asks one confirmation click before saving | |
| Hard block (error) | Cannot save until both fields match on name chip presence | |
| You decide | Claude discretion | |

**User's choice:** Non-blocking amber warning banner

### Q4: How should the existing schema fields `tags` and `sortOrder` be handled in the admin editor?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional tags input + optional numeric `sortOrder` field | Exposes both existing schema fields | |
| Tags input in editor + drag/arrow reordering in catalog list | Visual reordering + tag suggestions | |
| Hide `tags` and `sortOrder` from the editor for now | Keep forms minimal (`title`/`ref`, `text`, `textFemale`, `verseRef`) and leave them `null` | ✓ |
| You decide | Claude discretion | |

**User's choice:** Hide `tags` and `sortOrder` from the editor for now

---

## Suggestion moderation queue & promotion flow

### Q1: How should an admin review, edit, and accept a user suggestion into public content?

| Option | Description | Selected |
|--------|-------------|----------|
| Open suggestion in the full chip/preview editor with "Accept & Publish" and "Reject" | Review formatting, add female text or `{الاسم}` chips, preview as a phone, and publish atomically in one transaction | ✓ |
| Queue has quick "Accept as-is" + "Edit & Accept" buttons | One-click approval plus full editor when edits are needed | |
| Inline plain edit inside the queue card | Quick text tweak without opening the full rich-text editor | |
| You decide | Claude discretion | |

**User's choice:** Open suggestion in the full chip/preview editor with "Accept & Publish" and "Reject"

### Q2: How should rejecting a suggestion work and what queue tabs should exist?

| Option | Description | Selected |
|--------|-------------|----------|
| One-click Reject (with optional note) + Pending / Accepted / Rejected tabs | Leaves the Pending queue immediately while keeping an auditable history | ✓ |
| Reject requires typing a short internal reason + Pending / Accepted / Rejected tabs | Enforces documenting why a suggestion was declined | |
| One-click Reject, show Pending queue only | Simplest moderation screen with zero extra tabs | |
| You decide | Claude discretion | |

**User's choice:** One-click Reject (with optional note) + Pending / Accepted / Rejected tabs

### Q3: What submitter details should admins see, and how should concurrent moderation by two admins be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Show submitter email + accepted/rejected counts, and block double-moderation | Helps spot trusted vs spammy submitters and prevents two admins from publishing the same suggestion twice | ✓ |
| Show submitter email + date only, and block double-moderation | Lighter display while still preventing duplicate acceptance | |
| You decide | Claude discretion | |

**User's choice:** Show submitter email + accepted/rejected counts, and block double-moderation

---

## Admin UI language, catalog management & deployment

### Q1: What language and layout direction should the admin panel UI itself use?

| Option | Description | Selected |
|--------|-------------|----------|
| Full Arabic RTL UI | Entire panel is Arabic RTL | |
| English UI shell (LTR) + RTL Arabic content fields | English nav/labels with RTL inputs and preview | |
| You decide (User specified bilingual Arabic + English toggle) | Bilingual UI switcher (Arabic & English) with clean font pairing and `dir="rtl"` locked on Arabic content editors & previews | ✓ |

**User's choice:** Bilingual Arabic / English UI toggle with clean font pairing for both scripts; Arabic content editors and previews locked to `dir="rtl"` with logical CSS utilities so Arabic never breaks.

### Q2: How should soft-deleted content and the audit log be exposed in the admin panel?

| Option | Description | Selected |
|--------|-------------|----------|
| Archive filter ("Active / Deleted") with Restore + read-only Audit Log page | Recover accidentally deleted items and see who changed what | ✓ |
| Archive filter with Restore only | Easy undo without extra Audit Log screen | |
| Active items only | Simplest list view; soft-deletes and audit rows stay backend-only | |
| You decide | Claude discretion | |

**User's choice:** Archive filter ("Active / Deleted") with Restore + read-only Audit Log page

### Q3: How should the admin panel be deployed and served on Dokploy?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Dokploy static/Nginx app on admin subdomain | Separate Dokploy app matching `ADMIN_ORIGINS` | |
| Served directly from the NestJS backend container (same origin, e.g. `/admin`) | One Dokploy service, zero CORS or cross-site cookie issues | ✓ |
| You decide | Claude discretion | |

**User's choice:** Served directly from the NestJS backend container (same origin, e.g. `/admin`)

---

## Claude's Discretion

- Session cookie signing secret env var (`ADMIN_JWT_SECRET`) & claims, shadcn/ui component/layout details, `@tiptap/markdown` vs hand-written ProseMirror-JSON ⇄ Markdown-subset serializer, `audit_log` summary formatting, and storage of optional rejection notes.

## Deferred Ideas

None — discussion stayed within phase scope.
