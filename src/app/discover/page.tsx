import Link from 'next/link';
import { DiscoverySearch } from '@/components/discovery-search';
import { Button } from '@/components/ui/button';
import { product } from '@/lib/config';
import { db } from '@/lib/supabase/server';
import { googleKey } from '@/lib/discovery/google';

export default async function Discover() {
  let signedIn = false;
  try {
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    signedIn = !!user;
  } catch {
    /* Search reports configuration problems without inventing results. */
  }
  return (
    <main className="public-discovery">
      <header className="row between">
        <Link className="brand" href="/">
          {product.name}
        </Link>
        <div className="row">
          {signedIn ? (
            <Button asChild variant="outline">
              <Link href="/app">Your workspace</Link>
            </Button>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Button asChild>
                <Link href="/sign-up">Create an account</Link>
              </Button>
            </>
          )}
        </div>
      </header>
      <div className="discovery-heading">
        <div className="eyebrow">Business discovery</div>
        <h1>Find your next local opportunity.</h1>
        <p className="muted">
          Search by category and location. Review real business listings, then
          save the prospects you want to work with.
        </p>
      </div>
      <DiscoverySearch signedIn={signedIn} googleAvailable={!!googleKey()} />
      <footer className="row">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms & data sources</Link>
      </footer>
    </main>
  );
}
