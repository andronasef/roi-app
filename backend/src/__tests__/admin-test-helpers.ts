import 'reflect-metadata';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../app.module';
import { GOOGLE_OAUTH_CLIENT, type GoogleTokenVerifier } from '../common/google-auth.guard';
import { type BackendEnv, loadEnv } from '../config/env';
import { configureApp } from '../main';

export const TEST_ADMIN_JWT_SECRET = 'test-admin-jwt-secret-at-least-32-chars-long';

export interface CreateAdminTestAppOptions {
  dataDir: string;
  nodeEnv?: 'development' | 'test' | 'production';
  adminEmails?: string;
  adminJwtSecret?: string | undefined;
  adminOrigins?: string;
  adminGoogleClientId?: string;
  googleClientIds?: string;
}

export interface AdminTestAppContext {
  moduleRef: TestingModule;
  app: NestExpressApplication;
  env: BackendEnv;
}

/**
 * Stub Google ID-token verifier for admin & suggestion integration tests.
 * - `unverified` -> `email_verified: false`
 * - `missing-email` -> `email_verified: true` with no email claim
 * - `email:<address>` -> `email_verified: true` with `<address>` and deterministic `sub`
 * - `valid:<sub>` -> `email_verified: true` with `<sub>@example.com`
 */
export function createStubAdminGoogleVerifier(): GoogleTokenVerifier {
  return {
    async verifyIdToken({ idToken }) {
      if (idToken === 'unverified') {
        return {
          getPayload: () => ({
            sub: 'sub-unverified',
            email: 'unverified@example.com',
            email_verified: false,
          }),
        };
      }
      if (idToken === 'missing-email') {
        return {
          getPayload: () => ({
            sub: 'sub-missing-email',
            email_verified: true,
          }),
        };
      }
      if (idToken.startsWith('email:')) {
        const email = idToken.slice('email:'.length);
        const normalized = email.trim().toLowerCase();
        return {
          getPayload: () => ({
            sub: `sub-${normalized}`,
            email,
            email_verified: true,
          }),
        };
      }
      if (idToken.startsWith('valid:')) {
        const sub = idToken.slice('valid:'.length);
        return {
          getPayload: () => ({
            sub,
            email: `${sub}@example.com`,
            email_verified: true,
          }),
        };
      }
      throw new Error('Invalid Google ID token');
    },
  };
}

/** Boot a configured NestJS + Express + GraphQL app with stubbed Google OAuth verifier. */
export async function createAdminTestApp(
  options: CreateAdminTestAppOptions,
): Promise<AdminTestAppContext> {
  process.env.DATA_DIR = options.dataDir;
  process.env.NODE_ENV = options.nodeEnv ?? 'test';
  process.env.ADMIN_EMAILS =
    options.adminEmails !== undefined
      ? options.adminEmails
      : 'admin1@example.com, Admin2@Example.com ';

  if ('adminJwtSecret' in options) {
    if (options.adminJwtSecret === undefined) {
      delete process.env.ADMIN_JWT_SECRET;
    } else {
      process.env.ADMIN_JWT_SECRET = options.adminJwtSecret;
    }
  } else {
    process.env.ADMIN_JWT_SECRET = TEST_ADMIN_JWT_SECRET;
  }

  if ('adminOrigins' in options) {
    if (options.adminOrigins === undefined) {
      delete process.env.ADMIN_ORIGINS;
    } else {
      process.env.ADMIN_ORIGINS = options.adminOrigins;
    }
  }

  if ('adminGoogleClientId' in options) {
    if (options.adminGoogleClientId === undefined) {
      delete process.env.ADMIN_GOOGLE_CLIENT_ID;
    } else {
      process.env.ADMIN_GOOGLE_CLIENT_ID = options.adminGoogleClientId;
    }
  }

  if ('googleClientIds' in options && options.googleClientIds !== undefined) {
    process.env.GOOGLE_CLIENT_IDS = options.googleClientIds;
  }

  const env = loadEnv(process.env);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GOOGLE_OAUTH_CLIENT)
    .useValue(createStubAdminGoogleVerifier())
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, env);
  await app.init();

  return { moduleRef, app, env };
}

/** Extract `name=value` cookie pair(s) from Supertest `set-cookie` headers for `Cookie` header reuse. */
export function extractCookieHeader(res: Pick<Response, 'headers'>): string {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((cookieStr) => cookieStr.split(';')[0]?.trim())
    .filter((pair): pair is string => Boolean(pair))
    .join('; ');
}

/** Extract the raw `Set-Cookie` header string for a given cookie name. */
export function extractSessionCookie(
  res: Pick<Response, 'headers'>,
  cookieName = 'roi_admin_session',
): string | undefined {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.find((entry) => entry.startsWith(`${cookieName}=`));
}
