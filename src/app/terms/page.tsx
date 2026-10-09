import Link from 'next/link';
import { product } from '@/lib/config';
export default function Terms() {
  return (
    <main className="public-discovery">
      <Link href="/discover">← Business discovery</Link>
      <section className="card discovery-heading">
        <h1>Terms & data sources</h1>
        <p>
          {product.name} helps you find and organize business prospects.
          Listings may be incomplete or outdated; verify information before
          using it. A missing website field is not a website audit.
        </p>
        <h2>Overture Places</h2>
        <p>
          Overture listings are retained with their release and contributor
          provenance. The{' '}
          <a href="https://docs.overturemaps.org/guides/places/">
            Overture Places documentation
          </a>{' '}
          describes the applicable CDLA Permissive 2.0, Apache 2.0, and
          contributor licenses. Preserve source notices when reusing or
          exporting catalogue data.
        </p>
        <h2>Google Maps</h2>
        <p>
          Google listings are displayed live. This integration stores Google
          Place IDs, your independent labels, and your notes; it does not
          persist Google’s business descriptions, addresses, websites, or phone
          numbers. Use of Google Maps is subject to the{' '}
          <a href="https://maps.google.com/help/terms_maps/">
            Google Maps/Google Earth Additional Terms of Service
          </a>{' '}
          and the{' '}
          <a href="https://policies.google.com/privacy">
            Google Privacy Policy
          </a>
          .
        </p>
        <h2>Your workspace</h2>
        <p>
          You are responsible for your saved notes and use of prospect
          information. This milestone does not send outreach, crawl prospect
          websites, or verify website quality.
        </p>
        <Link href="/privacy">Privacy →</Link>
      </section>
    </main>
  );
}
