import { z } from 'zod';
import { api, jsonBody } from '@/lib/api';
import { workspaceContext, ApiError } from '@/lib/context';
import { duplicateKey, prospectSchema } from '@/lib/validation';
export async function POST(request: Request) {
  return api(request, async () => {
    const { client, user, workspace } = await workspaceContext(true);
    const input = z
      .object({
        prospect: prospectSchema,
        allowDuplicate: z.boolean().default(false),
      })
      .parse(await jsonBody(request));
    const { data: candidates, error: de } = await client.rpc(
      'duplicate_candidates',
      { w: workspace.id, keys: [duplicateKey(input.prospect)] },
    );
    if (de) throw new ApiError(503, 'Duplicate check failed');
    if (candidates?.length && !input.allowDuplicate)
      throw new ApiError(
        409,
        'A prospect with the same business name and location exists. Confirm to create another record.',
      );
    const { data, error } = await client
      .from('prospects')
      .insert({
        ...input.prospect,
        workspace_id: workspace.id,
        created_by: user.id,
        source_type: 'manual',
        verified_at:
          input.prospect.verification_status === 'user_verified'
            ? new Date().toISOString()
            : null,
      })
      .select('id')
      .single();
    if (error) throw new ApiError(400, 'Prospect could not be saved');
    return data;
  });
}
