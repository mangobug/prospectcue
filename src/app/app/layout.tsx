import { workspaceContext } from '@/lib/context';
import { product } from '@/lib/config';
import { Navigation } from '@/components/navigation';
import { signOut } from '@/app/actions';
import { Button } from '@/components/ui/button';
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await workspaceContext();
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">A</span>
          {product.name}
        </div>
        <div className="workspace-name">
          <small>YOUR WORKSPACE</small>
          <br />
          <strong>{workspace.name}</strong>
        </div>
        <Navigation />
        <div className="sidebar-foot">
          A little structure.
          <br />A lot of opportunity.
        </div>
      </aside>
      <div>
        <header className="topbar">
          <span className="muted">{workspace.name}</span>
          <div className="row">
            <small className="muted">
              {user.user_metadata.display_name || 'Agency member'}
            </small>
            <form action={signOut}>
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
