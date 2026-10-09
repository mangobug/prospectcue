'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  GoogleAttribution,
  OvertureAttribution,
} from './discovery-attribution';
import type { DiscoveryQuery, DiscoveryResponse } from '@/lib/discovery/types';

type Saved = {
  id: string;
  prospect_id: string;
  status: 'saved' | 'already_saved';
};
export function DiscoverySearch({
  signedIn,
  googleAvailable,
}: {
  signedIn: boolean;
  googleAvailable: boolean;
}) {
  const [category, setCategory] = useState('dentists');
  const [location, setLocation] = useState('London, Ontario, Canada');
  const [provider, setProvider] =
    useState<DiscoveryQuery['provider']>('overture');
  const [response, setResponse] = useState<DiscoveryResponse | null>(null);
  const [lastQuery, setLastQuery] = useState<DiscoveryQuery | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function change(action: () => void) {
    action();
    setResponse(null);
    setSelected([]);
    setSaved([]);
    setError('');
  }
  async function search(query: DiscoveryQuery) {
    setBusy(true);
    setError('');
    setSelected([]);
    setSaved([]);
    try {
      const r = await fetch('/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        cache: 'no-store',
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error || 'Search could not be completed.');
      setResponse(data);
      setLastQuery(query);
    } catch (e) {
      setResponse(null);
      setError(
        e instanceof Error ? e.message : 'Search could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!response || !lastQuery) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/discovery/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: response.provider,
          category: lastQuery.category,
          items: response.results
            .filter((p) => selected.includes(p.id))
            .map((p) => ({
              id: p.id,
              ...(p.selectionToken ? { selectionToken: p.selectionToken } : {}),
            })),
        }),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error || 'The selection could not be saved.');
      setSaved(data.results);
      setSelected([]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The selection could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="discovery">
      <section className="card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search({ provider, category, location, page: 1 });
          }}
          className="stack"
        >
          <div className="discovery-fields">
            <div>
              <label htmlFor="discovery-category">Business category</label>
              <input
                id="discovery-category"
                value={category}
                onChange={(e) => change(() => setCategory(e.target.value))}
                minLength={2}
                maxLength={100}
                required
                disabled={busy}
                placeholder="Dentists, plumbers, bakeries…"
              />
            </div>
            <div>
              <label htmlFor="discovery-location">Location</label>
              <input
                id="discovery-location"
                value={location}
                onChange={(e) => change(() => setLocation(e.target.value))}
                minLength={2}
                maxLength={150}
                required
                disabled={busy}
                placeholder="City, province / state, country"
              />
            </div>
            <div>
              <label htmlFor="discovery-source">Listing source</label>
              <select
                id="discovery-source"
                value={provider}
                onChange={(e) =>
                  change(() =>
                    setProvider(e.target.value as DiscoveryQuery['provider']),
                  )
                }
                disabled={busy}
              >
                <option value="overture">Overture Places</option>
                <option value="google_places" disabled={!googleAvailable}>
                  Google Places{googleAvailable ? '' : ' — being connected'}
                </option>
              </select>
            </div>
          </div>
          <div className="row between">
            <small className="muted">
              {provider === 'overture'
                ? 'Search published Overture business listings. Coverage depends on the regions imported.'
                : 'Search live Google business listings.'}
            </small>
            <Button type="submit" disabled={busy}>
              {busy ? 'Working…' : 'Find businesses'}
            </Button>
          </div>
        </form>
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {response && (
        <>
          <div className="row between discovery-summary">
            <div>
              <h2>
                {response.results.length}{' '}
                {response.results.length === 1 ? 'business' : 'businesses'} on
                this page
              </h2>
              <small className="muted">
                {lastQuery?.category} · {lastQuery?.location} ·{' '}
                {response.provider === 'overture'
                  ? 'Overture Places'
                  : 'Google Places'}
              </small>
            </div>
            {response.signedIn && response.results.length > 0 && (
              <div className="row">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    setSelected(
                      response.results
                        .filter((p) => !saved.some((s) => s.id === p.id))
                        .map((p) => p.id),
                    )
                  }
                >
                  Select page
                </Button>
                <Button
                  disabled={busy || !selected.length}
                  onClick={() => void save()}
                >
                  Save selected{selected.length ? ` (${selected.length})` : ''}
                </Button>
              </div>
            )}
          </div>
          {!response.signedIn && (
            <div className="notice">
              <strong>Try a real search—up to 5 businesses per preview.</strong>
              <p>
                Sign in to browse full results and save prospects to your
                workspace.
              </p>
              <div className="row">
                <Button asChild>
                  <Link href="/sign-up">Create an account</Link>
                </Button>
                <Link href="/sign-in">Sign in →</Link>
              </div>
            </div>
          )}
          {saved.length > 0 && (
            <div className="notice" role="status">
              {saved.filter((p) => p.status === 'saved').length} saved ·{' '}
              {saved.filter((p) => p.status === 'already_saved').length} already
              in your workspace.{' '}
              <Link href="/app/prospects">View prospects →</Link>
            </div>
          )}
          {response.provider === 'google_places' && (
            <p className="muted">
              Google listing details are loaded live. Saving retains a place
              reference and your own notes and pipeline, rather than a permanent
              copy of the listing.
            </p>
          )}
          <div className="discovery-results">
            {response.results.map((p) => {
              const record = saved.find((s) => s.id === p.id);
              return (
                <article className="card discovery-result" key={p.id}>
                  <div className="row between">
                    <h3>{p.name}</h3>
                    {response.signedIn && !record && (
                      <label className="discovery-select">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.name}`}
                          checked={selected.includes(p.id)}
                          disabled={busy}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, p.id]
                                : selected.filter((id) => id !== p.id),
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                  <p className="muted">{p.address || 'Address not listed'}</p>
                  {p.category && (
                    <span className="badge">
                      {p.category.replaceAll('_', ' ')}
                    </span>
                  )}
                  <dl>
                    <dt>Website</dt>
                    <dd>
                      {p.website ? (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Website listed ↗
                        </a>
                      ) : (
                        'Website not listed'
                      )}
                    </dd>
                    <dt>Phone</dt>
                    <dd>{p.phone || 'Not listed'}</dd>
                  </dl>
                  {p.mapsUrl && (
                    <a
                      href={p.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Google Maps ↗
                    </a>
                  )}
                  {p.release && (
                    <small className="muted">
                      Overture release {p.release}
                    </small>
                  )}
                  {response.provider === 'google_places' ? (
                    <GoogleAttribution contributors={p.attributions} />
                  ) : (
                    p.attributions.length > 0 && (
                      <small className="muted">
                        {p.attributions.map((a, i) => (
                          <span key={`${a.name}-${i}`}>
                            {i ? ' · ' : ''}
                            {a.url ? (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {a.name}
                              </a>
                            ) : (
                              a.name
                            )}
                          </span>
                        ))}
                      </small>
                    )
                  )}
                  {record && (
                    <Link
                      className="notice"
                      href={`/app/prospects/${record.prospect_id}`}
                    >
                      {record.status === 'saved' ? 'Saved' : 'Already saved'} ·
                      Open prospect →
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
          {!response.results.length && (
            <div className="card empty">
              <h3>No businesses found for this search</h3>
              <p>
                Try a broader category, a nearby city, or the other listing
                source. Overture searches cover imported regions.
              </p>
            </div>
          )}
          <div className="row between pagination">
            <small className="muted">
              Page {response.page}
              {response.signedIn ? ' · 20 per page' : ' · anonymous preview'}
            </small>
            {response.signedIn && (
              <div className="row">
                {response.page > 1 && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      lastQuery &&
                      void search({
                        ...lastQuery,
                        page: 1,
                        pageToken: undefined,
                      })
                    }
                  >
                    First page
                  </Button>
                )}
                {response.hasMore && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      lastQuery &&
                      void search({
                        ...lastQuery,
                        page: response.page + 1,
                        pageToken: response.nextPageToken,
                      })
                    }
                  >
                    Next results
                  </Button>
                )}
              </div>
            )}
          </div>
          {response.provider === 'google_places' ? (
            <GoogleAttribution
              contributors={response.results.flatMap((p) => p.attributions)}
            />
          ) : (
            <OvertureAttribution />
          )}
        </>
      )}
      <p className="muted discovery-help">
        A missing website link means no website is listed in this source. It
        does not verify that the business has no website. No website audit has
        run.
      </p>
      {!signedIn && !response && (
        <p className="muted">
          Explore up to 5 real results before signing up. Your saved prospects
          and pipeline are private to your workspace.
        </p>
      )}
    </div>
  );
}
