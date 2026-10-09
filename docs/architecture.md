# Implemented boundaries

One Next.js App Router application. Server-rendered pages query Supabase with per-request cookie sessions. Client forms call Route Handlers; authentication and workspace settings use Server Actions. The Next proxy uses @supabase/ssr getAll/setAll cookies and validates/refreshes sessions before render. No separate backend, ORM, queues or cache service.

- Authentication: app/actions.ts, auth/callback, proxy and lib/supabase/server.ts.
- Authorization: lib/context.ts resolves the authenticated user's membership, never a browser workspace ID; RLS enforces the same access for direct Supabase requests.
- Prospect management: api/prospects, server pages and shared lib/validation.ts.
- Imports: lib/imports.ts parses/maps/validates; api/imports revalidates on preview and confirmation and uses duplicate_candidates + import_prospects RPCs.
- Discovery: public and authenticated discovery pages call validated source adapters. Overture uses a shared, bounded public search RPC; saving uses the session workspace and a membership-checked transactional RPC. Google content stays live; only Place IDs and independent workspace fields persist. See docs/discovery.md.
- Pipeline/activities: prospect mutations and transactional PostgreSQL triggers; note inserts use authenticated clients.
- UI: Tailwind, shadcn-compatible locally owned Button/Slot and accessible native forms/tables, lucide icons. components.json records shadcn aliases for future components.

## Database decisions

Profiles are created from auth.users by a trigger. New workspace + owner membership is a transaction guarded by a user advisory lock. One owned workspace per initial user simplifies onboarding retries. Owner creation RPC takes only a name, never an arbitrary workspace/user/role. Membership direct mutations have no client grants. Workspace name can be changed by owners; timezone stays Toronto until configurable timezone support is designed.

Prospects use a workspace FK and composite uniqueness on workspace + ID. Activities link via a composite FK, preventing cross-workspace notes even when both supplied IDs exist. Prospect identity, creator and source are immutable on edit. Stage/follow-up triggers write structured from/to activities in the same transaction; client note policies do not permit forged change events. Verification timestamps are set when users verify and cleared when unverified. Deleting a prospect cascades its history.

RLS membership helper functions are narrow security-definer functions with an empty search path; policies call them to avoid recursive membership RLS. Workspace creation and import batch writes also use restricted definer RPCs. Their user identity comes from auth.uid(), with explicit access checks before any workspace operation; all functions have restricted execute grants. The app still invokes these through user sessions and never a service key. Normal CRUD uses RLS directly.

Import batches are immutable to clients. A per-workspace advisory lock and unique retry token ensure duplicate decisions, inserts and counts commit together. Payload hash rejects different content using the same token. Counts equal imported + skipped + invalid. The server excludes invalid records and passes validated rows; database constraints provide further defense. Direct authenticated callers still cannot target another workspace. Retry results include persisted logical record numbers and inserted IDs. Original CSV contents and invalid-row feedback are not retained. Filename and counts persist for the result view.

Indexes cover membership, stage, follow-up, creation, activity order and normalized duplicate keys. Filters are URL query parameters; name search uses escaped ILIKE and sorting includes an ID tie-breaker. Initial list size is 20. The app fetches limited board/history views and preserves full data in PostgreSQL.

## Next integration points

| Milestone       | Boundary                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audits          | Create workspace-scoped audit_runs/results/assets tables. Enqueue Trigger.dev jobs after authorized requests. Use isolated Playwright and PageSpeed; do not add URL fetching to prospect CRUD. |
| Evidence        | Private Supabase Storage buckets with tenant policies and expiring signed reads. Keep evidence and job status attributable to audit runs.                                                      |
| Scoring/reports | Versioned scoring models derived from evidence; calibrate with reviewed examples before presenting scores.                                                                                     |
| Discovery       | Extend existing adapters with additional regional imports, refresh jobs and distributed operational controls; keep account pricing separate.                                                   |
| AI drafts       | Replaceable provider behind server-only job logic, curated evidence input, saved drafts and human review. No sending.                                                                          |
| Billing         | Stripe customer/subscription mapping, signature-verified idempotent webhook processing and usage events per workspace.                                                                         |
| Teams           | Reviewed membership/invitation RPCs and policies; explicit workspace switcher; remove initial one-owner-workspace restriction only with an onboarding retry model.                             |
