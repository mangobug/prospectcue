import { z } from 'zod';

export const discoveryQuery = z
  .object({
    provider: z.enum(['overture', 'google_places']),
    category: z.string().trim().min(2).max(100),
    location: z.string().trim().min(2).max(150),
    page: z.number().int().min(1).max(500).default(1),
    pageToken: z.string().max(4096).optional(),
  })
  .strict();
export type DiscoveryQuery = z.output<typeof discoveryQuery>;
export type Attribution = { name: string; url?: string };
export type DiscoveryListing = {
  id: string;
  name: string;
  address: string;
  website: string | null;
  phone: string | null;
  category: string;
  attributions: Attribution[];
  mapsUrl?: string;
  selectionToken?: string;
  release?: string;
};
export type DiscoveryResponse = {
  provider: DiscoveryQuery['provider'];
  results: DiscoveryListing[];
  signedIn: boolean;
  hasMore: boolean;
  page: number;
  nextPageToken?: string;
};
export const discoverySelection = z
  .object({
    provider: z.enum(['overture', 'google_places']),
    category: z.string().trim().max(100).default(''),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(255),
            selectionToken: z.string().max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export function publicWebsite(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}
