alter table public.prospects add column discovery_attributions jsonb not null default '[]'
 check(jsonb_typeof(discovery_attributions)='array');
alter table public.prospects add constraint google_no_stored_attributions
 check(source_type<>'google_places' or discovery_attributions='[]'::jsonb);
update public.prospects p set discovery_attributions=d.attributions from public.discovery_places d
 where p.source_type='overture' and p.discovery_id=d.id;

create function public.capture_discovery_provenance() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.source_type='overture' then
  select attributions into new.discovery_attributions from public.discovery_places where id=new.discovery_id;
  if not found then raise exception 'Overture listing unavailable'; end if;
 else new.discovery_attributions:='[]'::jsonb; end if;
 return new;
end $$;
create trigger capture_discovery_provenance before insert on public.prospects
 for each row execute function public.capture_discovery_provenance();
create function public.protect_discovery_provenance() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.discovery_attributions is distinct from old.discovery_attributions then
  raise exception 'Immutable discovery provenance'; end if;
 return new;
end $$;
create trigger protect_discovery_provenance before update on public.prospects
 for each row execute function public.protect_discovery_provenance();
revoke execute on function public.capture_discovery_provenance(), public.protect_discovery_provenance() from public,anon,authenticated;
notify pgrst,'reload schema';
