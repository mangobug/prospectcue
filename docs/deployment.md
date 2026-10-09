# Browser-only deployment: Vercel + Supabase

For the new **two-provider business-discovery milestone**, use
[`docs/discovery.md`](discovery.md). An existing project needs the guarded
discovery upgrade and regional catalogue, rather than rerunning the bootstrap.
The feature is on `feature/business-discovery`; the guide below remains the
first-milestone deployment procedure.

This deploys the existing milestone without installing Node, npm or Docker on
your Mac. Vercel runs Next.js; a separate hosted Supabase project persists the
accounts, workspaces, prospects and activity records. No local database or seed
account is copied. The interface's temporary product name is Agency Prospect.

## 1. Create the hosted database

1. Sign in at <https://supabase.com/dashboard>, using GitHub if convenient.
2. Create a new project named **ProspectCue**, selecting the Free plan for initial
   review and a nearby region. Store its database password in your password manager.
3. Wait until the project is ready. Open its **SQL Editor** and a new query.
4. Open [`supabase/hosted-bootstrap.sql`](../supabase/hosted-bootstrap.sql) on
   GitHub, use its copy-raw-file control, paste the ENTIRE file into the SQL Editor,
   and run it once. Use a new, empty project. A failure rolls back the transaction;
   do not continue until it succeeds. Never run this bootstrap over existing data.
5. The Table Editor should show profiles, workspaces, workspace_memberships,
   prospects, prospect_activities and import_batches, all with row-level security.
6. Find the project's API/Connect settings. Copy its **Project URL** and the
   **publishable key** (`sb_publishable_...`) or legacy **anon** key. Those are the
   public application settings. Never use a secret or service-role key.

The bootstrap is generated from the versioned migrations and records their
versions in `supabase_migrations.schema_migrations`, so future CLI migrations do
not try to recreate the initial schema. Developers regenerate it with
`node scripts/prepare-hosted-sql.mjs` after intentionally adding migrations.
Future schema updates use normal reviewed migrations, never this bootstrap or a
database reset.

## 2. Deploy the website

1. Sign in at <https://vercel.com/signup> with GitHub.
2. Import **mangobug/prospectcue** from <https://vercel.com/new>. Grant the Vercel
   GitHub integration access to this repository if it is not visible.
3. Use the existing **work** branch. It is currently the repository's default
   branch. Ensure Vercel's **Production Branch** is `work`; future pushes can then
   deploy automatically. Do not merge another branch to deploy this milestone.
4. Keep the root directory at the repository root and framework **Next.js**.
   Choose **Node.js 24.x** in the project's build settings. The checked-in
   `vercel.json` pins installation/build to pnpm 11.19.0 and the committed lockfile.
5. Add these variables for the **Production** environment:

   | Name                            | Value                                                                                                |
   | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Hosted Supabase Project URL, such as `https://YOUR_PROJECT.supabase.co`                              |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Hosted public publishable or legacy anon key                                                         |
   | `APP_URL`                       | Your stable Vercel HTTPS domain, such as `https://YOUR_PROJECT.vercel.app`, without a trailing slash |

6. If Vercel has not assigned the stable domain yet, deploy initially with just
   the two Supabase variables. Confirm the stable domain under the project's
   **Domains** settings, then add `APP_URL` with that exact HTTPS origin and
   **Redeploy** before signing up or saving anything. If you already supplied an
   `APP_URL`, verify it matches and correct/redeploy if needed. Environment changes
   do not update an already-built deployment; public Supabase values are embedded
   at build time.
7. Visit the stable Production domain. Use that same hostname throughout signup
   and email confirmation. Preview deployment hostnames are not configured by this
   procedure and must not be used for the review.

Vercel's Hobby plan is for personal, non-commercial use. Choose an appropriate
plan for agency/business use under Vercel's current terms; do not assume a free
plan covers an operational commercial deployment. No paid account or plan is
created by these repository changes.

Do not upload `.env.local`, `.env.test`, `.local-seed.json`, local database
passwords or the service-role key. Do not run Docker/local database commands in
the Vercel build. Hosted Supabase is accessed using normal user sessions and RLS.

## 3. Configure email login before creating your account

In the hosted Supabase dashboard, open **Authentication → URL Configuration**:

- **Site URL:** the exact same stable HTTPS domain as `APP_URL`.
- **Redirect URLs:** `https://YOUR_DOMAIN/auth/callback` and
  `https://YOUR_DOMAIN/auth/callback?next=/reset-password`.

Enable the email/password provider and keep email confirmation enabled. Keep
hosted rate limits; `supabase/config.toml` applies to local Docker only and its
local testing rate limits must not be copied to the hosted project.

For an initial owner review, Supabase's built-in email sender generally permits
only addresses belonging to the Supabase organization team and has strict rate
limits. Use the email address on your Supabase account. If that address is not
eligible or delivery is blocked, configure custom SMTP in Supabase before
retrying. Public signup and reliable production recovery require a verified SMTP
sender; local Mailpit is not available online. Do not disable confirmation or
substitute demo authentication to work around delivery.

The default confirmation/recovery templates using `{{ .ConfirmationURL }}` work
with the app's PKCE callback. Follow the email in the browser that requested it.
If adapting a template for email scanners/cross-browser confirmation, the
existing callback also supports token-hash links:

```html
<!-- Confirm signup template -->
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email"
  >Confirm email</a
>
<!-- Reset password template -->
<a
  href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
  >Reset password</a
>
```

## 4. Verify the real hosted application

1. Open `/sign-up`, create your own account, follow the actual confirmation email
   in the same browser, and create your workspace.
2. Open **Import a CSV**, download the fictional example, upload it, review the
   mapping and preview, then **Confirm import**. A new workspace imports 3 rows.
3. Open a prospect, add a note, and save it. Set **Pipeline stage** to **Reviewed**,
   click **Save changes**, and verify the stage and note in Activity history.
4. Open Pipeline, confirm the prospect is in Reviewed, then reload and sign out/in
   to verify persistence. Try password recovery once; confirm the email lands and
   the new password works. Do not repeatedly request mail against limited quotas.
5. In a second browser profile, a second independent account should have its own
   empty workspace and should not be able to open the first account's prospect
   URL. This requires SMTP that can deliver to that second account's address.

Only call the hosted app verified after these operations actually succeed.
Repository checks and a green deployment build do not prove hosted email or RLS.
The local integration/E2E suites deliberately reject hosted administration; do
not change their environment to point at the live database.

For the website-audit feature branch, also follow
[`website-audits.md`](website-audits.md): apply its guarded audit upgrade and
configure/deploy the Trigger.dev worker before enabling online audits. The
original core bootstrap alone does not install the discovery or audit schemas.

## Persistence and maintenance

Code is saved on GitHub. Deployments run on Vercel; records live in the hosted
Supabase project independently of this Codex chat or a Vercel redeploy. Provider
free-tier pausing, retention and backup terms still apply. Establish an appropriate
backup plan before storing business records. This is separate from publishing a
Codex development environment.

If the deployed form reports an invalid origin, compare the browser's hostname,
`APP_URL`, Supabase Site URL and redirect URLs, correct the mismatch, and redeploy.
If signup says "Unable to create account", check the Supabase Auth logs for email
recipient/rate-limit errors without sharing tokens or passwords. Missing tables
or permission errors mean the SQL setup must be checked; do not disable RLS.
