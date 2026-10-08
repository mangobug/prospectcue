'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="content">
      <div className="card">
        <h1>Unable to load this page</h1>
        <p>Check your connection and Supabase configuration, then retry.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
