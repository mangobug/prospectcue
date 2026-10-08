import Link from 'next/link';
import { z } from 'zod';
import { workspaceContext } from '@/lib/context';
import { stages, websiteStatuses, label } from '@/lib/config';
import { ProspectTable } from '@/components/prospect-table';
import { Button } from '@/components/ui/button';
const filterSchema = z.object({
  q: z.string().max(200).catch(''),
  stage: z.enum(stages).optional().catch(undefined),
  industry: z.string().max(100).catch(''),
  city: z.string().max(100).catch(''),
  website_status: z.enum(websiteStatuses).optional().catch(undefined),
  sort: z
    .enum(['business_name', 'created_at', 'next_follow_up'])
    .catch('created_at'),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});
const literal = (s: string) => s.replace(/[\\%_]/g, '\\$&');
export default async function Prospects({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const f = filterSchema.parse({ q: '', industry: '', city: '', ...raw });
  const { client, workspace } = await workspaceContext();
  let query = client
    .from('prospects')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspace.id);
  if (f.q) query = query.ilike('business_name', `%${literal(f.q)}%`);
  if (f.stage) query = query.eq('stage', f.stage);
  if (f.industry) query = query.ilike('industry', literal(f.industry));
  if (f.city) query = query.ilike('city', literal(f.city));
  if (f.website_status) query = query.eq('website_status', f.website_status);
  const { data, count, error } = await query
    .order(f.sort, { ascending: f.sort !== 'created_at', nullsFirst: false })
    .order('id')
    .range((f.page - 1) * 20, f.page * 20 - 1);
  if (error) throw new Error('Prospects unavailable');
  const pageLink = (page: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(f))
      if (value) qs.set(key, String(value));
    qs.set('page', String(page));
    return `/app/prospects?${qs}`;
  };
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Prospects</div>
          <h1>Your next opportunities.</h1>
          <p className="muted">
            {count ?? 0} matching prospects · website classifications are user
            supplied.
          </p>
        </div>
        <div className="row">
          <Button asChild variant="outline">
            <Link href="/app/import">Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/app/prospects/new">+ Add prospect</Link>
          </Button>
        </div>
      </div>
      <section className="card">
        <form className="filters">
          <div>
            <label htmlFor="q">Search business</label>
            <input
              id="q"
              name="q"
              defaultValue={f.q}
              placeholder="Business name…"
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="stage">Stage</label>
            <select name="stage" id="stage" defaultValue={f.stage ?? ''}>
              <option value="">All stages</option>
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="industry">Industry</label>
            <input
              name="industry"
              id="industry"
              defaultValue={f.industry}
              placeholder="Exact industry"
            />
          </div>
          <div>
            <label htmlFor="city">City</label>
            <input
              name="city"
              id="city"
              defaultValue={f.city}
              placeholder="Exact city"
            />
          </div>
          <div>
            <label htmlFor="website_status">Website status</label>
            <select
              id="website_status"
              name="website_status"
              defaultValue={f.website_status ?? ''}
            >
              <option value="">All classifications</option>
              {websiteStatuses.map((s) => (
                <option value={s} key={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={f.sort}>
              <option value="created_at">Newest first</option>
              <option value="business_name">Business A–Z</option>
              <option value="next_follow_up">Follow-up date</option>
            </select>
          </div>
          <div className="row full">
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
            <Link href="/app/prospects">Clear</Link>
          </div>
        </form>
        <ProspectTable rows={data ?? []} />
        <div className="row between pagination">
          <small className="muted">
            Page {f.page} of {Math.max(1, Math.ceil((count ?? 0) / 20))} · 20
            per page
          </small>
          <div className="row">
            {f.page > 1 && (
              <Button asChild variant="outline">
                <Link href={pageLink(f.page - 1)}>Previous</Link>
              </Button>
            )}
            {f.page * 20 < (count ?? 0) && (
              <Button asChild variant="outline">
                <Link href={pageLink(f.page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
