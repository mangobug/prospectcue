import Link from 'next/link';
import { workspaceContext } from '@/lib/context';
import { stages, label } from '@/lib/config';
export default async function Pipeline() {
  const { client, workspace } = await workspaceContext();
  const lanes = await Promise.all(
    stages.map((stage) =>
      client
        .from('prospects')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspace.id)
        .eq('stage', stage)
        .order('updated_at', { ascending: false })
        .order('id')
        .limit(30),
    ),
  );
  if (lanes.some((l) => l.error)) throw new Error('Pipeline unavailable');
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Pipeline</div>
          <h1>Every opportunity has a next step.</h1>
          <p className="muted">
            Open a prospect to change its stage and set your next follow-up.
          </p>
        </div>
        <Link href="/app/prospects/new">+ Add prospect</Link>
      </div>
      <div className="pipeline">
        {stages.map((stage, i) => (
          <section className="lane" key={stage}>
            <div className="row between">
              <h3 style={{ margin: 0 }}>{label(stage)}</h3>
              <span className="badge">{lanes[i].count ?? 0}</span>
            </div>
            {lanes[i].data?.map((p) => (
              <article className="card" key={p.id}>
                <Link href={`/app/prospects/${p.id}`}>
                  <strong>{p.business_name}</strong>
                </Link>
                <div className="muted">
                  <small>
                    {p.city || 'No city'} · {p.industry || 'No industry'}
                  </small>
                </div>
                <small className="muted">
                  {p.next_follow_up
                    ? `Follow-up ${p.next_follow_up}`
                    : 'No follow-up set'}
                </small>
              </article>
            ))}
            {!lanes[i].count && (
              <p className="muted" style={{ marginTop: 24 }}>
                No prospects
              </p>
            )}
            {(lanes[i].count ?? 0) > 30 && (
              <Link href={`/app/prospects?stage=${stage}`}>
                View all {lanes[i].count} →
              </Link>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
