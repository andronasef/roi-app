import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type ContentKind, uuidv7 } from '@roi/shared';
import { eq, isNotNull, isNull } from 'drizzle-orm';
import type { BlessingDto, NameOfGodDto, VerseDto } from '../content/content.resolver';
import { ContentService } from '../content/content.service';
import { compareContentOrder, parseTagsJson } from '../content/snapshot-builder';
import type { BackendDatabase } from '../db/client';
import { DRIZZLE_DB } from '../db/drizzle.module';
import { blessings, namesOfGod, verses } from '../db/schema';

export type ContentStatusFilter = 'active' | 'deleted' | 'all';

export interface CreateVersePayload {
  readonly ref: string;
  readonly text: string;
  readonly textFemale?: string | null;
}

export interface CreateNameOfGodPayload {
  readonly title: string;
  readonly text: string;
}

export interface CreateBlessingPayload {
  readonly title: string;
  readonly verseRef?: string | null;
  readonly text: string;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value.trim().length === 0 ? null : value;
}

function normalizeOptionalVerseRef(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Editable fields recorded as audit before/after (text fields are already length-capped by the shared schema). */
function auditSnapshot(row: {
  ref?: string;
  title?: string;
  verseRef?: string | null;
  text: string;
  textFemale?: string | null;
}): Record<string, unknown> {
  return {
    ref: row.ref,
    title: row.title,
    verseRef: row.verseRef,
    text: row.text,
    textFemale: row.textFemale ?? null,
  };
}

/** Edits need a live row and, when the client supplied one, a matching version (WR-05). */
function assertEditable(
  existing: { version: number; deletedAt: number | null },
  expectedVersion: number | null | undefined,
): void {
  if (existing.deletedAt !== null) {
    throw new ConflictException('CONTENT_ALREADY_DELETED');
  }
  if (expectedVersion != null && existing.version !== expectedVersion) {
    throw new ConflictException('CONTENT_VERSION_CONFLICT');
  }
}

function mapVerseRow(row: typeof verses.$inferSelect): VerseDto {
  return {
    id: row.id,
    ref: row.ref,
    text: row.text,
    textFemale: row.textFemale,
    version: row.version,
    sortOrder: row.sortOrder,
    tags: parseTagsJson(row.tagsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function mapNameOfGodRow(row: typeof namesOfGod.$inferSelect): NameOfGodDto {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    version: row.version,
    sortOrder: row.sortOrder,
    tags: parseTagsJson(row.tagsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function mapBlessingRow(row: typeof blessings.$inferSelect): BlessingDto {
  return {
    id: row.id,
    title: row.title,
    verseRef: row.verseRef,
    text: row.text,
    version: row.version,
    sortOrder: row.sortOrder,
    tags: parseTagsJson(row.tagsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function statusCondition(
  deletedAtCol: typeof verses.deletedAt | typeof namesOfGod.deletedAt | typeof blessings.deletedAt,
  status: ContentStatusFilter,
) {
  if (status === 'active') {
    return isNull(deletedAtCol);
  }
  if (status === 'deleted') {
    return isNotNull(deletedAtCol);
  }
  return undefined;
}

interface ContentDeleteAccessor {
  readonly findById: (
    db: BackendDatabase,
    id: string,
  ) => { deletedAt: number | null } | undefined;
  readonly setDeletedAt: (
    db: BackendDatabase,
    id: string,
    deletedAt: number | null,
    updatedAt: number,
    version: number,
  ) => void;
}

const CONTENT_DELETE_ACCESSORS: Record<ContentKind, ContentDeleteAccessor> = {
  verse: {
    findById: (db, id) =>
      db.select({ deletedAt: verses.deletedAt }).from(verses).where(eq(verses.id, id)).get(),
    setDeletedAt: (db, id, deletedAt, updatedAt, version) => {
      db.update(verses).set({ deletedAt, updatedAt, version }).where(eq(verses.id, id)).run();
    },
  },
  name_of_god: {
    findById: (db, id) =>
      db
        .select({ deletedAt: namesOfGod.deletedAt })
        .from(namesOfGod)
        .where(eq(namesOfGod.id, id))
        .get(),
    setDeletedAt: (db, id, deletedAt, updatedAt, version) => {
      db.update(namesOfGod).set({ deletedAt, updatedAt, version }).where(eq(namesOfGod.id, id)).run();
    },
  },
  blessing: {
    findById: (db, id) =>
      db
        .select({ deletedAt: blessings.deletedAt })
        .from(blessings)
        .where(eq(blessings.id, id))
        .get(),
    setDeletedAt: (db, id, deletedAt, updatedAt, version) => {
      db.update(blessings).set({ deletedAt, updatedAt, version }).where(eq(blessings.id, id)).run();
    },
  },
};

/**
 * Transactional admin catalog CRUD, soft-delete, and restore service.
 * Delegates every public write to `ContentService.applyContentMutation()` (ADM-02, BE-05).
 */
@Injectable()
export class AdminContentService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: BackendDatabase,
    private readonly contentService: ContentService,
  ) {}

  getContentVersion(): number {
    return this.contentService.getCurrentVersion();
  }

  listVerses(status: ContentStatusFilter = 'active'): VerseDto[] {
    const cond = statusCondition(verses.deletedAt, status);
    const rows = cond
      ? this.db.select().from(verses).where(cond).all()
      : this.db.select().from(verses).all();
    return rows.sort(compareContentOrder).map(mapVerseRow);
  }

  listNamesOfGod(status: ContentStatusFilter = 'active'): NameOfGodDto[] {
    const cond = statusCondition(namesOfGod.deletedAt, status);
    const rows = cond
      ? this.db.select().from(namesOfGod).where(cond).all()
      : this.db.select().from(namesOfGod).all();
    return rows.sort(compareContentOrder).map(mapNameOfGodRow);
  }

  listBlessings(status: ContentStatusFilter = 'active'): BlessingDto[] {
    const cond = statusCondition(blessings.deletedAt, status);
    const rows = cond
      ? this.db.select().from(blessings).where(cond).all()
      : this.db.select().from(blessings).all();
    return rows.sort(compareContentOrder).map(mapBlessingRow);
  }

  createVerse(actorEmail: string, input: CreateVersePayload): VerseDto {
    const nowMs = Date.now();
    const id = uuidv7(nowMs, randomBytes);
    const ref = input.ref.trim();
    const textFemale = normalizeOptionalText(input.textFemale);

    const { result } = this.contentService.applyContentMutation<VerseDto>({
      actorEmail,
      action: 'create_verse',
      entityType: 'verse',
      entityId: id,
      nowMs,
      summarize: (item) => ({ ref: item.ref }),
      mutate: ({ db, nextVersion }) => {
        db.insert(verses)
          .values({
            id,
            ref,
            text: input.text,
            textFemale,
            version: nextVersion,
            sortOrder: null,
            tagsJson: null,
            createdAt: nowMs,
            updatedAt: nowMs,
            deletedAt: null,
          })
          .run();

        const created = db.select().from(verses).where(eq(verses.id, id)).get();
        if (!created) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        return mapVerseRow(created);
      },
    });

    return result;
  }

  updateVerse(
    actorEmail: string,
    id: string,
    input: CreateVersePayload,
    expectedVersion?: number | null,
  ): VerseDto {
    const ref = input.ref.trim();
    const textFemale = normalizeOptionalText(input.textFemale);
    let before: Record<string, unknown> | undefined;

    const { result } = this.contentService.applyContentMutation<VerseDto>({
      actorEmail,
      action: 'update_verse',
      entityType: 'verse',
      entityId: id,
      summarize: (item) => ({ ref: item.ref, before, after: auditSnapshot(item) }),
      mutate: ({ db, nextVersion, nowMs }) => {
        const existing = db.select().from(verses).where(eq(verses.id, id)).get();
        if (!existing) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        assertEditable(existing, expectedVersion);
        before = auditSnapshot(existing);

        db.update(verses)
          .set({
            ref,
            text: input.text,
            textFemale,
            version: nextVersion,
            updatedAt: nowMs,
          })
          .where(eq(verses.id, id))
          .run();

        const updated = db.select().from(verses).where(eq(verses.id, id)).get();
        if (!updated) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        return mapVerseRow(updated);
      },
    });

    return result;
  }

  createNameOfGod(actorEmail: string, input: CreateNameOfGodPayload): NameOfGodDto {
    const nowMs = Date.now();
    const id = uuidv7(nowMs, randomBytes);
    const title = input.title.trim();

    const { result } = this.contentService.applyContentMutation<NameOfGodDto>({
      actorEmail,
      action: 'create_name_of_god',
      entityType: 'name_of_god',
      entityId: id,
      nowMs,
      summarize: (item) => ({ title: item.title }),
      mutate: ({ db, nextVersion }) => {
        db.insert(namesOfGod)
          .values({
            id,
            title,
            text: input.text,
            version: nextVersion,
            sortOrder: null,
            tagsJson: null,
            createdAt: nowMs,
            updatedAt: nowMs,
            deletedAt: null,
          })
          .run();

        const created = db.select().from(namesOfGod).where(eq(namesOfGod.id, id)).get();
        if (!created) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        return mapNameOfGodRow(created);
      },
    });

    return result;
  }

  updateNameOfGod(
    actorEmail: string,
    id: string,
    input: CreateNameOfGodPayload,
    expectedVersion?: number | null,
  ): NameOfGodDto {
    const title = input.title.trim();
    let before: Record<string, unknown> | undefined;

    const { result } = this.contentService.applyContentMutation<NameOfGodDto>({
      actorEmail,
      action: 'update_name_of_god',
      entityType: 'name_of_god',
      entityId: id,
      summarize: (item) => ({ title: item.title, before, after: auditSnapshot(item) }),
      mutate: ({ db, nextVersion, nowMs }) => {
        const existing = db.select().from(namesOfGod).where(eq(namesOfGod.id, id)).get();
        if (!existing) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        assertEditable(existing, expectedVersion);
        before = auditSnapshot(existing);

        db.update(namesOfGod)
          .set({
            title,
            text: input.text,
            version: nextVersion,
            updatedAt: nowMs,
          })
          .where(eq(namesOfGod.id, id))
          .run();

        const updated = db.select().from(namesOfGod).where(eq(namesOfGod.id, id)).get();
        if (!updated) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        return mapNameOfGodRow(updated);
      },
    });

    return result;
  }

  createBlessing(actorEmail: string, input: CreateBlessingPayload): BlessingDto {
    const nowMs = Date.now();
    const id = uuidv7(nowMs, randomBytes);
    const title = input.title.trim();
    const verseRef = normalizeOptionalVerseRef(input.verseRef);

    const { result } = this.contentService.applyContentMutation<BlessingDto>({
      actorEmail,
      action: 'create_blessing',
      entityType: 'blessing',
      entityId: id,
      nowMs,
      summarize: (item) => ({ title: item.title, verseRef: item.verseRef ?? null }),
      mutate: ({ db, nextVersion }) => {
        db.insert(blessings)
          .values({
            id,
            title,
            verseRef,
            text: input.text,
            version: nextVersion,
            sortOrder: null,
            tagsJson: null,
            createdAt: nowMs,
            updatedAt: nowMs,
            deletedAt: null,
          })
          .run();

        const created = db.select().from(blessings).where(eq(blessings.id, id)).get();
        if (!created) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        return mapBlessingRow(created);
      },
    });

    return result;
  }

  updateBlessing(
    actorEmail: string,
    id: string,
    input: CreateBlessingPayload,
    expectedVersion?: number | null,
  ): BlessingDto {
    const title = input.title.trim();
    const verseRef = normalizeOptionalVerseRef(input.verseRef);
    let before: Record<string, unknown> | undefined;

    const { result } = this.contentService.applyContentMutation<BlessingDto>({
      actorEmail,
      action: 'update_blessing',
      entityType: 'blessing',
      entityId: id,
      summarize: (item) => ({
        title: item.title,
        verseRef: item.verseRef ?? null,
        before,
        after: auditSnapshot(item),
      }),
      mutate: ({ db, nextVersion, nowMs }) => {
        const existing = db.select().from(blessings).where(eq(blessings.id, id)).get();
        if (!existing) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        assertEditable(existing, expectedVersion);
        before = auditSnapshot(existing);

        db.update(blessings)
          .set({
            title,
            verseRef,
            text: input.text,
            version: nextVersion,
            updatedAt: nowMs,
          })
          .where(eq(blessings.id, id))
          .run();

        const updated = db.select().from(blessings).where(eq(blessings.id, id)).get();
        if (!updated) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        return mapBlessingRow(updated);
      },
    });

    return result;
  }

  softDeleteContent(actorEmail: string, kind: ContentKind, id: string): boolean {
    return this.mutateDeletedState(actorEmail, kind, id, true);
  }

  restoreContent(actorEmail: string, kind: ContentKind, id: string): boolean {
    return this.mutateDeletedState(actorEmail, kind, id, false);
  }

  private mutateDeletedState(
    actorEmail: string,
    kind: ContentKind,
    id: string,
    shouldDelete: boolean,
  ): boolean {
    const accessor = CONTENT_DELETE_ACCESSORS[kind];
    const { result } = this.contentService.applyContentMutation({
      actorEmail,
      action: shouldDelete ? 'soft_delete' : 'restore',
      entityType: kind,
      entityId: id,
      summarize: () => ({ kind, id }),
      mutate: ({ db, nextVersion, nowMs }) => {
        const existing = accessor.findById(db, id);
        if (!existing) {
          throw new NotFoundException('CONTENT_ITEM_NOT_FOUND');
        }
        if (shouldDelete && existing.deletedAt !== null) {
          throw new BadRequestException('CONTENT_ALREADY_DELETED');
        }
        if (!shouldDelete && existing.deletedAt === null) {
          throw new BadRequestException('CONTENT_NOT_DELETED');
        }

        accessor.setDeletedAt(
          db,
          id,
          shouldDelete ? nowMs : null,
          nowMs,
          nextVersion,
        );
        return true;
      },
    });

    return result;
  }
}
