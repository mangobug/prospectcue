import Link from 'next/link';
export default function Privacy() {
  return (
    <main className="public-discovery">
      <Link href="/discover">← Business discovery</Link>
      <section className="card discovery-heading">
        <h1>Privacy</h1>
        <p>
          Accounts, workspace records, notes, and pipeline activity are stored
          in Supabase. Access to workspace records requires a valid session and
          workspace membership. Session cookies support authentication.
        </p>
        <p>
          Overture searches use a shared public-business catalogue. Google
          searches send your category and location to Google Places; the app
          does not send your workspace notes or prospect history to Google. See
          the{' '}
          <a href="https://policies.google.com/privacy">
            Google Privacy Policy
          </a>
          .
        </p>
        <p>
          Search results stay in the current page until you navigate or search
          again. Google listing content is not saved in the prospect database;
          only place references and your independent labels and notes persist.
          Selected Overture records are copied into your private workspace with
          source provenance.
        </p>
        <p>
          Basic burst protection uses short-lived hashed request identifiers in
          server memory. Passwords, provider keys, raw imports, and prospect
          contact details are not intentionally written to application logs.
          Provider and hosting services may maintain their own operational logs.
        </p>
        <p>
          When you request a website audit, an isolated Trigger.dev worker
          visits the public homepage you specify. Your website address, observed
          findings, and mobile screenshot are saved privately in Supabase. If
          configured, Google PageSpeed receives the website address for a
          separate lab test. Audits do not send your workspace notes or account
          password to the website. Reports remain until you delete the prospect;
          administrative account removal also requires the operator to remove
          its stored images.
        </p>
        <p>
          Account and data-removal requests are handled by the operator of this
          instance. Use your agency’s support channel. Self-service account
          deletion is not part of this milestone.
        </p>
        <Link href="/terms">Terms & data sources →</Link>
      </section>
    </main>
  );
}
