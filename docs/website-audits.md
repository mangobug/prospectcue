# Website audits: findings with evidence

Open a saved prospect, scroll to **Website audit**, confirm **Website to audit**,
and click **Audit website**. You may leave while the worker runs; return to see
its saved status, findings, recommendations and private mobile screenshot.
**Run a new audit** creates a separate snapshot. The latest five snapshots appear;
older runs remain stored until the prospect is deleted.

Checks cover the public homepage: HTTPS/final HTTP response, title, search
description, mobile viewport/overflow, main heading, missing image alt attributes,
form labels and obvious contact/booking links. Each includes concrete evidence.
Missing contact links and findings affected by failed resources require manual
review. No forms or links are submitted, no login or purchase is attempted, and
no overall opportunity/revenue score is invented. Classification, notes and
pipeline stage are unchanged.

Optional Google PageSpeed supplies mobile lab performance/accessibility/SEO
scores, LCP and CLS. Scores vary; unavailable fields remain unavailable. Browser
checks and screenshots work without PageSpeed. Fictional CSV websites use
reserved domains and cannot be audited: use a real public business website. For
Google prospects, explicitly enter the website URL; live listing fields are not
copied into the audit.

## Deploy online using only your browser

The branch is **`feature/website-audits`** in **`mangobug/prospectcue`**.
You do not need Node, npm or a terminal on your Mac. This environment has no
administrative access to your Vercel, Supabase or Trigger.dev accounts.

1. **Apply the Supabase upgrade once.** In GitHub on this feature branch, open
   [`supabase/hosted-website-audits-upgrade.sql`](../supabase/hosted-website-audits-upgrade.sql),
   choose **Raw**, and copy its entire contents. In your existing Supabase
   project, open **SQL Editor**, create a query, paste and run it. This small,
   additive migration creates audit tables, restricted worker functions and
   a **private** `audit-evidence` Storage bucket with RLS policies. Keep the RLS
   statements. Do not rerun the core bootstrap or Overture import. This migration
   does not delete existing prospects and rolls back on error. Verify **Storage →
   audit-evidence** is private. Its guard rejects reruns when audits are already installed.
2. **Create a project at [Trigger.dev](https://cloud.trigger.dev).** This runs
   Chromium independently of Vercel request timeouts. In project settings, find
   the project reference (`proj_…`) and the **Production** environment API key
   with permission to trigger tasks. Keep keys out of chat and GitHub source.
3. **Set Trigger.dev → Environment variables for Production:**

   | Name                               | Value                                                                                         |
   | ---------------------------------- | --------------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`         | Same hosted Supabase URL already used in Vercel                                               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Same publishable/anon key used in Vercel; never service-role                                  |
   | `AUDIT_JOB_SECRET`                 | New random password of 32+ characters, generated in your password manager; keep it for step 5 |
   | `TRIGGER_BUILD_TRIGGER_PROJECT_ID` | Your `proj_…` reference; the GitHub build strips `TRIGGER_BUILD_`                             |
   | `GOOGLE_PAGESPEED_API_KEY`         | Optional PageSpeed Insights key; see below                                                    |

   Leave `AUDIT_LOCAL_WORKER` unset and do not set a local Chromium path. The
   checked-in Playwright build extension installs Chromium and its dependencies.

4. **Connect GitHub in Trigger.dev → Manage → Integrations → Git settings.**
   Select the **Production** environment. Install its GitHub app for
   `mangobug/prospectcue`, connect that repository, and set the **Production
   tracking branch** to **`feature/website-audits`**, config file
   `trigger.config.ts`. If an install-command override is needed, use
   `corepack enable && pnpm install --frozen-lockfile`. Configure the build-time
   project reference before deploying. Wait for a successful deployment and
   confirm the task **`website-audit`** is listed. A connected repository with
   **Waiting for tasks to deploy** is not a successful worker deployment.
   GitHub deployment starts on a new push to the tracking branch; if connecting
   the repository does not start a build, use the dashboard deployment action
   when available or push a reviewed change to this feature branch. Check the
   full branch name, including the final **s**, before pushing. Follow
   [Trigger.dev's GitHub integration](https://trigger.dev/docs/github-integration);
   no GitHub Actions workflow or local CLI is required.
5. **Set Vercel → Project → Settings → Environment Variables** for the
   environment serving `prospectcue.vercel.app`:

   | Name                 | Value                                          |
   | -------------------- | ---------------------------------------------- |
   | `TRIGGER_SECRET_KEY` | Trigger.dev Production API key from step 2     |
   | `AUDIT_JOB_SECRET`   | Exactly the same random password as the worker |

   Keep existing Supabase variables, `APP_URL=https://prospectcue.vercel.app`,
   and the Google Places key. Leave `AUDIT_LOCAL_WORKER` unset/0. Secrets must
   not have `NEXT_PUBLIC_` prefixes. Deploy **`feature/website-audits`** as the
   production branch or promote its checked deployment; no merge into the default
   branch is needed. Redeploy after saving variables.

6. **Verify the hosted flow.** Sign in, open a saved real business, confirm its
   public website and run an audit. Expect queued/running → completed, results
   after reload, and a private screenshot. Another independent account must not
   access the prospect, report API or screenshot URL. Blocked/unreachable sites
   may legitimately fail; failure is saved and can be retried. After a 20-minute
   timeout a new audit is allowed. Check Trigger.dev Runs and environment settings
   if jobs stay queued. **Pending version** in Trigger.dev means the receiving
   environment does not have a runnable version containing the task and queue;
   check **Production → Deploys** for a successful deployment containing
   `website-audit`. The Vercel API key must belong to that same Trigger.dev
   project and environment. An unexpired pending run starts after the missing
   task is deployed; after the 20-minute timeout, start a fresh audit in the app.
   Hosted verification remains required after setup.

### A deployed worker reports `Audit claim failed`

The worker decrypted the job but could not claim it through Supabase. Confirm
that the worker's Production Supabase URL and public anon/publishable key belong
to the same project used by Vercel. Never substitute a service-role key.

Worker errors classify known database failures without printing provider
messages, signed URLs or capabilities. Open the failed attempt in Trigger.dev
and read its error. To check installed functions and permissions, run the
read-only [`supabase/diagnose-website-audits.sql`](../supabase/diagnose-website-audits.sql)
in the hosted Supabase SQL Editor. It returns installation and permission flags
and the pgcrypto schema; it does not return prospect data or secrets. All flags
should be true, both worker functions should use owner permissions and be
executable by `anon`, and pgcrypto should be in `extensions`.

Do not rerun the full audit upgrade over existing tables. If a fresh audit fails,
use its classified error and these diagnostic results to determine the repair.
Old run authorization expires after 30 minutes; start a fresh audit from the app
instead of replaying an expired job in Trigger.dev.

### Optional PageSpeed

In Google Cloud Console, enable **PageSpeed Insights API** and create a server
API key restricted to that API. Enter it only in Trigger.dev Production as
`GOOGLE_PAGESPEED_API_KEY`. Do not use browser/referrer restrictions or a
Places-only restricted key. The worker calls
`www.googleapis.com/pagespeedonline/v5/runPagespeed`, mobile strategy, and saves
only selected measurements. Missing keys, quota errors, timeouts and Lighthouse
errors display **Unavailable** while browser evidence remains useful.

## Local setup

```sh
pnpm db:start
pnpm db:migrate
pnpm db:env
pnpm audits:local
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm dev
```

`audits:local` preserves existing ignored settings and adds a random encryption
secret and local subprocess switch if absent. It refuses hosted app/database
URLs. On a normal workstation install Chromium with
`pnpm exec playwright install chromium` and omit the executable override.
The local subprocess receives ciphertext over stdin, saves status in the real
database and uses the same browser worker. It is not a durable substitute for
hosted Trigger.dev jobs. Restart Next.js after changing `.env.local`.

The cloud development runner's outbound proxy does not support the worker's
direct, DNS-pinned website requests. Tests use controlled HTML with real Chromium,
real PostgreSQL/Auth/Storage, transport/DNS security tests and persisted job-failure
checks. Those do not prove a successful hosted public-site audit or live PageSpeed
measurement. Docker volumes retain local database records and images across
`db:stop`; do not use `db:reset` as a startup step.

## Isolation, persistence and limits

Signed-in members queue and read audits. A per-prospect database lock prevents
concurrent jobs. The worker receives encrypted input, uses a random 256-bit
capability scoped to one run, and uploads through a single-path signed capability.
Token hashes have no client grants and are erased on completion. It uses the
public Supabase key, with no service-role key or forwarded user session. Worker
HTTP tracing is suppressed so upload tokens do not enter task network spans.

Browser requests use a bounded HTTP(S) transport: reject private/loopback,
link-local, metadata and other non-public addresses; check every DNS answer and
redirect; pin the checked address for the socket while preserving HTTPS
certificate validation. Block non-GET requests, service workers and websockets;
send no visitor cookies, authorization or website credentials. Limit redirects,
response sizes, total bytes/requests and duration. Partial loads mark affected
missing-element findings for manual review.

Reports persist in Supabase PostgreSQL and PNGs in private Storage. Screenshot
reads require session/membership through the app and Storage RLS and use
private/no-store responses. Prospect deletion removes its objects through the
Storage API before cascading report rows; an active run blocks deletion.
Administrative account/workspace deletion must also remove its Storage prefix:
database cascades alone do not delete physical files. The operator owns retention,
backups and orphan cleanup; there is no scheduled evidence purge yet.

The queue allows three concurrent workers with three infrastructure retries.
This is operational protection, not a subscription limit. Website failures end
the run for an explicit retry. Free signed-in accounts use the same audit action;
guests must sign in and save a prospect before auditing it.
