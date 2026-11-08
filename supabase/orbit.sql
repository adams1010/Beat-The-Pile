-- Orbit part 2: two-way connections + "going to the same fair". Run once in Supabase → SQL Editor.
-- Safe to run twice. Nothing reads these until the Orbit part-2 code ships.

-- One row per pair of students. user_a < user_b (alphabetical Clerk ids) so a pair can only exist once.
create table if not exists orbit_links (
  user_a       text not null,
  user_b       text not null,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  requested_by text not null,                       -- which of the two sent the request
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
create index if not exists orbit_links_b on orbit_links (user_b);
-- Private: no public policies. Only the server (service key, after checking the Clerk sign-in) reads/writes.
alter table orbit_links enable row level security;

-- "Going to the same fair": opt-in, one fair at a time, only shown to other students who opted in to the same fair.
alter table user_jobs add column if not exists orbit_fair text,
  add column if not exists orbit_fair_on boolean not null default false;
