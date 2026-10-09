# Agency Prospect

For YXU Digital and other digital agencies: real Overture/Google business discovery → email/password authentication → private workspace → selected, manual or CSV prospects → notes and follow-ups → sales pipeline. Product name lives in `src/lib/config.ts`.

The discovery milestone and browser-only rollout are documented in
[`docs/discovery.md`](docs/discovery.md). Overture starts with a real London,
Ontario catalogue; Google uses a separate server-side Places API (New) key.
Anonymous searches show up to five results; signed-in free accounts browse twenty
per page and save prospects without subscription limits.

## Local development

Prerequisites: Node 24+, pnpm 11.19.0, Docker with the daemon running. Use the checked-in lockfile. The Supabase CLI is pinned to 2.75.0 for compatibility with this cloud runner. ESLint 9 and TypeScript 5.9 match Next's lint plugins' supported peer ranges.

```sh
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:env
pnpm catalogue:local  # optional real London Overture catalogue; requires Python 3
pnpm dev
```

App: port 3000. Supabase API: port 54321; PostgreSQL: 54322; local email inbox (Mailpit): 54324. Use `localhost` for the app consistently so PKCE cookies survive email redirects. The existing hosted first milestone is at https://prospectcue.vercel.app; deploying the new feature branch and its database changes is a separate action.

The default stack disables unused Studio, Storage, Realtime, analytics and edge functions. These are not needed for this milestone. The startup command uses Supabase's supported Docker Hub image mirror; the cloud network permits it. Docker's `vfs` driver can consume tens of GB with the layered PostgreSQL image. This runner may need a flattened, digest-verified official image (see `docs/cloud-setup.md`); normal overlay-based Docker installations do not.

`pnpm db:env` writes ignored, permission-restricted `.env.local` and `.env.test` from **local** CLI status without printing keys and preserves existing files. If you reset/change your local keys, deliberately refresh these files. Never commit them. `GOOGLE_PLACES_API_KEY` is optional for the core workflow and Overture, and required for live Google searches.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client configuration; database access requires a user session and RLS. `APP_URL` is the server-only canonical app origin used for email redirects. `.env.example` documents the placeholders. No service-role key is used anywhere in the application. `.env.test` holds a **local-only** service key for test account creation and cleanup; test assertions use ordinary signed-in users. Test/seed scripts refuse cloud hosts.

## Migrations, types and fictional seeds

```sh
pnpm db:migrate        # apply pending local migrations without resetting records
pnpm db:reset          # DESTRUCTIVE: local database only; reapplies migrations
pnpm db:types          # regenerate src/lib/database.types.ts from local PostgreSQL
pnpm seed:local        # optional, repeatable fictional agency and prospects
pnpm db:stop           # retain local database volumes
```

The seed creates a fictional local account with a random password and stores its login in ignored `.local-seed.json` (owner-readable). Read that file locally to sign in. It never sends real email or prints credentials. A normal signup and onboarding starts with an empty workspace. `supabase/seed.sql` intentionally creates no accounts; the seed script uses real authenticated operations after local account provisioning.

A linked Supabase project can apply the versioned migrations with `supabase db push`; only do this deliberately after reviewing the target. Production credentials are not supplied or required for local development. Never use `db reset` against a remote database.

## Email and sessions

Local email confirmation is enabled. Sign up, open the confirmation message in Mailpit on port 54324, and follow its link in the same browser that requested it. Password recovery uses the same flow. The callback supports PKCE authorization codes and explicit `token_hash` confirmation/recovery URLs; redirect targets are limited to the app or password reset page.

For production, configure a real SMTP sender in Supabase, verify its domain, configure the Auth Site URL and allowlisted callback URLs for the deployment origin, and set `APP_URL` accordingly. Set signup and recovery templates to the documented Supabase confirmation URL or the token-hash callback pattern. Register `/auth/callback` and `/auth/callback?next=/reset-password`. Use HTTPS, suitable Supabase email/password rate limits, and production password policies. The permissive email rate limit in `supabase/config.toml` is for **local testing only**. Hosted email delivery is unverified.

The Next proxy refreshes auth cookies, protected pages and APIs validate the user through Supabase Auth, and data is read/written with that user's client. Protected responses are private/no-store. Server Actions use Next's origin protections; JSON mutation routes reject cross-origin browser requests. Submitted website URLs are never fetched.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm exec playwright install chromium  # once, on a normal workstation
pnpm test:e2e
pnpm build
pnpm start                            # production app on port 3000
```

The cloud runner already has Chromium: set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` for browser tests. Playwright starts the development app if needed; tests also work against a running production app. Auth traces are disabled to avoid recording reset tokens. Unit tests cover CSV quoting, BOMs, multiline fields, mapping, malformed data, limits, duplicate keys, URL/date validation, and safe downloads. Integration tests create two actual Supabase sessions and test direct RLS/relationship constraints, ownership restrictions, idempotency, rollback/count consistency, and activity triggers. Browser tests cover real signup + local confirmation, onboarding, import/edit/notes/follow-up, saved data after reload, filters/pagination, metrics/pipeline, API isolation, sign-out/sign-in and recovery.

## CSV rules and limitations

CSV uploads are UTF-8, comma-delimited, limited to 2 MB and 1,000 logical data records (preview record numbers include the header; multiline fields are one record). Map unique columns; business name is required. Blank websites remain `unknown` unless the user supplies a classification. No automated verification is implied. International phone formatting remains text. Invalid records are excluded with per-record feedback; error CSV values are protected from spreadsheet formula execution.

Duplicate candidates match whitespace/case-normalized business name **and** city, province/state and country. A website or social domain alone never matches. Candidates skip by default; the user may explicitly include a separate record. Imports never overwrite. Import results and prospect inserts commit in one transaction; each confirmation has a UUID retry key, checked against its payload. Database locking serializes imports per workspace. Original uploads are held in memory, never stored on the server; invalid-row fields remain in the results page memory only to support the feedback download and are released on navigation; only batch filename, counts and row outcomes persist. In-flight selections are locked for retry; a browser reload restarts the upload flow.

Initial accounts own one workspace. Membership schema supports additional members, but invitations and workspace switching are deferred. Workspace timezone is fixed to `America/Toronto` in this milestone. Dates are PostgreSQL `date`, not timestamps. Won/lost prospects are excluded from due follow-ups. Pipeline shows the latest 30 prospects per stage with a link to its paginated list. Activity history displays the latest 100 entries; older entries remain stored. There is no drag-and-drop board, crawling, audit scoring, messaging, AI or billing integration.

See `docs/product.md`, `docs/architecture.md`, `docs/backlog.md` and `docs/verification.md`.

For online access without installing developer tools on your computer, follow
[`docs/deployment.md`](docs/deployment.md) for the existing Vercel + hosted Supabase
deployment. It includes a transactional, schema-only SQL bootstrap for a new
project and an actual hosted signup/import/pipeline verification checklist.
