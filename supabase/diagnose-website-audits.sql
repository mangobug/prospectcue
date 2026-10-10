-- Read-only: run in the hosted project's SQL Editor. No secrets or prospect
-- records are returned, and nothing is changed.
select
  to_regclass('public.audit_runs') is not null as audit_runs_installed,
  to_regclass('public.audit_capabilities') is not null as audit_capabilities_installed,
  to_regprocedure('public.claim_website_audit(uuid,text)') is not null as claim_function_installed,
  to_regprocedure('public.finish_website_audit(uuid,text,jsonb,boolean,text)') is not null as finish_function_installed,
  to_regprocedure('extensions.digest(text,text)') is not null as required_digest_installed;

select p.proname as function_name,
  has_function_privilege('anon', p.oid, 'execute') as anonymous_worker_can_execute,
  p.prosecdef as uses_owner_permissions
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('claim_website_audit', 'finish_website_audit');

select e.extname as extension_name, n.nspname as installed_schema
from pg_catalog.pg_extension e
join pg_catalog.pg_namespace n on n.oid = e.extnamespace
where e.extname = 'pgcrypto';
