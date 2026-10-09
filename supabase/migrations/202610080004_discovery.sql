-- Shared, independently licensed Overture catalogue. Workspace prospects stay private.
create table public.discovery_places (
 id text primary key check(length(id) between 1 and 100),
 business_name text not null check(length(btrim(business_name)) between 1 and 200),
 industry text not null default '' check(length(industry)<=100),
 categories text[] not null default '{}' check(cardinality(categories)<=50),
 website_url text check(website_url ~* '^https?://' and length(website_url)<=2048),
 phone text check(length(phone)<=50),
 city text not null default '' check(length(city)<=100),
 province text not null default '' check(length(province)<=100),
 country text not null default '' check(length(country)<=100),
 address text not null default '' check(length(address)<=500),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 release text not null check(length(release) between 1 and 100),
 attributions jsonb not null default '[]' check(jsonb_typeof(attributions)='array'),
 imported_at timestamptz not null default now()
);
alter table public.discovery_places enable row level security;
revoke all on public.discovery_places from anon, authenticated;
create index discovery_location on public.discovery_places(lower(city),lower(province),lower(country));

create function public.discovery_catalogue_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('count',count(*),'imported_at',max(imported_at),
  'releases',coalesce(jsonb_agg(distinct release),'[]'::jsonb)) from public.discovery_places;
$$;
revoke execute on function public.discovery_catalogue_status() from public;
grant execute on function public.discovery_catalogue_status() to anon,authenticated;

create function public.search_discovery_places(category text, location text, page integer default 1)
returns setof public.discovery_places language plpgsql stable security definer set search_path='' as $$
declare page_size integer := case when auth.uid() is null then 5 else 20 end;
 terms text[]; term text; location_terms text[];
begin
 if category is null or location is null or page is null
  or length(btrim(category)) not between 2 and 100 or length(btrim(location)) not between 2 and 150
  or page not between 1 and 500 then raise exception 'Invalid search'; end if;
 if auth.uid() is null and page<>1 then raise exception 'Sign in to browse more results'; end if;
 term := lower(regexp_replace(btrim(category),'[^[:alnum:]_ ]','','g'));
 terms := case term
  when 'dentists' then array['dentist','dental'] when 'dentist' then array['dentist','dental']
  when 'plumbers' then array['plumber','plumbing'] when 'plumber' then array['plumber','plumbing']
  when 'bakeries' then array['bakery','bakeries'] when 'restaurants' then array['restaurant']
  when 'lawyers' then array['lawyer','legal','attorney'] when 'salons' then array['salon','hairdresser']
  else array[term] end;
 location_terms := regexp_split_to_array(lower(btrim(location)),'[ ,]+');
 return query select d.* from public.discovery_places d
 where not exists(select 1 from unnest(location_terms) t where
  strpos(lower(d.city||' '||d.province||' '||d.country),t)=0)
 and exists(select 1 from unnest(terms) t where
  strpos(lower(d.industry||' '||array_to_string(d.categories,' ')||' '||d.business_name),t)>0)
 order by d.id limit (case when auth.uid() is null then 5 else page_size+1 end) offset (page-1)*page_size;
end $$;
revoke execute on function public.search_discovery_places(text,text,integer) from public;
grant execute on function public.search_discovery_places(text,text,integer) to anon,authenticated;

-- Google listing content is never copied into persistent prospect fields.
alter table public.prospects drop constraint prospects_source_type_check;
alter table public.prospects add constraint prospects_source_type_check
 check(source_type in ('manual','csv_import','overture','google_places'));
alter table public.prospects add column discovery_id text check(length(discovery_id) between 1 and 255);
alter table public.prospects add constraint discovery_identity check(
 (source_type in ('overture','google_places')) = (discovery_id is not null));
alter table public.prospects add constraint google_reference_only check(source_type<>'google_places' or
 (website_url is null and email is null and phone is null and city='' and province='' and country='' and website_status='unknown'));
create unique index prospects_provider_identity on public.prospects(workspace_id,source_type,discovery_id)
 where discovery_id is not null;

create or replace function public.protect_prospect() returns trigger language plpgsql set search_path='' as $$
begin
 if new.workspace_id<>old.workspace_id or new.created_by<>old.created_by or new.id<>old.id
 or new.created_at<>old.created_at or new.source_type<>old.source_type
 or new.discovery_id is distinct from old.discovery_id then raise exception 'Immutable prospect identity'; end if;
 if new.verification_status='user_verified' and old.verification_status<>'user_verified' then new.verified_at=now(); end if;
 if new.verification_status='unverified' then new.verified_at=null; end if;
 return new;
end $$;

create function public.save_discovery_prospects(w uuid, provider text, ids text[], category text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare place public.discovery_places; place_id text; pid uuid; result jsonb:='[]';
begin
 if auth.uid() is null or not public.is_member(w) then raise exception 'Workspace access denied'; end if;
 if provider is null or ids is null or category is null
 or provider not in ('overture','google_places') or cardinality(ids) not between 1 and 20
 or length(category)>100 then raise exception 'Invalid selection'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w::text,1));
 for place_id in select distinct unnest(ids) loop
  if place_id is null or length(place_id) not between 1 and 255 then raise exception 'Invalid place ID'; end if;
  select id into pid from public.prospects where workspace_id=w and source_type=provider and discovery_id=place_id;
  if pid is not null then
   result:=result||jsonb_build_object('id',place_id,'prospect_id',pid,'status','already_saved'); continue;
  end if;
  if provider='overture' then
   select * into place from public.discovery_places where id=place_id;
   if not found then raise exception 'Listing unavailable; search again'; end if;
   select id into pid from public.prospects where workspace_id=w
    and public.duplicate_key(business_name,city,province,country)=public.duplicate_key(place.business_name,place.city,place.province,place.country)
    order by created_at,id limit 1;
   if pid is not null then
    result:=result||jsonb_build_object('id',place_id,'prospect_id',pid,'status','already_saved'); continue;
   end if;
   insert into public.prospects(workspace_id,business_name,industry,website_url,website_status,phone,city,province,country,source_type,source_reference,created_by,discovery_id)
   values(w,place.business_name,place.industry,place.website_url,
    (case when place.website_url is null then 'unknown' else 'website_present' end)::public.website_status,
    place.phone,place.city,place.province,place.country,'overture','Overture Places · release '||place.release||' · '||place.id,auth.uid(),place.id)
   returning id into pid;
  else
   if place_id !~ '^[A-Za-z0-9_-]{10,255}$' then raise exception 'Invalid Google Place ID'; end if;
   insert into public.prospects(workspace_id,business_name,industry,city,province,country,source_type,source_reference,created_by,discovery_id)
   values(w,'Google place '||left(place_id,32),btrim(category),'','','','google_places',
    'https://www.google.com/maps/search/?api=1&query=Place&query_place_id='||place_id,auth.uid(),place_id)
   returning id into pid;
  end if;
  result:=result||jsonb_build_object('id',place_id,'prospect_id',pid,'status','saved');
 end loop;
 return result;
end $$;
revoke execute on function public.save_discovery_prospects(uuid,text,text[],text) from public,anon;
grant execute on function public.save_discovery_prospects(uuid,text,text[],text) to authenticated;
notify pgrst,'reload schema';
