import 'server-only';
import { ApiError } from '@/lib/context';
import { googleReceipt } from './receipts';
import {
  publicWebsite,
  type DiscoveryListing,
  type DiscoveryQuery,
  type Attribution,
} from './types';

type GooglePlace = {
  businessStatus?: string;
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  attributions?: { provider?: string; providerUri?: string }[];
};
export function googleKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || '';
}
function fields(place: GooglePlace, receipt = false): DiscoveryListing {
  if (!place || typeof place !== 'object')
    throw new ApiError(502, 'The listing source returned an invalid response.');
  if (typeof place.id !== 'string' || !/^[A-Za-z0-9_-]{10,255}$/.test(place.id))
    throw new ApiError(502, 'The listing source returned an invalid response.');
  const attributions: Attribution[] = (
    Array.isArray(place.attributions) ? place.attributions : []
  )
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      name:
        typeof a.provider === 'string'
          ? a.provider.slice(0, 200)
          : 'Listing contributor',
      ...(publicWebsite(a.providerUri)
        ? { url: publicWebsite(a.providerUri)! }
        : {}),
    }));
  return {
    id: place.id,
    name:
      typeof place.displayName?.text === 'string'
        ? place.displayName.text.slice(0, 200)
        : 'Google place',
    address:
      typeof place.formattedAddress === 'string'
        ? place.formattedAddress.slice(0, 500)
        : '',
    website: publicWebsite(place.websiteUri),
    phone:
      typeof place.nationalPhoneNumber === 'string'
        ? place.nationalPhoneNumber.slice(0, 50)
        : null,
    category: '',
    attributions,
    mapsUrl:
      publicWebsite(place.googleMapsUri) ||
      `https://www.google.com/maps/search/?api=1&query=Place&query_place_id=${encodeURIComponent(place.id)}`,
    ...(receipt
      ? { selectionToken: googleReceipt(place.id, googleKey()) }
      : {}),
  };
}
async function googleRequest(
  path: string,
  mask: string,
  body?: object,
): Promise<unknown> {
  const key = googleKey();
  if (!key)
    throw new ApiError(
      503,
      'Google Places is not connected yet. Please choose Overture Places.',
    );
  let response: Response;
  try {
    response = await fetch(`https://places.googleapis.com/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': mask,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      503,
      'Google Places could not be reached. Please try again.',
    );
  }
  if (!response.ok) {
    if (response.status === 429)
      throw new ApiError(
        503,
        'Google Places is busy. Please try again shortly.',
      );
    if (response.status === 400)
      throw new ApiError(
        400,
        'Google could not complete this search. Start a new search or use a more specific location.',
      );
    throw new ApiError(
      503,
      'Google Places is temporarily unavailable. Please choose Overture Places.',
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ApiError(502, 'The listing source returned an invalid response.');
  }
}
export async function searchGoogle(query: DiscoveryQuery, signedIn: boolean) {
  const value = (await googleRequest(
    'places:searchText',
    'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.attributions,places.businessStatus,nextPageToken',
    {
      textQuery: `${query.category} in ${query.location}`,
      pageSize: signedIn ? 20 : 5,
      ...(query.pageToken ? { pageToken: query.pageToken } : {}),
    },
  )) as { places?: GooglePlace[]; nextPageToken?: string };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError(502, 'The listing source returned an invalid response.');
  if (value.places !== undefined && !Array.isArray(value.places))
    throw new ApiError(502, 'The listing source returned an invalid response.');
  const results = (value.places || [])
    .filter((p) => p && p.businessStatus !== 'CLOSED_PERMANENTLY')
    .slice(0, signedIn ? 20 : 5)
    .map((p) => fields(p, true));
  return {
    results,
    hasMore:
      signedIn &&
      typeof value.nextPageToken === 'string' &&
      !!value.nextPageToken,
    ...(signedIn && typeof value.nextPageToken === 'string'
      ? { nextPageToken: value.nextPageToken }
      : {}),
  };
}
export async function googleDetails(id: string) {
  if (!/^[A-Za-z0-9_-]{10,255}$/.test(id))
    throw new ApiError(400, 'Invalid Google Place ID.');
  return fields(
    (await googleRequest(
      `places/${encodeURIComponent(id)}`,
      'id,displayName,formattedAddress,websiteUri,nationalPhoneNumber,googleMapsUri,attributions',
    )) as GooglePlace,
  );
}
