'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import {
  feedbackCsv,
  importFields,
  MAX_BYTES,
  parseCsv,
  type Mapping,
  type PreviewRow,
} from '@/lib/imports';
import { label } from '@/lib/config';
import type { Tables } from '@/lib/database.types';
const aliases: Record<string, string[]> = {
  business_name: ['business name', 'name', 'business'],
  website_url: ['website', 'url', 'website url'],
  province: ['province/state', 'province', 'state'],
  source_reference: ['source', 'source reference'],
  email: ['email'],
  phone: ['phone', 'telephone'],
};
const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;
export function ImportFlow() {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    hydratedSnapshot,
    serverSnapshot,
  );
  const [csv, setCsv] = useState(''),
    [filename, setFilename] = useState(''),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<Mapping>({}),
    [rows, setRows] = useState<PreviewRow[]>([]),
    [allowRows, setAllowRows] = useState<number[]>([]),
    [token, setToken] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [batch, setBatch] = useState<Tables<'import_batches'> | null>(null),
    [locked, setLocked] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setRows([]);
    setBatch(null);
    setAllowRows([]);
    setLocked(false);
    try {
      if (file.size > MAX_BYTES) throw new Error('CSV exceeds the 2 MB limit');
      const content = await file.text();
      const parsed = parseCsv(content);
      const initial: Mapping = {};
      for (const field of importFields) {
        const match = parsed.headers.find(
          (h) =>
            h.trim().toLowerCase() === field ||
            h.trim().toLowerCase() === field.replaceAll('_', ' ') ||
            aliases[field]?.includes(h.trim().toLowerCase()),
        );
        if (match) initial[field] = match;
      }
      setCsv(content);
      setFilename(file.name);
      setHeaders(parsed.headers);
      setMapping(initial);
      setToken(crypto.randomUUID());
    } catch (e) {
      setCsv('');
      setHeaders([]);
      setError(e instanceof Error ? e.message : 'Unable to read CSV');
    }
  }
  async function request(mode: 'preview' | 'confirm') {
    setBusy(true);
    setError('');
    if (mode === 'confirm') setLocked(true);
    try {
      const response = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv,
          filename,
          mapping,
          mode,
          token,
          allowRows,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRows(result.rows);
      if (mode === 'confirm') {
        setBatch(result.batch);
        setCsv('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to process CSV');
    } finally {
      setBusy(false);
    }
  }
  function downloadErrors() {
    const blob = new Blob(['\uFEFF', feedbackCsv(rows)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-invalid-rows.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  const valid = rows.filter((r) => r.data).length,
    invalid = rows.length - valid,
    duplicate = rows.filter(
      (r) => r.duplicate && !allowRows.includes(r.row),
    ).length;
  return (
    <div className="stack">
      <div className="row muted" aria-label="Import steps">
        <span>1 Upload</span>
        <span>→ 2 Map columns</span>
        <span>→ 3 Preview &amp; review</span>
        <span>→ 4 Confirm</span>
        <span>→ 5 Results</span>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {batch ? (
        <section className="card">
          <div className="eyebrow">Import complete</div>
          <h2>{batch.filename}</h2>
          <div className="stats">
            {[
              ['Total', batch.total_count],
              ['Imported', batch.imported_count],
              ['Skipped duplicates', batch.skipped_count],
              ['Invalid', batch.invalid_count],
            ].map(([title, count]) => (
              <div key={title}>
                <small className="muted">{title}</small>
                <div className="stat-number">{count}</div>
              </div>
            ))}
          </div>
          <p className="muted">
            Saved as one transaction. Your original CSV was not retained.
          </p>
          <div className="row">
            <Button asChild>
              <Link href="/app/prospects">View prospects</Link>
            </Button>
            {invalid > 0 && (
              <Button variant="outline" onClick={downloadErrors}>
                Download invalid rows
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setBatch(null);
                setRows([]);
                setHeaders([]);
                setLocked(false);
              }}
            >
              Import another file
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>Start with your CSV</h2>
            <p className="muted">
              UTF-8 CSV · up to 2 MB and 1,000 rows · original files are
              processed in memory only.
            </p>
            <p>
              <a href="/example.csv" download className="muted">
                Download fictional example CSV ↓
              </a>
            </p>
            <label htmlFor="file">Upload CSV file</label>
            <input
              id="file"
              type="file"
              accept=".csv,text/csv"
              disabled={!hydrated || busy || locked}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </section>
          {headers.length > 0 && (
            <section className="card">
              <h2>Map your columns</h2>
              <p className="muted">
                Choose the corresponding CSV header for each field. Business
                name is required; all other columns are optional.
              </p>
              <div className="grid">
                {importFields.map((field) => (
                  <div key={field}>
                    <label htmlFor={`map-${field}`}>
                      {label(field)}
                      {field === 'business_name' ? ' *' : ''}
                    </label>
                    <select
                      id={`map-${field}`}
                      value={mapping[field] ?? ''}
                      disabled={!hydrated || busy || locked}
                      onChange={(e) => {
                        setMapping({ ...mapping, [field]: e.target.value });
                        setRows([]);
                        setAllowRows([]);
                      }}
                    >
                      <option value="">Do not import</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <Button
                style={{ marginTop: 20 }}
                variant="outline"
                disabled={busy || locked || !mapping.business_name}
                onClick={() => request('preview')}
              >
                {busy ? 'Validating…' : 'Preview & validate'}
              </Button>
            </section>
          )}
          {rows.length > 0 && (
            <section className="card">
              <h2>Review before importing</h2>
              <p>
                {valid} valid · {invalid} invalid · {duplicate} duplicate
                candidates skipped by default
              </p>
              <p className="muted">
                Matching uses normalized business name + city + province/state +
                country. A shared website or social domain alone never matches.
                Invalid rows are excluded. Matches are rechecked when the import
                is committed.
              </p>
              {invalid > 0 && (
                <Button variant="outline" onClick={downloadErrors}>
                  Download invalid rows
                </Button>
              )}
              <div
                className="table-wrap"
                style={{ maxHeight: 500, marginTop: 20 }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Record</th>
                      <th>Business</th>
                      <th>Location</th>
                      <th>Validation / duplicate review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>
                          {r.data?.business_name ||
                            r.raw[
                              headers.indexOf(mapping.business_name ?? '')
                            ] ||
                            '—'}
                        </td>
                        <td>{r.data?.city || '—'}</td>
                        <td>
                          {r.errors.length ? (
                            <span style={{ color: '#9f1239' }}>
                              {r.errors.join('; ')}
                            </span>
                          ) : r.duplicate ? (
                            <>
                              <small>{r.duplicateReason}</small>
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  disabled={!hydrated || busy || locked}
                                  checked={allowRows.includes(r.row)}
                                  onChange={(e) =>
                                    setAllowRows(
                                      e.target.checked
                                        ? [...allowRows, r.row]
                                        : allowRows.filter((n) => n !== r.row),
                                    )
                                  }
                                />
                                Import as a separate record
                              </label>
                            </>
                          ) : (
                            <span className="badge badge-won">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ marginTop: 20 }}>
                <Button
                  disabled={busy || valid === 0}
                  onClick={() => request('confirm')}
                >
                  {busy
                    ? 'Importing…'
                    : locked
                      ? 'Retry same import'
                      : 'Confirm import'}
                </Button>
                <small className="muted">
                  {locked
                    ? 'Selections are locked for a safe retry.'
                    : `${valid - duplicate} records expected; duplicate review may change final counts.`}
                </small>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
