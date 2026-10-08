# Repository conventions

One strict TypeScript Next.js App Router app, pnpm and the committed lockfile. Use the existing checkout: cloud tasks are already isolated; do not create a worktree unless requested.

- Keep product configuration in src/lib/config.ts.
- Use authenticated Supabase clients for normal operations. Never add a service-role key to app code.
- Protect every operation with validated auth and workspace membership; RLS remains authoritative. Do not trust browser workspace IDs.
- Put database changes in new SQL migrations; regenerate database.types.ts with pnpm db:types.
- Keep inputs in shared Zod schemas; run server validation even for client previews.
- Never log passwords, tokens, raw imports or prospect contact details. No website fetching in this milestone.
- Optional external providers must not be required for the core workflow.
- Keep local test/seed administration local-only and configuration files ignored.

Verification: pnpm typecheck; pnpm lint; pnpm test; pnpm test:integration (local Supabase); pnpm test:e2e (local email + Chromium); pnpm build. Cloud Chromium: PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium. Do not call mocks proof of RLS. Report any unrun or failed checks separately.

Setup: pnpm install --frozen-lockfile; pnpm db:start; pnpm db:env; pnpm dev. Use README for migrations, email testing and the cloud vfs workaround. Never reset an existing database as an automatic startup action.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
