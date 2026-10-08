import 'server-only';
import { redirect } from 'next/navigation';
import { db } from './supabase/server';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function context(api = false, workspaceRequired = true) {
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    if (api) throw new ApiError(401, 'Please sign in');
    redirect('/sign-in');
  }
  const { data: membership, error: membershipError } = await client
    .from('workspace_memberships')
    .select('workspace_id,role,workspaces(*)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw new ApiError(503, 'Workspace could not be loaded');
  if (!membership && workspaceRequired) {
    if (api) throw new ApiError(403, 'Create your workspace first');
    redirect('/onboarding');
  }
  return {
    client,
    user,
    workspace: membership?.workspaces ?? null,
    role: membership?.role,
  };
}
export async function workspaceContext(api = false) {
  const c = await context(api);
  if (!c.workspace) throw new ApiError(403, 'Workspace required');
  return { ...c, workspace: c.workspace };
}
