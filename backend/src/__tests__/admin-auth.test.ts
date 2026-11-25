import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { ADMIN_COOKIE_NAME } from '../admin-auth/admin-auth.service';
import {
  TEST_ADMIN_JWT_SECRET,
  createAdminTestApp,
  extractCookieHeader,
  extractSessionCookie,
} from './admin-test-helpers';

const ADMIN_PUBLIC_CONFIG_QUERY = /* GraphQL */ `
  query AdminPublicConfig {
    adminPublicConfig {
      googleClientId
    }
  }
`;

const ADMIN_ME_QUERY = /* GraphQL */ `
  query AdminMe {
    adminMe {
      sub
      email
    }
  }
`;

const ADMIN_LOGIN_MUTATION = /* GraphQL */ `
  mutation AdminLogin($idToken: String!) {
    adminLogin(idToken: $idToken) {
      sub
      email
    }
  }
`;

const ADMIN_LOGOUT_MUTATION = /* GraphQL */ `
  mutation AdminLogout {
    adminLogout
  }
`;

describe('AdminAuthModule (ADM-01, D-01, D-02, D-14)', () => {
  const savedEnv = { ...process.env };
  const tempDirs: string[] = [];

  afterEach(() => {
    process.env = { ...savedEnv };
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'roi-admin-auth-'));
    tempDirs.push(dir);
    return dir;
  }

  it('exposes adminPublicConfig without auth and supports ADMIN_GOOGLE_CLIENT_ID override', async () => {
    const dir1 = makeTempDir();
    const first = await createAdminTestApp({ dataDir: dir1 });
    try {
      const res = await request(first.app.getHttpServer())
        .post('/graphql')
        .send({ query: ADMIN_PUBLIC_CONFIG_QUERY })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.adminPublicConfig.googleClientId).toBe(
        '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
      );
    } finally {
      await first.app.close();
    }

    const dir2 = makeTempDir();
    const second = await createAdminTestApp({
      dataDir: dir2,
      adminGoogleClientId: 'custom-web-client.apps.googleusercontent.com',
    });
    try {
      const res = await request(second.app.getHttpServer())
        .post('/graphql')
        .send({ query: ADMIN_PUBLIC_CONFIG_QUERY })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.adminPublicConfig.googleClientId).toBe(
        'custom-web-client.apps.googleusercontent.com',
      );
    } finally {
      await second.app.close();
    }
  });

  it('authenticates multiple allowlisted admins (case-insensitive), mints 14d HttpOnly SameSite=Lax cookie, enforces CSRF header, and clears cookie on logout', async () => {
    const dataDir = makeTempDir();
    const { app } = await createAdminTestApp({
      dataDir,
      adminEmails: ' First.Admin@Example.com , second.admin@example.org ',
      adminOrigins: 'http://localhost:5173',
    });

    try {
      const server = app.getHttpServer();

      // CORS preflight allows credentials and X-Roi-Admin for configured ADMIN_ORIGINS
      const corsRes = await request(server)
        .options('/graphql')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,x-roi-admin');
      expect(corsRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(corsRes.headers['access-control-allow-credentials']).toBe('true');
      expect(corsRes.headers['access-control-allow-headers']).toMatch(/X-Roi-Admin/i);

      // Admin 1 signs in with mixed-case email claim
      const login1 = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.1')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:first.admin@example.com' },
        })
        .expect(200);
      expect(login1.body.errors).toBeUndefined();
      expect(login1.body.data.adminLogin).toEqual({
        sub: 'sub-first.admin@example.com',
        email: 'first.admin@example.com',
      });

      const setCookie1 = extractSessionCookie(login1, ADMIN_COOKIE_NAME);
      expect(setCookie1).toBeTruthy();
      expect(setCookie1).toContain('HttpOnly');
      expect(setCookie1).toContain('SameSite=Lax');
      expect(setCookie1).toContain('Path=/');
      expect(setCookie1).toContain('Max-Age=1209600');
      expect(setCookie1).not.toContain('Secure');

      // Admin 2 signs in concurrently with uppercase email claim
      const login2 = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.2')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:SECOND.ADMIN@EXAMPLE.ORG' },
        })
        .expect(200);
      expect(login2.body.errors).toBeUndefined();
      expect(login2.body.data.adminLogin).toEqual({
        sub: 'sub-second.admin@example.org',
        email: 'second.admin@example.org',
      });

      const cookie1 = extractCookieHeader(login1);
      const cookie2 = extractCookieHeader(login2);

      // Missing x-roi-admin CSRF header is rejected even with a valid session cookie
      const missingCsrf = await request(server)
        .post('/graphql')
        .set('Cookie', cookie1)
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(missingCsrf.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(missingCsrf.body.errors?.[0]?.message).toBe('CSRF_HEADER_REQUIRED');

      // Both concurrent admin sessions succeed with x-roi-admin: 1
      const me1 = await request(server)
        .post('/graphql')
        .set('Cookie', cookie1)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(me1.body.errors).toBeUndefined();
      expect(me1.body.data.adminMe).toEqual({
        sub: 'sub-first.admin@example.com',
        email: 'first.admin@example.com',
      });

      const me2 = await request(server)
        .post('/graphql')
        .set('Cookie', cookie2)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(me2.body.errors).toBeUndefined();
      expect(me2.body.data.adminMe).toEqual({
        sub: 'sub-second.admin@example.org',
        email: 'second.admin@example.org',
      });

      // Logout clears the session cookie
      const logoutRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie1)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_LOGOUT_MUTATION })
        .expect(200);
      expect(logoutRes.body.errors).toBeUndefined();
      expect(logoutRes.body.data.adminLogout).toBe(true);

      const clearedCookie = extractSessionCookie(logoutRes, ADMIN_COOKIE_NAME);
      expect(clearedCookie).toBeTruthy();
      expect(clearedCookie).toMatch(new RegExp(`^${ADMIN_COOKIE_NAME}=;`));
      expect(clearedCookie).toContain('HttpOnly');
    } finally {
      await app.close();
    }
  });

  it('rejects non-allowlisted emails (403 FORBIDDEN), unverified/invalid tokens (401 UNAUTHENTICATED), and forged/revoked cookies', async () => {
    const dataDir = makeTempDir();
    const first = await createAdminTestApp({
      dataDir,
      adminEmails: 'admin1@example.com,admin2@example.com',
    });

    let admin2Cookie = '';

    try {
      const server = first.app.getHttpServer();

      // Non-allowlisted Google account -> FORBIDDEN
      const nonAllowlisted = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:outsider@example.com' },
        })
        .expect(200);
      expect(nonAllowlisted.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(nonAllowlisted.body.errors?.[0]?.message).toBe('ADMIN_EMAIL_NOT_ALLOWLISTED');
      expect(extractSessionCookie(nonAllowlisted, ADMIN_COOKIE_NAME)).toBeUndefined();

      // Unverified Google email -> UNAUTHENTICATED
      const unverified = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'unverified' },
        })
        .expect(200);
      expect(unverified.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(unverified.body.errors?.[0]?.message).toBe('GOOGLE_TOKEN_INVALID');
      expect(extractSessionCookie(unverified, ADMIN_COOKIE_NAME)).toBeUndefined();

      // Invalid Google token -> UNAUTHENTICATED
      const invalidToken = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'not-a-valid-token' },
        })
        .expect(200);
      expect(invalidToken.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(invalidToken.body.errors?.[0]?.message).toBe('GOOGLE_TOKEN_INVALID');

      // Missing cookie on adminMe -> UNAUTHENTICATED
      const noCookie = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(noCookie.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(noCookie.body.errors?.[0]?.message).toBe('ADMIN_SESSION_REQUIRED');

      // Tampered JWT cookie -> UNAUTHENTICATED
      const tampered = await request(server)
        .post('/graphql')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=tampered.jwt.token`)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(tampered.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(tampered.body.errors?.[0]?.message).toBe('ADMIN_SESSION_INVALID');

      // Wrong `typ` claim even with valid signature -> UNAUTHENTICATED
      const jwt = new JwtService();
      const wrongTypToken = jwt.sign(
        { sub: 'sub-admin1', email: 'admin1@example.com', typ: 'other' },
        { secret: TEST_ADMIN_JWT_SECRET, algorithm: 'HS256', expiresIn: '1h' },
      );
      const wrongTypRes = await request(server)
        .post('/graphql')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=${wrongTypToken}`)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(wrongTypRes.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      // Login admin2 so we can test revocation on restart
      const login2 = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:admin2@example.com' },
        })
        .expect(200);
      admin2Cookie = extractCookieHeader(login2);
      expect(admin2Cookie).toContain(`${ADMIN_COOKIE_NAME}=`);
    } finally {
      await first.app.close();
    }

    // Restart with admin2 removed from ADMIN_EMAILS -> existing 14d cookie immediately rejected (T-03-05)
    const restarted = await createAdminTestApp({
      dataDir,
      adminEmails: 'admin1@example.com',
    });
    try {
      const revokedRes = await request(restarted.app.getHttpServer())
        .post('/graphql')
        .set('Cookie', admin2Cookie)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(revokedRes.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(revokedRes.body.errors?.[0]?.message).toBe('ADMIN_SESSION_INVALID');
    } finally {
      await restarted.app.close();
    }
  });

  it('fails closed in production when ADMIN_JWT_SECRET is missing or < 32 chars, and sets Secure flag when valid', async () => {
    // 1. Missing secret in production
    const dirMissing = makeTempDir();
    const missingSecretApp = await createAdminTestApp({
      dataDir: dirMissing,
      nodeEnv: 'production',
      adminEmails: 'admin1@example.com',
      adminJwtSecret: undefined,
    });
    try {
      const server = missingSecretApp.app.getHttpServer();
      const res = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:admin1@example.com' },
        })
        .expect(200);
      expect(res.body.errors?.[0]?.message).toBe('ADMIN_AUTH_MISCONFIGURED');
      expect(extractSessionCookie(res, ADMIN_COOKIE_NAME)).toBeUndefined();

      const meRes = await request(server)
        .post('/graphql')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=anything`)
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_ME_QUERY })
        .expect(200);
      expect(meRes.body.errors?.[0]?.message).toBe('ADMIN_AUTH_MISCONFIGURED');
    } finally {
      await missingSecretApp.app.close();
    }

    // 2. Short (< 32 chars) secret in production
    const dirShort = makeTempDir();
    const shortSecretApp = await createAdminTestApp({
      dataDir: dirShort,
      nodeEnv: 'production',
      adminEmails: 'admin1@example.com',
      adminJwtSecret: 'too-short-secret-31-chars-12345',
    });
    try {
      const res = await request(shortSecretApp.app.getHttpServer())
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:admin1@example.com' },
        })
        .expect(200);
      expect(res.body.errors?.[0]?.message).toBe('ADMIN_AUTH_MISCONFIGURED');
      expect(extractSessionCookie(res, ADMIN_COOKIE_NAME)).toBeUndefined();
    } finally {
      await shortSecretApp.app.close();
    }

    // 3. Valid >= 32-char secret in production sets Secure cookie flag
    const dirValid = makeTempDir();
    const validProdApp = await createAdminTestApp({
      dataDir: dirValid,
      nodeEnv: 'production',
      adminEmails: 'admin1@example.com',
      adminJwtSecret: 'prod-secret-that-is-definitely-at-least-32-chars',
    });
    try {
      const res = await request(validProdApp.app.getHttpServer())
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_LOGIN_MUTATION,
          variables: { idToken: 'email:admin1@example.com' },
        })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      const setCookie = extractSessionCookie(res, ADMIN_COOKIE_NAME);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Lax');
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('Max-Age=1209600');
    } finally {
      await validProdApp.app.close();
    }
  });
});
