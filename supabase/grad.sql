-- Grad school paths (Nov 2026): one jsonb column on user_jobs (path, grad year, LSAT/GPA, hours log). Safe to run twice.
alter table user_jobs add column if not exists grad jsonb;
