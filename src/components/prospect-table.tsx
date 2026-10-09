import Link from 'next/link';
import { label } from '@/lib/config';
import type { Tables } from '@/lib/database.types';
import { listingNames } from '@/lib/discovery/display';
import { GoogleAttribution } from './discovery-attribution';
export async function ProspectTable({
  rows,
  emptyMessage,
}: {
  emptyMessage?: string;
  rows: Pick<
    Tables<'prospects'>,
    | 'id'
    | 'business_name'
    | 'industry'
    | 'city'
    | 'website_status'
    | 'stage'
    | 'next_follow_up'
  >[] &
    Partial<Pick<Tables<'prospects'>, 'source_type' | 'discovery_id'>>[];
}) {
  const live = await listingNames(rows);
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Business</th>
            <th>Location</th>
            <th>Website classification</th>
            <th>Stage</th>
            <th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/app/prospects/${p.id}`}>
                  {live.get(p.id)?.name || p.business_name}
                </Link>
                <br />
                <small className="muted">
                  {p.industry || 'No industry set'}
                </small>
                {live.has(p.id) && (
                  <GoogleAttribution
                    contributors={live.get(p.id)!.attributions}
                  />
                )}
              </td>
              <td>{live.get(p.id)?.address || p.city || '—'}</td>
              <td>
                <span className="badge">{label(p.website_status)}</span>
              </td>
              <td>
                <span className={`badge badge-${p.stage}`}>
                  {label(p.stage)}
                </span>
              </td>
              <td>{p.next_follow_up || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      {emptyMessage ? (
        <p>{emptyMessage}</p>
      ) : (
        <>
          <h3>No prospects here yet</h3>
          <p>
            <Link href="/app/discover">Find businesses →</Link>, add one
            manually, or import your first CSV.
          </p>
          <Link href="/app/prospects/new">Add your first prospect →</Link>
        </>
      )}
    </div>
  );
}
