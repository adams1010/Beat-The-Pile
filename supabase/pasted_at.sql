-- Nov 25: links the owners paste on /discovery leave their queue for good (applied via MCP)
alter table company_candidates add column if not exists pasted_at timestamptz;
