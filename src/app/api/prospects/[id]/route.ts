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
    const audits = await client
      .from('audit_runs')
      .select('id,status,created_at,has_screenshot')
      .eq('workspace_id', workspace.id)
      .eq('prospect_id', id);
    if (audits.error)
      throw new ApiError(
        503,
        'Audit history unavailable; prospect was not deleted',
      );
    if (
      audits.data.some(
        (a) =>
          ['queued', 'running'].includes(a.status) &&
          Date.now() - Date.parse(a.created_at) < 20 * 60 * 1000,
      )
    )
      throw new ApiError(
        409,
        'Wait for the website audit to finish before deleting this prospect.',
      );
    // Remove through the Storage API while the parent run still authorizes access.
    // Runs with failed uploads may also have an object, so include all run paths.
    for (let offset = 0; offset < audits.data.length; offset += 100) {
      const paths = audits.data
        .slice(offset, offset + 100)
        .map((a) => `${workspace.id}/${a.id}/mobile.png`);
      const removed = await client.storage.from('audit-evidence').remove(paths);
      if (removed.error)
        throw new ApiError(
          503,
          'Audit screenshots could not be removed; prospect was not deleted',
        );
    }
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
