# Business discovery: Overture Places + Google Places

Enter a business category and location, select a source, review real listings,
and save selected businesses into the existing workspace pipeline. Anonymous
visitors see up to five results. Signed-in users, including free accounts, browse
twenty per page and save selected results, add notes, and change stages. There are
no subscription checks, search-credit counters, monthly quotas, or pricing UI.

## What each source does

| Source          | Retrieval                                                                                                 | Saved prospect                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overture Places | A regional, independently licensed catalogue imported from official public Parquet releases; no API key   | Listing fields, source ID, release and contributor provenance copied into the private workspace                                                                   |
| Google Places   | Server-side Places API (New) Text Search, followed by live Place Details when displaying saved references | Place ID/reference, search category, an independent editable label and workspace notes/stage/follow-up; Google listing content is not copied into database fields |

The supplied launch catalogue has **17,980 real listings** from the London,
Ontario area, release `2026-09-23.1`, bbox `-81.46,42.88,-81.05,43.10`. It includes
multiple business categories. Other Overture locations need a regional import;
Google searches use the live provider's broader coverage. Category aliases handle
common requests such as dentists/dental and plumbers/plumbing. Overture search
matches published city/province/country tokens, with stable ID-ordered paging.
It is not a geographic radius search or an exhaustive global Overture index.

A missing website means **not listed in that source**, not verified absent.
Explicitly permanently closed listings are excluded. Neither adapter scrapes
Google Maps HTML, visits prospect websites, extracts emails from websites, runs
audits, or sends outreach. Listings can be incomplete, outdated or inaccurate.

## Browser-only rollout for the existing prospectcue.vercel.app project

The feature is on `feature/business-discovery`. The existing `work` branch and
default branch have not been merged or force-pushed. Local verification does not
deploy the feature or update hosted Supabase.

1. In the existing hosted Supabase project's **SQL Editor**, run the entire
   [`supabase/hosted-discovery-upgrade.sql`](../supabase/hosted-discovery-upgrade.sql)
   **once**. It installs only the two new migrations, tracks their versions and
   preserves existing accounts, workspaces, prospects and notes. It rejects
   accidental repeat execution. A statement failure rolls back the transaction.
   Do not run `hosted-bootstrap.sql` over this existing project or reset it.
2. On GitHub, download
   [`supabase/catalogue/london-overture-sql-editor-2026-09-23.1.zip`](../supabase/catalogue/london-overture-sql-editor-2026-09-23.1.zip)
   using **Download raw file**. macOS can unzip it without Node or npm. Open
   `001-dentists.sql` in a text editor, copy **all** its contents, paste into a new
   Supabase SQL Editor query, and run it. Wait for success. Repeat with files
   `002-places.sql` through `022-places.sql`, replacing the editor contents each
   time. Each file is below 700 KB and commits independently; rerunning a file
   does not duplicate listings. The first loads the dental-related listings so
   you can test dentists in London immediately; all 22 load the full regional
   catalogue. No workspace prospects are created by these imports. Preserve the
   archive's source notices and license texts. Keep RLS enabled. The original
   approximately 14 MB single-script archive is for direct PostgreSQL/psql
   import and **cannot be run in SQL Editor**. If the discovery upgrade in step
   1 was already applied, do not rerun it; only import the catalogue files.
3. In [Google Cloud Console](https://console.cloud.google.com/), create/select
   your project, attach a billing account if required by Google, enable **Places
   API (New)**, and create a separate server API key restricted to that API. This
   is a server key; browser HTTP-referrer restrictions will reject these server
   requests. Vercel's ordinary outbound IPs are dynamic, so fixed-IP application
   restrictions require an appropriate egress setup. Configure provider-side
   request quotas/alerts for operational protection. Provider API charges are
   independent of ProspectCue account tiers.
4. In Vercel → ProspectCue → **Settings → Environment Variables**, add
   `GOOGLE_PLACES_API_KEY` securely for the deployment environments you will use.
   Keep the existing hosted Supabase public settings. Never prefix this key with
   `NEXT_PUBLIC_`, put it in Git, or paste it into chat. Without the key, Overture,
   manual entry, CSV, notes and pipeline remain available; Google is visibly
   marked as being connected and its API returns an honest unavailable error.
5. Deploy the **feature branch** in Vercel. For a preview, set `APP_URL` to that
   deployment's exact HTTPS origin and add its `/auth/callback` and
   `/auth/callback?next=/reset-password` to Supabase's allowed redirects. You may
   need a redeploy after assigning the URL. Continue using the same hostname
   throughout signup and confirmation. To serve this branch on the stable
   production domain, deliberately choose the feature branch as Vercel's
   Production Branch and deploy it, or promote its validated deployment with
   production `APP_URL=https://prospectcue.vercel.app`. This deployment setting
   does not require a Git merge. These account actions have not been performed
   by the coding task.

Verify **after** those steps: open `/discover` signed out, search dentists in
London/Ontario/Canada, see five actual records and no saving/paging controls.
Sign in and open **Find businesses**; page through twenty results, select one,
save it, open its prospect, add a note and change its stage. Reload, check the
pipeline, and save the same source record again to confirm deduplication.
Repeat a search with Google selected and verify Google attribution and live
details. A second independent account must not see the first workspace's record.
Local transport fixtures are not evidence that your Google key or hosted project
is configured correctly.

## Local development and additional Overture regions

```sh
pnpm db:migrate
pnpm db:env
pnpm catalogue:local
pnpm dev
```

The local catalogue helper uses Python 3's standard library to read the committed
archive and imports only into the named local Docker PostgreSQL database. It
refuses hosted Supabase configuration. Running it twice preserves private
prospects and upserts the same public source IDs.

For a different region, an operator can fetch a pinned official release and bbox:

```sh
python3 -m venv /workspace/.cache/overture-tools
/workspace/.cache/overture-tools/bin/pip install -r scripts/overture-requirements.txt
/workspace/.cache/overture-tools/bin/python scripts/fetch-overture.py \
  --release 2026-09-23.1 --bbox=-81.46,42.88,-81.05,43.10 \
  --output .data/overture-london.ndjson
node scripts/prepare-overture.mjs .data/overture-london.ndjson .data/overture-london.sql 2026-09-23.1 .data/new-sql-editor-parts
```

The helper uses fixed official public S3 endpoints, unsigned public-bucket reads,
validated operator-only coordinates and DuckDB Parquet spatial filtering. No AWS
account or credentials are needed. `prepare-overture` validates bounded data,
retains contributor metadata, normalizes Canadian province codes, includes
license notices, and prepares an atomic SQL upsert. Explicitly closed IDs are
removed from discovery; previously saved prospects retain their provenance.
Missing listings are not automatically deleted, and refreshes do not overwrite
workspace prospects. Scheduling ongoing regional refreshes is deferred.

The optional fourth argument creates byte-bounded, independently committed
SQL Editor files, prioritizing dental-related listings, plus a record-count/size
manifest. Use a new or empty directory so stale files from another release
cannot enter the import. These files are resumable and individually idempotent;
the complete region is not one atomic transaction across files. The standalone
full SQL remains available for an atomic direct PostgreSQL import.

DuckDB's `httpfs` extension normally installs from its official extension host.
That host returned 403 in this runner. The successful regional extraction used
the version-matched native extension redistributed through PyPI: its wheel SHA-256
was checked against PyPI metadata, only the binary was extracted, and DuckDB
accepted its embedded signature with unsigned extensions disabled. No wheel
Python code was executed and no TLS/signature checks were disabled. The retained
verified extension path can be supplied with
`--extension /workspace/.cache/duckdb/httpfs.duckdb_extension`. The committed
launch archive makes that extension unnecessary for normal startup.

Regenerate hosted schema files after changing migrations with
`node scripts/prepare-hosted-sql.mjs` and
`node scripts/prepare-discovery-upgrade.mjs`.

## Access, attribution and operational boundaries

The shared catalogue has RLS enabled and no direct anonymous/authenticated table
grants. Narrow search/status RPCs expose bounded public listing results. Anonymous
paging and saving are denied. Workspace saving derives the workspace from the
session, validates source selections, and uses a membership-checked atomic RPC.
Retries and concurrent saves reuse existing source IDs; Overture also reuses a
conservative matching manual/CSV prospect. Google and Overture IDs are separate;
cross-provider entity matching is deferred.

Google result selections use short-lived signed receipts at the app API. API keys
and provider requests stay server-side; responses and fetches are private/no-store.
React cache deduplicates Google details within a render only. Google text and
third-party attribution appear beside displayed details. Public `/terms` and
`/privacy` describe data sources and usage. Google Place IDs are exempt from
Google's general caching restrictions; listing details are fetched live instead
of persisted. See the [official policies](https://developers.google.com/maps/documentation/places/web-service/policies).
Overture license texts are in `docs/licenses` and the regional archive.

Basic 30-requests/minute burst protection uses short-lived hashed identifiers in
one server instance. It is not a distributed quota or a guaranteed global cost
cap on Vercel. Provider quotas and hosting firewall/rate-limit controls are
separate operational protections. No subscription tier affects search or saving.
Live Google names are refreshed for up to twenty saved references per list/board
render, with five concurrent fetches; other cards keep their independent saved
label and can be opened for live details. Provider failures leave labels, notes,
stage and follow-up accessible. Rendering many saved Google references can cause
additional provider requests and delay pages; broader enrichment/caching requires
separate performance work and provider-policy review.

Private-list name/location filters use stored prospect fields. Google references
are searchable through your independent saved label; live Google addresses are
not stored and therefore do not participate in the database's city filter.
