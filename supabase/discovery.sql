-- Run once in Supabase → SQL Editor. Creates the discovery robot's worklist.

create table if not exists company_candidates (
  id            text primary key,          -- "x-company-name"
  company       text not null,             -- display name on listings
  domain        text,                      -- their website, used to find + prove the board
  key           text,                      -- name keyword the proof step looks for
  hint          text,                      -- optional guessed board URL (must still pass proof)
  source        text,                      -- where the candidate came from (e.g. "VT Expo 2026")
  status        text not null default 'pending',
                                           -- pending | live | identity_failed | unsupported | blocked
                                           -- | board_error | no_board | no_domain | duplicate | error
  ats           text,                      -- workday | successfactors | greenhouse | lever
  config        jsonb,                     -- scraper settings for that board
  enabled       boolean not null default false,  -- ← turn a company off here; its listings come down next check
  detail        text,                      -- human-readable reason / proof
  intern_count  int,
  attempts      int not null default 0,
  checked_at    timestamptz,
  verified_at   timestamptz
);
create index if not exists company_candidates_queue_idx on company_candidates (status, checked_at);

alter table company_candidates enable row level security;
drop policy if exists "public read candidates" on company_candidates;
create policy "public read candidates" on company_candidates for select using (true);
