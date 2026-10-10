import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';
import { openPacket } from './packet';
import { inspectWebsite } from './browser';
import { auditDatabaseError } from './database-error';
export async function runWebsiteAudit(sealed: string) {
  const packet = openPacket(sealed);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Audit database configuration is missing');
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error, status } = await client.rpc('claim_website_audit', {
    r: packet.runId,
    capability: packet.token,
  });
  if (error) throw auditDatabaseError('claim', error, status);
  if (!data) return; // A completed/failed run is never executed twice.
  if (
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.url !== 'string'
  )
    throw new Error('Invalid audit target');
  try {
    const { report, screenshot } = await inspectWebsite(data.url);
    const upload = await client.storage
      .from('audit-evidence')
      .uploadToSignedUrl(packet.assetPath, packet.uploadToken, screenshot, {
        contentType: 'image/png',
      });
    if (upload.error)
      report.limitations.push(
        'The screenshot could not be saved. Text findings remain available; rerun the audit for visual evidence.',
      );
    const finished = await client.rpc('finish_website_audit', {
      r: packet.runId,
      capability: packet.token,
      result: report as unknown as Json,
      screenshot: !upload.error,
    });
    if (finished.error)
      throw auditDatabaseError('result', finished.error, finished.status);
  } catch {
    // Provider/browser errors may contain URLs, headers, or tokens. Persist only a safe explanation.
    const failure = await client.rpc('finish_website_audit', {
      r: packet.runId,
      capability: packet.token,
      result: null,
      screenshot: false,
      failure:
        'The website could not be audited safely. It may be unreachable, block automated visits, redirect to a private address, or exceed the loading budget. Check the website manually or run a new audit.',
    });
    if (failure.error)
      throw auditDatabaseError('status', failure.error, failure.status);
  }
}
