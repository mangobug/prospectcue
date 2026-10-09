# Current milestones

Agency Prospect helps agencies organize public local-business prospects and sales follow-ups. YXU Digital in London, Ontario is the first internal user; the UI and data boundaries support other independent agencies.

The implemented journey is signup, email confirmation, workspace onboarding, manual entry or reviewed CSV import, searching a private prospect list, editing details, recording conversation notes, setting Toronto calendar follow-ups, and progressing through New, Reviewed, Contacted, Meeting, Proposal, Won and Lost. Dashboard and pipeline reflect stored records only. Website statuses and verification are supplied by users and do not assert that an audit happened.

CSV review exposes invalid records and conservative duplicate candidates. Users can exclude invalid records and default-skipped duplicates, or explicitly create a separate duplicate. Imports do not merge or overwrite. Prospect deletion requires confirmation and removes its activity history.

Business discovery adds category/location search with Overture Places and Google
Places API (New). Anonymous visitors try five real results; signed-in users
browse twenty per page and save selections into their workspace. Overture starts
with a regional London catalogue; Google needs a server-side key. No account tier
or pricing affects searching or saving. See `docs/discovery.md` for coverage,
provider retention boundaries, attribution and hosted rollout.

Internal validation precedes subscriptions. Crawling, audit evidence, automated
scoring, outreach sending, AI drafts, billing, invitations and drag-and-drop
remain outside these milestones. No external providers are simulated in the app.
