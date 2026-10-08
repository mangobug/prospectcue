import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { makeUser, cleanup } from './helpers';
import { prospectSchema } from '@/lib/validation';
let a: Awaited<ReturnType<typeof makeUser>>,
  b: Awaited<ReturnType<typeof makeUser>>,
  id: string;
beforeAll(async () => {
  a = await makeUser();
  b = await makeUser();
  const { data, error } = await a.client
    .from('prospects')
    .insert({
      workspace_id: a.workspace,
      created_by: a.userId,
      business_name: 'Fictional isolated shop',
      source_type: 'manual',
    })
    .select()
    .single();
  expect(error).toBeNull();
  id = data!.id;
});
afterAll(cleanup);
describe('real authenticated workspace isolation', () => {
  it('creates workspace atomically and returns same ID on retry', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        a.client.rpc('create_workspace', { workspace_name: 'Retry' }),
      ),
    );
    expect(results.every((r) => r.data === a.workspace && !r.error)).toBe(true);
  });
  it('cannot read another workspace or prospect', async () => {
    expect(
      (await b.client.from('prospects').select().eq('id', id)).data,
    ).toEqual([]);
    expect(
      (await b.client.from('workspaces').select().eq('id', a.workspace)).data,
    ).toEqual([]);
  });
  it('cannot update or delete another workspace prospect', async () => {
    expect(
      (
        await b.client
          .from('prospects')
          .update({ business_name: 'Hijack' })
          .eq('id', id)
          .select()
      ).data,
    ).toEqual([]);
    expect(
      (await b.client.from('prospects').delete().eq('id', id).select()).data,
    ).toEqual([]);
    expect(
      (
        await a.client
          .from('prospects')
          .select('business_name')
          .eq('id', id)
          .single()
      ).data?.business_name,
    ).toBe('Fictional isolated shop');
  });
  it('cannot insert a prospect into another workspace', async () =>
    expect(
      (
        await b.client
          .from('prospects')
          .insert({
            workspace_id: a.workspace,
            created_by: b.userId,
            business_name: 'Intrusion',
            source_type: 'manual',
          })
      ).error,
    ).not.toBeNull());
  it('cannot move a prospect or change creator', async () => {
    expect(
      (
        await a.client
          .from('prospects')
          .update({ workspace_id: b.workspace })
          .eq('id', id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from('prospects')
          .update({ created_by: b.userId })
          .eq('id', id)
      ).error,
    ).not.toBeNull();
  });
  it('rejects cross-workspace activity relationships', async () =>
    expect(
      (
        await b.client
          .from('prospect_activities')
          .insert({
            workspace_id: b.workspace,
            prospect_id: id,
            type: 'note',
            note: 'Cross workspace',
            created_by: b.userId,
          })
      ).error,
    ).not.toBeNull());
  it('cannot self-enroll or change ownership', async () => {
    expect(
      (
        await b.client
          .from('workspace_memberships')
          .insert({
            workspace_id: a.workspace,
            user_id: b.userId,
            role: 'owner',
          })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from('workspace_memberships')
          .update({ role: 'member' })
          .eq('workspace_id', a.workspace)
      ).error,
    ).not.toBeNull();
  });
  it('cannot spoof generated activities or import counts', async () => {
    expect(
      (
        await a.client
          .from('prospect_activities')
          .insert({
            workspace_id: a.workspace,
            prospect_id: id,
            type: 'stage_change',
            change_data: { to: 'won' },
            created_by: a.userId,
          })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from('import_batches')
          .insert({
            workspace_id: a.workspace,
            filename: 'fake.csv',
            status: 'completed',
            total_count: 999,
            imported_count: 999,
            skipped_count: 0,
            invalid_count: 0,
            idempotency_key: randomUUID(),
            request_hash: 'fake',
            created_by: a.userId,
          })
      ).error,
    ).not.toBeNull();
  });
  it('denies import RPC and lookup for another workspace', async () => {
    expect(
      (
        await b.client.rpc('import_prospects', {
          w: a.workspace,
          token: randomUUID(),
          filename: 'test.csv',
          rows: [],
          invalid_count: 0,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await b.client.rpc('duplicate_candidates', {
          w: a.workspace,
          keys: ['fictional isolated shop|||canada'],
        })
      ).data,
    ).toEqual([]);
  });
  it('denies anonymous reads and RPC execution', async () => {
    const anonymous = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    expect((await anonymous.from('prospects').select()).data).toEqual([]);
    expect(
      (
        await anonymous.rpc('create_workspace', {
          workspace_name: 'Unauthorized',
        })
      ).error,
    ).not.toBeNull();
  });
  it('records stage and follow-up atomically and preserves notes', async () => {
    expect(
      (
        await a.client
          .from('prospects')
          .update({ stage: 'contacted', next_follow_up: '2026-10-10' })
          .eq('id', id)
      ).error,
    ).toBeNull();
    expect(
      (
        await a.client
          .from('prospect_activities')
          .insert({
            workspace_id: a.workspace,
            prospect_id: id,
            type: 'note',
            note: 'Fictional note',
            created_by: a.userId,
          })
      ).error,
    ).toBeNull();
    const { data } = await a.client
      .from('prospect_activities')
      .select()
      .eq('prospect_id', id);
    expect(data?.map((r) => r.type).sort()).toEqual([
      'follow_up_change',
      'note',
      'stage_change',
    ]);
    expect(data?.find((r) => r.type === 'stage_change')?.change_data).toEqual({
      from: 'new',
      to: 'contacted',
    });
  });
  it('sets verification time and clears it on unverify', async () => {
    expect(
      (
        await a.client
          .from('prospects')
          .update({ verification_status: 'user_verified' })
          .eq('id', id)
      ).error,
    ).toBeNull();
    expect(
      (
        await a.client
          .from('prospects')
          .select('verified_at')
          .eq('id', id)
          .single()
      ).data?.verified_at,
    ).toBeTruthy();
    await a.client
      .from('prospects')
      .update({ verification_status: 'unverified' })
      .eq('id', id);
    expect(
      (
        await a.client
          .from('prospects')
          .select('verified_at')
          .eq('id', id)
          .single()
      ).data?.verified_at,
    ).toBeNull();
  });
});
describe('atomic imports and count accuracy', () => {
  it('skips duplicates and retries concurrent submission exactly once', async () => {
    const row = prospectSchema.parse({
      business_name: 'Fictional import shop',
      city: 'London',
    });
    const token = randomUUID();
    const args = {
      w: a.workspace,
      token,
      filename: 'fictional.csv',
      rows: [
        { ...row, row: 2 },
        { ...row, row: 3 },
      ],
      invalid_count: 1,
    };
    const responses = await Promise.all([
      a.client.rpc('import_prospects', args),
      a.client.rpc('import_prospects', args),
    ]);
    for (const r of responses) {
      expect(r.error).toBeNull();
      expect(r.data).toMatchObject({
        total_count: 3,
        imported_count: 1,
        skipped_count: 1,
        invalid_count: 1,
      });
    }
    expect(responses[0].data?.id).toBe(responses[1].data?.id);
    expect(
      (
        await a.client
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('business_name', row.business_name)
      ).count,
    ).toBe(1);
    expect(
      (
        await a.client.rpc('import_prospects', {
          ...args,
          filename: 'changed.csv',
        })
      ).error,
    ).not.toBeNull();
  });
  it('allows explicit duplicates without overwriting', async () => {
    const row = prospectSchema.parse({
      business_name: 'Fictional import shop',
      city: 'London',
    });
    const r = await a.client.rpc('import_prospects', {
      w: a.workspace,
      token: randomUUID(),
      filename: 'another.csv',
      rows: [{ ...row, row: 2, allow_duplicate: true }],
      invalid_count: 0,
    });
    expect(r.data?.imported_count).toBe(1);
    expect(
      (
        await a.client
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('business_name', row.business_name)
      ).count,
    ).toBe(2);
  });
  it('rolls back all records and batch on database failure', async () => {
    const token = randomUUID();
    const result = await a.client.rpc('import_prospects', {
      w: a.workspace,
      token,
      filename: 'bad.csv',
      rows: [{ business_name: 'Fictional rollback' }, { business_name: '' }],
      invalid_count: 0,
    });
    expect(result.error).not.toBeNull();
    expect(
      (
        await a.client
          .from('prospects')
          .select()
          .eq('business_name', 'Fictional rollback')
      ).data,
    ).toEqual([]);
    expect(
      (
        await a.client
          .from('import_batches')
          .select()
          .eq('idempotency_key', token)
      ).data,
    ).toEqual([]);
  });
});
