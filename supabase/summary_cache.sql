-- Nov 27: last good homepage totals; /api/listings?summary=1 serves these when the live count times out (applied via MCP)
create table if not exists public.summary_cache (id text primary key, data jsonb not null, at timestamptz not null default now());
alter table public.summary_cache enable row level security;
-- listings gets vacuumed much more often (bot upserts left the visibility map stale: 137k heap fetches per count)
alter table public.listings set (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_insert_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
