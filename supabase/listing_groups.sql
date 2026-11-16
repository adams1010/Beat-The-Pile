-- Nov 16: counts for /api/listings?summary=1, ?names=1 and /bots done in Postgres (Supabase egress was over the free 5.5 GB:
-- these used to pull every open listing, ~15 MB, on each cold cache). One JSON array, so PostgREST's 1000-row cap doesn't apply.
-- rows: [company_id, company, field, match, kind, n, new24]
create or replace function public.listing_groups()
returns json language sql stable security invoker set search_path = public as $$
  select coalesce(json_agg(json_build_array(company_id, company, field, match, kind, n, new24)), '[]'::json) from (
    select l.company_id, max(l.company) company, l.field, l.match, l.kind, count(*)::int n,
           count(*) filter (where l.first_seen > now() - interval '24 hours')::int new24
    from listings l
    where l.closed_at is null and (l.link_ok is null or l.link_ok)
    group by l.company_id, l.field, l.match, l.kind) g
$$;
grant execute on function public.listing_groups() to anon, authenticated, service_role;
