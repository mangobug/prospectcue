# London Overture launch catalogue

`london-overture-2026-09-23.1.zip` contains `overture-london.sql`, source notices,
and license texts. These are real public-business catalogue records, not fictional
seed prospects, user accounts, private workspace data, or Google content.

Source: official Overture Places release `2026-09-23.1`, public S3 Parquet.
Bounding box: longitude -81.46 to -81.05, latitude 42.88 to 43.10, London,
Ontario and surrounding area. 17,980 usable records; six explicitly permanently
closed records excluded. Search results depend on each record's published city,
region and category, and may contain source inaccuracies. This is regional
coverage, not a worldwide Overture service.

For a hosted project with the discovery migrations installed, download and unzip
the archive, then run the complete SQL in Supabase SQL Editor. The transaction
upserts the shared catalogue and removes explicitly closed source IDs; it does
not create accounts or add workspace prospects. Never run the schema bootstrap
over an existing project. See `docs/discovery.md` for the browser-only rollout.

Local development: `pnpm catalogue:local` after `pnpm db:migrate` and `pnpm db:env`.
It requires Python 3's standard library and the project's local Docker database.
The operation is repeatable and changes only the shared public catalogue.

Regeneration: `scripts/fetch-overture.py` → `scripts/prepare-overture.mjs`; see
`docs/discovery.md`. The archive includes CDLA Permissive 2.0 and Apache 2.0
texts and preserves Overture/contributor dataset names, record IDs, properties,
update times, and release provenance. Preserve these notices when redistributing.
