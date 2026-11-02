-- Run once in Supabase → SQL Editor (Ctrl+A, then Run). Career Fair Mode: resume QR + conversation notes.
alter table user_jobs add column if not exists resume_path        text;
alter table user_jobs add column if not exists resume_name        text;
alter table user_jobs add column if not exists resume_token       text unique;
alter table user_jobs add column if not exists resume_share       boolean not null default true;
alter table user_jobs add column if not exists resume_uploaded_at timestamptz;
alter table user_jobs add column if not exists fair_notes         jsonb not null default '[]';
-- Private file bucket: resumes are only ever handed out as 10-minute signed links via /r/<token>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 3145728, array['application/pdf'])
on conflict (id) do nothing;
