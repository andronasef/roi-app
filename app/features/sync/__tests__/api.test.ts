import { describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../../../constants/app';
import {
  CONTENT_STAGES,
  DELTA_SYNC_THROTTLE_MS,
  STAGING_DIR_NAME,
  STAGING_MANIFEST_FILE,
} from '../../../constants/sync';
import { createSyncApiClient } from '../api';

const NOW = 1_732_483_200_000;

describe('sync constants and API client', () => {
  it('exports sync stage order, 6-hour throttle, staging names, and API_BASE_URL', () => {
    expect(CONTENT_STAGES).toEqual(['verses', 'names_of_god', 'blessings']);
    expect(DELTA_SYNC_THROTTLE_MS).toBe(6 * 60 * 60 * 1000);
    expect(STAGING_DIR_NAME).toBe('content-staging');
    expect(STAGING_MANIFEST_FILE).toBe('manifest.json');
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.endsWith('/')).toBe(false);
  });

  it('fetches snapshot without manual Accept-Encoding header and validates against @roi/shared schema', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'verses',
          contentVersion: 3,
          generatedAt: NOW,
          items: [
            {
              id: 'ps23-1',
              ref: 'مزمور ٢٣: ١',
              text: 'الرب راعي فلا يعوزني شيء.',
              textFemale: null,
              version: 3,
              sortOrder: 1,
              tags: ['ثقة'],
              createdAt: NOW,
              updatedAt: NOW,
              deletedAt: null,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = createSyncApiClient('https://api.roi.example/', fetchMock);
    const envelope = await client.fetchSnapshot('verses');

    expect(envelope.type).toBe('verses');
    expect(envelope.contentVersion).toBe(3);
    expect(envelope.items).toHaveLength(1);
    expect(envelope.items[0]?.id).toBe('ps23-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.roi.example/snapshots/verses');
    const headers = new Headers(init?.headers);
    expect(headers.has('accept-encoding')).toBe(false);
  });

  it('rejects snapshot responses that fail @roi/shared schema validation', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'verses',
          contentVersion: 1,
          generatedAt: NOW,
          items: [
            {
              id: 'bad-token',
              ref: 'مزمور ١',
              text: 'نص به رمز خاطئ {name}',
              textFemale: null,
              version: 1,
              createdAt: NOW,
              updatedAt: NOW,
              deletedAt: null,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = createSyncApiClient('https://api.roi.example', fetchMock);
    await expect(client.fetchSnapshot('verses')).rejects.toThrow();
  });

  it('queries contentDelta via GraphQL and validates response including tombstones', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            contentDelta: {
              contentVersion: 5,
              verses: [
                {
                  id: 'ps23-1',
                  ref: 'مزمور ٢٣: ١',
                  text: 'الرب راعي فلا يعوزني شيء.',
                  textFemale: null,
                  version: 5,
                  sortOrder: 1,
                  tags: null,
                  createdAt: NOW,
                  updatedAt: NOW + 5000,
                  deletedAt: NOW + 5000,
                },
              ],
              namesOfGod: [],
              blessings: [],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = createSyncApiClient('https://api.roi.example', fetchMock);
    const delta = await client.fetchContentDelta(3);

    expect(delta.contentVersion).toBe(5);
    expect(delta.verses).toHaveLength(1);
    expect(delta.verses[0]?.deletedAt).toBe(NOW + 5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.roi.example/graphql');
    const headers = new Headers(init?.headers);
    expect(headers.has('accept-encoding')).toBe(false);
  });
});
