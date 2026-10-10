-- Read-only: run in the hosted project's SQL Editor. No secrets or prospect
-- records are returned, and nothing is changed. All checks are returned in one
-- result table because the SQL Editor may display only the last statement.
with worker_functions as (
  select required.name, p.oid, p.prosecdef
  from (values
    ('claim', 'public.claim_website_audit(uuid,text)'),
    ('finish', 'public.finish_website_audit(uuid,text,jsonb,boolean,text)')
  ) as required(name, signature)
  left join pg_catalog.pg_proc p on p.oid = to_regprocedure(required.signature)
), checks as (
  select * from (values
    ('audit_runs_installed', (to_regclass('public.audit_runs') is not null)::text),
    ('audit_capabilities_installed', (to_regclass('public.audit_capabilities') is not null)::text),
    ('required_digest_installed', (to_regprocedure('extensions.digest(text,text)') is not null)::text),
    ('pgcrypto_schema', coalesce((
      select n.nspname::text
      from pg_catalog.pg_extension e
      join pg_catalog.pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'pgcrypto'
    ), 'missing'))
  ) as installation(check_name, result)
  union all
  select name || '_function_installed', (oid is not null)::text
  from worker_functions
  union all
  select name || '_anonymous_worker_can_execute',
    coalesce(has_function_privilege('anon', oid, 'execute'), false)::text
  from worker_functions
  union all
  select name || '_uses_owner_permissions', coalesce(prosecdef, false)::text
  from worker_functions
)
select check_name, result from checks order by check_name;
