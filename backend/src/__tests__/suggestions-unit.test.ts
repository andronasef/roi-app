import 'reflect-metadata';
import {
  BadRequestException,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { submitSuggestionInputSchema } from '@roi/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GoogleAuthGuard,
  type GoogleTokenVerifier,
} from '../common/google-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { loadEnv } from '../config/env';
import { resolveBackendPath } from '../config/paths';
import * as schema from '../db/schema';
import {
  DAILY_SUGGESTION_LIMIT,
  SuggestionsService,
} from '../suggestions/suggestions.service';

function makeHttpExecutionContext(headers: Record<string, string | undefined>): {
  context: ExecutionContext;
  req: { headers: Record<string, string | undefined>; googleUser?: unknown };
} {
  const req = { headers };
  const context = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('ZodValidationPipe, GoogleAuthGuard, and SuggestionsService (unit)', () => {
  const openDbs: Database.Database[] = [];

  afterEach(() => {
    while (openDbs.length > 0) {
      openDbs.pop()?.close();
    }
  });

  it('ZodValidationPipe validates via schema and throws BadRequestException with Arabic error message', () => {
    const pipe = new ZodValidationPipe(submitSuggestionInputSchema);

    const parsed = pipe.transform({
      kind: 'verse',
      title: 'مزمور ٢٣: ١',
      text: 'يا {الاسم}، الرب راعيك',
    });
    expect(parsed).toMatchObject({
      kind: 'verse',
      title: 'مزمور ٢٣: ١',
      text: 'يا {الاسم}، الرب راعيك',
    });

    expect(() =>
      pipe.transform({
        kind: 'verse',
        title: 'مزمور ٢٣: ١',
        text: 'Hello {name}',
      }),
    ).toThrowError(BadRequestException);

    try {
      pipe.transform({
        kind: 'verse',
        title: 'مزمور ٢٣: ١',
        text: 'Hello {name}',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).message).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it('GoogleAuthGuard verifies Bearer token against GOOGLE_CLIENT_IDS and requires email_verified=true', async () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATA_DIR: './data',
    });

    const verifyIdToken = vi.fn(async ({ idToken }: { idToken: string }) => {
      if (idToken === 'valid-token') {
        return {
          getPayload: () => ({
            sub: 'google-sub-123',
            email: 'user@example.com',
            email_verified: true,
          }),
        };
      }
      if (idToken === 'unverified-token') {
        return {
          getPayload: () => ({
            sub: 'google-sub-456',
            email: 'unverified@example.com',
            email_verified: false,
          }),
        };
      }
      throw new Error('Invalid token');
    });

    const verifier: GoogleTokenVerifier = { verifyIdToken };
    const guard = new GoogleAuthGuard(env, verifier);

    // Missing header
    const missingCtx = makeHttpExecutionContext({});
    await expect(guard.canActivate(missingCtx.context)).rejects.toThrow(UnauthorizedException);

    // Invalid token
    const invalidCtx = makeHttpExecutionContext({ authorization: 'Bearer bad-token' });
    await expect(guard.canActivate(invalidCtx.context)).rejects.toThrow(UnauthorizedException);

    // Unverified email
    const unverifiedCtx = makeHttpExecutionContext({
      authorization: 'Bearer unverified-token',
    });
    await expect(guard.canActivate(unverifiedCtx.context)).rejects.toThrow(UnauthorizedException);

    // Valid token attaches googleUser
    const validCtx = makeHttpExecutionContext({ authorization: 'Bearer valid-token' });
    await expect(guard.canActivate(validCtx.context)).resolves.toBe(true);
    expect(validCtx.req.googleUser).toEqual({
      googleSub: 'google-sub-123',
      email: 'user@example.com',
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid-token',
      audience: env.GOOGLE_CLIENT_IDS,
    });
  });

  it('SuggestionsService enforces 10/UTC-day quota per googleSub and persists pending rows', () => {
    const sqlite = new Database(':memory:');
    openDbs.push(sqlite);
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: resolveBackendPath('drizzle') });

    const service = new SuggestionsService(db, sqlite);
    const day1Start = Date.UTC(2026, 10, 25, 0, 0, 0);
    const userA = { googleSub: 'sub-a', email: 'a@example.com' };
    const userB = { googleSub: 'sub-b', email: 'b@example.com' };

    for (let i = 0; i < DAILY_SUGGESTION_LIMIT; i += 1) {
      const receipt = service.submitSuggestion(
        userA,
        {
          kind: 'blessing',
          title: `بركة ${i + 1}`,
          text: `يا {الاسم}، بركة رقم ${i + 1}`,
          verseRef: 'مزمور ٢٣',
        },
        day1Start + i * 1000,
      );
      expect(receipt.status).toBe('pending');
      expect(receipt.remainingToday).toBe(DAILY_SUGGESTION_LIMIT - (i + 1));
    }

    // 11th on same UTC day throws 429 TOO_MANY_REQUESTS
    let thrown: unknown;
    try {
      service.submitSuggestion(
        userA,
        { kind: 'verse', title: 'آية ١١', text: 'نص آية ١١' },
        day1Start + 20_000,
      );
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

    // Different googleSub still succeeds
    const bReceipt = service.submitSuggestion(
      userB,
      { kind: 'name_of_god', title: 'الراعي الصالح', text: 'أنت الراعي الصالح' },
      day1Start + 21_000,
    );
    expect(bReceipt.remainingToday).toBe(9);

    // Next UTC day resets quota for userA
    const day2Start = day1Start + 24 * 60 * 60 * 1000;
    const nextDayReceipt = service.submitSuggestion(
      userA,
      { kind: 'verse', title: 'آية يوم جديد', text: 'نص يوم جديد' },
      day2Start,
    );
    expect(nextDayReceipt.remainingToday).toBe(9);
  });
});
