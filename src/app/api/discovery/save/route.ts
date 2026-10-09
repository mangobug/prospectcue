import { api, jsonBody } from '@/lib/api';
import { ApiError, workspaceContext } from '@/lib/context';
import { discoverySelection } from '@/lib/discovery/types';
import { googleKey } from '@/lib/discovery/google';
import { verifyGoogleReceipt } from '@/lib/discovery/receipts';

export async function POST(request: Request) {
  return api(request, async () => {
    const { client, workspace } = await workspaceContext(true);
    const input = discoverySelection.parse(await jsonBody(request, 16 * 1024));
    if (
      input.provider === 'google_places' &&
      input.items.some(
        (item) =>
          !googleKey() ||
          !item.selectionToken ||
          !verifyGoogleReceipt(item.id, item.selectionToken, googleKey()),
      )
    ) {
      throw new ApiError(
        400,
        'Search again before saving these Google listings.',
      );
    }
    const { data, error } = await client.rpc('save_discovery_prospects', {
      w: workspace.id,
      provider: input.provider,
      ids: input.items.map((i) => i.id),
      category: input.category,
    });
    if (error)
      throw new ApiError(
        400,
        'The selection could not be saved. Search again and retry.',
      );
    return { results: data };
  });
}
