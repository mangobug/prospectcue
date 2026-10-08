import { z } from 'zod';
import { api, jsonBody } from '@/lib/api';
import { workspaceContext, ApiError } from '@/lib/context';
import { prospectSchema } from '@/lib/validation';
type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) {
  return api(request, async () => {
    const id = z.uuid().parse((await params).id);
    const { client, workspace } = await workspaceContext(true);
    const input = prospectSchema.parse(await jsonBody(request));
    const { data, error } = await client
      .from('prospects')
      .update(input)
      .eq('workspace_id', workspace.id)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new ApiError(400, 'Prospect could not be updated');
    if (!data) throw new ApiError(404, 'Prospect not found');
    return data;
  });
}
export async function DELETE(request: Request, { params }: Params) {
  return api(request, async () => {
    const id = z.uuid().parse((await params).id);
    const { client, workspace } = await workspaceContext(true);
    const { data, error } = await client
      .from('prospects')
      .delete()
      .eq('workspace_id', workspace.id)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new ApiError(400, 'Prospect could not be deleted');
    if (!data) throw new ApiError(404, 'Prospect not found');
    return { deleted: true };
  });
}
