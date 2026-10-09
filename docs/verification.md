# Verification record — 2026-10-08

## Business-discovery milestone — 2026-10-09

The new `feature/business-discovery` implementation was checked with real local
Supabase PostgreSQL/Auth/PostgREST and Chromium against the production build.
Overture results used the actual official `2026-09-23.1` release, not fixtures or
mocked listings. Google adapter checks use explicitly identified transport
fixtures; **live Google searches remain unverified because no server API key is
configured**.

- TypeScript, ESLint and the production build passed.
- 29 unit tests passed, including strict discovery input/URL validation, signed
  selection tampering/expiry, Google pagination/headers/no-store behavior,
  missing-key handling, malformed responses and closed-listing filtering.
- 22 real-database integration tests passed. New coverage checks anonymous
  five-result bounds, paging denial, unavailable raw catalogue grants,
  signed-in paging, immutable provider provenance, trusted-field saving,
  concurrent retry deduplication, matching manual-record reuse, transactional
  rollback, Google reference-only storage and independent workspace isolation.
- Five production browser workflows passed. New coverage uses real Overture
  searches: anonymous preview and mobile layout, signed-in twenty-result pages,
  non-overlapping pagination, selection/save/retry, strict mutation validation,
  prospect opening, notes, persisted stage changes, pipeline display and denial
  of another workspace's detail page and note API.
- Official regional extraction produced 17,980 usable public-business records;
  six explicitly permanently closed records were excluded. The pinned regional
  archive includes contributor provenance and full source-license texts.
  `pnpm catalogue:local` passed twice without resetting private prospects.
- The generated hosted upgrade was applied to a separate temporary PostgreSQL
  database with the original three-migration schema and fictional existing
  prospect/note. Both remained intact; all 17,980 catalogue records imported;
  five migration versions were tracked. An accidental repeat upgrade was
  rejected. A fresh generated bootstrap separately produced five tracked
  migrations, seven RLS-enabled public tables and zero workspace prospects.
  Both temporary verification databases were removed.

The tests were corrected to await the prospect-save confirmation before reload
and to assert Next.js's streamed not-found UI (which can return HTTP 200), while
the unauthorized mutation API is required to return 404. No authorization
assertions or failing features were disabled to make the suite pass.

The restricted runner could not download DuckDB's extension from its normal
host. Extraction used a version-matched, checksum-checked PyPI redistribution
whose embedded signature was accepted by DuckDB with unsigned extensions
disabled. This limitation does not affect normal startup from the committed
regional catalogue archive.

The feature has **not** been deployed to the existing Vercel production domain,
and the new migrations/catalogue have **not** been applied to hosted Supabase.
Hosted Google credentials, API billing/quotas, both hosted discovery flows and
fresh-task environment snapshot restoration remain outside the verified
evidence. See `docs/discovery.md` for the concrete browser-only rollout.

Cloud Node requests require `NODE_USE_ENV_PROXY=1`. The configured proxy route
reached Google's real API and returned `PERMISSION_DENIED` for an unregistered
caller with no key. Provider connectivity was established; authenticated Google
retrieval remains untested. Startup instructions preserve this runtime setting.
The local production server was restarted after the final rebuild before the
final browser verification, preventing reuse of old build modules/chunk paths.

## Original first milestone

Verified in this cloud instance using real local Supabase PostgreSQL 17/Auth/PostgREST and system Chromium, with the production Next.js server. No mocked sessions or database results were used to establish tenant isolation.

| Check                                               | Result                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Frozen pnpm installation                            | Passed; lockfile and approved dependency build scripts retained                                         |
| Official PostgreSQL image flattening for Docker vfs | Passed; SHA-256 checked Crane download, digest-addressed OCI export and preserved runtime configuration |
| Local Supabase startup + migrations                 | Passed, five core services healthy; repeat startup does not reset data                                  |
| Generated database types                            | Produced from the running database                                                                      |
| Strict TypeScript check                             | Passed                                                                                                  |
| ESLint                                              | Passed without warnings                                                                                 |
| Vitest unit suite                                   | 21 passed, 0 skipped                                                                                    |
| Vitest real database integration suite              | 15 passed, 0 skipped                                                                                    |
| Playwright against production build                 | 3 passed, 0 skipped                                                                                     |
| Production build                                    | Passed                                                                                                  |
| Local seed repeatability                            | Passed twice; same fictional batch and records reused                                                   |

Browser coverage includes actual signup/confirmation emails and PKCE callback, workspace creation, manual creation/editing, persistence after refresh, stage/follow-up activity records, notes, mixed valid/invalid/duplicate CSV results (5 total: 2 imported, 2 skipped, 1 invalid), downloadable feedback, search and all list filters, sorting and 20-row pagination, actual dashboard counts and pipeline, workspace rename, second-session HTTP mutation denial, sign-out/protected routes/sign-in, recovery email and password change, explicit manual duplicate decision, confirmed deletion and safe rendering of HTML-like text. Cross-origin mutation and unsafe URL input rejection were also exercised.

Direct database tests use normal authenticated sessions from two independently provisioned local accounts. They verify read/write/delete isolation, forbidden enrollment/ownership changes, immutable prospect identity, cross-workspace activity FK rejection, blocked forged activity/batch writes, anonymous access denial, atomic activity changes, verification timestamps, concurrent idempotent import retry, exact counts, explicit duplicate inclusion, and complete transaction rollback on an invalid database row. Local test administration is confined to creating and cleaning up fictional accounts.

Initial validation caught and fixed optional mapping validation, single-column CSV parser handling, optional list filter types, public-origin checks behind Next's internal bind address, and upload interactivity before hydration. The final browser run used a stable production server.

Hosted Supabase, production SMTP, deployment, new-task snapshot restoration and future audit/discovery/AI/billing providers were not tested or activated. No paid resources were created and no outreach was sent. The repository has one workspace per initial owner, a Toronto timezone, a 30-card-per-stage board and a latest-100 activity display; full records remain stored. Broader assistive-technology and cross-browser testing remain follow-up work.

## Online deployment preparation — 2026-10-08

Added Vercel build configuration using the pinned pnpm version, a browser-only
deployment guide, and a generated schema-only bootstrap for an empty hosted
Supabase project. A new versioned migration makes the existing authenticated
table permissions explicit, avoiding reliance on provider default grants.
Anonymous table reads now fail with PostgreSQL permission error `42501`; the
real-session security assertion checks that denial rather than an empty result.
No product features, local accounts or prospect records were added or migrated
to a hosting provider.

After applying the permissions migration locally, strict typecheck, lint, all
21 unit tests, all 15 real-session integration tests and all 3 browser workflows
passed. The production build passed using the exact pnpm invocation configured
for Vercel (the cloud runner required a writable npm cache). Database types were
regenerated and unchanged. The generated bootstrap also completed in a separate
fresh PostgreSQL database with a schema-only copy of local Supabase Auth: three
tracked migrations, six RLS-protected application tables and zero prospects.
A repeat bootstrap was rejected without replacing the schema. That temporary
validation database was removed; the existing local database was retained.

These are deployment preparation checks, not evidence of a live deployment.
Vercel account access, hosted Supabase execution, real email delivery and the
public URL still require the account setup and hosted checklist in
`docs/deployment.md`.
