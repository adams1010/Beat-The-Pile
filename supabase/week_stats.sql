-- Nov 24 2026 (owner: "things I can see live in the bot control room"). Run once in Supabase → SQL Editor.
-- One read-only function for the "This week" section of /bots (api/discovery.js ?bots=1&week=1, owners only, cached 10 min).
-- Counts only, no user data. Returns:
--   kinds:  [kind, open_now, new7, fresh7, closed7]   fresh7 = new jobs at companies that were already live a week ago
--   stale:  [ats, open jobs not seen by the bots in 7+ days]
--   fields: [field, open internships]  thinnest first
--   states: [state, open jobs]         thinnest first (2-letter US states + DC)
--   fails:  [status, ats, reason, companies]  top reasons companies aren't live
create or replace function public.bot_week_stats()
returns json language sql stable security invoker set search_path = public as $$
  with w as (select now() - interval '7 days' as t),
  g as (
    select l.kind, coalesce(c.ats, 'other') as ats,
      count(*) filter (where l.closed_at is null)::int as open_now,
      count(*) filter (where l.first_seen > w.t)::int as new7,
      count(*) filter (where l.first_seen > w.t and (c.verified_at is null or c.verified_at <= w.t))::int as fresh7,
      count(*) filter (where l.closed_at > w.t)::int as closed7,
      count(*) filter (where l.closed_at is null and l.last_seen < w.t)::int as stale
    from listings l cross join w left join company_candidates c on c.id = l.company_id
    where l.closed_at is null or l.closed_at > w.t or l.first_seen > w.t
    group by 1, 2)
  select json_build_object(
    'at', now(),
    'kinds', (select coalesce(json_agg(json_build_array(kind, o, n, f, c) order by o desc), '[]'::json) from
               (select kind, sum(open_now)::int o, sum(new7)::int n, sum(fresh7)::int f, sum(closed7)::int c from g group by kind) k),
    'stale', (select coalesce(json_agg(json_build_array(ats, s) order by s desc), '[]'::json) from
               (select ats, sum(stale)::int s from g group by ats having sum(stale) > 0) s),
    'fields', (select coalesce(json_agg(json_build_array(field, n) order by n asc), '[]'::json) from
               (select coalesce(field, 'untagged') field, count(*)::int n from listings where closed_at is null and kind = 'intern' group by 1) f),
    'states', (select coalesce(json_agg(json_build_array(state, n) order by n asc), '[]'::json) from
               (select state, count(*)::int n from listings where closed_at is null and state ~ '^[A-Z]{2}$' and state <> 'US' group by 1) s),
    'fails', (select coalesce(json_agg(json_build_array(status, ats, reason, n) order by n desc), '[]'::json) from
               (select status, coalesce(ats, '') ats, left(regexp_replace(regexp_replace(coalesce(detail, ''), '(https?://)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(/[^ )]*)?', 'a site', 'gi'), '[0-9]+', 'N', 'g'), 70) reason, count(*)::int n
                from company_candidates where status not in ('live', 'pending', 'duplicate', 'later')
                group by 1, 2, 3 order by n desc limit 12) x)
  )
$$;
revoke all on function public.bot_week_stats() from public, anon, authenticated;
grant execute on function public.bot_week_stats() to service_role;

-- helps the "new this week" and "closed this week" counts skip old rows
create index if not exists listings_first_seen on public.listings (first_seen);
create index if not exists listings_closed_at on public.listings (closed_at) where closed_at is not null;
