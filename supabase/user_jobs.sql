-- Run once in Supabase → SQL Editor. Each student's saved + applied internships.
create table if not exists user_jobs (
  clerk_user_id text primary key,
  saved         jsonb not null default '[]',
  applied       jsonb not null default '[]',
  updated_at    timestamptz not null default now()
);
-- Private: no public policies. Only the server (service key, after checking the Clerk sign-in) can read/write.
alter table user_jobs enable row level security;
