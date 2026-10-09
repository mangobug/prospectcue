import Link from 'next/link';
import { workspaceContext } from '@/lib/context';
import { todayInTimezone } from '@/lib/validation';
import { ProspectTable } from '@/components/prospect-table';
import { Button } from '@/components/ui/button';
export default async function Dashboard() {
  const { client, workspace } = await workspaceContext();
  const today = todayInTimezone(workspace.timezone);
  const [total, due, won, active, followups] = await Promise.all([
    client
      .from('prospects')
      .select('*', { head: true, count: 'exact' })
      .eq('workspace_id', workspace.id),
    client
      .from('prospects')
      .select('*', { head: true, count: 'exact' })
      .eq('workspace_id', workspace.id)
      .lte('next_follow_up', today)
      .not('stage', 'in', '(won,lost)'),
    client
      .from('prospects')
      .select('*', { head: true, count: 'exact' })
      .eq('workspace_id', workspace.id)
      .eq('stage', 'won'),
    client
      .from('prospects')
      .select('*', { head: true, count: 'exact' })
      .eq('workspace_id', workspace.id)
      .in('stage', ['contacted', 'meeting', 'proposal']),
    client
      .from('prospects')
      .select('*')
      .eq('workspace_id', workspace.id)
      .lte('next_follow_up', today)
      .not('stage', 'in', '(won,lost)')
      .order('next_follow_up')
      .order('id')
      .limit(10),
  ]);
  if ([total, due, won, active, followups].some((r) => r.error))
    throw new Error('Dashboard unavailable');
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Your agency, organized</div>
          <h1>A clear view of what’s next.</h1>
          <p className="muted">
            Track opportunities. Keep the conversation moving.
          </p>
        </div>
        <div className="row">
          <Button asChild>
            <Link href="/app/discover">Find businesses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/prospects/new">+ Add prospect</Link>
          </Button>
        </div>
      </div>
      <section className="stats" aria-label="Prospect counts">
        {[
          ['Total prospects', total.count],
          ['Follow-ups due', due.count],
          ['In conversation', active.count],
          ['Won prospects', won.count],
        ].map(([name, count]) => (
          <div className="card" key={name}>
            <small className="muted">{name}</small>
            <div className="stat-number">{count ?? 0}</div>
          </div>
        ))}
      </section>
      <section className="card">
        <div className="row between">
          <div>
            <h2>Follow-ups that need you</h2>
            <p className="muted">
              Due on or before {today} · {workspace.timezone} · excludes won and
              lost
            </p>
          </div>
          <Link href="/app/prospects?sort=next_follow_up">All prospects →</Link>
        </div>
        <ProspectTable
          rows={followups.data ?? []}
          emptyMessage="You’re all caught up. No follow-ups are due."
        />
      </section>
      <div className="grid" style={{ marginTop: 20 }}>
        <section className="card">
          <h2>Bring your prospect list</h2>
          <p className="muted">
            Map your columns, review duplicates, and import only the rows you
            want.
          </p>
          <Button asChild variant="outline">
            <Link href="/app/import">Import a CSV</Link>
          </Button>
        </section>
        <section className="card">
          <h2>Keep every opportunity moving</h2>
          <p className="muted">
            From first review to a won project, your pipeline shows the current
            stage.
          </p>
          <Button asChild variant="outline">
            <Link href="/app/pipeline">Open pipeline</Link>
          </Button>
        </section>
      </div>
    </>
  );
}
