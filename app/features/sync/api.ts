import {
  blessingItemSchema,
  contentDeltaResponseSchema,
  createSnapshotEnvelopeSchema,
  nameOfGodItemSchema,
  verseItemSchema,
  type ContentDeltaResponse,
  type SnapshotEnvelope,
  type SnapshotType,
} from '@roi/shared';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { API_BASE_URL } from '../../constants/app';
import { SYNC_REQUEST_TIMEOUT_MS } from '../../constants/sync';

export type VersesSnapshotEnvelope = Extract<
  SnapshotEnvelope,
  { type: 'verses' }
>;
export type NamesOfGodSnapshotEnvelope = Extract<
  SnapshotEnvelope,
  { type: 'names_of_god' }
>;
export type BlessingsSnapshotEnvelope = Extract<
  SnapshotEnvelope,
  { type: 'blessings' }
>;

export type SnapshotEnvelopeByType = {
  verses: VersesSnapshotEnvelope;
  names_of_god: NamesOfGodSnapshotEnvelope;
  blessings: BlessingsSnapshotEnvelope;
};

const snapshotEnvelopeSchemas = {
  verses: createSnapshotEnvelopeSchema(verseItemSchema).extend({
    type: z.literal('verses'),
  }),
  names_of_god: createSnapshotEnvelopeSchema(nameOfGodItemSchema).extend({
    type: z.literal('names_of_god'),
  }),
  blessings: createSnapshotEnvelopeSchema(blessingItemSchema).extend({
    type: z.literal('blessings'),
  }),
} as const;

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
        sortOrder
        tags
        createdAt
        updatedAt
        deletedAt
      }
      namesOfGod {
        id
        title
        text
        version
        sortOrder
        tags
        createdAt
        updatedAt
        deletedAt
      }
      blessings {
        id
        title
        verseRef
        text
        version
        sortOrder
        tags
        createdAt
        updatedAt
        deletedAt
      }
    }
  }
`;

/** Public sync API client interface for snapshot downloads and GraphQL delta queries. */
export interface SyncApiClient {
  fetchSnapshot<T extends SnapshotType>(
    type: T,
    signal?: AbortSignal,
  ): Promise<SnapshotEnvelopeByType[T]>;
  fetchContentDelta(
    sinceVersion: number,
    signal?: AbortSignal,
  ): Promise<ContentDeltaResponse>;
}

function createTimeoutSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    controller.abort(new Error(`Sync request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

/**
 * Create the mobile sync client for public snapshot REST endpoints and GraphQL delta sync.
 * Intentionally omits any manual Accept-Encoding header so Android OkHttp handles gzip transparently.
 */
export function createSyncApiClient(
  baseUrl = API_BASE_URL,
  fetchImpl: typeof fetch = fetch,
): SyncApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const graphqlClient = new GraphQLClient(`${normalizedBaseUrl}/graphql`, {
    fetch: fetchImpl,
  });

  return {
    async fetchSnapshot<T extends SnapshotType>(
      type: T,
      signal?: AbortSignal,
    ): Promise<SnapshotEnvelopeByType[T]> {
      const { signal: requestSignal, cleanup } = createTimeoutSignal(
        SYNC_REQUEST_TIMEOUT_MS,
        signal,
      );
      try {
        const response = await fetchImpl(
          `${normalizedBaseUrl}/snapshots/${type}`,
          {
            method: 'GET',
            signal: requestSignal,
          },
        );
        if (!response.ok) {
          throw new Error(
            `Snapshot fetch failed for ${type}: HTTP ${response.status}`,
          );
        }
        const rawJson: unknown = await response.json();
        return snapshotEnvelopeSchemas[type].parse(
          rawJson,
        ) as SnapshotEnvelopeByType[T];
      } finally {
        cleanup();
      }
    },

    async fetchContentDelta(
      sinceVersion: number,
      signal?: AbortSignal,
    ): Promise<ContentDeltaResponse> {
      const { signal: requestSignal, cleanup } = createTimeoutSignal(
        SYNC_REQUEST_TIMEOUT_MS,
        signal,
      );
      try {
        const result = await graphqlClient.request<
          { contentDelta: unknown },
          { sinceVersion: number }
        >({
          document: CONTENT_DELTA_QUERY,
          variables: { sinceVersion },
          signal: requestSignal,
        });
        return contentDeltaResponseSchema.parse(result.contentDelta);
      } finally {
        cleanup();
      }
    },
  };
}
