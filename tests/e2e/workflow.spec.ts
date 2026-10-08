import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.test');
const url = process.env.TEST_SUPABASE_URL!;
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Browser tests are local-only');
const admin = createClient(url, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const users: string[] = [];
async function emailLink(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  let id = '';
  await expect
    .poll(
      async () => {
        const r = await request.get('http://127.0.0.1:54324/api/v1/messages');
        const data = await r.json();
        const message = data.messages?.find(
          (m: { ID: string; To: { Address: string }[]; Subject: string }) =>
            m.To.some((t) => t.Address === email) &&
            m.Subject.toLowerCase().includes(subject),
        );
        id = message?.ID ?? '';
        return !!id;
      },
      { timeout: 20000 },
    )
    .toBe(true);
  const r = await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`);
  const data = await r.json();
  const match = (data.HTML || data.Text).match(
    /https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/,
  );
  if (!match) throw new Error('Email verification link not found');
  return match[0].replaceAll('&amp;', '&');
}
async function signup(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Fictional Designer');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByText('Check your email to confirm your account, then sign in.'),
  ).toBeVisible();
  await page.goto(await emailLink(request, email, 'confirm'));
  await expect(
    page.getByRole('heading', { name: 'Give your agency a home.' }),
  ).toBeVisible();
  await page.getByLabel('Workspace name').fill('Fictional E2E Agency');
  await page
    .getByRole('button', { name: 'Create workspace', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'A clear view of what’s next.' }),
  ).toBeVisible();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  if (user) users.push(user.id);
}
test.afterAll(async () => {
  for (const user of users) {
    const { data: m } = await admin
      .from('workspace_memberships')
      .select('workspace_id')
      .eq('user_id', user);
    for (const w of m ?? [])
      await admin.from('workspaces').delete().eq('id', w.workspace_id);
    await admin.auth.admin.deleteUser(user);
  }
});
test('sign-up, import, editing, persistence, filters, notes, pipeline and workspace isolation', async ({
  page,
  request,
  browser,
}) => {
  const email = `fictional-e2e-${randomUUID()}@example.invalid`,
    password = randomUUID() + 'Aa1!';
  await signup(page, request, email, password);
  await page
    .getByRole('link', { name: '+ Add prospect', exact: true })
    .first()
    .click();
  await page
    .getByLabel('Business name *', { exact: true })
    .fill('Fictional Alder Studio');
  await page.getByLabel('Industry / category').fill('Retail');
  await page.getByLabel('City', { exact: true }).fill('London');
  await page.getByLabel('Province / state').fill('Ontario');
  await page
    .getByRole('button', { name: 'Create prospect', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Fictional Alder Studio', exact: true }),
  ).toBeVisible();
  const detail = page.url(),
    id = detail.split('/').at(-1)!;
  await page.getByLabel('Pipeline stage').selectOption('contacted');
  await page.getByLabel('Next follow-up date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page.getByText('Prospect saved.', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Add a note')
    .fill('Fictional conversation: follow up next week.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByText('Fictional conversation: follow up next week.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Stage: new → contacted', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Follow-up: Not set → 2026-01-01', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Pipeline stage')).toHaveValue('contacted');
  await expect(page.getByLabel('Next follow-up date')).toHaveValue(
    '2026-01-01',
  );
  await page.goto('/app/import');
  const csv =
    'business_name,city,province,country,email,website_url\nFictional Alder Studio,London,Ontario,Canada,,\nFictional Beta,London,Ontario,Canada,beta@example.com,instagram.com/fictional-beta\nFictional Gamma,Toronto,Ontario,Canada,,example.ca\n,London,Ontario,Canada,invalid,ftp://bad.example\nFictional Beta,London,Ontario,Canada,,instagram.com/other';
  await expect(page.getByLabel('Upload CSV file')).toBeEnabled();
  await page.getByLabel('Upload CSV file').setInputFiles({
    name: 'fictional.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page
    .getByRole('button', { name: 'Preview & validate', exact: true })
    .click();
  await expect(
    page.getByText(
      '4 valid · 1 invalid · 2 duplicate candidates skipped by default',
    ),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download invalid rows', exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe('import-invalid-rows.csv');
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await expect(
    page.getByText('Import complete', { exact: true }),
  ).toBeVisible();
  const result = page.locator('.stats');
  await expect(result).toContainText('Total5');
  await expect(result).toContainText('Imported2');
  await expect(result).toContainText('Skipped duplicates2');
  await expect(result).toContainText('Invalid1');
  await page.goto('/app/prospects');
  await expect(
    page.getByRole('link', { name: 'Fictional Beta', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Search business').fill('Alder');
  await page.getByLabel('Stage', { exact: true }).selectOption('contacted');
  await page.getByLabel('Industry', { exact: true }).fill('Retail');
  await page.getByLabel('City', { exact: true }).fill('London');
  await page
    .getByLabel('Website status', { exact: true })
    .selectOption('unknown');
  await page.getByLabel('Sort', { exact: true }).selectOption('business_name');
  await page
    .getByRole('button', { name: 'Apply filters', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: 'Fictional Alder Studio', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Fictional Beta', exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('stage')).toBe('contacted');
  // Add enough records through the actual server API to exercise pagination.
  const bulk =
    'business_name,city\n' +
    Array.from(
      { length: 22 },
      (_, i) => `Fictional Pagination ${String(i).padStart(2, '0')},London`,
    ).join('\n');
  const response = await page.request.post('/api/imports', {
    data: {
      csv: bulk,
      filename: 'pagination.csv',
      mapping: { business_name: 'business_name', city: 'city' },
      token: randomUUID(),
      mode: 'confirm',
    },
  });
  expect(response.status()).toBe(200);
  const bulkResult = await response.json();
  expect(bulkResult.batch.imported_count).toBe(22);
  expect(
    bulkResult.rows.every((r: { raw: string[] }) => r.raw.length === 0),
  ).toBe(true);
  await page.goto('/app/prospects?sort=business_name');
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  expect(new URL(page.url()).searchParams.get('sort')).toBe('business_name');
  await page.goto('/app');
  await expect(page.locator('.stats .stat-number').first()).toHaveText('25');
  await expect(page.locator('.stats .stat-number').nth(1)).toHaveText('1');
  await page.goto('/app/pipeline');
  await expect(
    page.locator('.lane').filter({
      has: page.getByRole('heading', { name: 'Contacted', exact: true }),
    }),
  ).toContainText('Fictional Alder Studio');
  await page.goto('/app/settings');
  await page.getByLabel('Workspace name').fill('Fictional Renamed Agency');
  await page
    .getByRole('button', { name: 'Save workspace', exact: true })
    .click();
  await expect(
    page.getByText('Workspace updated', { exact: true }),
  ).toBeVisible();
  // A second independent browser session tests direct HTTP mutations as well as UI access.
  const other = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const otherPage = await other.newPage();
  await signup(
    otherPage,
    request,
    `fictional-other-${randomUUID()}@example.invalid`,
    randomUUID() + 'Aa1!',
  );
  await otherPage.goto(`/app/prospects/${id}`);
  await expect(
    otherPage.getByText('This page could not be found.'),
  ).toBeVisible();
  const patch = await other.request.patch(`/api/prospects/${id}`, {
    data: { business_name: 'Hijack' },
  });
  expect(patch.status()).toBe(404);
  expect((await other.request.delete(`/api/prospects/${id}`)).status()).toBe(
    404,
  );
  expect(
    (
      await other.request.post(`/api/prospects/${id}/notes`, {
        data: { note: 'Unauthorized' },
      })
    ).status(),
  ).toBe(404);
  await other.close();
  await page.goto(detail);
  await expect(
    page.getByRole('heading', { name: 'Fictional Alder Studio', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete prospect', exact: true })
    .click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fictional Alder Studio', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
  expect(
    (
      await page.request.post('/api/prospects', {
        data: { prospect: { business_name: 'Anonymous' } },
      })
    ).status(),
  ).toBe(401);
  await page.goto('/app');
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A clear view of what’s next.' }),
  ).toBeVisible();
});
test('password recovery email and callback update credentials', async ({
  page,
  request,
}) => {
  const email = `fictional-recovery-${randomUUID()}@example.invalid`,
    password = randomUUID() + 'Aa1!';
  await signup(page, request, email, password);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByRole('button', { name: 'Send reset link', exact: true })
    .click();
  await expect(
    page.getByText('If an account exists, a reset link has been sent.'),
  ).toBeVisible();
  await page.goto(await emailLink(request, email, 'reset'));
  await expect(
    page.getByRole('heading', { name: 'Choose a new password' }),
  ).toBeVisible();
  const nextPassword = randomUUID() + 'Aa1!';
  await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page
    .getByRole('button', { name: 'Update password', exact: true })
    .click();
  await expect(
    page.getByText('Password updated. Sign in with your new password.'),
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A clear view of what’s next.' }),
  ).toBeVisible();
});
test('manual duplicate decision, confirmed deletion, safe text and mutation validation', async ({
  page,
  request,
}) => {
  const email = `fictional-safety-${randomUUID()}@example.invalid`;
  await signup(page, request, email, randomUUID() + 'Aa1!');
  const name = 'Fictional <img src=x onerror=alert(1)> Studio';
  async function fillProspect() {
    await page.goto('/app/prospects/new');
    await page.getByLabel('Business name *', { exact: true }).fill(name);
    await page.getByLabel('City', { exact: true }).fill('London');
    await page
      .getByRole('button', { name: 'Create prospect', exact: true })
      .click();
  }
  await fillProspect();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  const original = page.url();
  await fillProspect();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'same business name and location' }),
  ).toBeVisible();
  await page
    .getByLabel('I reviewed the duplicate warning. Create a separate record.')
    .check();
  await page
    .getByRole('button', { name: 'Create prospect', exact: true })
    .click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  expect(page.url()).not.toBe(original);
  const note = 'Fictional <script>window.e2eInjected=true</script> note';
  await page.getByLabel('Add a note').fill(note);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => 'e2eInjected' in window)).toBe(false);
  const invalid = await page.request.post('/api/prospects', {
    data: {
      prospect: {
        business_name: 'Invalid',
        website_url: 'javascript:alert(1)',
      },
    },
  });
  expect(invalid.status()).toBe(400);
  const csrf = await page.request.post('/api/prospects', {
    headers: { Origin: 'https://attacker.example' },
    data: { prospect: { business_name: 'Cross origin' } },
  });
  expect(csrf.status()).toBe(403);
  await page
    .getByRole('button', { name: 'Delete prospect', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm deletion', exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/prospects$/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.goto(original);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
});
