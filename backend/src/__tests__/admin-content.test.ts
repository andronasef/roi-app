import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotEnvelopeSchema } from '@roi/shared';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SnapshotService } from '../content/snapshot.service';
import { createAdminTestApp, extractCookieHeader } from './admin-test-helpers';

const ADMIN_LOGIN_MUTATION = /* GraphQL */ `
  mutation AdminLogin($idToken: String!) {
    adminLogin(idToken: $idToken) {
      sub
      email
    }
  }
`;

const ADMIN_VERSES_QUERY = /* GraphQL */ `
  query AdminVerses($status: String) {
    adminVerses(status: $status) {
      id
      ref
      text
      textFemale
      version
      sortOrder
      tags
      createdAt
      updatedAt
      deletedAt
    }
  }
`;

const ADMIN_NAMES_QUERY = /* GraphQL */ `
  query AdminNamesOfGod($status: String) {
    adminNamesOfGod(status: $status) {
      id
      title
      text
      textFemale
      version
      sortOrder
      tags
      createdAt
      updatedAt
      deletedAt
    }
  }
`;

const ADMIN_BLESSINGS_QUERY = /* GraphQL */ `
  query AdminBlessings($status: String) {
    adminBlessings(status: $status) {
      id
      title
      verseRef
      text
      textFemale
      version
      sortOrder
      tags
      createdAt
      updatedAt
      deletedAt
    }
  }
`;

const ADMIN_VERSION_QUERY = /* GraphQL */ `
  query AdminContentVersion {
    adminContentVersion
  }
`;

const CREATE_VERSE_MUTATION = /* GraphQL */ `
  mutation CreateVerse($input: CreateVerseInput!) {
    createVerse(input: $input) {
      id
      ref
      text
      textFemale
      version
      sortOrder
      tags
      deletedAt
    }
  }
`;

const UPDATE_VERSE_MUTATION = /* GraphQL */ `
  mutation UpdateVerse($id: ID!, $input: UpdateVerseInput!) {
    updateVerse(id: $id, input: $input) {
      id
      ref
      text
      textFemale
      version
      deletedAt
    }
  }
`;

const CREATE_NAME_MUTATION = /* GraphQL */ `
  mutation CreateNameOfGod($input: CreateNameOfGodInput!) {
    createNameOfGod(input: $input) {
      id
      title
      text
      textFemale
      version
      sortOrder
      tags
      deletedAt
    }
  }
`;

const UPDATE_NAME_MUTATION = /* GraphQL */ `
  mutation UpdateNameOfGod($id: ID!, $input: UpdateNameOfGodInput!) {
    updateNameOfGod(id: $id, input: $input) {
      id
      title
      text
      textFemale
      version
    }
  }
`;

const CREATE_BLESSING_MUTATION = /* GraphQL */ `
  mutation CreateBlessing($input: CreateBlessingInput!) {
    createBlessing(input: $input) {
      id
      title
      verseRef
      text
      textFemale
      version
      sortOrder
      tags
      deletedAt
    }
  }
`;

const UPDATE_BLESSING_MUTATION = /* GraphQL */ `
  mutation UpdateBlessing($id: ID!, $input: UpdateBlessingInput!) {
    updateBlessing(id: $id, input: $input) {
      id
      title
      verseRef
      text
      textFemale
      version
    }
  }
`;

const SOFT_DELETE_MUTATION = /* GraphQL */ `
  mutation SoftDeleteContent($kind: String!, $id: ID!) {
    softDeleteContent(kind: $kind, id: $id)
  }
`;

const RESTORE_MUTATION = /* GraphQL */ `
  mutation RestoreContent($kind: String!, $id: ID!) {
    restoreContent(kind: $kind, id: $id)
  }
`;

const ADMIN_AUDIT_LOGS_QUERY = /* GraphQL */ `
  query AdminAuditLogs($action: String, $entityType: String, $limit: Int, $offset: Int) {
    adminAuditLogs(action: $action, entityType: $entityType, limit: $limit, offset: $offset) {
      id
      actorEmail
      action
      entityType
      entityId
      contentVersion
      summaryJson
      createdAt
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
        deletedAt
      }
      namesOfGod {
        id
        title
        text
        textFemale
        version
        deletedAt
      }
      blessings {
        id
        title
        verseRef
        text
        textFemale
        version
        deletedAt
      }
    }
  }
`;

describe('AdminContentModule & AdminAuditModule (ADM-02, ADM-06, BE-05, D-05, D-06, D-08, D-13)', () => {
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
    const dir = mkdtempSync(join(tmpdir(), 'roi-admin-content-'));
    tempDirs.push(dir);
    return dir;
  }

  async function loginAsAdmin(
    server: ReturnType<Awaited<ReturnType<typeof createAdminTestApp>>['app']['getHttpServer']>,
    email = 'admin1@example.com',
  ): Promise<string> {
    const res = await request(server)
      .post('/graphql')
      .set('x-roi-admin', '1')
      .send({
        query: ADMIN_LOGIN_MUTATION,
        variables: { idToken: `email:${email}` },
      })
      .expect(200);
    expect(res.body.errors).toBeUndefined();
    return extractCookieHeader(res);
  }

  it('enforces AdminAuthGuard (cookie + x-roi-admin CSRF header) on all admin content and audit operations', async () => {
    const dataDir = makeTempDir();
    const { app } = await createAdminTestApp({ dataDir });

    try {
      const server = app.getHttpServer();

      // Missing cookie (with CSRF header) -> UNAUTHENTICATED
      const noCookieVerses = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_VERSES_QUERY })
        .expect(200);
      expect(noCookieVerses.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      const noCookieAudit = await request(server)
        .post('/graphql')
        .set('x-roi-admin', '1')
        .send({ query: ADMIN_AUDIT_LOGS_QUERY })
        .expect(200);
      expect(noCookieAudit.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

      const cookie = await loginAsAdmin(server);

      // Missing x-roi-admin CSRF header -> FORBIDDEN
      const noCsrfCreate = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .send({
          query: CREATE_VERSE_MUTATION,
          variables: {
            input: { ref: 'مزمور ٢٣: ١', text: 'الرب راعي يا {الاسم}' },
          },
        })
        .expect(200);
      expect(noCsrfCreate.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(noCsrfCreate.body.errors?.[0]?.message).toBe('CSRF_HEADER_REQUIRED');
    } finally {
      await app.close();
    }
  });

  it('validates payloads via @roi/shared personalizedTextSchema, rejects non-{الاسم} brace tokens, and coerces empty verseRef to null', async () => {
    const dataDir = makeTempDir();
    const { app } = await createAdminTestApp({ dataDir });

    try {
      const server = app.getHttpServer();
      const cookie = await loginAsAdmin(server);

      // Invalid brace token in text -> BAD_REQUEST with Arabic error
      const badBraceRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .send({
          query: CREATE_VERSE_MUTATION,
          variables: {
            input: {
              ref: 'يوحنا ٣: ١٦',
              text: 'مرحبا {name}',
            },
          },
        })
        .expect(200);
      expect(badBraceRes.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(badBraceRes.body.errors?.[0]?.message).toBe(
        'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم}',
      );

      // Invalid brace token in textFemale -> BAD_REQUEST with Arabic error
      const badFemaleBraceRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .send({
          query: CREATE_NAME_MUTATION,
          variables: {
            input: {
              title: 'الراعي الصالح',
              text: 'الرب راعيك يا {الاسم}',
              textFemale: 'الرب راعيتك يا {user}',
            },
          },
        })
        .expect(200);
      expect(badFemaleBraceRes.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(badFemaleBraceRes.body.errors?.[0]?.message).toBe(
        'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم}',
      );

      // Blank text -> BAD_REQUEST with Arabic error
      const blankTextRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .send({
          query: CREATE_BLESSING_MUTATION,
          variables: {
            input: {
              title: 'بركة صباحية',
              text: '   ',
            },
          },
        })
        .expect(200);
      expect(blankTextRes.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(blankTextRes.body.errors?.[0]?.message).toBe('النص لا يمكن أن يكون فارغاً');

      // Whitespace-only verseRef coerces to null cleanly before validation/insert
      const createBlessingRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .send({
          query: CREATE_BLESSING_MUTATION,
          variables: {
            input: {
              title: 'بركة السلام',
              verseRef: '   ',
              text: 'سلام الله يحفظك يا {الاسم}',
              textFemale: null,
            },
          },
        })
        .expect(200);
      expect(createBlessingRes.body.errors).toBeUndefined();
      expect(createBlessingRes.body.data.createBlessing).toMatchObject({
        title: 'بركة السلام',
        verseRef: null,
        textFemale: null,
        sortOrder: null,
        tags: null,
        deletedAt: null,
      });
    } finally {
      await app.close();
    }
  });

  it('executes full CRUD, soft-delete, and restore lifecycle across all 3 content kinds with delta sync, snapshot refresh, and audit logging', async () => {
    const dataDir = makeTempDir();
    const { app } = await createAdminTestApp({ dataDir });

    try {
      const server = app.getHttpServer();
      const cookie = await loginAsAdmin(server, 'admin1@example.com');

      const initialVersionRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.10')
        .send({ query: ADMIN_VERSION_QUERY })
        .expect(200);
      expect(initialVersionRes.body.data.adminContentVersion).toBe(0);

      // 1. Create verse, name_of_god, blessing
      const verseRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.11')
        .send({
          query: CREATE_VERSE_MUTATION,
          variables: {
            input: {
              ref: 'مزمور ٢٣: ١',
              text: 'الرب راعي يا {الاسم} فلا يعوزني شيء',
              textFemale: 'الرب راعيك يا {الاسم} فلا يعوزك شيء',
            },
          },
        })
        .expect(200);
      expect(verseRes.body.errors).toBeUndefined();
      const verseId = verseRes.body.data.createVerse.id as string;
      expect(verseRes.body.data.createVerse.version).toBe(1);

      const nameRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.12')
        .send({
          query: CREATE_NAME_MUTATION,
          variables: {
            input: {
              title: 'الأمين',
              text: '**الأمين** يرعاك يا {الاسم}',
            },
          },
        })
        .expect(200);
      expect(nameRes.body.errors).toBeUndefined();
      const nameId = nameRes.body.data.createNameOfGod.id as string;
      expect(nameRes.body.data.createNameOfGod.version).toBe(2);

      const blessingRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.13')
        .send({
          query: CREATE_BLESSING_MUTATION,
          variables: {
            input: {
              title: 'بركة النور',
              verseRef: 'العدد ٦: ٢٥',
              text: 'ليضئ الرب وجهه عليك يا {الاسم}',
              textFemale: null,
            },
          },
        })
        .expect(200);
      expect(blessingRes.body.errors).toBeUndefined();
      const blessingId = blessingRes.body.data.createBlessing.id as string;
      expect(blessingRes.body.data.createBlessing.version).toBe(3);

      // 2. Update all three (including clearing verse.textFemale to null per D-05)
      const updatedVerseRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.14')
        .send({
          query: UPDATE_VERSE_MUTATION,
          variables: {
            id: verseId,
            input: {
              ref: 'مزمور ٢٣: ١-٢',
              text: 'الرب راعيك يا {الاسم}',
              textFemale: null,
            },
          },
        })
        .expect(200);
      expect(updatedVerseRes.body.errors).toBeUndefined();
      expect(updatedVerseRes.body.data.updateVerse).toMatchObject({
        id: verseId,
        ref: 'مزمور ٢٣: ١-٢',
        textFemale: null,
        version: 4,
      });

      const updatedNameRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.15')
        .send({
          query: UPDATE_NAME_MUTATION,
          variables: {
            id: nameId,
            input: {
              title: 'الأمين الصادق',
              text: '**الأمين الصادق** معك يا {الاسم}',
            },
          },
        })
        .expect(200);
      expect(updatedNameRes.body.data.updateNameOfGod.version).toBe(5);

      const updatedBlessingRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.16')
        .send({
          query: UPDATE_BLESSING_MUTATION,
          variables: {
            id: blessingId,
            input: {
              title: 'بركة النور المحدثة',
              verseRef: '',
              text: 'يباركك الرب يا {الاسم}',
            },
          },
        })
        .expect(200);
      expect(updatedBlessingRes.body.data.updateBlessing).toMatchObject({
        id: blessingId,
        title: 'بركة النور المحدثة',
        verseRef: null,
        version: 6,
      });

      // 3. Soft-delete verse -> removed from active & snapshot, present in deleted & delta tombstone
      const deleteVerseRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.17')
        .send({
          query: SOFT_DELETE_MUTATION,
          variables: { kind: 'verse', id: verseId },
        })
        .expect(200);
      expect(deleteVerseRes.body.data.softDeleteContent).toBe(true);

      // Re-deleting already deleted item fails with BAD_REQUEST
      const doubleDeleteRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.18')
        .send({
          query: SOFT_DELETE_MUTATION,
          variables: { kind: 'verse', id: verseId },
        })
        .expect(200);
      expect(doubleDeleteRes.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
      expect(doubleDeleteRes.body.errors?.[0]?.message).toBe('CONTENT_ALREADY_DELETED');

      const activeVersesAfterDelete = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.19')
        .send({ query: ADMIN_VERSES_QUERY, variables: { status: 'active' } })
        .expect(200);
      expect(activeVersesAfterDelete.body.data.adminVerses).toHaveLength(0);

      const deletedVerses = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.20')
        .send({ query: ADMIN_VERSES_QUERY, variables: { status: 'deleted' } })
        .expect(200);
      expect(deletedVerses.body.data.adminVerses).toHaveLength(1);
      expect(deletedVerses.body.data.adminVerses[0].deletedAt).toBeTypeOf('number');

      // Snapshot excludes soft-deleted verse and has updated contentVersion
      const versesSnapshotDeleted = await request(server).get('/snapshots/verses').expect(200);
      const parsedSnapshotDeleted = snapshotEnvelopeSchema.parse(versesSnapshotDeleted.body);
      expect(parsedSnapshotDeleted.contentVersion).toBe(7);
      expect(parsedSnapshotDeleted.items).toHaveLength(0);

      // 4. Restore verse -> reappears in active, snapshot, and delta
      const restoreVerseRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.21')
        .send({
          query: RESTORE_MUTATION,
          variables: { kind: 'verse', id: verseId },
        })
        .expect(200);
      expect(restoreVerseRes.body.data.restoreContent).toBe(true);

      const activeVersesAfterRestore = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.22')
        .send({ query: ADMIN_VERSES_QUERY, variables: { status: 'all' } })
        .expect(200);
      expect(activeVersesAfterRestore.body.data.adminVerses).toHaveLength(1);
      expect(activeVersesAfterRestore.body.data.adminVerses[0]).toMatchObject({
        id: verseId,
        deletedAt: null,
        version: 8,
      });

      const namesListRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.23')
        .send({ query: ADMIN_NAMES_QUERY, variables: { status: 'active' } })
        .expect(200);
      expect(namesListRes.body.data.adminNamesOfGod).toHaveLength(1);

      const blessingsListRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.24')
        .send({ query: ADMIN_BLESSINGS_QUERY, variables: { status: 'active' } })
        .expect(200);
      expect(blessingsListRes.body.data.adminBlessings).toHaveLength(1);

      // contentDelta reflects all 3 updated items at version 8
      const deltaRes = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.25')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 0 } })
        .expect(200);
      expect(deltaRes.body.data.contentDelta.contentVersion).toBe(8);
      expect(deltaRes.body.data.contentDelta.verses).toHaveLength(1);
      expect(deltaRes.body.data.contentDelta.namesOfGod).toHaveLength(1);
      expect(deltaRes.body.data.contentDelta.blessings).toHaveLength(1);

      // Snapshot reflects restored verse and updated blessing
      const versesSnapshotRestored = await request(server).get('/snapshots/verses').expect(200);
      const parsedRestored = snapshotEnvelopeSchema.parse(versesSnapshotRestored.body);
      expect(parsedRestored.contentVersion).toBe(8);
      expect(parsedRestored.items).toHaveLength(1);

      // Health reflects contentVersion 8
      const healthRes = await request(server).get('/health').expect(200);
      expect(healthRes.body.contentVersion).toBe(8);

      // Audit logs recorded all 8 actions in descending order, filterable by action & entityType
      const allAuditRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.26')
        .send({
          query: ADMIN_AUDIT_LOGS_QUERY,
          variables: { limit: 20, offset: 0 },
        })
        .expect(200);
      expect(allAuditRes.body.errors).toBeUndefined();
      const logs = allAuditRes.body.data.adminAuditLogs as Array<{
        actorEmail: string;
        action: string;
        entityType: string;
        entityId: string;
        contentVersion: number;
      }>;
      expect(logs).toHaveLength(8);
      expect(logs[0]).toMatchObject({
        actorEmail: 'admin1@example.com',
        action: 'restore',
        entityType: 'verse',
        entityId: verseId,
        contentVersion: 8,
      });

      // WR-04: updates record before/after of the editable fields
      const updateLog = logs.find((l) => l.action === 'update_verse');
      expect(updateLog).toBeDefined();
      const updateSummary = JSON.parse((updateLog as unknown as { summaryJson: string }).summaryJson);
      expect(updateSummary.before.ref).not.toBe(updateSummary.after.ref);
      expect(updateSummary.after).toMatchObject({ ref: 'مزمور ٢٣: ١-٢', text: 'الرب راعيك يا {الاسم}', textFemale: null });

      const filteredAuditRes = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.27')
        .send({
          query: ADMIN_AUDIT_LOGS_QUERY,
          variables: { action: 'soft_delete', entityType: 'verse' },
        })
        .expect(200);
      expect(filteredAuditRes.body.data.adminAuditLogs).toHaveLength(1);
      expect(filteredAuditRes.body.data.adminAuditLogs[0].contentVersion).toBe(7);
    } finally {
      await app.close();
    }
  });

  it('rejects stale expectedVersion and edits to soft-deleted items with 409-style conflicts (WR-05)', async () => {
    const { app } = await createAdminTestApp({ dataDir: makeTempDir() });
    try {
      const server = app.getHttpServer();
      const cookie = await loginAsAdmin(server);
      const gql = async (query: string, variables: Record<string, unknown>, ip: string) =>
        (
          await request(server)
            .post('/graphql')
            .set('Cookie', cookie)
            .set('x-roi-admin', '1')
            .set('X-Forwarded-For', ip)
            .send({ query, variables })
            .expect(200)
        ).body;
      const update = /* GraphQL */ `
        mutation U($id: ID!, $input: UpdateVerseInput!, $v: Int) {
          updateVerse(id: $id, input: $input, expectedVersion: $v) { id version }
        }
      `;
      const input = { ref: 'مزمور ١', text: 'نص' };

      const created = await gql(CREATE_VERSE_MUTATION, { input }, '198.51.100.40');
      const id = created.data.createVerse.id as string;
      const v1 = created.data.createVerse.version as number;

      const ok = await gql(update, { id, input: { ...input, text: 'نص ٢' }, v: v1 }, '198.51.100.41');
      expect(ok.errors).toBeUndefined();

      const stale = await gql(update, { id, input: { ...input, text: 'نص ٣' }, v: v1 }, '198.51.100.42');
      expect(stale.errors?.[0]?.message).toContain('CONTENT_VERSION_CONFLICT');

      await gql(SOFT_DELETE_MUTATION, { kind: 'verse', id }, '198.51.100.43');
      const deleted = await gql(update, { id, input: { ...input, text: 'نص ٤' } }, '198.51.100.44');
      expect(deleted.errors?.[0]?.message).toContain('CONTENT_ALREADY_DELETED');
    } finally {
      await app.close();
    }
  });

  it('returns the committed result when the post-commit snapshot rebuild fails, and heals on the next read (WR-06)', async () => {
    const { app, moduleRef } = await createAdminTestApp({ dataDir: makeTempDir() });
    try {
      const server = app.getHttpServer();
      const cookie = await loginAsAdmin(server);
      const snapshots = moduleRef.get(SnapshotService);
      const spy = vi.spyOn(snapshots, 'refreshCache').mockImplementationOnce(() => {
        throw new Error('disk full');
      });
      const res = await request(server)
        .post('/graphql')
        .set('Cookie', cookie)
        .set('x-roi-admin', '1')
        .set('X-Forwarded-For', '198.51.100.50')
        .send({ query: CREATE_VERSE_MUTATION, variables: { input: { ref: 'مزمور ١', text: 'نص' } } })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);

      const snap = await request(server).get('/snapshots/verses').expect(200);
      expect(snap.body.items.some((i: { id: string }) => i.id === res.body.data.createVerse.id)).toBe(true);
    } finally {
      await app.close();
    }
  });
});
