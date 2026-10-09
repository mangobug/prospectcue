import { api, jsonBody } from '@/lib/api';
import { ApiError } from '@/lib/context';
import { db } from '@/lib/supabase/server';
import {
  discoveryQuery,
  publicWebsite,
  type Attribution,
  type DiscoveryListing,
} from '@/lib/discovery/types';
import { searchGoogle } from '@/lib/discovery/google';
import { allowDiscoveryBurst } from '@/lib/discovery/rate-limit';

export async function POST(request: Request) {
  return api(request, async () => {
    const query = discoveryQuery.parse(await jsonBody(request, 16 * 1024));
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    const signedIn = !!user;
    if (!signedIn && (query.page !== 1 || query.pageToken))
      throw new ApiError(401, 'Sign in to browse more results.');
    const ip = process.env.VERCEL
      ? (request.headers.get('x-forwarded-for') || 'unknown')
          .split(',')[0]
          .trim()
      : 'local';
    if (!allowDiscoveryBurst(`${ip}:${user?.id || 'visitor'}`))
      throw new ApiError(
        429,
        'Too many rapid requests. Please wait a minute and try again.',
      );
    if (query.provider === 'google_places') {
      if (
        (query.page > 1 && !query.pageToken) ||
        (query.page === 1 && query.pageToken)
      )
        throw new ApiError(
          400,
          'Start a new Google search before paging through results.',
        );
      return {
        ...(await searchGoogle(query, signedIn)),
        provider: query.provider,
        signedIn,
        page: query.page,
      };
    }
    if (query.pageToken)
      throw new ApiError(400, 'Start a new Overture search.');
    const { data: state, error: statusError } = await client.rpc(
      'discovery_catalogue_status',
    );
    if (statusError)
      throw new ApiError(
        503,
        'Discovery is being prepared. Please try again later.',
      );
    const status = state as { count?: number };
    if (!status.count)
      throw new ApiError(
        503,
        'Overture Places is being connected. Please try Google Places or return later.',
      );
    const { data, error } = await client.rpc('search_discovery_places', {
      category: query.category,
      location: query.location,
      page: query.page,
    });
    if (error)
      throw new ApiError(
        503,
        'Business listings could not be loaded. Please try again.',
      );
    const limit = signedIn ? 20 : 5;
    const results: DiscoveryListing[] = (data || [])
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        name: p.business_name,
        address:
          p.address ||
          [p.city, p.province, p.country].filter(Boolean).join(', '),
        website: publicWebsite(p.website_url),
        phone: p.phone,
        category: p.industry,
        release: p.release,
        attributions: Array.isArray(p.attributions)
          ? (p.attributions
              .filter(
                (a): a is { name: string; url?: string } =>
                  !!a &&
                  typeof a === 'object' &&
                  'name' in a &&
                  typeof a.name === 'string',
              )
              .map((a) => ({
                name: a.name,
                ...(publicWebsite(a.url) ? { url: publicWebsite(a.url)! } : {}),
              })) as Attribution[])
          : [],
      }));
    return {
      provider: query.provider,
      results,
      signedIn,
      page: query.page,
      hasMore: signedIn && (data || []).length > 20,
    };
  });
}
