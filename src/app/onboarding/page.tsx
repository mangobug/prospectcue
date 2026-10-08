import { redirect } from 'next/navigation';
import { context } from '@/lib/context';
import { product } from '@/lib/config';
import { createWorkspace, signOut } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/submit-button';
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { workspace } = await context(false, false);
  if (workspace) redirect('/app');
  const { message } = await searchParams;
  return (
    <main className="auth-main" style={{ minHeight: '100vh' }}>
      <div className="auth-form card">
        <div className="eyebrow">{product.name}</div>
        <h1>Give your agency a home.</h1>
        <p className="muted">
          Your prospects are private to your workspace. You can change the name
          later.
        </p>
        {message && <div className="notice error">{message}</div>}
        <form action={createWorkspace} className="stack">
          <div>
            <label htmlFor="name">Workspace name</label>
            <input
              id="name"
              name="name"
              defaultValue={product.initialWorkspace}
              maxLength={100}
              required
            />
          </div>
          <small className="muted">Follow-ups use America/Toronto dates.</small>
          <SubmitButton>Create workspace</SubmitButton>
        </form>
        <form action={signOut} style={{ marginTop: 16 }}>
          <Button variant="outline">Sign out</Button>
        </form>
      </div>
    </main>
  );
}
