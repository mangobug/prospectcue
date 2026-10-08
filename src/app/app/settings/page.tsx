import { workspaceContext } from '@/lib/context';
import { updateWorkspace } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { workspace, role } = await workspaceContext();
  const { message } = await searchParams;
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Workspace settings</div>
          <h1>A workspace for your agency.</h1>
          <p className="muted">You are a workspace {role}.</p>
        </div>
      </div>
      <section className="card" style={{ maxWidth: 650 }}>
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        <form action={updateWorkspace} className="stack">
          <div>
            <label htmlFor="name">Workspace name</label>
            <input
              id="name"
              name="name"
              defaultValue={workspace.name}
              required
              maxLength={100}
              disabled={role !== 'owner'}
            />
          </div>
          <div>
            <label>Follow-up timezone</label>
            <p>{workspace.timezone}</p>
            <small className="muted">
              The first milestone uses the Toronto calendar for date-only
              follow-ups.
            </small>
          </div>
          <div>
            <SubmitButton disabled={role !== 'owner'}>
              Save workspace
            </SubmitButton>
          </div>
        </form>
      </section>
    </>
  );
}
