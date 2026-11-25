import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotEnvelopeSchema } from '@roi/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import type { openBackendDatabase } from '../db/client';
import { DRIZZLE_DB } from '../db/drizzle.module';
import { auditLog, blessings, namesOfGod, verses } from '../db/schema';
import { createAdminTestApp, extractCookieHeader } from './admin-test-helpers';

const ADMIN_LOGIN_MUTATION = /* GraphQL */ `
  mutation AdminLogin($idToken: String!) {
    adminLogin(idToken: $idToken) {
      sub
      email
    }
  }
`;

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

const ADMIN_SUGGESTIONS_QUERY = /* GraphQL */ `
  query AdminSuggestions($status: String) {
    adminSuggestions(status: $status) {
      id
      kind
      title
      text
      textFemale
      verseRef
      status
      moderationNote
      googleSub
      email
      createdAt
      updatedAt
      submitterStats {
        pendingCount
        acceptedCount
        rejectedCount
      }
    }
  }
`;

const ADMIN_SUGGESTION_QUERY = /* GraphQL */ `
  query AdminSuggestion($id: ID!) {
    adminSuggestion(id: $id) {
      id
      kind
      title
      text
      textFemale
      verseRef
      status
      moderationNote
      email
      submitterStats {
        pendingCount
        acceptedCount
        rejectedCount
      }
    }
  }
`;

const ACCEPT_SUGGESTION_MUTATION = /* GraphQL */ `
  mutation AcceptSuggestion($id: ID!, $input: AcceptSuggestionInput!) {
    acceptSuggestion(id: $id, input: $input) {
      id
      kind
      title
      status
      moderationNote
      submitterStats {
        pendingCount
        acceptedCount
        rejectedCount
      }
    }
  }
`;

const REJECT_SUGGESTION_MUTATION = /* GraphQL */ `
  mutation RejectSuggestion($id: ID!, $note: String) {
    rejectSuggestion(id: $id, note: $note) {
      id
      kind
      title
      status
      moderationNote
      submitterStats {
        pendingCount
        acceptedCount
        rejectedCount
      }
    }
  }
`;

const CONTENT_DELTA_QUERY = /* GraphQL */ `
  query ContentDelta($sinceVersion: Int!) {
    contentDelta(sinceVersion: $sinceVersion) {
      contentVersion
      verses {
        id
        ref
        text
        textFemale
        version
      }
      namesOfGod {
        id
        title
        text
        version
      }
      blessings {
        id
        title
        verseRef
        text
        version
      }
    }
  }
`;

describe('AdminModerationModule (ADM-07, D-09, D-10, D-11)', () => {
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
    const dir = mkdtempSync(join(tmpdir(), 'roi-admin-mod-'));
    tempDirs.push(dir);
    return dir;
  }

  async function loginAsAdmin(
    server: ReturnType<Awaited<ReturnType<typeof createAdminTestApp>>['app']['getHttpServer']>,
    email: string,
    ip = '198.51.100.1',
  ): Promise<string> {
    const res = await request(server)
      .post('/graphql')
      .set('X-Forwarded-For', ip)
      .set('x-roi-admin', '1')
      .send({
        query: ADMIN_LOGIN_MUTATION,
        variables: { idToken: `email:${email}` },
      })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return extractCookieHeader(res);
  }

  async function submitUserSuggestion(
    server: ReturnType<Awaited<ReturnType<typeof createAdminTestApp>>['app']['getHttpServer']>,
    sub: string,
    input: {
      kind: 'verse' | 'name_of_god' | 'blessing';
      title: string;
      text: string;
      textFemale?: string | null;
      verseRef?: string | null;
    },
    ip = '198.51.100.20',
  ): Promise<string> {
    const res = await request(server)
      .post('/graphql')
      .set('X-Forwarded-For', ip)
      .set('Authorization', `Bearer valid:${sub}`)
      .send({
        query: SUBMIT_SUGGESTION_MUTATION,
        variables: { input },
      })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.submitSuggestion.id as string;
  }

  it('requires AdminAuthGuard + CSRF header and validates acceptSuggestion payloads against @roi/shared personalizedTextSchema', async () => {
    const dataDir = makeTempDir();
    const { app } = await createAdminTestApp({ dataDir });

    try {
      const server = app.getHttpServer();

      const unauthRes = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_SUGGESTIONS_QUERY })
        .expect(200);
      expect(unauthRes.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      const cookie = await loginAsAdmin(server, 'admin1@example.com');
      const suggestionId = await submitUserSuggestion(server, 'user-a', {
        kind: 'blessing',
        title: 'بركة مقترحة',
        text: 'بارك الله فيك يا {الاسم}',
      });

      const noCsrfRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .send({ query: ADMIN_SUGGESTIONS_QUERY })
        .expect(200);
      expect(noCsrfRes.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

      // Invalid brace token on acceptSuggestion -> BAD_REQUEST with Arabic error
      const invalidAcceptRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .send({
          query: ACCEPT_SUGGESTION_MUTATION,
          variables: {
            id: suggestionId,
            input: {
              kind: 'blessing',
              title: 'بركة محررة',
              text: 'سلام يا {invalid}',
            },
          },
        })
        .expect(200);
      expect(invalidAcceptRes.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(invalidAcceptRes.body.errors?.[0]?.message).toBe(
        'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم}',
      );

      // Missing suggestion ID -> NOT_FOUND
      const missingRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .send({
          query: ADMIN_SUGGESTION_QUERY,
          variables: { id: 'nonexistent-suggestion-id' },
        })
        .expect(200);
      expect(missingRes.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    } finally {
      await app.close();
    }
  });

  it('tracks submitter historical counts, promotes edited suggestions atomically to public content & snapshots, and rejects with optional note without bumping version', async () => {
    const dataDir = makeTempDir();
    const { moduleRef, app } = await createAdminTestApp({ dataDir });

    try {
      const server = app.getHttpServer();
      const db = moduleRef.get<ReturnType<typeof openBackendDatabase>['db']>(DRIZZLE_DB);
      const cookie = await loginAsAdmin(server, 'admin1@example.com');

      // Same submitter submits 3 items; another submitter submits 1 item
      const s1 = await submitUserSuggestion(
        server,
        'sub-repeat',
        {
          kind: 'verse',
          title: 'مزمور ١٢١: ١',
          text: 'أرفع عيني إلى الجبال يا {الاسم}',
        },
        '198.51.100.31',
      );
      const s2 = await submitUserSuggestion(
        server,
        'sub-repeat',
        {
          kind: 'blessing',
          title: 'بركة المساء',
          verseRef: 'مزمور ٤: ٨',
          text: 'بسلامة أضطجع يا {الاسم}',
        },
        '198.51.100.32',
      );
      const s3 = await submitUserSuggestion(
        server,
        'sub-repeat',
        {
          kind: 'name_of_god',
          title: 'السلام',
          text: 'رب السلام معك يا {الاسم}',
        },
        '198.51.100.33',
      );
      const sOther = await submitUserSuggestion(
        server,
        'sub-other',
        {
          kind: 'blessing',
          title: 'اقتراح آخر',
          text: 'نعمة وسلام يا {الاسم}',
        },
        '198.51.100.34',
      );

      // Initially sub-repeat has pendingCount = 3, sub-other has pendingCount = 1
      const pendingBefore = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.35')
        .send({ query: ADMIN_SUGGESTIONS_QUERY, variables: { status: 'pending' } })
        .expect(200);
      expect(pendingBefore.body.errors).toBeUndefined();
      const pendingList = pendingBefore.body.data.adminSuggestions as Array<{
        id: string;
        submitterStats: { pendingCount: number; acceptedCount: number; rejectedCount: number };
      }>;
      expect(pendingList).toHaveLength(4);
      expect(pendingList.find((row) => row.id === s1)?.submitterStats).toEqual({
        pendingCount: 3,
        acceptedCount: 0,
        rejectedCount: 0,
      });
      expect(pendingList.find((row) => row.id === sOther)?.submitterStats).toEqual({
        pendingCount: 1,
        acceptedCount: 0,
        rejectedCount: 0,
      });

      // Edit s1 (verse) and Accept & Publish
      const acceptVerseRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.36')
        .send({
          query: ACCEPT_SUGGESTION_MUTATION,
          variables: {
            id: s1,
            input: {
              kind: 'verse',
              title: 'مزمور ١٢١: ١-٢ (محرر)',
              text: 'أرفع عيني إلى الجبال يا {الاسم}، معونتي من عند الرب',
              textFemale: 'ارفعي عينيك إلى الجبال يا {الاسم}',
            },
          },
        })
        .expect(200);
      expect(acceptVerseRes.body.errors).toBeUndefined();
      expect(acceptVerseRes.body.data.acceptSuggestion).toMatchObject({
        id: s1,
        status: 'accepted',
        submitterStats: {
          pendingCount: 2,
          acceptedCount: 1,
          rejectedCount: 0,
        },
      });

      // Edit s2 (blessing) clearing verseRef whitespace to null and Accept & Publish
      const acceptBlessingRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.37')
        .send({
          query: ACCEPT_SUGGESTION_MUTATION,
          variables: {
            id: s2,
            input: {
              kind: 'blessing',
              title: 'بركة المساء المحررة',
              verseRef: '   ',
              text: '**بسلامة** تنام يا {الاسم}',
            },
          },
        })
        .expect(200);
      expect(acceptBlessingRes.body.errors).toBeUndefined();
      expect(acceptBlessingRes.body.data.acceptSuggestion.submitterStats).toEqual({
        pendingCount: 1,
        acceptedCount: 2,
        rejectedCount: 0,
      });

      // Reject s3 with optional note -> does NOT increment contentVersion
      const rejectRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.38')
        .send({
          query: REJECT_SUGGESTION_MUTATION,
          variables: {
            id: s3,
            note: 'مكرر مع عنصر حالي',
          },
        })
        .expect(200);
      expect(rejectRes.body.errors).toBeUndefined();
      expect(rejectRes.body.data.rejectSuggestion).toMatchObject({
        id: s3,
        status: 'rejected',
        moderationNote: 'مكرر مع عنصر حالي',
        submitterStats: {
          pendingCount: 0,
          acceptedCount: 2,
          rejectedCount: 1,
        },
      });

      // Reject sOther without note (whitespace -> null) -> contentVersion still 2
      const rejectNoNoteRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.39')
        .send({
          query: REJECT_SUGGESTION_MUTATION,
          variables: {
            id: sOther,
            note: '   ',
          },
        })
        .expect(200);
      expect(rejectNoNoteRes.body.errors).toBeUndefined();
      expect(rejectNoNoteRes.body.data.rejectSuggestion).toMatchObject({
        id: sOther,
        status: 'rejected',
        moderationNote: null,
      });

      // Pending tab is now empty; accepted has 2; rejected has 2; all has 4
      const pendingAfter = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.40')
        .send({ query: ADMIN_SUGGESTIONS_QUERY, variables: { status: 'pending' } })
        .expect(200);
      expect(pendingAfter.body.data.adminSuggestions).toHaveLength(0);

      const acceptedTab = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.41')
        .send({ query: ADMIN_SUGGESTIONS_QUERY, variables: { status: 'accepted' } })
        .expect(200);
      expect(acceptedTab.body.data.adminSuggestions).toHaveLength(2);

      const rejectedTab = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.42')
        .send({ query: ADMIN_SUGGESTIONS_QUERY, variables: { status: 'rejected' } })
        .expect(200);
      expect(rejectedTab.body.data.adminSuggestions).toHaveLength(2);

      // Verify contentDelta & /snapshots/:type show contentVersion === 2 and promoted items
      const deltaRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.43')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 0 } })
        .expect(200);
      expect(deltaRes.body.data.contentDelta.contentVersion).toBe(2);
      expect(deltaRes.body.data.contentDelta.verses).toHaveLength(1);
      expect(deltaRes.body.data.contentDelta.verses[0]).toMatchObject({
        ref: 'مزمور ١٢١: ١-٢ (محرر)',
        text: 'أرفع عيني إلى الجبال يا {الاسم}، معونتي من عند الرب',
        textFemale: 'ارفعي عينيك إلى الجبال يا {الاسم}',
        version: 1,
      });
      expect(deltaRes.body.data.contentDelta.blessings).toHaveLength(1);
      expect(deltaRes.body.data.contentDelta.blessings[0]).toMatchObject({
        title: 'بركة المساء المحررة',
        verseRef: null,
        version: 2,
      });

      const versesSnapshot = await request(server).get('/snapshots/verses').expect(200);
      const parsedVerses = snapshotEnvelopeSchema.parse(versesSnapshot.body);
      expect(parsedVerses.contentVersion).toBe(2);
      expect(parsedVerses.items).toHaveLength(1);

      // Audit log contains 2 accept_suggestion and 2 reject_suggestion entries
      const logs = db.select().from(auditLog).all();
      expect(logs).toHaveLength(4);
      expect(logs.filter((l) => l.action === 'accept_suggestion')).toHaveLength(2);
      expect(logs.filter((l) => l.action === 'reject_suggestion')).toHaveLength(2);
      // WR-04: accepts are filed under the suggestion entity, like rejects
      expect(logs.every((l) => l.entityType === 'suggestion')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('guards against concurrent double-accept, accept-after-reject, and double-reject with 409 CONFLICT without corrupting version or creating duplicates', async () => {
    const dataDir = makeTempDir();
    const { moduleRef, app } = await createAdminTestApp({ dataDir });

    try {
      const server = app.getHttpServer();
      const db = moduleRef.get<ReturnType<typeof openBackendDatabase>['db']>(DRIZZLE_DB);

      const cookie1 = await loginAsAdmin(server, 'admin1@example.com', '198.51.100.51');
      const cookie2 = await loginAsAdmin(server, 'admin2@example.com', '198.51.100.52');

      const sAcceptRace = await submitUserSuggestion(
        server,
        'sub-race-1',
        {
          kind: 'name_of_god',
          title: 'القدير',
          text: 'الرب القدير يحميك يا {الاسم}',
        },
        '198.51.100.53',
      );
      const sRejectRace = await submitUserSuggestion(
        server,
        'sub-race-2',
        {
          kind: 'verse',
          title: 'إشعياء ٤١: ١٠',
          text: 'لا تخف لأني معك يا {الاسم}',
        },
        '198.51.100.54',
      );

      // 1. Concurrent double-accept by two admins
      const [acceptA, acceptB] = await Promise.all([
        request(server)
          .post('/graphql')
          .set('Cookie', cookie1)
          .set('x-roi-admin', '1')
          .set('X-Forwarded-For', '198.51.100.55')
          .send({
            query: ACCEPT_SUGGESTION_MUTATION,
            variables: {
              id: sAcceptRace,
              input: {
                kind: 'name_of_god',
                title: 'القدير',
                text: 'الرب القدير يحميك يا {الاسم}',
              },
            },
          }),
        request(server)
          .post('/graphql')
          .set('Cookie', cookie2)
          .set('x-roi-admin', '1')
          .set('X-Forwarded-For', '198.51.100.56')
          .send({
            query: ACCEPT_SUGGESTION_MUTATION,
            variables: {
              id: sAcceptRace,
              input: {
                kind: 'name_of_god',
                title: 'القدير',
                text: 'الرب القدير يحميك يا {الاسم}',
              },
            },
          }),
      ]);

      const acceptSuccesses = [acceptA, acceptB].filter((r) => !r.body.errors);
      const acceptConflicts = [acceptA, acceptB].filter((r) => Boolean(r.body.errors));
      expect(acceptSuccesses).toHaveLength(1);
      expect(acceptConflicts).toHaveLength(1);
      expect(acceptConflicts[0]?.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
      expect(acceptConflicts[0]?.body.errors?.[0]?.message).toBe(
        'SUGGESTION_ALREADY_MODERATED',
      );

      // Rejecting an already accepted suggestion -> 409 CONFLICT
      const rejectAfterAccept = await request(server)
        .post('/graphql')
        .set('Cookie', cookie2)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.57')
        .send({
          query: REJECT_SUGGESTION_MUTATION,
          variables: { id: sAcceptRace, note: 'تأخر الرفض' },
        })
        .expect(200);
      expect(rejectAfterAccept.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
      expect(rejectAfterAccept.body.errors?.[0]?.message).toBe(
        'SUGGESTION_ALREADY_MODERATED',
      );

      // 2. Concurrent double-reject by two admins
      const [rejectA, rejectB] = await Promise.all([
        request(server)
          .post('/graphql')
          .set('Cookie', cookie1)
          .set('x-roi-admin', '1')
          .set('X-Forwarded-For', '198.51.100.58')
          .send({
            query: REJECT_SUGGESTION_MUTATION,
            variables: { id: sRejectRace, note: 'ملاحظة ١' },
          }),
        request(server)
          .post('/graphql')
          .set('Cookie', cookie2)
          .set('x-roi-admin', '1')
          .set('X-Forwarded-For', '198.51.100.59')
          .send({
            query: REJECT_SUGGESTION_MUTATION,
            variables: { id: sRejectRace, note: 'ملاحظة ٢' },
          }),
      ]);

      const rejectSuccesses = [rejectA, rejectB].filter((r) => !r.body.errors);
      const rejectConflicts = [rejectA, rejectB].filter((r) => Boolean(r.body.errors));
      expect(rejectSuccesses).toHaveLength(1);
      expect(rejectConflicts).toHaveLength(1);
      expect(rejectConflicts[0]?.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
      expect(rejectConflicts[0]?.body.errors?.[0]?.message).toBe(
        'SUGGESTION_ALREADY_MODERATED',
      );

      // Accepting an already rejected suggestion -> 409 CONFLICT without version drift or verse insert
      const acceptAfterReject = await request(server)
        .post('/graphql')
        .set('Cookie', cookie1)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.60')
        .send({
          query: ACCEPT_SUGGESTION_MUTATION,
          variables: {
            id: sRejectRace,
            input: {
              kind: 'verse',
              title: 'إشعياء ٤١: ١٠',
              text: 'لا تخف لأني معك يا {الاسم}',
            },
          },
        })
        .expect(200);
      expect(acceptAfterReject.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
      expect(acceptAfterReject.body.errors?.[0]?.message).toBe(
        'SUGGESTION_ALREADY_MODERATED',
      );

      // Assert DB integrity: only 1 name_of_god, 0 verses, 0 blessings, contentVersion === 1, 2 audit rows
      expect(db.select().from(namesOfGod).all()).toHaveLength(1);
      expect(db.select().from(verses).all()).toHaveLength(0);
      expect(db.select().from(blessings).all()).toHaveLength(0);
      expect(db.select().from(auditLog).all()).toHaveLength(2);

      const deltaRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.61')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 0 } })
        .expect(200);
      expect(deltaRes.body.data.contentDelta.contentVersion).toBe(1);
    } finally {
      await app.close();
    }
  });
});
