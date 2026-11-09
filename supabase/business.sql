-- Business side (Nov 2026): one row per employer account. Run once in Supabase → SQL Editor. Safe to run twice.
-- Private: RLS on with no policies — only the server (service key, after checking the Clerk sign-in) reads/writes.
create table if not exists employers (
  clerk_user_id      text primary key,
  slug               text unique,                          -- public company page: /co/<slug>
  profile            jsonb not null default '{}'::jsonb,   -- company, website, industry, size, hq, about, logo, your name/title, hiring
  domain             text,                                 -- from the verified work email, e.g. boeing.com
  company_id         text,                                 -- our jobs data (company_candidates.id) when the name matches
  status             text not null default 'new' check (status in ('new', 'pending', 'verified', 'rejected')),
  review_note        text,
  reviewed_by        text,
  work_email         text,
  email_code_hash    text,
  email_code_expires timestamptz,
  email_tries        int not null default 0,
  email_verified_at  timestamptz,
  fairs              jsonb not null default '[]'::jsonb,   -- career fair ids this company will attend
  version            int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists employers_domain on employers (domain);
create index if not exists employers_status on employers (status);
alter table employers enable row level security;
