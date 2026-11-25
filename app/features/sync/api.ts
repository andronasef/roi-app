import {
  blessingItemSchema,
  contentDeltaResponseSchema,
  createSnapshotEnvelopeSchema,
  nameOfGodItemSchema,
  submitSuggestionInputSchema,
  verseItemSchema,
  type ContentDeltaResponse,
  type SnapshotEnvelope,
  type SnapshotType,
  type SubmitSuggestionInput,
} from '@roi/shared';
import { ClientError, GraphQLClient } from 'graphql-request';
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

const suggestionReceiptSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  createdAt: z.number(),
  remainingToday: z.number().int().nonnegative(),
});

export type SuggestionReceipt = z.infer<typeof suggestionReceiptSchema>;

export type SuggestionSubmitErrorCode =
  | 'unauthenticated'
  | 'daily_limit'
  | 'rate_limited'
  | 'validation'
  | 'network';

/** Typed error for submitSuggestion GraphQL and validation failures. */
export class SuggestionSubmitError extends Error {
  readonly code: SuggestionSubmitErrorCode;

  constructor(code: SuggestionSubmitErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SuggestionSubmitError';
    this.code = code;
  }
}

function mapSuggestionError(error: unknown): SuggestionSubmitError {
  if (error instanceof SuggestionSubmitError) {
    return error;
  }

  if (error instanceof ClientError) {
    const status = error.response.status;
    const errors = error.response.errors ?? [];
    const firstMessage = errors[0]?.message ?? error.message;
    const codes = errors
      .map((entry) =>
        typeof entry.extensions?.code === 'string' ? entry.extensions.code : '',
      )
      .filter(Boolean);

    if (
      status === 401 ||
      codes.includes('UNAUTHENTICATED') ||
      firstMessage.includes('UNAUTHENTICATED') ||
      firstMessage.includes('GOOGLE_TOKEN_REQUIRED')
    ) {
      return new SuggestionSubmitError('unauthenticated', firstMessage);
    }

    if (
      status === 429 ||
      codes.includes('TOO_MANY_REQUESTS') ||
      firstMessage.includes('DAILY_SUGGESTION_LIMIT_REACHED') ||
      firstMessage.includes('ThrottlerException')
    ) {
      if (firstMessage.includes('DAILY_SUGGESTION_LIMIT_REACHED')) {
        return new SuggestionSubmitError('daily_limit', firstMessage);
      }
      return new SuggestionSubmitError('rate_limited', firstMessage);
    }

    if (
      status === 400 ||
      codes.includes('BAD_USER_INPUT') ||
      codes.includes('BAD_REQUEST')
    ) {
      return new SuggestionSubmitError('validation', firstMessage);
    }
  }

  const message = error instanceof Error ? error.message : 'Network error';
  return new SuggestionSubmitError('network', message);
}

/** Public sync API client interface for snapshot downloads, GraphQL delta queries, and suggestions. */
export interface SyncApiClient {
  fetchSnapshot<T extends SnapshotType>(
    type: T,
    signal?: AbortSignal,
  ): Promise<SnapshotEnvelopeByType[T]>;
  fetchContentDelta(
    sinceVersion: number,
    signal?: AbortSignal,
  ): Promise<ContentDeltaResponse>;
  submitSuggestion(
    input: SubmitSuggestionInput,
    idToken: string,
    signal?: AbortSignal,
  ): Promise<SuggestionReceipt>;
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

    async submitSuggestion(
      input: SubmitSuggestionInput,
      idToken: string,
      signal?: AbortSignal,
    ): Promise<SuggestionReceipt> {
      const parsedInput = submitSuggestionInputSchema.safeParse(input);
      if (!parsedInput.success) {
        throw new SuggestionSubmitError(
          'validation',
          parsedInput.error.issues[0]?.message ?? 'Invalid suggestion input',
        );
      }

      const trimmedToken = idToken.trim();
      if (!trimmedToken) {
        throw new SuggestionSubmitError(
          'unauthenticated',
          'Missing Google ID token',
        );
      }

      const { signal: requestSignal, cleanup } = createTimeoutSignal(
        SYNC_REQUEST_TIMEOUT_MS,
        signal,
      );
      try {
        const result = await graphqlClient.request<
          { submitSuggestion: unknown },
          { input: SubmitSuggestionInput }
        >({
          document: SUBMIT_SUGGESTION_MUTATION,
          variables: { input: parsedInput.data },
          requestHeaders: {
            Authorization: `Bearer ${trimmedToken}`,
          },
          signal: requestSignal,
        });
        return suggestionReceiptSchema.parse(result.submitSuggestion);
      } catch (error) {
        throw mapSuggestionError(error);
      } finally {
        cleanup();
      }
    },
  };
}
