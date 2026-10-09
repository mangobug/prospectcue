import { afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { admin, makeUser, cleanup } from './helpers';
import { inspectWebsite } from '@/lib/audits/browser';
import * as browser from '@/lib/audits/browser';
import { runWebsiteAudit } from '@/lib/audits/worker';
import { sealPacket } from '@/lib/audits/packet';
import { fixtureFetch } from '../fixtures/audit-page';
const realInspect = inspectWebsite;
afterAll(cleanup);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function setup() {
  const user = await makeUser();
  const prospect = await user.client
    .from('prospects')
    .insert({
      workspace_id: user.workspace,
      created_by: user.userId,
      business_name: 'Fictional audit prospect',
      source_type: 'manual',
    })
    .select('id')
    .single();
  if (prospect.error) throw new Error('Test prospect failed');
  const token = randomBytes(32).toString('hex');
  const queued = await user.client.rpc('queue_website_audit', {
    p: prospect.data.id,
    target_url: 'https://example.com/',
    capability_hash: createHash('sha256').update(token).digest('hex'),
  });
  if (queued.error || !queued.data) throw new Error('Test audit queue failed');
  return { ...user, pid: prospect.data.id, run: queued.data, token };
}
function anon() {
  return createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
describe('real audit database, browser and storage isolation', () => {
  it('isolates audit history, capabilities and direct writes from other tenants', async () => {
    const a = await setup(),
      b = await makeUser();
    expect(
      (await b.client.from('audit_runs').select('*').eq('id', a.run)).data,
    ).toEqual([]);
    expect((await anon().from('audit_runs').select('*')).error).toBeTruthy();
    expect(
      (await a.client.from('audit_capabilities').select('*')).error,
    ).toBeTruthy();
    expect(
      (
        await a.client
          .from('audit_runs')
          .update({ status: 'completed' })
          .eq('id', a.run)
      ).error,
    ).toBeTruthy();
    expect(
      (
        await b.client.rpc('queue_website_audit', {
          p: a.pid,
          target_url: 'https://example.com',
          capability_hash: 'a'.repeat(64),
        })
      ).error,
    ).toBeTruthy();
    await b.client.rpc('fail_audit_dispatch', { r: a.run });
    expect(
      (
        await a.client
          .from('audit_runs')
          .select('status')
          .eq('id', a.run)
          .single()
      ).data?.status,
    ).toBe('queued');
  });
  it('requires an unguessable capability, prevents duplicate jobs, validates completion and erases tokens', async () => {
    const a = await setup(),
      worker = anon();
    expect(
      (
        await worker.rpc('claim_website_audit', {
          r: a.run,
          capability: 'b'.repeat(64),
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await a.client.rpc('queue_website_audit', {
          p: a.pid,
          target_url: 'https://example.com',
          capability_hash: 'c'.repeat(64),
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await worker.rpc('claim_website_audit', {
          r: a.run,
          capability: a.token,
        })
      ).data,
    ).toMatchObject({ url: 'https://example.com/' });
    expect(
      (
        await worker.rpc('claim_website_audit', {
          r: a.run,
          capability: a.token,
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await worker.rpc('finish_website_audit', {
          r: a.run,
          capability: a.token,
          result: {},
          screenshot: false,
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await worker.rpc('finish_website_audit', {
          r: a.run,
          capability: a.token,
          result: null,
          screenshot: false,
          failure: 'Fictional unreachable fixture',
        })
      ).data,
    ).toBe(true);
    expect(
      (
        await worker.rpc('claim_website_audit', {
          r: a.run,
          capability: a.token,
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await a.client.rpc('queue_website_audit', {
          p: a.pid,
          target_url: 'https://example.com',
          capability_hash: 'd'.repeat(64),
        })
      ).error,
    ).toBeNull();
  });
  it('runs a real Chromium audit, persists evidence, and denies cross-workspace storage reads', async () => {
    const a = await setup(),
      b = await makeUser();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.TEST_SUPABASE_URL!);
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.TEST_SUPABASE_ANON_KEY!,
    );
    vi.stubEnv('PLAYWRIGHT_CHROMIUM_EXECUTABLE', '/usr/bin/chromium');
    vi.stubEnv('GOOGLE_PAGESPEED_API_KEY', '');
    const path = `${a.workspace}/${a.run}/mobile.png`;
    expect(
      (
        await b.client.storage
          .from('audit-evidence')
          .createSignedUploadUrl(path)
      ).error,
    ).toBeTruthy();
    const signed = await a.client.storage
      .from('audit-evidence')
      .createSignedUploadUrl(path);
    expect(signed.error).toBeNull();
    vi.spyOn(browser, 'inspectWebsite').mockImplementation((target) =>
      realInspect(target, fixtureFetch),
    );
    await runWebsiteAudit(
      sealPacket({
        runId: a.run,
        token: a.token,
        assetPath: path,
        uploadToken: signed.data!.token,
      }),
    );
    const run = await a.client
      .from('audit_runs')
      .select('*')
      .eq('id', a.run)
      .single();
    expect(run.data).toMatchObject({
      status: 'completed',
      has_screenshot: true,
    });
    expect(JSON.stringify(run.data?.report)).toContain(
      'Mobile horizontal overflow',
    );
    expect(JSON.stringify(run.data?.report)).toContain('700px');
    const image = await a.client.storage.from('audit-evidence').download(path);
    expect(image.error).toBeNull();
    expect(image.data?.type).toBe('image/png');
    expect(
      (await b.client.storage.from('audit-evidence').download(path)).error,
    ).toBeTruthy();
    expect(
      (await anon().storage.from('audit-evidence').download(path)).error,
    ).toBeTruthy();
    expect(
      (await b.client.storage.from('audit-evidence').createSignedUrl(path, 60))
        .error,
    ).toBeTruthy();
    expect(
      (
        await a.client.storage
          .from('audit-evidence')
          .upload(
            `${a.workspace}/${randomUUID()}/mobile.png`,
            Buffer.from('bad'),
            { contentType: 'image/png' },
          )
      ).error,
    ).toBeTruthy();
    expect(
      (await a.client.storage.from('audit-evidence').remove([path])).error,
    ).toBeNull();
  });
  it('expires a stuck run and allows an explicit new audit', async () => {
    const a = await setup();
    await admin
      .from('audit_runs')
      .update({
        created_at: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
      })
      .eq('id', a.run);
    const next = await a.client.rpc('queue_website_audit', {
      p: a.pid,
      target_url: 'https://example.com',
      capability_hash: 'e'.repeat(64),
    });
    expect(next.error).toBeNull();
    expect(
      (
        await a.client
          .from('audit_runs')
          .select('status')
          .eq('id', a.run)
          .single()
      ).data?.status,
    ).toBe('failed');
  });
});
