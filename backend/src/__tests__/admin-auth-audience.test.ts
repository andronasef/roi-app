import 'reflect-metadata';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { loadEnv } from '../config/env';

function makeService(extra: Record<string, string>) {
  const calls: Array<string | string[]> = [];
  const env = loadEnv({
    NODE_ENV: 'test',
    ADMIN_EMAILS: 'a@example.com',
    ADMIN_JWT_SECRET: 'test-admin-jwt-secret-at-least-32-chars-long',
    GOOGLE_CLIENT_IDS: 'mobile-1,mobile-2',
    ...extra,
  });
  const service = new AdminAuthService(env, new JwtService(), {
    async verifyIdToken({ audience }) {
      calls.push(audience);
      return { getPayload: () => ({ sub: 's', email: 'a@example.com', email_verified: true }) };
    },
  });
  return { service, calls };
}

describe('AdminAuthService ID-token audience (CR-01)', () => {
  it('verifies against the dedicated admin client only when ADMIN_GOOGLE_CLIENT_ID is set', async () => {
    const { service, calls } = makeService({ ADMIN_GOOGLE_CLIENT_ID: 'admin-web' });
    await service.authenticateGoogleIdToken('t');
    expect(calls).toEqual([['admin-web']]);
  });

  it('falls back to GOOGLE_CLIENT_IDS when no admin client is set', async () => {
    const { service, calls } = makeService({});
    await service.authenticateGoogleIdToken('t');
    expect(calls).toEqual([['mobile-1', 'mobile-2']]);
  });
});
