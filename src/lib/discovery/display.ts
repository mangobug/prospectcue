import 'server-only';
import { cache } from 'react';
import { googleDetails, googleKey } from './google';
import type { DiscoveryListing } from './types';

// React cache deduplicates within this render only. No listing content is persisted.
export const liveGoogleListing = cache(
  async (id: string): Promise<DiscoveryListing | null> => {
    if (!googleKey()) return null;
    try {
      return await googleDetails(id);
    } catch {
      return null;
    }
  },
);
export async function listingNames<
  T extends { id: string; source_type?: string; discovery_id?: string | null },
>(rows: T[]) {
  const names = new Map<string, DiscoveryListing>();
  const candidates = rows
    .filter((p) => p.source_type === 'google_places' && p.discovery_id)
    .slice(0, 20);
  for (let offset = 0; offset < candidates.length; offset += 5) {
    await Promise.all(
      candidates.slice(offset, offset + 5).map(async (p) => {
        const result = await liveGoogleListing(p.discovery_id!);
        if (result) names.set(p.id, result);
      }),
    );
  }
  return names;
}
