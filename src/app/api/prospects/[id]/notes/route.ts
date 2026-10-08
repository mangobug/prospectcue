import { z } from 'zod';
import { api, jsonBody } from '@/lib/api';
import { workspaceContext, ApiError } from '@/lib/context';
import { noteSchema } from '@/lib/validation';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(request, async () => {
    const id = z.uuid().parse((await params).id);
    const { client, user, workspace } = await workspaceContext(true);
    const input = noteSchema.parse(await jsonBody(request));
    const { data: p } = await client
      .from('prospects')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('id', id)
      .maybeSingle();
    if (!p) throw new ApiError(404, 'Prospect not found');
    const { error } = await client
      .from('prospect_activities')
      .insert({
        workspace_id: workspace.id,
        prospect_id: id,
        type: 'note',
        note: input.note,
        created_by: user.id,
      });
    if (error) throw new ApiError(400, 'Note could not be saved');
    return { saved: true };
  });
}
