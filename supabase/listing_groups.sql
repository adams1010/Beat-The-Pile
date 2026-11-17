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

-- Nov 17: weekly job alerts read every open listing first seen in the last 8 days (≈50k rows); this keeps that fast
create index if not exists listings_open_first_seen on public.listings (first_seen desc, id) where closed_at is null;

-- Nov 17: public job searches (anon role) timed out at Supabase's default 3 s on the Nano database during heavy sync; 8 s = same as signed-in users
alter role anon set statement_timeout = '8s'; notify pgrst, 'reload config';

-- Nov 17 2026: listing_groups averaged 3 s (peaks 7.3 s, timeout 8 s) on the Nano instance. This index lets it answer from
-- the index alone (index-only scan): ~0.1 s. Plus the /jobs index for "this job type + this major, newest first".
create index if not exists listings_open_groups on public.listings (company_id, field, match, kind) include (company, first_seen, link_ok) where closed_at is null;
create index if not exists listings_open_field_kind_first_seen on public.listings (field, kind, first_seen desc, id) where closed_at is null;
alter table public.feedback add column if not exists handled_at timestamptz;
