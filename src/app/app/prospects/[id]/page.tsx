import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { workspaceContext } from '@/lib/context';
import { label } from '@/lib/config';
import { ProspectForm } from '@/components/prospect-form';
import { NoteForm, ProspectActions } from '@/components/prospect-actions';
import type { Json } from '@/lib/database.types';
function changeText(type: string, data: Json) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
  return `${type === 'stage_change' ? 'Stage' : 'Follow-up'}: ${String(data.from ?? 'Not set')} → ${String(data.to ?? 'Not set')}`;
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { client, workspace } = await workspaceContext();
  const { data: p, error } = await client
    .from('prospects')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Prospect unavailable');
  if (!p) notFound();
  const { data: activities, error: activityError } = await client
    .from('prospect_activities')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })
    .order('id')
    .limit(100);
  if (activityError) throw new Error('Activities unavailable');
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Prospects / Detail</div>
          <h1>{p.business_name}</h1>
          <div className="row">
            <span className={`badge badge-${p.stage}`}>{label(p.stage)}</span>
            <span className="muted">
              {[p.city, p.province, p.country].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>
        <Link href="/app/prospects">Back to prospects →</Link>
      </div>
      <div className="grid">
        <section className="card">
          <h2>Business information</h2>
          <dl>
            <dt>Website</dt>
            <dd>
              {p.website_url ? (
                <a
                  href={p.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p.website_url} ↗
                </a>
              ) : (
                'Not provided'
              )}
            </dd>
            <dt>Classification</dt>
            <dd>
              {label(p.website_status)}
              <br />
              <small className="muted">User supplied · no audit</small>
            </dd>
            <dt>Email</dt>
            <dd>{p.email || '—'}</dd>
            <dt>Phone</dt>
            <dd>{p.phone || '—'}</dd>
            <dt>Industry</dt>
            <dd>{p.industry || '—'}</dd>
            <dt>Source</dt>
            <dd>
              {label(p.source_type)}
              {p.source_reference && <p>{p.source_reference}</p>}
            </dd>
            <dt>Verification</dt>
            <dd>
              {label(p.verification_status)}
              {p.verified_at && (
                <>
                  <br />
                  <small>
                    {new Date(p.verified_at).toLocaleString('en-CA', {
                      timeZone: workspace.timezone,
                    })}
                  </small>
                </>
              )}
            </dd>
            <dt>Follow-up</dt>
            <dd>{p.next_follow_up || 'Not set'}</dd>
          </dl>
        </section>
        <section className="card">
          <h2>Conversation notes</h2>
          <NoteForm id={id} />
        </section>
        <section className="card full">
          <h2>Edit prospect &amp; next steps</h2>
          <ProspectForm prospect={p} />
        </section>
        <section className="card full">
          <h2>Activity history</h2>
          <small className="muted">
            Latest 100 activities · newest first · {workspace.timezone}
          </small>
          {activities?.length ? (
            <ol className="timeline">
              {activities.map((a) => (
                <li key={a.id}>
                  <span className="badge">{label(a.type)}</span>
                  <p>
                    {a.type === 'note'
                      ? a.note
                      : changeText(a.type, a.change_data)}
                  </p>
                  <small className="muted">
                    {new Date(a.created_at).toLocaleString('en-CA', {
                      timeZone: workspace.timezone,
                    })}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty">
              Notes, stage changes, and follow-ups will appear here.
            </div>
          )}
        </section>
        <section className="card full">
          <h2>Delete prospect</h2>
          <p className="muted">
            Deleting also removes this prospect’s notes and history.
          </p>
          <ProspectActions id={id} />
        </section>
      </div>
    </>
  );
}
