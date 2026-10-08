# Verification record — 2026-10-08

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
