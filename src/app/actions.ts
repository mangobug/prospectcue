'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/supabase/server';
import { context, workspaceContext } from '@/lib/context';
import { workspaceSchema } from '@/lib/validation';
const authSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});
function message(path: string, text: string): never {
  redirect(`${path}?message=${encodeURIComponent(text)}`);
}
function appUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error('APP_URL must be configured');
  return new URL(value).origin;
}
export async function signIn(form: FormData) {
  const input = authSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    message(
      '/sign-in',
      'Enter a valid email and a password of at least 8 characters',
    );
  const client = await db();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error)
    message(
      '/sign-in',
      'Unable to sign in. Check your credentials and confirm your email.',
    );
  redirect('/app');
}
export async function signUp(form: FormData) {
  const input = authSchema
    .extend({ display_name: z.string().trim().min(1).max(100) })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    message(
      '/sign-up',
      'Enter a name, valid email and password of at least 8 characters',
    );
  const client = await db();
  const { data, error } = await client.auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: {
      data: { display_name: input.data.display_name },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });
  if (error)
    message('/sign-up', 'Unable to create account. Please try again later.');
  if (data.session) redirect('/onboarding');
  message(
    '/sign-in',
    'Check your email to confirm your account, then sign in.',
  );
}
export async function signOut() {
  const client = await db();
  await client.auth.signOut();
  redirect('/sign-in');
}
export async function forgotPassword(form: FormData) {
  const input = z.email().safeParse(form.get('email'));
  if (!input.success) message('/forgot-password', 'Enter a valid email');
  const client = await db();
  const { error } = await client.auth.resetPasswordForEmail(input.data, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
  });
  if (error)
    message(
      '/forgot-password',
      'Reset email could not be sent. Try again later.',
    );
  message(
    '/forgot-password',
    'If an account exists, a reset link has been sent.',
  );
}
export async function resetPassword(form: FormData) {
  const password = z.string().min(8).max(128).safeParse(form.get('password'));
  if (!password.success)
    message('/reset-password', 'Use a password of 8–128 characters');
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) message('/forgot-password', 'Use a valid password reset link');
  const { error } = await client.auth.updateUser({ password: password.data });
  if (error)
    message(
      '/reset-password',
      'Password could not be changed. Request a new reset link.',
    );
  await client.auth.signOut();
  message('/sign-in', 'Password updated. Sign in with your new password.');
}
export async function createWorkspace(form: FormData) {
  const { client } = await context(false, false);
  const input = workspaceSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    message('/onboarding', 'Workspace name must be 1–100 characters');
  const { error } = await client.rpc('create_workspace', {
    workspace_name: input.data.name,
  });
  if (error)
    message('/onboarding', 'Workspace could not be created. Please retry.');
  redirect('/app');
}
export async function updateWorkspace(form: FormData) {
  const { client, workspace, role } = await workspaceContext();
  if (role !== 'owner') message('/app/settings', 'Owner access required');
  const input = workspaceSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    message('/app/settings', 'Workspace name must be 1–100 characters');
  const { error } = await client
    .from('workspaces')
    .update({ name: input.data.name })
    .eq('id', workspace.id);
  if (error) message('/app/settings', 'Workspace could not be updated');
  revalidatePath('/app', 'layout');
  message('/app/settings', 'Workspace updated');
}
