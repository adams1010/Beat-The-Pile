-- Nov 23 2026: "How did you hear about Beat the Pile?" (lib/heard.js). Run once in Supabase → SQL Editor.
-- Students: user_jobs.heard_from {src, detail?, at, via: signup|email}, set once. Businesses keep theirs in employers.profile.heard
-- (no column needed). heard_token = the random link in the one-time email (/heard/?t=…), heard_asked_at = when it went out
-- (so nobody gets it twice). Private: never on profiles, Orbit, search or company pages.
alter table user_jobs add column if not exists heard_from jsonb,
  add column if not exists heard_token text,
  add column if not exists heard_asked_at timestamptz;
create unique index if not exists user_jobs_heard_token_idx on user_jobs (heard_token) where heard_token is not null;
