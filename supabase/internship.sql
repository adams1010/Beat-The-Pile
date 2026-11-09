-- My Internship (Nov 2026): one jsonb column on user_jobs. Run once in Supabase → SQL Editor. Safe to run twice.
alter table user_jobs add column if not exists internship jsonb;
