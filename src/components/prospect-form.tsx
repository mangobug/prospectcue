'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { label, stages, websiteStatuses } from '@/lib/config';
import type { Tables } from '@/lib/database.types';
const fields = [
  ['business_name', 'Business name', 200],
  ['industry', 'Industry / category', 100],
  ['website_url', 'Website URL', 2048],
  ['email', 'Public business email', 254],
  ['phone', 'Public business phone', 50],
  ['city', 'City', 100],
  ['province', 'Province / state', 100],
  ['country', 'Country', 100],
  ['source_reference', 'Source reference', 500],
] as const;
export function ProspectForm({ prospect }: { prospect?: Tables<'prospects'> }) {
  const reference = prospect?.source_type === 'google_places';
  const hiddenFields = [
    'website_url',
    'email',
    'phone',
    'city',
    'province',
    'country',
    'source_reference',
  ];
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [duplicate, setDuplicate] = useState(false),
    [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form);
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch(
        prospect ? `/api/prospects/${prospect.id}` : '/api/prospects',
        {
          method: prospect ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            prospect
              ? data
              : {
                  prospect: data,
                  allowDuplicate: form.get('allowDuplicate') === 'on',
                },
          ),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setDuplicate(true);
        throw new Error(result.error);
      }
      if (!prospect) router.push(`/app/prospects/${result.id}`);
      else {
        setSaved(true);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="notice" role="status">
          Prospect saved.
        </div>
      )}
      <div className="grid">
        {reference &&
          hiddenFields.map((name) => (
            <input
              key={name}
              type="hidden"
              name={name}
              value={String(
                prospect?.[name as keyof Tables<'prospects'>] || '',
              )}
            />
          ))}
        {fields
          .filter(([name]) => !reference || !hiddenFields.includes(name))
          .map(([name, title, max]) => (
            <div key={name}>
              <label htmlFor={`p-${name}`}>
                {reference && name === 'business_name'
                  ? 'Your saved label'
                  : title}
                {name === 'business_name' ? ' *' : ''}
              </label>
              <input
                name={name}
                id={`p-${name}`}
                defaultValue={
                  prospect?.[name] ?? (name === 'country' ? 'Canada' : '')
                }
                type={name === 'email' ? 'email' : 'text'}
                maxLength={max}
                required={name === 'business_name'}
                placeholder={name === 'website_url' ? 'example.ca' : undefined}
              />
            </div>
          ))}
        <div>
          <label htmlFor="p-website_status">Website classification</label>
          <select
            name="website_status"
            id="p-website_status"
            defaultValue={prospect?.website_status ?? 'unknown'}
            disabled={reference}
          >
            {websiteStatuses.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <small className="muted">
            Your classification; no automated audit was performed.
          </small>
        </div>
        <div>
          <label htmlFor="p-stage">Pipeline stage</label>
          <select
            name="stage"
            id="p-stage"
            defaultValue={prospect?.stage ?? 'new'}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-next_follow_up">Next follow-up date</label>
          <input
            id="p-next_follow_up"
            name="next_follow_up"
            type="date"
            defaultValue={prospect?.next_follow_up ?? ''}
          />
          <small className="muted">America/Toronto calendar date</small>
        </div>
        <div>
          <label htmlFor="p-verification_status">Verification</label>
          <select
            name="verification_status"
            id="p-verification_status"
            defaultValue={prospect?.verification_status ?? 'unverified'}
          >
            <option value="unverified">Unverified</option>
            <option value="user_verified">Verified by you</option>
          </select>
        </div>
      </div>
      {duplicate && (
        <label className="checkbox">
          <input type="checkbox" name="allowDuplicate" />I reviewed the
          duplicate warning. Create a separate record.
        </label>
      )}
      <div className="row">
        <Button disabled={busy} type="submit">
          {busy ? 'Saving…' : prospect ? 'Save changes' : 'Create prospect'}
        </Button>
        <small className="muted">No prospect website will be fetched.</small>
      </div>
    </form>
  );
}
