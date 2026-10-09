-- Hosted projects can have different default privileges. Make the application's
-- existing authenticated API permissions explicit; RLS still controls each row.
revoke all on public.profiles, public.workspaces, public.workspace_memberships,
 public.prospects, public.prospect_activities, public.import_batches from anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.profiles, public.workspaces, public.workspace_memberships,
 public.prospects, public.prospect_activities, public.import_batches to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (name) on public.workspaces to authenticated;
grant insert, update, delete on public.prospects to authenticated;
grant insert on public.prospect_activities to authenticated;
