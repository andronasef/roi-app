---
phase: 03-admin-panel-moderation
plan: 09
subsystem: infra
tags: [express5, helmet, csp, gis, docker, spa, dokploy]

requires:
  - phase: 03-admin-panel-moderation
    plan: 03
    provides: admin GraphQL API + cookie auth on the backend origin
  - phase: 03-admin-panel-moderation
    plan: 08
    provides: complete admin SPA (vite base '/admin/')
provides:
  - resolveAdminDistDir() (ADMIN_DIST_DIR, ../admin/dist, admin-dist)
  - Production Helmet CSP compatible with Google Identity Services + self-hosted fonts
  - Express 5 /admin static + /admin and /admin/{*splat} SPA fallback in configureApp()
  - backend/Dockerfile building admin and shipping only admin/dist in the runner image
affects: []

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

commits: 2
plan_head_before: 0cd3afdcb59181237508085c7f81a8e52d058ab8
plan_head_after: cb5912fb9766dca187b5b8509de7efbf6fb4da62

tech-stack:
  added: []
  patterns:
    - "configureApp(app, env, adminDistDir) takes the dist dir as a param (string | null) so tests mount a temp dir or none"
    - "Dotted /admin/* paths fall through to 404 so missing JS/CSS chunks are never masked by index.html"

key-files:
  created:
    - backend/src/__tests__/admin-static-audit.test.ts
  modified:
    - backend/src/config/paths.ts
    - backend/src/main.ts
    - backend/Dockerfile
    - backend/Dockerfile.dockerignore

key-decisions:
  - "static mounted with redirect:false so serve-static does not 301 /admin to /admin/ ahead of the SPA route"
  - "COOP set to same-origin-allow-popups in production: Helmet's default same-origin severs window.opener and breaks the GIS popup flow"
  - "Local structural request/response types in main.ts instead of importing express types (express types are not resolvable from backend; no dependency added)"

status: complete
completed: 2026-11-25
---

# Phase 3 Plan 09: Single-container /admin serving Summary

**Built admin SPA now served at `/admin` from the same NestJS container and origin as `/graphql`, with a GIS-compatible production CSP and a multi-stage Dockerfile that ships only `admin/dist`.**

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | resolveAdminDistDir, GIS Helmet CSP, Express 5 /admin static + `/{*splat}` fallback | 9aea8fb |
| 2 | Dockerfile (+ dockerignore) packaging admin/dist; full verification + live Docker smoke | cb5912f |

## Verification

- `bun run test`: 40 files / 269 tests pass. `bun run typecheck`: clean (root, admin, app).
- `bun run --cwd admin build` and `bun run --cwd backend build`: OK.
- Docker image built; seeded a fresh volume and ran the container with `NODE_ENV=production`. Observed:
  - `/health` -> `snapshotsReady:true`; `/snapshots/verses` -> 200
  - `/admin` and `/admin/verses` -> 200 with HTML shell, `Cache-Control: no-cache, no-store, must-revalidate`, CSP containing `accounts.google.com/gsi/client`, `/gsi/`, `/gsi/style`, `font-src 'self' data:`
  - `/admin/assets/nope.js` -> 404 (not masked); hashed asset -> `public, max-age=31536000, immutable`; `/admin/fonts/Amiri-Regular.ttf` -> 200
  - `POST /graphql` contentDelta -> data returned on the same origin
  - Runner image contains `/app/admin/dist` only (no `admin/node_modules`, T-03-SC)

## Deviations from Plan

**1. [Rule 3 - Blocking] backend/Dockerfile.dockerignore excluded admin sources**
- **Found during:** Task 2
- **Issue:** `admin/*` (except package.json) was ignored, so `COPY admin ./admin` + `vite build` could not work.
- **Fix:** Un-ignored `admin/index.html`, `vite.config.ts`, `tsconfig.json`, `src`, `public`.
- **Files modified:** backend/Dockerfile.dockerignore
- **Commit:** cb5912f

**2. [Rule 1 - Bug] serve-static redirected `/admin` to `/admin/` (301)**
- **Found during:** Task 1 test run
- **Fix:** `redirect: false` on the static mount so the exact `/admin` route serves index.html.
- **Commit:** 9aea8fb

**3. [Rule 2 - Critical] Cross-Origin-Opener-Policy relaxed to `same-origin-allow-popups`**
- **Reason:** Helmet's default `same-origin` breaks the Google Identity Services popup sign-in. Production only.
- **Commit:** 9aea8fb

Also: `configureApp`'s third parameter is `string | null` (not `undefined`), because `undefined` would trigger the default and re-resolve the real dist dir in tests.

## Outstanding human verification (backstop, not run)

The plan's `human-check` is a visual browser pass and was NOT performed by the executor: open `/admin` against local Vite/NestJS in both `dir="rtl"` and `dir="ltr"`, verify Google Sign-In, drag a `{الاسم}` chip mid-sentence in Tiptap with heavy tashkeel, M/F toggle + live preview neutral fallback, Suggestion Review and Audit Log. Also confirm real GIS sign-in works under the production CSP in a browser (curl only proves header content).

## Known Stubs

None.

## Threat Flags

None. T-03-17 (CSP scoped to self + GIS), T-03-18 (splat fallback skips dotted paths, tested), T-03-SC (only dist copied) mitigated.

## Self-Check: PASSED

- Files exist: paths.ts, main.ts, Dockerfile, Dockerfile.dockerignore, admin-static-audit.test.ts
- Commits 9aea8fb, cb5912f present on main.
