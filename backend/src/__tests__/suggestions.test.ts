import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { GOOGLE_OAUTH_CLIENT, type GoogleTokenVerifier } from '../common/google-auth.guard';
import { loadEnv } from '../config/env';
import { openBackendDatabase } from '../db/client';
import { DRIZZLE_DB } from '../db/drizzle.module';
import { suggestions } from '../db/schema';
import { configureApp } from '../main';

const SUBMIT_SUGGESTION_MUTATION = /* GraphQL */ `
  mutation SubmitSuggestion($input: SubmitSuggestionInput!) {
    submitSuggestion(input: $input) {
      id
      status
      createdAt
      remainingToday
    }
  }
`;

function createStubVerifier(): GoogleTokenVerifier {
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

async function createTestApp(dataDir: string) {
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = 'test';
  const env = loadEnv(process.env);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GOOGLE_OAUTH_CLIENT)
    .useValue(createStubVerifier())
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, env);
  await app.init();

  return { moduleRef, app };
}

describe('submitSuggestion GraphQL Mutation (BE-03, BE-04, D-10, D-11, D-12)', () => {
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

  it('rejects missing/invalid/unverified Google tokens, validates @roi/shared brace rules, and persists pending verse/name_of_god/blessing rows', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'roi-sugg-auth-'));
    tempDirs.push(dataDir);
    const { moduleRef, app } = await createTestApp(dataDir);

    try {
      const server = app.getHttpServer();
      const db = moduleRef.get<ReturnType<typeof openBackendDatabase>['db']>(DRIZZLE_DB);

      // 1. Missing Bearer token -> UNAUTHENTICATED
      const missingAuth = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.1')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'مزمور ٢٣: ١',
              text: 'الرب راعي فلا يعوزني شيء',
            },
          },
        });
      expect(missingAuth.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      // 2. Malformed/invalid Bearer token -> UNAUTHENTICATED
      const invalidAuth = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.1')
        .set('Authorization', 'Bearer malformed-jwt')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'مزمور ٢٣: ١',
              text: 'الرب راعي فلا يعوزني شيء',
            },
          },
        });
      expect(invalidAuth.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      // 3. Unverified email -> UNAUTHENTICATED
      const unverifiedAuth = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.1')
        .set('Authorization', 'Bearer unverified')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'مزمور ٢٣: ١',
              text: 'الرب راعي فلا يعوزني شيء',
            },
          },
        });
      expect(unverifiedAuth.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      // 4. Non-{الاسم} brace token -> BAD_REQUEST with Arabic error
      const invalidBrace = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.2')
        .set('Authorization', 'Bearer valid:sub-val')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'آية',
              text: 'مرحبا {name}',
            },
          },
        });
      expect(invalidBrace.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(invalidBrace.body.errors?.[0]?.message).toMatch(/[\u0600-\u06FF]/);

      // 5. Empty text -> BAD_REQUEST with Arabic error
      const emptyText = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.2')
        .set('Authorization', 'Bearer valid:sub-val')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'blessing',
              title: 'بركة',
              text: '   ',
            },
          },
        });
      expect(emptyText.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(emptyText.body.errors?.[0]?.message).toMatch(/[\u0600-\u06FF]/);

      expect(db.select().from(suggestions).all()).toHaveLength(0);

      // 6. Valid verse, name_of_god, and blessing suggestions
      const verseRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.3')
        .set('Authorization', 'Bearer valid:sub-val')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'مزمور ٢٣: ١',
              text: 'يا {الاسم}، الرب راعيك.',
            },
          },
        })
        .expect(200);
      expect(verseRes.body.errors).toBeUndefined();
      expect(verseRes.body.data.submitSuggestion).toMatchObject({
        status: 'pending',
        remainingToday: 9,
      });

      const nameRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.3')
        .set('Authorization', 'Bearer valid:sub-val')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'name_of_god',
              title: 'يهوه رافا',
              text: 'الله شافيك يا {الاسم}.',
              textFemale: 'الله شافيكي يا {الاسم}.',
            },
          },
        })
        .expect(200);
      expect(nameRes.body.errors).toBeUndefined();
      expect(nameRes.body.data.submitSuggestion.remainingToday).toBe(8);

      const blessingRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.3')
        .set('Authorization', 'Bearer valid:sub-val')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'blessing',
              title: 'بركة الصباح',
              text: 'ليباركك الرب يا {الاسم}.',
              verseRef: 'العدد ٦: ٢٤',
            },
          },
        })
        .expect(200);
      expect(blessingRes.body.errors).toBeUndefined();
      expect(blessingRes.body.data.submitSuggestion.remainingToday).toBe(7);

      const rows = db.select().from(suggestions).all();
      expect(rows).toHaveLength(3);
      expect(rows.every((r) => r.status === 'pending')).toBe(true);
      expect(rows.every((r) => r.googleSub === 'sub-val')).toBe(true);
      expect(rows.every((r) => r.email === 'sub-val@example.com')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('enforces durable 10/day googleSub SQLite quota across IPs and restarts while isolating accounts', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'roi-sugg-quota-'));
    tempDirs.push(dataDir);

    const firstBoot = await createTestApp(dataDir);
    try {
      const server = firstBoot.app.getHttpServer();

      // Use isolated IPs so the 10/min per-IP burst throttle does not interfere with the 10/day quota
      for (let i = 0; i < 10; i += 1) {
        const res = await request(server)
          .post('/graphql')
          .set('X-Forwarded-For', `198.51.100.${20 + i}`)
          .set('Authorization', 'Bearer valid:sub-a')
          .send({
            query: SUBMIT_SUGGESTION_MUTATION,
            variables: {
              input: {
                kind: 'blessing',
                title: `بركة ${i + 1}`,
                text: `يا {الاسم}، بركة رقم ${i + 1}`,
              },
            },
          })
          .expect(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.submitSuggestion.remainingToday).toBe(9 - i);
      }

      // 11th request for sub-a from a fresh IP fails with 429 TOO_MANY_REQUESTS
      const eleventh = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.35')
        .set('Authorization', 'Bearer valid:sub-a')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'آية ١١',
              text: 'نص آية ١١',
            },
          },
        })
        .expect(429);
      expect(eleventh.body.errors?.[0]?.extensions?.code).toBe('TOO_MANY_REQUESTS');

      // Second Google account sub-b succeeds from a fresh IP
      const subBRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.36')
        .set('Authorization', 'Bearer valid:sub-b')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'آية ب',
              text: 'نص آية ب',
            },
          },
        })
        .expect(200);
      expect(subBRes.body.data.submitSuggestion.remainingToday).toBe(9);
    } finally {
      await firstBoot.app.close();
    }

    // Re-create TestingModule against the same DATA_DIR SQLite file -> quota survives restart
    const secondBoot = await createTestApp(dataDir);
    try {
      const server = secondBoot.app.getHttpServer();
      const afterRestart = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.37')
        .set('Authorization', 'Bearer valid:sub-a')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'verse',
              title: 'آية بعد إعادة التشغيل',
              text: 'نص بعد إعادة التشغيل',
            },
          },
        })
        .expect(429);
      expect(afterRestart.body.errors?.[0]?.extensions?.code).toBe('TOO_MANY_REQUESTS');
    } finally {
      await secondBoot.app.close();
    }
  });

  it('enforces 10/min per-IP @Throttle burst cap even across distinct Google accounts', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'roi-sugg-burst-'));
    tempDirs.push(dataDir);
    const { app } = await createTestApp(dataDir);

    try {
      const server = app.getHttpServer();

      for (let i = 0; i < 10; i += 1) {
        const res = await request(server)
          .post('/graphql')
          .set('X-Forwarded-For', '198.51.100.99')
          .set('Authorization', `Bearer valid:sub-burst-${i}`)
          .send({
            query: SUBMIT_SUGGESTION_MUTATION,
            variables: {
              input: {
                kind: 'name_of_god',
                title: `اسم ${i + 1}`,
                text: `يا {الاسم}، الرب معك ${i + 1}`,
              },
            },
          })
          .expect(200);
        expect(res.body.errors).toBeUndefined();
      }

      // 11th request from same IP within 60s hits @Throttle burst cap (429)
      const burstRejected = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.99')
        .set('Authorization', 'Bearer valid:sub-burst-10')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'name_of_god',
              title: 'اسم ١١',
              text: 'يا {الاسم}، الرب معك ١١',
            },
          },
        })
        .expect(429);
      expect(burstRejected.body.errors?.[0]?.extensions?.code).toBe('TOO_MANY_REQUESTS');

      // Different IP still succeeds
      const otherIp = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.100')
        .set('Authorization', 'Bearer valid:sub-burst-10')
        .send({
          query: SUBMIT_SUGGESTION_MUTATION,
          variables: {
            input: {
              kind: 'name_of_god',
              title: 'اسم ١٢',
              text: 'يا {الاسم}، الرب معك ١٢',
            },
          },
        })
        .expect(200);
      expect(otherIp.body.errors).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
