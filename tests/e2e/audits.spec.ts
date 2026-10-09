import { test, expect } from '@playwright/test';
import { makeUser, cleanup } from '../integration/helpers';
import { createHash, randomBytes } from 'node:crypto';
import { inspectWebsite } from '../../src/lib/audits/browser';
import { fixtureFetch } from '../fixtures/audit-page';
import { createClient } from '@supabase/supabase-js';
test.afterAll(cleanup);
test('reviews real browser findings and private screenshot, rejects unsafe audit targets, and removes evidence on deletion', async ({
  page,
  request,
}) => {
  const user = await makeUser(),
    other = await makeUser();
  const prospect = await user.client
    .from('prospects')
    .insert({
      workspace_id: user.workspace,
      created_by: user.userId,
      business_name: 'Fictional website audit review',
      source_type: 'manual',
      website_url: 'https://example.com',
    })
    .select('id')
    .single();
  if (prospect.error) throw new Error('Fixture prospect failed');
  const id = prospect.data.id,
    token = randomBytes(32).toString('hex');
  const queued = await user.client.rpc('queue_website_audit', {
    p: id,
    target_url: 'https://example.com/',
    capability_hash: createHash('sha256').update(token).digest('hex'),
  });
  if (queued.error || !queued.data) throw new Error('Fixture audit failed');
  const worker = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  await worker.rpc('claim_website_audit', {
    r: queued.data,
    capability: token,
  });
  const evidence = await inspectWebsite('https://example.com/', fixtureFetch);
  const path = `${user.workspace}/${queued.data}/mobile.png`;
  const upload = await user.client.storage
    .from('audit-evidence')
    .upload(path, evidence.screenshot, { contentType: 'image/png' });
  expect(upload.error).toBeNull();
  const saved = await worker.rpc('finish_website_audit', {
    r: queued.data,
    capability: token,
    result: evidence.report,
    screenshot: true,
  });
  expect(saved.error).toBeNull();
  expect(
    (await request.get(`/api/audits/${queued.data}/evidence`)).status(),
  ).toBe(401);
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto(`/app/prospects/${id}`);
  const section = page.getByRole('region', { name: 'Website audit' });
  await expect(
    section.getByRole('heading', { name: 'Latest audit · completed' }),
  ).toBeVisible();
  await expect(
    section.getByText('4 observed issue(s)', { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText(/At 390px viewport width, the document was 700px wide/),
  ).toBeVisible();
  await section
    .getByText('View mobile screenshot evidence (390 × 844)')
    .click();
  const screenshot = section.getByRole('img');
  await expect(screenshot).toBeVisible();
  await expect
    .poll(() =>
      screenshot.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(390);
  const download = await page.request.get(
    `/api/audits/${queued.data}/evidence`,
  );
  expect(download.status()).toBe(200);
  expect(download.headers()['cache-control']).toContain('no-store');
  const input = section.getByLabel('Website to audit');
  await input.fill('http://169.254.169.254/');
  await section.getByRole('button', { name: 'Run a new audit' }).click();
  await expect(section.getByRole('alert')).toContainText('public');
  const denied = await page.request.post(`/api/prospects/${id}/audits`, {
    data: { url: 'https://example.com', workspace_id: other.workspace },
  });
  expect(denied.status()).toBe(400);
  // Deleting removes the private storage object while its RLS parent still exists.
  await page
    .getByRole('button', { name: 'Delete prospect', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page).toHaveURL('/app/prospects');
  expect(
    (await user.client.from('audit_runs').select('id').eq('id', queued.data))
      .data,
  ).toEqual([]);
  expect(
    (await user.client.storage.from('audit-evidence').download(path)).error,
  ).toBeTruthy();
});
test('starts a local background job and shows its status without holding the page open', async ({
  page,
}) => {
  const user = await makeUser();
  const prospect = await user.client
    .from('prospects')
    .insert({
      workspace_id: user.workspace,
      created_by: user.userId,
      business_name: 'Fictional audit job status',
      source_type: 'manual',
    })
    .select('id')
    .single();
  if (prospect.error) throw new Error('Fixture prospect failed');
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto(`/app/prospects/${prospect.data.id}`);
  const section = page.getByRole('region', { name: 'Website audit' });
  await expect(section.getByText('No website audits yet.')).toBeVisible();
  await section.getByLabel('Website to audit').fill('https://example.com/');
  await section.getByRole('button', { name: 'Audit website' }).click();
  await expect(
    section.getByRole('heading', {
      name: /Latest audit · (queued|running|completed|failed)/,
    }),
  ).toBeVisible();
  // External DNS is blocked in this cloud runner. This verifies dispatch and
  // persisted failure/status, not a successful public-site audit.
  await expect(
    section.getByRole('heading', { name: /Latest audit · (completed|failed)/ }),
  ).toBeVisible({ timeout: 90000 });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Latest audit · (completed|failed)/ }),
  ).toBeVisible();
  const outsider = await makeUser();
  const foreign = await outsider.client
    .from('audit_runs')
    .select('*')
    .eq('prospect_id', prospect.data.id);
  expect(foreign.data).toEqual([]);
});
