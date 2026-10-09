import { beforeAll, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import { admin, makeUser, cleanup } from './helpers';
let a: Awaited<ReturnType<typeof makeUser>>,
  b: Awaited<ReturnType<typeof makeUser>>;
const prefix = `discovery-qa-${randomUUID()}`,
  city = `QA-${randomUUID()}`;
const ids = Array.from(
  { length: 25 },
  (_, i) => `${prefix}-${String(i).padStart(2, '0')}`,
);
const anon = createClient<Database>(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);
const provenance = [
  { name: 'Fictional test contributor', record_id: 'fixture-record' },
];
beforeAll(async () => {
  a = await makeUser();
  b = await makeUser();
  const { error } = await admin
    .from('discovery_places')
    .insert(
      ids.map((id, i) => ({
        id,
        business_name: `Fictional QA Dentist ${i}`,
        industry: 'dentist',
        city,
        province: 'Ontario',
        country: 'Canada',
        address: 'Fictional QA address',
        latitude: 43,
        longitude: -81,
        release: 'fixture-test',
        website_url: 'https://example.invalid/',
        attributions: provenance,
      })),
    );
  expect(error).toBeNull();
});
afterAll(async () => {
  await cleanup();
  await admin.from('discovery_places').delete().in('id', ids);
});
function save(user: typeof a, selected: string[], provider = 'overture') {
  return user.client.rpc('save_discovery_prospects', {
    w: user.workspace,
    provider,
    ids: selected,
    category: 'dentists',
  });
}
it('bounds anonymous discovery at five and forbids anonymous paging/raw access/writes', async () => {
  const r = await anon.rpc('search_discovery_places', {
    category: 'dentists',
    location: city,
    page: 1,
  });
  expect(r.error).toBeNull();
  expect(r.data).toHaveLength(5);
  expect(
    (
      await anon.rpc('search_discovery_places', {
        category: 'dentists',
        location: city,
        page: 2,
      })
    ).error,
  ).not.toBeNull();
  expect((await anon.from('discovery_places').select()).error).not.toBeNull();
  expect(
    (await a.client.from('discovery_places').select()).error,
  ).not.toBeNull();
  expect(
    (
      await anon.rpc('save_discovery_prospects', {
        w: a.workspace,
        provider: 'overture',
        ids: [ids[0]],
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await a.client
        .from('discovery_places')
        .update({ business_name: 'Forgery' })
        .eq('id', ids[0])
    ).error,
  ).not.toBeNull();
});
it('returns signed-in pages with a sentinel and stable non-overlapping offset', async () => {
  const first = await a.client.rpc('search_discovery_places', {
    category: 'dentists',
    location: city,
    page: 1,
  });
  const second = await a.client.rpc('search_discovery_places', {
    category: 'dentists',
    location: city,
    page: 2,
  });
  expect(first.error).toBeNull();
  expect(first.data).toHaveLength(21);
  expect(second.data).toHaveLength(5);
  expect(
    first
      .data!.slice(0, 20)
      .some((p) => second.data!.some((q) => q.id === p.id)),
  ).toBe(false);
});
it('saves trusted catalogue values, snapshots provenance, and deduplicates concurrent retries', async () => {
  const results = await Promise.all([save(a, [ids[0]]), save(a, [ids[0]])]);
  expect(results.every((r) => !r.error)).toBe(true);
  const statuses = results
    .flatMap((r) => (r.data as { status: string }[]).map((p) => p.status))
    .sort();
  expect(statuses).toEqual(['already_saved', 'saved']);
  const row = await a.client
    .from('prospects')
    .select()
    .eq('workspace_id', a.workspace)
    .eq('discovery_id', ids[0])
    .single();
  expect(row.data).toMatchObject({
    business_name: 'Fictional QA Dentist 0',
    website_url: 'https://example.invalid/',
    website_status: 'website_present',
    source_type: 'overture',
    discovery_attributions: provenance,
  });
  expect(
    (
      await a.client
        .from('prospects')
        .update({ discovery_attributions: [] })
        .eq('id', row.data!.id)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await a.client
        .from('prospects')
        .update({ discovery_id: ids[1] })
        .eq('id', row.data!.id)
    ).error,
  ).not.toBeNull();
});
it('prevents another workspace saving into or reading the owner workspace', async () => {
  expect(
    (
      await b.client.rpc('save_discovery_prospects', {
        w: a.workspace,
        provider: 'overture',
        ids: [ids[1]],
      })
    ).error,
  ).not.toBeNull();
  expect(
    (await b.client.from('prospects').select().eq('workspace_id', a.workspace))
      .data,
  ).toEqual([]);
  expect((await save(b, [ids[0]])).error).toBeNull();
});
it('rolls back a mixed valid/invalid selection and rejects oversized selections', async () => {
  expect((await save(a, [ids[2], 'zz-missing-fixture'])).error).not.toBeNull();
  expect(
    (await a.client.from('prospects').select().eq('discovery_id', ids[2])).data,
  ).toEqual([]);
  expect((await save(a, ids)).error).not.toBeNull();
});
it('reuses a matching manual prospect instead of creating a provider duplicate', async () => {
  const inserted = await a.client
    .from('prospects')
    .insert({
      workspace_id: a.workspace,
      created_by: a.userId,
      business_name: 'Fictional QA Dentist 3',
      city,
      province: 'Ontario',
      country: 'Canada',
      source_type: 'manual',
    })
    .select('id')
    .single();
  expect(inserted.error).toBeNull();
  expect((await save(a, [ids[3]])).data).toEqual([
    { id: ids[3], prospect_id: inserted.data!.id, status: 'already_saved' },
  ]);
});
it('stores Google references without content and keeps normal notes and pipeline changes working', async () => {
  const placeId = 'ChIJ_fixture_reference_only';
  const result = await save(a, [placeId], 'google_places');
  expect(result.error).toBeNull();
  const row = await a.client
    .from('prospects')
    .select()
    .eq('discovery_id', placeId)
    .single();
  expect(row.data).toMatchObject({
    website_url: null,
    email: null,
    phone: null,
    city: '',
    province: '',
    country: '',
    website_status: 'unknown',
    discovery_attributions: [],
  });
  expect(
    (
      await a.client
        .from('prospects')
        .update({ website_url: 'https://example.invalid/' })
        .eq('id', row.data!.id)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await a.client
        .from('prospects')
        .update({ stage: 'reviewed', next_follow_up: '2027-01-01' })
        .eq('id', row.data!.id)
    ).error,
  ).toBeNull();
  expect(
    (
      await a.client
        .from('prospect_activities')
        .insert({
          prospect_id: row.data!.id,
          workspace_id: a.workspace,
          created_by: a.userId,
          type: 'note',
          note: 'Fictional test note',
        })
    ).error,
  ).toBeNull();
  const activities = await a.client
    .from('prospect_activities')
    .select()
    .eq('prospect_id', row.data!.id);
  expect(activities.data!.map((p) => p.type)).toEqual(
    expect.arrayContaining(['note', 'stage_change', 'follow_up_change']),
  );
  expect(
    (
      await a.client
        .from('prospects')
        .update({
          discovery_attributions: [
            { name: 'copied Google attribution' },
          ] as Json,
        })
        .eq('id', row.data!.id)
    ).error,
  ).not.toBeNull();
});
