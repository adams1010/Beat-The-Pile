-- Run once in Supabase → SQL Editor. Each student's saved + applied internships.
create table if not exists user_jobs (
  clerk_user_id text primary key,
  saved         jsonb not null default '[]',
  applied       jsonb not null default '[]',
  updated_at    timestamptz not null default now()
);
-- Private: no public policies. Only the server (service key, after checking the Clerk sign-in) can read/write.
alter table user_jobs enable row level security;

-- Weekly job alerts (lib/alerts.js), Nov 2026
alter table user_jobs add column if not exists alert_on boolean not null default false,
  add column if not exists alert_major text, add column if not exists alert_states text,
  add column if not exists alert_last_sent timestamptz;

-- Nov 16: invite links (/?ref=<handle>) — who brought this student in. Set once, at first sign-up.
alter table user_jobs add column if not exists referred_by text;
create index if not exists user_jobs_referred_by_idx on user_jobs (referred_by) where referred_by is not null;
