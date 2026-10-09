'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { reportSchema } from '@/lib/audits/schema';
import type { Database } from '@/lib/database.types';
type Run = Database['public']['Tables']['audit_runs']['Row'];
function active(run: Run) {
  return (
    ['queued', 'running'].includes(run.status) &&
    Date.now() - Date.parse(run.created_at) < 20 * 60 * 1000
  );
}
export function WebsiteAudit({
  id,
  website,
  configured,
}: {
  id: string;
  website: string | null;
  configured: boolean;
}) {
  const [url, setUrl] = useState(website || ''),
    [runs, setRuns] = useState<Run[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let stopped = false;
    async function refresh() {
      try {
        const response = await fetch(`/api/prospects/${id}/audits`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || 'Unable to load audits');
        if (!stopped) {
          setRuns(data.runs);
          setLoaded(true);
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : 'Unable to load audits');
          setLoaded(true);
        }
      }
    }
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [id]);
  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/prospects/${id}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start audit');
      const latest = await fetch(`/api/prospects/${id}/audits`, {
        cache: 'no-store',
      });
      if (latest.ok) setRuns((await latest.json()).runs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start audit');
    } finally {
      setBusy(false);
    }
  }
  const pending = runs.some(active);
  return (
    <section className="card full" aria-labelledby="website-audit-heading">
      <h2 id="website-audit-heading">Website audit</h2>
      <p>
        Check this prospect’s public homepage and review the evidence before
        contacting them. Audits keep a separate snapshot; they do not change the
        pipeline or your website classification.
      </p>
      {!configured && (
        <p className="notice">
          Website audits need the background worker configured by the workspace
          owner. Your prospect and notes remain saved.
        </p>
      )}
      <form onSubmit={start} className="stack">
        <div>
          <label htmlFor="audit-url">Website to audit</label>
          <input
            id="audit-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            maxLength={2048}
            placeholder="https://business-website.com"
            aria-describedby="audit-url-help"
          />
          <small id="audit-url-help" className="muted">
            Confirm the business website address. Use its public homepage
            without login credentials or query parameters. Google listing
            details are not copied into this audit.
          </small>
        </div>
        <div>
          <Button disabled={!configured || !loaded || busy || pending}>
            {busy
              ? 'Starting…'
              : pending
                ? 'Audit in progress…'
                : runs.length
                  ? 'Run a new audit'
                  : 'Audit website'}
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!loaded && <p role="status">Loading audit history…</p>}
      {loaded && !runs.length && !error && (
        <p className="empty">No website audits yet.</p>
      )}
      <div className="stack audit-history">
        {runs.map((run, index) => {
          const parsed = reportSchema.safeParse(run.report),
            report = parsed.success ? parsed.data : null;
          const timedOut =
            ['queued', 'running'].includes(run.status) && !active(run);
          return (
            <article key={run.id} className="audit-run">
              <h3>
                {index === 0 ? 'Latest audit' : 'Earlier audit'} ·{' '}
                {timedOut ? 'Timed out' : run.status}
              </h3>
              <p className="muted">
                Requested {new Date(run.created_at).toLocaleString()} ·{' '}
                {run.requested_url}
              </p>
              {active(run) && (
                <p role="status">
                  {run.status === 'queued'
                    ? 'Queued for the website worker.'
                    : 'Visiting the homepage and collecting evidence.'}{' '}
                  You can leave this page and come back.
                </p>
              )}
              {timedOut && (
                <p role="status">
                  This audit did not finish within 20 minutes. Run a new audit.
                </p>
              )}
              {run.error_message && (
                <p className="notice error">{run.error_message}</p>
              )}
              {run.status === 'completed' && !report && (
                <p className="notice">
                  This report could not be displayed. Run a new audit.
                </p>
              )}
              {report && (
                <>
                  <p>
                    <strong>
                      {
                        report.findings.filter((f) => f.status === 'issue')
                          .length
                      }{' '}
                      observed issue(s)
                    </strong>{' '}
                    ·{' '}
                    {
                      report.findings.filter((f) => f.status === 'unknown')
                        .length
                    }{' '}
                    check(s) need manual review · Homepage only
                  </p>
                  <p>
                    <a
                      href={report.finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Audited page ↗
                    </a>{' '}
                    · Observed {new Date(report.checkedAt).toLocaleString()}
                  </p>
                  {run.has_screenshot && (
                    <details>
                      <summary>
                        View mobile screenshot evidence (390 × 844)
                      </summary>
                      <a
                        href={`/api/audits/${run.id}/evidence`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open screenshot ↗
                      </a>
                      {/* Authenticated evidence URL; signed storage credentials never enter browser markup. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="audit-screenshot"
                        src={`/api/audits/${run.id}/evidence`}
                        alt="Homepage captured by the audit worker at a 390-pixel mobile viewport"
                        loading="lazy"
                      />
                    </details>
                  )}
                  <ul className="audit-findings">
                    {[...report.findings]
                      .sort(
                        (a, b) =>
                          ({ issue: 0, unknown: 1, pass: 2 })[a.status] -
                          { issue: 0, unknown: 1, pass: 2 }[b.status],
                      )
                      .map((f) => (
                        <li key={f.id}>
                          <h4>
                            <span className={`badge audit-${f.status}`}>
                              {f.status === 'issue'
                                ? 'Issue'
                                : f.status === 'unknown'
                                  ? 'Manual review'
                                  : 'Passed'}
                            </span>{' '}
                            {f.title}
                          </h4>
                          <p>
                            <strong>Evidence:</strong> {f.evidence}
                          </p>
                          <p className="muted">{f.recommendation}</p>
                        </li>
                      ))}
                  </ul>
                  <h4>Google PageSpeed · mobile lab test</h4>
                  {report.pageSpeed.status === 'available' ? (
                    <p>
                      Performance:{' '}
                      {report.pageSpeed.performance ?? 'Unavailable'}/100 ·
                      Accessibility:{' '}
                      {report.pageSpeed.accessibility ?? 'Unavailable'}/100 ·
                      SEO: {report.pageSpeed.seo ?? 'Unavailable'}/100
                      <br />
                      Largest contentful paint:{' '}
                      {report.pageSpeed.lcpMs === null
                        ? 'Unavailable'
                        : `${(report.pageSpeed.lcpMs / 1000).toFixed(2)} seconds`}{' '}
                      · Layout shift: {report.pageSpeed.cls ?? 'Unavailable'}
                      <br />
                      Measured:{' '}
                      {report.pageSpeed.measuredAt || 'Time unavailable'}
                    </p>
                  ) : (
                    <p>
                      Unavailable for this audit. No performance or
                      accessibility score was inferred.
                    </p>
                  )}
                  <details>
                    <summary>Scope and limitations</summary>
                    <ul>
                      {report.limitations.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
            </article>
          );
        })}
      </div>
      <small className="muted">
        Showing the latest five audits. Automated checks indicate things to
        review; they do not establish legal compliance or prove lost revenue.
      </small>
    </section>
  );
}
