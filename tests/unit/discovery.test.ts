import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoveryQuery,
  discoverySelection,
  publicWebsite,
} from '@/lib/discovery/types';
import { googleReceipt, verifyGoogleReceipt } from '@/lib/discovery/receipts';
vi.mock('server-only', () => ({}));
import { googleDetails, searchGoogle } from '@/lib/discovery/google';

const key = 'fixture-private-key-not-a-real-credential';
const id = 'ChIJ_fixture_business_123';
const query = {
  provider: 'google_places' as const,
  category: 'dentists',
  location: 'London, Ontario',
  page: 1,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('discovery validation and selection security', () => {
  it('rejects browser workspace IDs, excessive selections and invalid pages', () => {
    expect(
      discoveryQuery.safeParse({ ...query, workspace_id: 'forged' }).success,
    ).toBe(false);
    expect(discoveryQuery.safeParse({ ...query, page: 0 }).success).toBe(false);
    expect(
      discoverySelection.safeParse({
        provider: 'overture',
        items: Array.from({ length: 21 }, () => ({ id: 'abc' })),
      }).success,
    ).toBe(false);
    expect(
      discoverySelection.safeParse({
        provider: 'overture',
        items: [{ id: 'abc', business_name: 'forged' }],
      }).success,
    ).toBe(false);
  });
  it('allows only credential-free HTTP links', () => {
    for (const unsafe of [
      'javascript:alert(1)',
      'data:text/html,abc',
      'https://user:pass@example.com',
      '/relative',
      null,
    ])
      expect(publicWebsite(unsafe)).toBeNull();
    expect(publicWebsite('https://example.com')).toBe('https://example.com/');
  });
  it('rejects tampered, expired, mismatched and rotated-key receipts', () => {
    const now = 1791500000000,
      token = googleReceipt(id, key, now);
    expect(verifyGoogleReceipt(id, token, key, now + 100)).toBe(true);
    expect(verifyGoogleReceipt(id + 'x', token, key, now)).toBe(false);
    expect(verifyGoogleReceipt(id, token, 'other', now)).toBe(false);
    expect(verifyGoogleReceipt(id, token, key, now + 900001)).toBe(false);
    expect(verifyGoogleReceipt(id, token.replace(/.$/, 'z'), key, now)).toBe(
      false,
    );
    expect(verifyGoogleReceipt(id, token, key, now - 1)).toBe(false);
  });
});
describe('Google adapter transport fixtures (not live Google verification)', () => {
  it('requests five anonymous results with server headers and exposes no paging token or key', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', key);
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          places: Array.from({ length: 9 }, (_, i) => ({
            id: id + i,
            displayName: { text: 'Fixture clinic' },
            websiteUri: 'javascript:bad',
            attributions: [
              { provider: 'Contributor', providerUri: 'https://example.com' },
            ],
          })),
          nextPageToken: 'next-fixture',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await searchGoogle(query, false);
    expect(result.results).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result).not.toHaveProperty('nextPageToken');
    expect(JSON.stringify(result)).not.toContain(key);
    expect(result.results[0].website).toBeNull();
    expect(
      verifyGoogleReceipt(id + '0', result.results[0].selectionToken!, key),
    ).toBe(true);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(options.cache).toBe('no-store');
    expect(options.headers['X-Goog-Api-Key']).toBe(key);
    expect(JSON.parse(options.body).pageSize).toBe(5);
  });
  it('requests twenty for signed-in users and excludes explicitly closed businesses', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', key);
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            { id, displayName: { text: 'Fixture clinic' } },
            { id: id + 'closed', businessStatus: 'CLOSED_PERMANENTLY' },
          ],
          nextPageToken: 'fixture-next',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await searchGoogle(
      { ...query, page: 2, pageToken: 'fixture-current' },
      true,
    );
    expect(result.results).toHaveLength(1);
    expect(result.nextPageToken).toBe('fixture-next');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      pageSize: 20,
      pageToken: 'fixture-current',
    });
  });
  it('fetches details without a selection token or cache', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', key);
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id,
          displayName: { text: 'Fixture clinic' },
          websiteUri: 'https://example.com',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await googleDetails(id);
    expect(result).toMatchObject({
      id,
      website: 'https://example.com/',
    });
    expect(result.selectionToken).toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      `https://places.googleapis.com/v1/places/${id}`,
    );
    expect(fetch.mock.calls[0][1].cache).toBe('no-store');
  });
  it('fails honestly when the key is absent and never exposes provider error payloads', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(searchGoogle(query, false)).rejects.toThrow('not connected');
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv('GOOGLE_PLACES_API_KEY', key);
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ secret: key }), { status: 403 }),
    );
    await expect(searchGoogle(query, true)).rejects.toThrow(
      'temporarily unavailable',
    );
  });
  it('rejects malformed listings and response shapes', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', key);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const payload of [
      null,
      [],
      { places: 'bad' },
      { places: [{ id: 1234567890123 }] },
    ]) {
      fetch.mockResolvedValue(new Response(JSON.stringify(payload)));
      await expect(searchGoogle(query, false)).rejects.toThrow(
        'invalid response',
      );
    }
  });
});
