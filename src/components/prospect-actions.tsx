'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
export function ProspectActions({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function remove() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error);
      router.push('/app/prospects');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {confirm ? (
        <div className="notice error" role="alert">
          <p>Delete this prospect and its activity history permanently?</p>
          <div className="row">
            <Button variant="destructive" disabled={busy} onClick={remove}>
              Confirm deletion
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setConfirm(true)}>
          Delete prospect
        </Button>
      )}
    </div>
  );
}
export function NoteForm({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const note = new FormData(form).get('note');
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/prospects/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      form.reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save note');
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
      <div>
        <label htmlFor="note">Add a note</label>
        <textarea
          id="note"
          name="note"
          required
          maxLength={5000}
          placeholder="Useful context for your next conversation…"
        />
      </div>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save note'}
        </Button>
      </div>
    </form>
  );
}
