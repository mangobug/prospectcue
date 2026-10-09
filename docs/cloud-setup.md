# Cloud runner notes

This runner provides Node, pnpm, Docker and system Chromium. Its home directory is read-only. Keep caches under `/workspace/.cache` with `XDG_DATA_HOME`, `XDG_CACHE_HOME` and `NPM_CONFIG_CACHE`; do not repurpose HOME. Supabase's npm binary installer needs `npm_config_https_proxy` set to the existing HTTPS_PROXY. Do not print these values or disable TLS/checksum checks.

The CLI version and minimal Docker Hub stack are pinned in package.json. The stock daemon uses vfs. Its copy of every PostgreSQL image layer exhausts the 32 GB writable filesystem. `node scripts/flatten-postgres.mjs` is an optional Linux x64 cloud workaround: it verifies the official Crane release checksum, resolves the official PostgreSQL image to an immutable platform digest, verifies/downloads OCI layers through Crane, exports their merged filesystem, then imports it as one Docker layer with the original environment, entrypoint, command, user, workdir and exposed ports. It labels the result with its upstream digest. This changes the local image representation, not its PostgreSQL files. It never changes the daemon configuration and is not used on normal Docker storage drivers.

Run this helper before `pnpm db:start` on a fresh vfs runner. It leaves existing images alone, uses a temporary directory, and removes its temporary downloads. Startup then uses the same Supabase CLI and migrations. Required hosts are the package-manager presets, GitHub release hosts and Docker Hub registry/auth/CDN hosts already in those presets; no application external integrations are contacted.

Each cloud task already runs in isolation. Reuse the checkout; do not create a worktree. Restart local services and the app after snapshot restore; live processes are not retained. Do not reset database volumes during normal startup. Recheck auth and a representative app request after restoration. Saved draft instructions do not establish publication or new-task restoration.

Business discovery uses the committed regional Overture archive. After local
migrations and environment-file preparation, `pnpm catalogue:local` imports it
using Python 3's standard library and the local Docker database; the command is
repeatable and preserves existing workspace prospects. No AWS credentials or
DuckDB extension is needed to import this prepared archive. Additional regional
extraction is an operator workflow documented in `docs/discovery.md`.

`GOOGLE_PLACES_API_KEY` is a server-only optional provider setting for normal
startup, and required to exercise live Google discovery. Enter it securely in
environment settings, scoped to `places.googleapis.com`; never put it in chat,
source files or public environment variables. No key was available during this
verification. The saved draft includes the key requirement and provider network
destinations, but saving a draft does not inject a key or publish a snapshot.

For this cloud runner's Node 24 server, export `NODE_USE_ENV_PROXY=1` before
starting Next.js so provider fetches use the platform's existing proxy/secret
route. Direct Node fetch could not reach Google; a request through that route
reached the actual Google API and returned its expected missing-key permission
error. This is connectivity evidence, not a successful listing search. Do not
copy proxy credentials into files or add this runner-specific setting to Vercel.

Website audits require local Storage (now included in `db:start`) and Chromium.
Run `pnpm audits:local` after `db:env`; it preserves ignored files and prepares the
local subprocess mode and encryption secret. Export the existing system Chromium
path when starting the app. This runner cannot make the direct DNS-pinned public
website connections used by the worker; do not replace them with an unsafe proxy
fallback. Controlled-page browser tests and real local Storage/RLS checks are
available here; successful external audits must be checked on Trigger.dev.
See docs/website-audits.md for secure hosted settings. Installing the SDK and
saving environment instructions do not deploy a worker or publish the website.
