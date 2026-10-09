# London Overture launch catalogue

`london-overture-sql-editor-2026-09-23.1.zip` contains 22 numbered SQL files,
a manifest, source notices, and license texts. Each query is below 700 KB, with
headroom below Supabase SQL Editor's approximately 1 MB limit. These are real
public-business catalogue records, not fictional
seed prospects, user accounts, private workspace data, or Google content.

Source: official Overture Places release `2026-09-23.1`, public S3 Parquet.
Bounding box: longitude -81.46 to -81.05, latitude 42.88 to 43.10, London,
Ontario and surrounding area. 17,980 usable records; six explicitly permanently
closed records excluded. Search results depend on each record's published city,
region and category, and may contain source inaccuracies. This is regional
coverage, not a worldwide Overture service.

For a hosted project with the discovery migrations installed, download and unzip
the SQL Editor archive. Run **one entire numbered file per query**, in order,
from `001-dentists.sql` through `022-places.sql`. Replace the editor contents each
time; do not concatenate files or paste the old 14 MB script. Wait for each run
to succeed before continuing. Each file has its own transaction and can be rerun
safely without duplicate rows. The final file removes explicitly closed source
IDs. No file creates accounts or adds workspace prospects, and RLS stays enabled.

`001-dentists.sql` is also available separately in this directory. It loads 282
dental-related regional listings and supports the default dentist search in
London immediately. Run the remaining files for the full 17,980-record catalogue
and other categories. If interrupted, resume at the next file or rerun the last
one; a completed file stays committed.

After all files, run `select count(*) from public.discovery_places;`: a previously
empty catalogue should contain **17,980** records. The count may be higher if
other regions/releases were imported earlier. Never run the schema bootstrap
over an existing project. See `docs/discovery.md` for the browser-only rollout.

The original `london-overture-2026-09-23.1.zip` contains the approximately 14 MB
`overture-london.sql` for **direct PostgreSQL/psql import only**. It is too large
for SQL Editor. The local helper continues to use this full archive.

Local development: `pnpm catalogue:local` after `pnpm db:migrate` and `pnpm db:env`.
It requires Python 3's standard library and the project's local Docker database.
The operation is repeatable and changes only the shared public catalogue.

Regeneration: `scripts/fetch-overture.py` → `scripts/prepare-overture.mjs`; see
`docs/discovery.md`. The archive includes CDLA Permissive 2.0 and Apache 2.0
texts and preserves Overture/contributor dataset names, record IDs, properties,
update times, and release provenance. Preserve these notices when redistributing.
