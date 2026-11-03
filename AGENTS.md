<!-- Same project guide as CLAUDE.md, for ChatGPT/Codex and other AI tools. If you change one, change both. -->
# InternIQ — read this first

InternIQ (intern-iq-psi.vercel.app) shows students **real internships pulled straight from each company's own job
board**, plus Career Fair Mode, My Season, and the Opening Radar. Owner: Adam Shiloni (VT mechanical engineering).
Admins (can flip bot switches, paste links): `ADMIN_EMAILS` env, default shiloniadam10@gmail.com, mdxp21@gmail.com.

**Non-negotiables**
- Never show a listing from a board the robot hasn't *proven* belongs to that company (see Proof rules below).
- Never fabricate stats, testimonials or reviews. Every number on the site/demo is live data or cited.
- Ask the owner before anything that sends messages as him, spends money, enters passwords, or deletes data.
- Never print secrets (CRON_SECRET, Supabase keys, Anthropic key). Never paste them into chat.

## Stack & hard limits
| Piece | Notes |
|---|---|
| Vercel (Hobby) | Static pages + `api/*.js` functions. **Max 12 function files — we're AT 12.** Add features as actions inside existing files (`api/me.js`, `api/discovery.js`), never new files. |
| Supabase (Postgres, project `ancyjceciqendgahfqsd`) | REST via `lib/db.js`. **PostgREST returns ≤1000 rows per request — use `db.selectAll*` for anything that can grow.** |
| Clerk | Sign-in. `lib/auth.js` verifies JWTs. |
| GitHub Actions (repo is **public** → unlimited minutes; making it private would cap at 2,000 min/mo) | Runs the heavy bots + `probe.yml` for testing against real sites. |
| Anthropic API (Haiku 4.5, $1/$5 per M tokens) | Briefs, AI follow-up emails, homepage AI. Every call costed in `ai_usage`; monthly cap on /bots (default $10). |

The Claude workspace **can't reach company websites**. To test against real sites, dispatch `probe.yml`
(`gh api -X POST repos/adams1010/InternIQ/actions/workflows/probe.yml/dispatches -f ref=<branch> -f "inputs[code]=<async JS>"`),
then read `PROBE_RESULT` from the run logs. In the JS, `await import(process.cwd() + "/lib/….js")` works. Use real
tab/newline escapes (`"\t"`, `"\n"`) — the code is passed through bash single quotes.

## Pages
`/jobs` internships (engineering view) · `/fair` Career Fair Mode (QR resume, route, briefs, notes, follow-ups) ·
`/season` My Season (pipeline, weekly goal, apply speed) · `/radar` Opening Radar · `/bots` **Bot Control Room**
(live system map, "where to spend time", every bot's switch + run log, AI spend) · `/discovery` robot's company list +
"Needs a link" sheet · `/demo` story-style demo · `/` homepage (older, large file).

## The bots (all visible + switchable on /bots; details in docs/BOTS.md)
| Bot | Runs | Where | Code |
|---|---|---|---|
| 🤖 Company Finder (**main**) | every 15 min (GitHub) + hourly (Vercel) | Vercel `api/discover.js` | `lib/discover.js` |
| 🛰 Board Scout | weekly Sun 07:00 UTC | GitHub `board-scout.yml` | `lib/scout.js`, `scripts/board-scout.mjs` |
| 🔭 New-Company Scout (SimplifyJobs import) | daily 07:xx UTC inside the finder | Vercel | `lib/simplify.js` |
| 🌐 Browser Pass | nightly 08:30 UTC | GitHub `deep-discover.yml` (Playwright) | `scripts/deep-discover.mjs` |
| 🔄 Internship Sync | hourly | Vercel `api/sync.js` (+ GitHub `sync.yml`) | `lib/fetchers/*` |
| 🔗 Link Checker | 09:45 + 21:45 UTC | Vercel `api/check-links.js` | |
| 📡 Opening Radar | daily 10:40 UTC | GitHub `radar.yml` | `scripts/build-radar.mjs` |

Every bot calls `botOn(id)` before working and `logRun(id, ok, summary, stats)` after (`lib/bots.js`).
GitHub-run bots read their switch from `GET /api/discovery?bots=1` and report via `POST /api/discovery {action:"botlog"}`
with the CRON_SECRET. To add a bot: add it to `BOTS` in `lib/bots.js`, check the switch, log runs, add a row in the
`bot_settings` table (or it defaults to on), and give it a `STALE_MIN` + icon in `bots/index.html`.

## How companies get in (sources → proof → live)
1. **Board Scout** (biggest source): Common Crawl's public index → ~14,600 job boards (Workday, Greenhouse, Ashby,
   SmartRecruiters, iCIMS) → probes the ones we don't track for US internships → real employer name from the board →
   `POST /api/discovery {action:"scout"}` inserts candidates (`id b-…`, `hint` = board URL, `priority`).
2. **Backlog** (`data/backlog.json`, 3,000+ companies from 3 years of SimplifyJobs history; rebuild with
   `scripts/build-backlog.mjs`). The finder pulls 30 more whenever <48 are queued.
3. **Nightly SimplifyJobs import**, **career-fair lists** (`fair/fairs.json`, `lib/candidates.js`), **links pasted on /discovery**.
4. The **Company Finder** takes the queue by `priority desc` (ME-heavy ~60–95, other engineering ~20–40, other majors
   <20), finds each company's board (or uses the hint), and **proves** it's theirs before enabling it.

**Proof rules** (`lib/discover.js` verify*): linked from the company's own site; or board name matches the company key
(≥4 chars, or exact 3-letter key); or most sampled postings name the company as employer (Workday
`hiringOrganization` 2-of-3, SmartRecruiters company, Jibe `hiring_organization`). iCIMS needs the name in the portal
address/title (portals are often a parent's). Oracle/ADP/Paylocity need an own-site link. A failed check records the
real reason (`board_error` / `identity_failed`); `unsupported` means only "no board we can read was found".

## Job systems we read (`lib/fetchers/`)
workday · successfactors · greenhouse · lever · icims (classic) · **jibe** (iCIMS's newer career site on the company's
own domain, `/api/jobs`) · ashby · smartrecruiters · oracle · **eightfold** (newer `/api/pcsx/search` feed, falls back to
`/api/apply/v2`) · paylocity · adp. Not yet: Avature, UKG, Dayforce, Taleo, BambooHR, BrassRing.
**Adding a reader:** fetcher in `lib/fetchers/` returning `[{sourceId,title,location,url,postedOn}]` → register in
`fetchers/index.js` → `boardKey` in `lib/companies.js` → detection in `scanHtml` + a `verify…` proof in
`lib/discover.js` → add the system to `NOW_READABLE` and bump `READERS_UPDATED_AT` in `api/discover.js` (re-tests
parked companies) → if links can't be checked like a web page, add it to the skip list in `api/check-links.js` →
test offline in `tests/` and against real sites with `probe.yml` on a branch.

## All majors (ready, not switched on)
Every US internship is now stored with `field` (`lib/fields.js`: mechanical, electrical, civil, chemical, software,
data, cyber_it, industrial, finance, consulting, marketing, sales, product_design, supply_chain, science_health,
people_hr, legal_policy, engineering, other). `match` stays the engineering view (`me` / `general` / null).
`GET /api/listings` defaults to engineering (`match` not null); `?field=all` or `?field=finance` etc. returns other
majors. **To launch all majors:** add a major picker to `/jobs` (and `/fair`) that passes `field`, update copy
("mechanical engineering internships…"), and extend `/radar` + Board Scout priorities if the focus changes.

## Data model (Supabase)
`company_candidates` (robot queue + results: status, ats, config, hint, priority, detail) · `listings` (match, field,
first_seen, closed_at, link_ok) · `feed_runs` + view `feed_last` · `user_jobs` (saved, applied, apps, starred,
seen_at, fair_notes, resume_*, weekly_goal) · `company_briefs` · `feedback` · `bot_settings` (switches; row `ai` holds
`cap_usd`) · `bot_runs` · `ai_usage`. Storage bucket `resumes` (private, signed links).

## Working on it
- Clone: `/home/claude/interniq` (repo adams1010/InternIQ). Push to `main` deploys (check
  `gh api repos/adams1010/InternIQ/commits/<sha>/status`).
- Tests: `bash tests/run.sh` (offline, everything faked). Add a test for every bot/reader change.
- Risky robot changes: push a branch, run `probe.yml` with `ref=<branch>` against real sites, then merge.
- Secrets in GitHub: `CRON_SECRET` only. Everything else lives in Vercel env.
- Owner prefs: short bullets, honest pushback, visuals, small targeted changes, test before deploying.
