import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Database } from '@/lib/database.types';
process.loadEnvFile('.env.test');
const url = process.env.TEST_SUPABASE_URL!;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Integration tests require local Supabase');
export const admin = createClient<Database>(
  url,
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export const clients: { userId: string; workspace: string }[] = [];
export async function makeUser() {
  const email = `fictional-${randomUUID()}@example.invalid`;
  const password = randomUUID() + 'Aa1!';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error || new Error('User creation failed');
  const client = createClient<Database>(
    url,
    process.env.TEST_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const { data: workspace, error: we } = await client.rpc('create_workspace', {
    workspace_name: 'Fictional test agency',
  });
  if (we || !workspace) throw we || new Error('No workspace');
  clients.push({ userId: data.user.id, workspace });
  return { client, workspace, userId: data.user.id, email, password };
}
export async function cleanup() {
  for (const u of clients) {
    await admin.from('workspaces').delete().eq('id', u.workspace);
    await admin.auth.admin.deleteUser(u.userId);
  }
}
