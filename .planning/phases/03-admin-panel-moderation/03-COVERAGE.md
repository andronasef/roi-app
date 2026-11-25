# Phase 3: External API Integration Coverage Matrix

> Generated per Phase 3 API Coverage Checkpoint (`api-coverage.cjs` detected Google Identity Services / OAuth2 ID-token integration).

| capability | decision | reason |
|---|---|---|
| Google Identity Services Sign-In button | INTEGRATE | Primary admin login button and ReauthModal fallback in admin SPA (`ADM-01`, `D-03`) |
| Google Identity Services One Tap prompt | INTEGRATE | Silent mid-edit re-authentication on 401/UNAUTHENTICATED before opening ReauthModal (`D-03`) |
| google-auth-library OAuth2Client.verifyIdToken | INTEGRATE | Backend verification of Google ID token signature, audience, and email_verified against ADMIN_EMAILS (`D-01`) |
| Google OAuth2 authorization code and refresh tokens | OPT-OUT | Admin sessions use 14-day HttpOnly JWT cookies minted from verified ID tokens; no Google refresh tokens stored (`D-02`) |
| Google Drive and Workspace Admin Directory APIs | OPT-OUT | Admin panel uses only ID token email/sub claims against env ADMIN_EMAILS; no external Google APIs accessed (`D-01`) |
| Google OAuth2 token revocation endpoint | OPT-OUT | Session termination clears the HttpOnly cookie via adminLogout and re-checks ADMIN_EMAILS on every request (`D-01`, `D-02`) |
