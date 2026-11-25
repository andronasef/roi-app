import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContentKind } from '@roi/shared';
import { CONTENT_VERSION_KEY } from '@/components/layout/AdminShell';
import { AdminApiError, executeAdminGraphQL } from '@/lib/graphql';
import type { ContentPayload } from '@/pages/ItemEditorPage';

export type CatalogStatus = 'active' | 'deleted' | 'all';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

/** Everything the catalog needs from a verse / name of God / blessing, with ref|title unified as `label`. */
export interface CatalogItem {
  id: string;
  label: string;
  verseRef: string | null;
  text: string;
  textFemale: string | null;
  version: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface AdminSuggestion {
  id: string;
  kind: ContentKind;
  title: string;
  text: string;
  textFemale: string | null;
  verseRef: string | null;
  status: SuggestionStatus;
  moderationNote: string | null;
  email: string;
  createdAt: number;
  updatedAt: number;
  submitterStats: { pendingCount: number; acceptedCount: number; rejectedCount: number };
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  contentVersion: number;
  summaryJson: string;
  createdAt: number;
}

/** One table drives every per-kind document so verses / names / blessings cannot drift apart. */
export const KIND_CONFIG = {
  verse: {
    route: 'verses',
    list: 'adminVerses',
    create: 'createVerse',
    update: 'updateVerse',
    input: 'ref',
    fields: 'id ref text textFemale version updatedAt deletedAt',
  },
  name_of_god: {
    route: 'names',
    list: 'adminNamesOfGod',
    create: 'createNameOfGod',
    update: 'updateNameOfGod',
    input: 'title',
    fields: 'id title text textFemale version updatedAt deletedAt',
  },
  blessing: {
    route: 'blessings',
    list: 'adminBlessings',
    create: 'createBlessing',
    update: 'updateBlessing',
    input: 'title',
    fields: 'id title verseRef text textFemale version updatedAt deletedAt',
  },
} as const satisfies Record<ContentKind, object>;

export const KIND_BY_ROUTE: Record<string, ContentKind> = {
  verses: 'verse',
  names: 'name_of_god',
  blessings: 'blessing',
};

const SUGGESTION_FIELDS = `id kind title text textFemale verseRef status moderationNote email createdAt updatedAt
  submitterStats { pendingCount acceptedCount rejectedCount }`;

const catalogKey = (kind: ContentKind, status: CatalogStatus) => ['adminCatalog', kind, status] as const;
const SUGGESTIONS_KEY = ['adminSuggestions'] as const;
const AUDIT_KEY = ['adminAuditLogs'] as const;

type RawItem = Record<string, unknown> & { id: string; text: string; version: number; updatedAt: number };

function toCatalogItem(kind: ContentKind, raw: RawItem): CatalogItem {
  return {
    id: raw.id,
    label: String(raw[KIND_CONFIG[kind].input === 'ref' ? 'ref' : 'title'] ?? ''),
    verseRef: (raw.verseRef as string | null | undefined) ?? null,
    text: raw.text,
    textFemale: (raw.textFemale as string | null | undefined) ?? null,
    version: raw.version,
    updatedAt: raw.updatedAt,
    deletedAt: (raw.deletedAt as number | null | undefined) ?? null,
  };
}

export function useAdminCatalog(kind: ContentKind, status: CatalogStatus = 'all') {
  const { list, fields } = KIND_CONFIG[kind];
  return useQuery({
    queryKey: catalogKey(kind, status),
    queryFn: async () => {
      const data = await executeAdminGraphQL<Record<string, RawItem[]>>(
        `query AdminCatalog($status: String) { ${list}(status: $status) { ${fields} } }`,
        { status },
      );
      return (data[list] ?? []).map((raw) => toCatalogItem(kind, raw));
    },
  });
}

export function useAdminContentVersion() {
  return useQuery({
    queryKey: CONTENT_VERSION_KEY,
    queryFn: () => executeAdminGraphQL<{ adminContentVersion: number }>('query { adminContentVersion }'),
  });
}

/** Content writes bump contentVersion, add audit rows and can change the pending queue. */
function useInvalidateAfterWrite() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [['adminCatalog'], CONTENT_VERSION_KEY, SUGGESTIONS_KEY, AUDIT_KEY].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

/** Maps the editor payload to the per-kind GraphQL input (verse uses `ref`, others `title`). */
function toContentInput(kind: ContentKind, p: ContentPayload) {
  return {
    [KIND_CONFIG[kind].input]: p.refOrTitle,
    ...(kind === 'blessing' ? { verseRef: p.verseRef } : {}),
    text: p.text,
    textFemale: p.textFemale,
  };
}

export function useSaveContent(kind: ContentKind) {
  const invalidate = useInvalidateAfterWrite();
  const { create, update } = KIND_CONFIG[kind];
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ContentPayload }) => {
      const input = toContentInput(kind, payload);
      const type = `${(id ? update : create).replace(/^./, (c) => c.toUpperCase())}Input`;
      return id
        ? executeAdminGraphQL(`mutation Save($id: ID!, $input: ${type}!) { ${update}(id: $id, input: $input) { id } }`, { id, input })
        : executeAdminGraphQL(`mutation Save($input: ${type}!) { ${create}(input: $input) { id } }`, { input });
    },
    onSuccess: invalidate,
  });
}

export function useSoftDelete() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (v: { kind: ContentKind; id: string }) =>
      executeAdminGraphQL('mutation SoftDelete($kind: String!, $id: ID!) { softDeleteContent(kind: $kind, id: $id) }', v),
    onSuccess: invalidate,
  });
}

export function useRestore() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (v: { kind: ContentKind; id: string }) =>
      executeAdminGraphQL('mutation Restore($kind: String!, $id: ID!) { restoreContent(kind: $kind, id: $id) }', v),
    onSuccess: invalidate,
  });
}

export function useAdminAuditLogs(filters: { action: string | null; entityType: string | null }) {
  return useQuery({
    queryKey: [...AUDIT_KEY, filters] as const,
    // ponytail: newest 200 only (backend max page); add offset paging when the log outgrows it.
    queryFn: async () =>
      (
        await executeAdminGraphQL<{ adminAuditLogs: AuditLogEntry[] }>(
          `query AdminAuditLogs($action: String, $entityType: String) {
            adminAuditLogs(action: $action, entityType: $entityType, limit: 200) {
              id actorEmail action entityType entityId contentVersion summaryJson createdAt
            }
          }`,
          filters,
        )
      ).adminAuditLogs,
  });
}

export function useAdminSuggestions(status: SuggestionStatus) {
  return useQuery({
    queryKey: [...SUGGESTIONS_KEY, 'list', status] as const,
    queryFn: async () =>
      (
        await executeAdminGraphQL<{ adminSuggestions: AdminSuggestion[] }>(
          `query AdminSuggestionList($status: String) { adminSuggestions(status: $status) { ${SUGGESTION_FIELDS} } }`,
          { status },
        )
      ).adminSuggestions,
  });
}

export function useAdminSuggestion(id: string | undefined) {
  return useQuery({
    queryKey: [...SUGGESTIONS_KEY, 'one', id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await executeAdminGraphQL<{ adminSuggestion: AdminSuggestion }>(
          `query AdminSuggestionOne($id: ID!) { adminSuggestion(id: $id) { ${SUGGESTION_FIELDS} } }`,
          { id },
        )
      ).adminSuggestion,
  });
}

export function useAcceptSuggestion() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ContentPayload }) =>
      executeAdminGraphQL(
        `mutation AcceptSuggestion($id: ID!, $input: AcceptSuggestionInput!) { acceptSuggestion(id: $id, input: $input) { id status } }`,
        {
          id,
          input: {
            kind: payload.kind,
            title: payload.refOrTitle,
            verseRef: payload.verseRef,
            text: payload.text,
            textFemale: payload.textFemale,
          },
        },
      ),
    onSuccess: invalidate,
  });
}

export function useRejectSuggestion() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string | null }) =>
      executeAdminGraphQL(
        'mutation RejectSuggestion($id: ID!, $note: String) { rejectSuggestion(id: $id, note: $note) { id status } }',
        { id, note },
      ),
    onSuccess: invalidate,
  });
}

/** Backend maps a lost moderation race to HTTP 409 / `CONFLICT` with SUGGESTION_ALREADY_MODERATED (D-11). */
export function isModerationConflict(error: unknown): boolean {
  return (
    error instanceof AdminApiError &&
    (error.code === 'CONFLICT' || error.status === 409 || error.message.includes('SUGGESTION_ALREADY_MODERATED'))
  );
}
