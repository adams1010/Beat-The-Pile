<!-- Same project guide as CLAUDE.md, for ChatGPT/Codex and other AI tools. If you change one, change both. -->
# Beat the Pile (formerly InternIQ) — read this first

**Beat the Pile** (www.beatthepile.com — the bare domain redirects there; still also served at intern-iq-psi.vercel.app) shows students **real internships
pulled straight from each company's own job board**, plus Career Fair Mode, My Season, and the Opening Radar.
Owner: Adam Shiloni (VT mechanical engineering). The repo/Vercel project/database keep the old "InternIQ" names — only
the brand changed. All student-facing copy says "Beat the Pile".
Admins (can flip bot switches, paste links): `ADMIN_EMAILS` env, default shiloniadam10@gmail.com, mdxp21@gmail.com.

**Non-negotiables**
- Never show a listing from a board the robot hasn't *proven* belongs to that company (see Proof rules below).
- Never fabricate stats, testimonials or reviews. Every number on the site/demo is live data or cited. Example screens
  in the demo are labeled "Example". No AI-generated company lists anywhere (the homepage quiz shows real listings only).
- Estimates are labeled as estimates (match %, resume scores, Radar opening dates, "Posted ~" dates).
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

## Look & feel (Nov 2026)
Font **Geist**; ink `#0B1220`, one accent green `#0E8A5F`, cool neutrals. No gradients, glows, rainbow chips or emoji
in UI. Homepage tokens: `G/GD/GL/GM` at the top of `src/home.jsx`; static pages: CSS vars at the top of each page.
Homepage `/#interview` = Interview practice (`/api/generate` feature `interview_turn`). Pro is **free during beta**
(no payment exists — never show prices or "secure checkout" until Stripe is wired).

## Homepage build step (important)
The homepage app is **`src/home.jsx`** (edit this). Browsers load the built **`home.js`** with production React (no
in-browser Babel). After editing `src/home.jsx`: `npm install && node scripts/build-home.mjs`, then commit both.
`tests/home-build-test.mjs` fails if `home.js` is stale. `index.html` is just the shell (head, styles, script tags).
Homepage screens have hash URLs (`/#quiz`, `/#dashboard`, `/#score`, …) so Back/refresh/sharing work.

## Pages
`/jobs` internships (engineering view; filters live in the URL: `?state=all|VA,PA&me=1&q=&view=saved|following`) ·
`/fair` Career Fair Mode (QR resume, route, briefs, notes, follow-ups) · `/season` My Season (pipeline, weekly goal,
apply speed, **Delete all my data**) · `/radar` Opening Radar · `/privacy` plain-words privacy page · `/bots` **Bot
Control Room** (owner sign-in required to see numbers) · `/discovery` robot's company list + "Needs a link" sheet ·
`/demo` story-style demo · `/` homepage (built from `src/home.jsx`).
Every page (homepage too) includes **`/nav.js`** (one shared top bar: Jobs · Career Fair · My Season · Radar · Tools ▾, phones get a Menu; it moves the page's `#acct` sign-in widget into the bar) and
`/feedback.js` (Report a problem). Owner tools are not in the student nav.

## Privacy, AI and data-integrity rules (from the Nov 2026 audit — keep them)
- **Resume QR**: new uploads start **private** (`resume_share=false`); students turn it on. `rotate` = new token (old QR
  dies), `resume_delete` = file + link gone. QR redirects hand out **2-minute** signed links.
- **AI**: every call goes through `callClaude()` in `lib/aiusage.js` — atomic budget reservation (Postgres
  `ai_reserve`, one lock), real cost settled after, **fails closed** if the budget table can't be read.
  `/api/generate` takes `{feature, input}` only — prompts are server-side templates (no free-form prompts).
  Rate limits are durable + shared: Postgres `rate_take(key, window_s, max)` via `rateOk()`. Fails closed.
- **Community wall** (`/api/community`, tables `community_posts/_replies` in the main DB): everything starts
  `pending`; AI approves/hides; AI down/over budget/unclear → stays pending for owner review (`admin_list`,
  `admin_review` with Clerk admin sign-in). 3 reports → back to pending. Only public fields are returned.
- **Concurrent saves**: every write to `user_jobs` goes through `mutate()` in `lib/userdata.js` (version column,
  retry on conflict). `user_home` (homepage sync) is versioned the same way in `api/usersync.js`, which also
  **merges** devices on sign-in and mirrors homepage tracker entries into My Season (`apps` ids `h:…`).
- **Dates**: `posted_on` (employer text) ≠ `first_seen` (our robot). `lib/dates.js postedInfo()` → exact, estimated
  ("Posted 3 Days Ago"), or null ("30+ days", junk). Apply-speed stats only use employer dates.
- **Auth**: `lib/auth.js` checks signature, expiry, **issuer** (from the publishable key) and **azp** (our domains,
  this project's previews, localhost; add others with `ALLOWED_ORIGINS`). Rejections are logged as `[auth] rejected`.
- **Errors**: APIs never return raw database errors; a failed load is 503/500 with a plain message, never an empty
  list that looks like "no jobs". Pages show "couldn't load" differently from "nothing found".

## The bots (all visible + switchable on /bots; details in docs/BOTS.md)
| Bot | Runs | Where | Code |
|---|---|---|---|
| 🤖 Company Finder (**main**) | hourly (Vercel) + GitHub `discover.yml` (3 passes per fire; GitHub only fires it a few times a day) | Vercel `api/discover.js` | `lib/discover.js` |
| 🛰 Board Scout | weekly Sun 07:00 UTC | GitHub `board-scout.yml` | `lib/scout.js`, `scripts/board-scout.mjs` |
| 🔭 New-Company Scout (SimplifyJobs import) | daily 07:xx UTC inside the finder | Vercel | `lib/simplify.js` |
| 🌐 Browser Pass | nightly 08:30 UTC | GitHub `deep-discover.yml` (Playwright) | `scripts/deep-discover.mjs` |
| 🔄 Internship Sync | Vercel cron 24×/day + GitHub `sync.yml` (3 passes per fire) | Vercel `api/sync.js` | `lib/fetchers/*`; 14 boards at once |
| 🔗 Link Checker | after each GitHub sync pass + 09:45/21:45 UTC (Vercel); 700/run | Vercel `api/check-links.js` | hides only after 2 dead checks in a row; skips script-only ATS pages |
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
   `scripts/build-backlog.mjs`). The finder pulls 60 more whenever <120 are queued; it checks up to 60 per run, 12 at once.
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
first_seen, closed_at, link_ok, link_fails) · `feed_runs` + view `feed_last` · `user_jobs` (saved, applied, apps,
starred, seen_at, fair_notes, resume_*, weekly_goal, **version**) · `user_home` (homepage profile/tracker/resumes,
version) · `community_posts` / `community_replies` (status pending/approved/hidden) · `company_briefs` · `feedback` ·
`bot_settings` (switches; row `ai` holds `cap_usd`) · `bot_runs` · `ai_usage` (reserved flag) · `rate_hits`.
Functions: `rate_take`, `ai_reserve` (service role only). Storage bucket `resumes` (private, signed links).
`/api/listings` extras: `?summary=1` (counts only), `?ids=` (your history incl. closed), `?limit=&offset=` (paging).
`/api/discovery?bots=1` is public **switches only**; full control-room data needs an owner token or CRON_SECRET.

## Working on it
- Clone: `/home/claude/interniq` (repo adams1010/InternIQ). Push to `main` deploys (check
  `gh api repos/adams1010/InternIQ/commits/<sha>/status`).
- Tests: `bash tests/run.sh` (offline, everything faked via `tests/fakedb.mjs`). Add a test for every bot/reader/API change.
- Risky robot changes: push a branch, run `probe.yml` with `ref=<branch>` against real sites, then merge.
- Secrets in GitHub: `CRON_SECRET` only. Everything else lives in Vercel env.
- Owner prefs: short bullets, honest pushback, visuals, small targeted changes, test before deploying.
