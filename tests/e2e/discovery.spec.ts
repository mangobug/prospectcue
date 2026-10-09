import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { admin, makeUser, cleanup } from '../integration/helpers';

test.afterAll(cleanup);
const query = {
  provider: 'overture',
  category: 'dentists',
  location: 'London, Ontario, Canada',
  page: 1,
};

test('anonymous preview searches real Overture records, bounds access and works on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/discover');
  await page
    .getByRole('button', { name: 'Find businesses', exact: true })
    .click();
  await expect(page.locator('.discovery-result')).toHaveCount(5);
  await expect(
    page.getByRole('heading', { name: '5 businesses on this page' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next results' })).toHaveCount(
    0,
  );
  await expect(
    page.locator('.discovery-result input[type=checkbox]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const second = await page.request.post('/api/discovery/search', {
    data: { ...query, page: 2 },
  });
  expect(second.status()).toBe(401);
  const save = await page.request.post('/api/discovery/save', {
    data: { provider: 'overture', items: [{ id: 'untrusted' }] },
  });
  expect(save.status()).toBe(401);
  const foreign = await page.request.post('/api/discovery/search', {
    headers: { Origin: 'https://attacker.example' },
    data: query,
  });
  expect(foreign.status()).toBe(403);
  const invalid = await page.request.post('/api/discovery/search', {
    data: { ...query, workspace_id: randomUUID() },
  });
  expect(invalid.status()).toBe(400);
  await page
    .getByLabel('Location', { exact: true })
    .fill('Nonexistent location QA 0000');
  await page
    .getByRole('button', { name: 'Find businesses', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'No businesses found for this search' }),
  ).toBeVisible();
  await expect(page.locator('.discovery-result')).toHaveCount(0);
});

test('signed-in discovery saves real records, deduplicates, persists notes/stages and isolates workspaces', async ({
  page,
  browser,
}) => {
  const account = await makeUser();
  await page.goto('/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto('/app/discover');
  const firstResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/discovery/search') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Find businesses', exact: true })
    .click();
  const first = await (await firstResponse).json();
  expect(first.results).toHaveLength(20);
  expect(first.signedIn).toBe(true);
  await expect(page.locator('.discovery-result')).toHaveCount(20);
  const secondResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/discovery/search') &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Next results', exact: true }).click();
  const second = await (await secondResponse).json();
  expect(second.page).toBe(2);
  expect(
    second.results.some((p: { id: string }) =>
      first.results.some((q: { id: string }) => q.id === p.id),
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'First page', exact: true }).click();
  await expect(
    page.getByText('Page 1 · 20 per page', { exact: true }),
  ).toBeVisible();
  await page.locator('.discovery-result input[type=checkbox]').first().check();
  await page
    .getByRole('button', { name: 'Save selected (1)', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('1 saved');
  const selected = first.results[0];
  const repeat = await page.request.post('/api/discovery/save', {
    data: { provider: 'overture', items: [{ id: selected.id }] },
  });
  expect(repeat.status()).toBe(200);
  const repeated = await repeat.json();
  expect(repeated.results[0].status).toBe('already_saved');
  const prospectId = repeated.results[0].prospect_id;
  const forged = await page.request.post('/api/discovery/save', {
    data: {
      provider: 'overture',
      items: [{ id: selected.id }],
      workspace_id: randomUUID(),
    },
  });
  expect(forged.status()).toBe(400);
  const googleForgery = await page.request.post('/api/discovery/save', {
    data: {
      provider: 'google_places',
      items: [
        { id: 'ChIJ_fixture_forged_selection', selectionToken: 'forged' },
      ],
    },
  });
  expect(googleForgery.status()).toBe(400);
  await page.goto(`/app/prospects/${prospectId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    selected.name,
  );
  await expect(
    page.getByText('Overture Maps Places', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Add a note')
    .fill('Review this listing with the agency.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByText('Review this listing with the agency.', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Pipeline stage').selectOption('reviewed');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Prospect saved.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Pipeline stage')).toHaveValue('reviewed');
  await page.reload();
  await expect(
    page.getByText('Review this listing with the agency.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Pipeline stage')).toHaveValue('reviewed');
  await page.goto('/app/pipeline');
  const lane = page.locator('.lane').filter({
    has: page.getByRole('heading', { name: 'Reviewed', exact: true }),
  });
  await expect(
    lane.locator(`a[href="/app/prospects/${prospectId}"]`),
  ).toHaveCount(1);
  const other = await makeUser();
  const context = await browser.newContext();
  try {
    const isolated = await context.newPage();
    await isolated.goto('http://localhost:3000/sign-in');
    await isolated.getByLabel('Email', { exact: true }).fill(other.email);
    await isolated.getByLabel('Password', { exact: true }).fill(other.password);
    await isolated
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
    await expect(isolated).toHaveURL(/\/app$/);
    await isolated.goto(`http://localhost:3000/app/prospects/${prospectId}`);
    // Next.js streamed notFound pages can have HTTP 200; assert the denied page.
    await expect(
      isolated.getByRole('heading', { name: 'This page could not be found.' }),
    ).toBeVisible();
    await expect(
      isolated.getByRole('heading', { name: selected.name, exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await isolated.request.post(
          `http://localhost:3000/api/prospects/${prospectId}/notes`,
          { data: { note: 'Forbidden' } },
        )
      ).status(),
    ).toBe(404);
    expect((await other.client.from('prospects').select()).data).toEqual([]);
  } finally {
    await context.close();
  }
  const persisted = await admin
    .from('prospects')
    .select('source_type,discovery_id,stage,discovery_attributions')
    .eq('id', prospectId)
    .single();
  expect(persisted.data).toMatchObject({
    source_type: 'overture',
    discovery_id: selected.id,
    stage: 'reviewed',
  });
  expect(Array.isArray(persisted.data!.discovery_attributions)).toBe(true);
});
