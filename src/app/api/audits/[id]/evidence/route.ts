import { z } from 'zod';
import { workspaceContext, ApiError } from '@/lib/context';
import { api } from '@/lib/api';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let response: Response | undefined;
  const errorResponse = await api(request, async () => {
    const id = z.uuid().parse((await params).id);
    const { client, workspace } = await workspaceContext(true);
    const run = await client
      .from('audit_runs')
      .select('id,has_screenshot')
      .eq('workspace_id', workspace.id)
      .eq('id', id)
      .maybeSingle();
    if (run.error) throw new ApiError(503, 'Audit evidence unavailable');
    if (!run.data?.has_screenshot)
      throw new ApiError(404, 'Audit evidence not found');
    const downloaded = await client.storage
      .from('audit-evidence')
      .download(`${workspace.id}/${id}/mobile.png`);
    if (downloaded.error || !downloaded.data)
      throw new ApiError(404, 'Audit evidence not found');
    response = new Response(downloaded.data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline; filename="mobile-audit.png"',
      },
    });
    return {};
  });
  return response || errorResponse;
}
