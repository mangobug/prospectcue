import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { api, jsonBody } from '@/lib/api';
import { workspaceContext, ApiError } from '@/lib/context';
import { auditInput } from '@/lib/audits/schema';
import { auditUrl } from '@/lib/audits/url';
import { auditsConfigured, dispatchAudit } from '@/lib/audits/dispatch';
import { sealPacket } from '@/lib/audits/packet';
type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) {
  return api(request, async () => {
    const id = z.uuid().parse((await params).id);
    const { client, workspace } = await workspaceContext(true);
    const prospect = await client
      .from('prospects')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('id', id)
      .maybeSingle();
    if (prospect.error) throw new ApiError(503, 'Prospect unavailable');
    if (!prospect.data) throw new ApiError(404, 'Prospect not found');
    const result = await client
      .from('audit_runs')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('prospect_id', id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (result.error)
      throw new ApiError(
        503,
        'Website audits are unavailable. Apply the website audit migration in Supabase.',
      );
    return { runs: result.data };
  });
}
export async function POST(request: Request, { params }: Params) {
  return api(request, async () => {
    const id = z.uuid().parse((await params).id);
    const { client, workspace } = await workspaceContext(true);
    const prospect = await client
      .from('prospects')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('id', id)
      .maybeSingle();
    if (prospect.error) throw new ApiError(503, 'Prospect unavailable');
    if (!prospect.data) throw new ApiError(404, 'Prospect not found');
    if (!auditsConfigured())
      throw new ApiError(
        503,
        'Website audits need the background worker configured. Your prospect is saved; contact the workspace owner.',
      );
    const input = auditInput.parse(await jsonBody(request, 4096));
    let url: string;
    try {
      url = auditUrl(input.url).href;
    } catch (e) {
      throw new ApiError(
        400,
        e instanceof Error ? e.message : 'Invalid website URL',
      );
    }
    const token = randomBytes(32).toString('hex');
    const queued = await client.rpc('queue_website_audit', {
      p: id,
      target_url: url,
      capability_hash: createHash('sha256').update(token).digest('hex'),
    });
    if (queued.error || !queued.data)
      throw new ApiError(
        409,
        'An audit may already be in progress. Refresh the page and try again. If no audit appears, check the Supabase audit migration.',
      );
    const runId = queued.data;
    try {
      const assetPath = `${workspace.id}/${runId}/mobile.png`;
      const signed = await client.storage
        .from('audit-evidence')
        .createSignedUploadUrl(assetPath);
      if (signed.error || !signed.data)
        throw new Error('Evidence storage unavailable');
      await dispatchAudit(
        sealPacket({ runId, token, assetPath, uploadToken: signed.data.token }),
        runId,
      );
    } catch {
      await client.rpc('fail_audit_dispatch', { r: runId });
      throw new ApiError(
        503,
        'Unable to start the audit. Check the background worker and private evidence storage, then try again.',
      );
    }
    return { id: runId };
  });
}
