-- Nov 17 2026: remove the unused InternIQ v1 tables + PostGIS (clears the rls_disabled_in_public warning on spatial_ref_sys).
-- Salvage first: 3,522 v1 companies with a real website (hospitals, colleges, banks, insurers, firms…) were queued in
-- company_candidates (source 'v1 salvage (OpenStreetMap)', priority 1) so the Company Finder can still prove their boards.
drop function if exists public.find_internships cascade;
drop table if exists public.apply_links;        -- 415 old v1 job links, unused
drop table if exists public.company_majors;     -- guessed major → title pairs, never shown
drop table if exists public.company_locations;
drop table if exists public.companies;
drop extension if exists postgis;
