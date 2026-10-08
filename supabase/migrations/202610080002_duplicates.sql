create function public.duplicate_candidates(w uuid, keys text[]) returns table(id uuid,business_name text,key text)
language sql stable security invoker set search_path='' as $$
 select distinct on (public.duplicate_key(p.business_name,p.city,p.province,p.country)) p.id,p.business_name,public.duplicate_key(p.business_name,p.city,p.province,p.country) from public.prospects p
 where p.workspace_id=w and public.is_member(w) and public.duplicate_key(p.business_name,p.city,p.province,p.country)=any(keys);
$$;
revoke execute on function public.duplicate_candidates(uuid,text[]) from public,anon;
grant execute on function public.duplicate_candidates(uuid,text[]) to authenticated;
