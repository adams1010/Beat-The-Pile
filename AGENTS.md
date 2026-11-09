<!-- Same project guide as CLAUDE.md, for ChatGPT/Codex and other AI tools. If you change one, change both. -->
# Beat the Pile (formerly InternIQ) — read this first

**Beat the Pile** (www.beatthepile.com — the bare domain redirects there; still also served at intern-iq-psi.vercel.app) helps **every student, any major,
land an internship — and their first full-time job**: real internships **pulled straight from each company's own job board**, plus Career Fair Mode, My Season, and the Opening Radar.
Owner: Adam Shiloni (VT mechanical engineering). **Positioning (Nov 2026): for every major — never write copy that implies it's only for engineers. Internships first, early-career full-time too (Nov 8) — lead with internships, never drop them.** The Vercel project and database keep the old "InternIQ" names (the GitHub repo is now adams1010/beat-the-pile) — only
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
(`gh api -X POST repos/adams1010/beat-the-pile/actions/workflows/probe.yml/dispatches -f ref=<branch> -f "inputs[code]=<async JS>"`),
then read `PROBE_RESULT` from the run logs. In the JS, `await import(process.cwd() + "/lib/….js")` works. Use real
tab/newline escapes (`"\t"`, `"\n"`) — the code is passed through bash single quotes.

## Look & feel (Nov 2026) — Direction D (Glassdoor × LinkedIn), live since Nov 5; "less AI" pass Nov 5 night
Top bar + homepage hero: navy `#060A2C` (no grid, no scan line, no ticker, no blinking), lime `#B0F701` accent, the Beat the Pile
logo. Content area `#EEF1F6`, white 12px-radius cards, dark-lime actions `#4A7000`, pill buttons. **No monospace/"terminal" font and
no ALL-CAPS letter-spaced labels** — sentence case, Geist with `tabular-nums` for numbers. Job cards lead with the **role**, then a
company line with an initials tile. /jobs = 3 columns on desktop; on phones the filter box is not sticky and Feedback is a small "?".
Shared static-page theme: `/d.css`. Mockups: Design artifact 6iuFD7mA58DSdeeWUebJCo.
Font **Geist**; ink `#060A2C`, one accent (dark lime `#4A7000` on white, lime `#B0F701` on navy), cool neutrals. No gradients, glows, rainbow chips or emoji
in UI. Homepage tokens: `G/GD/GL/GM` at the top of `src/home.jsx`; static pages: CSS vars at the top of each page.
Homepage `/#interview` = Interview practice (`/api/generate` feature `interview_turn`). Pro is **free during beta**
(no payment exists — never show prices or "secure checkout" until Stripe is wired).

## Homepage build step (important)
The homepage app is **`src/home.jsx`** (edit this). Browsers load the built **`home.js`** with production React (no
in-browser Babel). After editing `src/home.jsx`: `npm install && node scripts/build-home.mjs`, then commit both.
`tests/home-build-test.mjs` fails if `home.js` is stale. `index.html` is just the shell (head, styles, script tags).
Homepage screens have hash URLs (`/#quiz`, `/#dashboard`, `/#score`, …) so Back/refresh/sharing work.

## Pages
`/jobs` internships (every major via the Major picker; filters live in the URL: `?state=all|VA,PA&major=&me=1&q=&view=saved|following&company=`; a `?q=` link with no major searches every major). **Search (Nov 9, `jobs/search.js`, tests `tests/jobsearch-test.mjs`)**: each word on its own (title/company/place), cousins (`SYN`: sales → business development…; medical → healthcare, clinical, medtech + big medical/pharma company names in `CO_SYN`), plurals, one-letter typos, word fragments only when clearly a fragment (never "sales" → Salem); fits-every-word first (closest fit first), and under 12 of those a "Similar roles" block (fits some words) + "Search every major" — so a search is never a dead end. Spelling fixes against the words in real titles/companies/places ("phycoology" → psychology, shown as "Showing results for …"); `AREA` maps a word to its job areas so a major with no matching title ("zoology") still gets its closest area; a submitted search inside one major that finds < 12 widens to every major once (not saved as their major). Checked against 15.5k live listings with probe.yml ·
`/fair` Career Fair Mode (QR resume, route, briefs, notes, follow-ups; `fair/fairs.json` — every fair has a `term` ("Spring 2027") shown after its name; announced fairs with no employer list yet have `companies: []` and say so) · `/season` My Season (pipeline, weekly goal,
apply speed, **Delete all my data**) · `/radar` Opening Radar · `/privacy` plain-words privacy page · `/bots` **Bot
Control Room** (owner sign-in required to see numbers) · `/discovery` robot's company list + "Needs a link" sheet ·
`/demo` story-style demo · `/majors` **Every major** (Nov 9; homepage "Every major →"; 109 quiz majors → /jobs field keys, MAP generated from `lib/geo.js fieldsForMajor` — `tests/majors-page-test.mjs` fails on drift; "Also:" links for majors that fit several areas; area cards with live counts) · `/internship` **My Internship** (Nov 9; for students with an offer — under Tools + a link on My Season's Offer tab: dated checklist by phase (after offer → 2 weeks before → first week → middle → last 2 weeks, `lib/internship.js phaseOf`), countdown, weekly log → AI resume bullets (`/api/generate` feature `intern_bullets`, copy-only), company brief, "Your people" = public profiles that interned there + opted-in incoming interns; `user_jobs.internship` jsonb via `supabase/internship.sql`; actions `intern_save`/`intern_peers`; until the column exists it saves on the device (`btp_internship`)) · `/orbit` **Orbit** (Nov 8; the people side — drawn as an actual orbit: you in the middle, rings = Inner orbit (your major + school) · Campus (other majors) · Insiders (interned at companies you follow), plus a "Signals" feed; deliberately NOT a LinkedIn "My Network" clone; **Find people** (Nov 9, `orbit_search` → `searchPeople` in lib/orbitnet.js, `/orbit/?q=`, top-bar search menu "People", `@name` = people; public profiles only, matches name/@handle/school/major/headline/skills/experience companies, never you, no ids; employers only once verified and only students open to employers; tests `tests/peoplesearch-test.mjs`); the /u/ "Public profile" switch tells students classmates can find them here): part 1 live = classmates (same school + major, public profiles only), other majors at your school, students who interned at companies you follow (profile experience org = followed company), activity feed (new internships at followed companies + approved community posts) — `POST /api/me {action:"orbit"}` → `lib/orbit.js`. Part 2 (live Nov 8, `supabase/orbit.sql` run) = two-way Connect (request → accept/ignore, by public handle), in-app messages (connected students; employer accounts → students with "Let employers find me" on, students can reply), "going to the same fair" (opt-in both ways) — `orbit_connect|accept|remove|inbox|thread|send|fair` actions in `api/me.js` → `lib/orbitnet.js`; the browser never sees Clerk ids (people you know are addressed by an HMAC "peer key"); Find talent has a Message button; Delete all my data also removes links + messages · `/u/` **the one profile** (Nov 7: the old homepage profile form is gone — `/#profile` redirects to `/u/#kit`; owner view adds Profile strength + a private **Application kit** = email/phone/GPA/work auth/relocate/why-me/resumes, stored in `user_home.profile`/`resumes` via `/api/usersync` so homepage auto-fill + cover letters still use it; saving /u/ also copies name/school/major/links/skills into the kit; profile QR for career fairs; owner view also shows "Your season" counts, a profile-strength ring with one-click next steps, and "Who can see you" (link / Orbit / employers); `profile.openTo` = ["intern","fulltime"] "Open to" badges; **Education card (Nov 9):** main school picked from `/schools/index.json` (every US degree-granting college, US Dept. of Education IPEDS — rebuild with the on-demand `schools.yml` workflow → `scripts/build-schools.mjs`) saves `schoolId`; the Major then becomes a dropdown of the programs that school really awards (`/schools/p/<id%64>.json` + `/schools/cip.json`, "Not listed — type it" fallback), so classmates pick the same name → inner orbit (`sameSchool()` in lib/orbit.js compares ids when both have one); graduation = term (Spring/Summer/Fall/Winter → `gradTerm`, kit date May/Aug/Dec) + year; `education[]` = up to 5 more schools {school, degree, major, when}; tests `tests/education-test.mjs`) and `/u/<handle>` public profile (signed-in visitors see the same orbit state as Orbit — "In orbit" + Message (→ `/orbit/?chat=<handle>`), "Orbit requested", "<name> wants to join your orbit" + Accept, or Join orbit — via `orbit_state`; private until the student turns it on; noindex; https-only links; resume button only when the QR link is on; API `action:"profile"` + `GET /api/me?u=`) · `/` homepage (built from `src/home.jsx`).
Every page (homepage too) includes **`/nav.js`** (one shared top bar — students: Jobs · Career Fair · Orbit · My Season · Tools ▾; employers: Home · Talent · Orbit · Career Fairs. **No Profile / For business tabs (Nov 8):** your picture (top right) opens the account menu = View profile (employers: View company page) · **Switch to business / student account** · Language (English, Español, Français, Deutsch, Nederlands) · Sign out; signed out = "Sign in" → `/start/` (email first, then student or business). Pages' own `#acct` widgets are hidden, and the homepage no longer adds its own account button (Nov 9: on phones it showed a second "Sign in" next to your picture while Clerk loaded). Verified employers get a "Hiring" tag under their picture (`localStorage btp_hiring`, set by biz.js), and "Hiring" under their avatar in Orbit/messages and on their company page. A line icon above each label (inline SVG, class `btpic`; never emoji); Radar lives under Tools; phones get a Menu) and
`/feedback.js` (Report a problem). Owner tools are not in the student nav.
**Resumes are files (Nov 8):** every resume input is a PDF/Word/txt upload read in the browser by **`/resume-file.js`**
(`btpResumeFile.read(file)` → text; real .docx unzip via DecompressionStream; pdf.js from cdnjs) — no paste boxes. /u/ "Fill your
profile from your resume" → `/api/generate` feature `profile_fill` (copy-only JSON) → fills only EMPTY fields + adds new
experience/projects/skills, and keeps the file in the kit (`resumes.list[].file` = name/size/pages/kind). Photo upload has a
crop + zoom dialog. The Orbit/Talent tab badge (`orbit_count` = unread + requests, "10+") loads on every page, re-checks every 30 s
and on tab focus; nav.js loads Clerk itself on pages that don't, if this browser was signed in before.
**Languages (Nov 8): English, Español, Français, Deutsch, Nederlands.** `nav.js` loads **`/i18n.js`**; the account menu (your picture) →
Language (and a Language card on `/u/`) sets localStorage `btp_lang` (`en`|`es`|`fr`|`de`|`nl`). Non-English swaps whole text nodes /
placeholder / aria-label / title that exactly match an English key in **`i18n/<lang>.json`** (`strings`, ~1,090 keys, same keys in
all four), plus `patterns` for numbers/names ("12 open", "Ana wants to join your orbit"; captured parts are translated too), and
"·"-joined parts one by one; a MutationObserver covers later renders. Employer data (titles, companies, places) is never in the
dictionary. **New UI text? Add it to all four files** (`tests/i18n-test.mjs` fails if a language is missing a key or pattern).
Wrap anything that must not change in `data-noi18n`.
**Two sides (Nov 8): students + employers.** After sign-in everyone picks a role once — `/start/` (step 1 Clerk email box, step 2
"I'm looking for an internship" / "I'm hiring interns") or the welcome sheet `nav.js` shows to a signed-in account with no role.
Saved in Clerk `unsafeMetadata.role` (`student`|`employer`) + localStorage `btp_role`. **The business side is its own site (Nov 8):**
employers' bar = Home (`/business/home/`) · Talent · Orbit · Career Fairs (`/business/fairs/`) · Company (`/business/company/`), a
"Business" tag on the logo, a student search box; student-only pages (`/`, `/jobs`, `/season`, `/fair`, `/radar`, `/demo`, `/u/`,
the `/business/` sales page) redirect employers to `/business/home/`. Students (and signed-out visitors) see "For business".
`/business/` = sales landing (live numbers only, talent mock labeled Example, **no "free"/price wording**, no testimonials);
"Find interns" → `/start/?role=employer` skips the looking/hiring question → `/business/setup/`.
**Employer trust (table `employers`, `supabase/business.sql`, `lib/employer.js`, actions `biz_*` in `api/me.js`):** setup = company →
6-digit code to a WORK email (free-mail refused; code stored hashed, 15 min, 5 tries; sent via Resend) → status `pending` → an owner
approves on **`/business/admin/`** (ADMIN_EMAILS; shows "email confirmed" + "domain matches website"). **Only `verified` employers**
can use Find talent, send messages, or ask students to join their orbit — and only to students with a public profile AND
`profile.openToEmployers` ("Let employers find me", off by default). Public company page **`/co/<slug>`** (verified only; `GET
/api/me?co=`): about, who we hire, perks, live jobs (our listings via `company_id` name match), recruiters, "Interned here" (opted-in
students only), fairs. Students can **join a company's orbit** too: `/co/<slug>` shows "Join orbit" (page owner + each recruiter carry an HMAC peer key;
`resolve()` in lib/orbitnet.js accepts keys of VERIFIED employers only), and message threads show Join orbit / Accept; once the
employer accepts, both can message. Business Orbit (`biz_orbit`): Interested students (follow your company) · Former interns · Your team (verified
employers, same email domain) · At your fairs · In orbit. Business home (`biz_home`): live counts only. Fair counts are numbers only.
`/business/biz.js` + `biz.css` = shared employer-page helpers. Tests: `tests/business-test.mjs`.
**Founding members (Nov 9, `lib/founding.js`, `tests/founding-test.mjs`):** the first 150 STUDENT accounts (Clerk created_at order, employers skipped) get "Founding member #N" and "keep every Pro feature free, for life" (never name a price). The number is saved once in Clerk `public_metadata.founding` (server-only) so it never moves. `GET /api/me?founding=1` = real `{taken,total,left}` (homepage hero + `/start/` show "N of 150 founding spots left" only while > 0); `founding` comes back on `GET /api/me` and on public profiles (`/u/` badge).
**Homepage map:** `/api/listings?dots=1&field=all&kind=all` = internships + early-career jobs; a posting open in several real cities is a dot in each (`spots` = dots, `placed` = postings).
**Sticky top bar:** the homepage used `overflow-x:hidden` on html+body, which made body the scroll box and unstuck the nav — use `overflow-x:clip` (never `hidden`) on html/body anywhere.
**Brand (Nov 8):** logo in `brand/` (`logo-white.png` in the navy top bar, `logo.png` on light, `mark.png`), icons in `icons/`.
Colors from the logo: navy `#060A2C`, lime `#B0F701` (on dark only — 1.3:1 on white), dark lime `#4A7000` for buttons/links
on white, tints `#F2FADF`/`#DDF3A8`.

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
| 🛰 Board Scout | Sun + Wed 07:00 UTC (twice a week since Nov 9) | GitHub `board-scout.yml` | `lib/scout.js`, `scripts/board-scout.mjs` |
| 🔭 New-Company Scout (SimplifyJobs import) | daily 07:xx UTC inside the finder | Vercel | `lib/simplify.js`; internship list + (Nov 9) the **New-Grad-Positions** list (`SIMPLIFY_NEWGRAD_URL`, `newGrad:true` = any title, closed rows skipped; ~600 companies we didn't track) |
| 🌐 Browser Pass | nightly 08:30 UTC | GitHub `deep-discover.yml` (Playwright) | `scripts/deep-discover.mjs` |
| 🔄 Internship Sync | Vercel cron 24×/day + GitHub `sync.yml` (3 passes per fire) | Vercel `api/sync.js` | `lib/fetchers/*`; 14 boards at once |
| 🔗 Link Checker | after each GitHub sync pass + 09:45/21:45 UTC (Vercel); 700/run | Vercel `api/check-links.js` | hides only after 2 dead checks in a row; skips script-only ATS pages |
| 📡 Opening Radar | daily 10:40 UTC | GitHub `radar.yml` | `scripts/build-radar.mjs` |
| 🖼 Logo Finder | daily 10:15 UTC | GitHub `logos.yml` | `lib/logos.js`, `scripts/find-logos.mjs`. Proves the company's website (own job-board link, board on their domain, or title names them — every name word) before saving `company_candidates.logo` (https icon, `fav` = Google s2 icon of the proven `domain`, `none`). `/logos.js` swaps any `[data-logo-id]` initials tile; initials stay when unproven. Public map: `/api/listings?logos=1`. |
| ✉️ Follow-up Emails + weekly Job Alerts | daily 13:20 UTC (Vercel cron `/api/remind` → `api/me.js?cron=remind`) | Vercel | `lib/remind.js`, rule in `lib/followups.js` (applied 5–45 days, not followed up). Opt-in, ≤1 email/3 days, one-click unsubscribe. **Job alerts** (`lib/alerts.js`, same cron): opt-in on /jobs for the current major+states (`user_jobs.alert_on/alert_major/alert_states/alert_last_sent`) + followed companies; ≤1/week, none when nothing new; unsub `?unsub=<token>&k=alerts`. Off without `RESEND_API_KEY`; sender `REMIND_FROM` (default reminders@beatthepile.com, domain verified in Resend). |

Every bot calls `botOn(id)` before working and `logRun(id, ok, summary, stats)` after (`lib/bots.js`).
GitHub-run bots read their switch from `GET /api/discovery?bots=1` and report via `POST /api/discovery {action:"botlog"}`
with the CRON_SECRET. To add a bot: add it to `BOTS` in `lib/bots.js`, check the switch, log runs, add a row in the
`bot_settings` table (or it defaults to on), and give it a `STALE_MIN` + icon in `bots/index.html`.

## How companies get in (sources → proof → live)
1. **Board Scout** (biggest source): Common Crawl's public index → ~14,600 job boards (Workday, Greenhouse, Ashby,
   SmartRecruiters, iCIMS, Lever since Nov 6; Paylocity + UKG + BambooHR since Nov 7 — 37,000+ boards) → probes the ones we don't track for US internships → real employer name from the board →
   `POST /api/discovery {action:"scout"}` inserts candidates (`id b-…`, `hint` = board URL, `priority`).
2. **Backlog** (`data/backlog.json`, 3,000+ companies from 3 years of SimplifyJobs history; rebuild with
   `scripts/build-backlog.mjs`). The finder pulls 60 more whenever <120 are queued; it checks up to 60 per run, 12 at once.
3. **Nightly SimplifyJobs import**, **career-fair lists** (`fair/fairs.json`, `lib/candidates.js`), **links pasted on /discovery**.
4. The **Company Finder** retries failed checks after 14 days (7 in hiring season Aug–Feb), up to 6 tries; it takes the queue by `priority desc` (ME-heavy ~60–95, other engineering ~20–40, other majors
   <20), finds each company's board (or uses the hint), and **proves** it's theirs before enabling it.

**Website guessing** (`guessDomain`, for Paylocity/UKG boards that name a company but have no website on file): .com, .org, .net, .us, .ai, .io, .co, with and without www (Nov 9: + .org/.net/.us/bare domain), 20 s cap; the page must carry the full name AND link to that exact board — a guessed site linking to some other board is still held back.
**Proof rules** (`lib/discover.js` verify*): linked from the company's own site; or board name matches the company key
(≥4 chars, or exact 3-letter key); or most sampled postings name the company as employer (Workday
`hiringOrganization` 2-of-3, SmartRecruiters company, Jibe `hiring_organization`). iCIMS needs the name in the portal
address/title (portals are often a parent's). Oracle/ADP/Paylocity need an own-site link. A failed check records the
real reason (`board_error` / `identity_failed`); `unsupported` means only "no board we can read was found".

## Job systems we read (`lib/fetchers/`)
workday · successfactors · greenhouse · lever · icims (classic) · **jibe** (iCIMS's newer career site on the company's
own domain, `/api/jobs`) · ashby · smartrecruiters · oracle · **eightfold** (newer `/api/pcsx/search` feed, falls back to
`/api/apply/v2`) · paylocity · adp · **taleo** (Enterprise: `{tenant}.taleo.net/careersection/{section}`, portal id read
from the search page and saved in config; keyword search "intern"/"co-op"; proof = tenant name or own-site link) ·
**ukg** (UltiPro `recruiting{,2}.ultipro.com/{TENANT}/JobBoard/{guid}`; keyword search is broken so it reads every job;
proof = own-site link only; every detail URL answers 200 → link checker skips it) · **workable** (Nov 9: `apply.workable.com/api/v1/widget/accounts/{slug}` — every job in one feed; detected from `apply.workable.com/{slug}` / `{slug}.workable.com` links; proof = slug match or the account's own `name`; link checker skips it; tests `tests/workable-test.mjs`; Common Crawl barely has Workable pages, so these come in via companies' own careers pages) · **bamboohr** (`{slug}.bamboohr.com/careers/list` JSON; the board's
"Internship" employment type counts even when the title doesn't say intern (`isIntern`); proof = board name/slug match or the board's own
registered name from `/careers/company-info`; dead job pages redirect → link checker skips it). Not yet: Avature, Dayforce,
Taleo Business Edition (`*.tbe.taleo.net`), BrassRing, Workable. (Board Scout can't use Taleo: pages never name the employer.)
**Adding a reader:** fetcher in `lib/fetchers/` returning `[{sourceId,title,location,url,postedOn}]` → register in
`fetchers/index.js` → `boardKey` in `lib/companies.js` → detection in `scanHtml` + a `verify…` proof in
`lib/discover.js` → add the system to `NOW_READABLE` and bump `READERS_UPDATED_AT` in `api/discover.js` (re-tests
parked companies) → if links can't be checked like a web page, add it to the skip list in `api/check-links.js` →
test offline in `tests/` and against real sites with `probe.yml` on a branch.

## All majors (LIVE since Nov 5 2026)
Every US internship is stored with `field` (`lib/fields.js`, first-match-wins rules: software, data, product_design (PM),
cyber_it, mechanical, electrical, chemical, civil, product_design (design), industrial, finance, legal_policy, people_hr,
consulting, marketing, sales, supply_chain, science_health, education_social, engineering, other). `match` stays the
engineering view (`me` / `general` / null). **Any rule change must keep `tests/fields-test.mjs` green** (≈200 real
hand-labeled titles) — check moves against a live sample before shipping. Quiz majors → fields: `lib/geo.js
fieldsForMajor` (tested for all 110 quiz majors). `/api/listings` default = engineering view; `field=all|<key>`;
`names=1` = companies hiring now (Radar). `/jobs` has a Major picker (`?major=`, remembered in localStorage
`btp_major`, shared with `/fair`) and loads one major + place at a time in pages of 1,000 (all majors in one response
would hit Vercel's 4.5 MB cap). Bots: finder/scout priority = number of internships (+ small engineering boost);
nightly SimplifyJobs import takes every major; Radar keeps any company with 5+ postings and 2+ seasons (or tracked).

## Full-time (early-career) jobs (Nov 8 2026)
Internships stay first, but the readers also keep **early-career full-time** roles: `lib/fields.js isEarlyCareer()` (new grad,
entry level, early career, rotational / development programs, "Engineer I / Analyst 1", "Associate … Engineer/Analyst", junior …;
never senior/lead/manager/II+/"N+ years", never internships, years < 2026 dropped). Keyword readers add `EARLY_QUERIES`
("new grad", "entry level", "graduate", + "associate" since Nov 9 — probed on 26 Workday boards, it roughly doubles the new-grad roles found) capped at `EARLY_PAGES` (2) pages each, and a failed early search never costs the
internships; Workday adds the same keyword searches after the intern facet; Greenhouse/Lever/Ashby/BambooHR/Paylocity/ADP/UKG
already read every job. **No new column:** `/api/listings?kind=intern|fulltime|all` (default `intern`, so old pages are unchanged)
filters with PostgREST `title=imatch.<INTERN_PG>`; every row comes back with `kind`; `summary` keeps `allMajors` = internships and
adds `fulltime`. `/jobs` has an Internships · Full-time · Both switch (`?kind=`) and a "Full-time" badge. Probed Nov 8 on real
boards (Boeing, Northrop, L3Harris, BWXT, Merck, Stripe, Palantir): 3–28 early-career roles each, ≤8 s per company.
Tests: `tests/fulltime-test.mjs`.

## Distance search ("within N mi of a ZIP", live Nov 7 2026)
`lib/geocode.js` turns employer location text into points using only the US Census Gazetteer (`data/us-places.json`,
`data/us-zips.json`, rebuilt by `scripts/build-places.mjs <dir>` from the 2024 place/cousub/ZCTA files + the ZCTA↔place
relationship file). Rules: a point only when a real city/town is found **in the state the text names**; regions ("Bay
Area"), neighborhoods, truncated names and same-name towns in one state (two Cranberry/Hamilton Townships) stay unplaced;
offshore Census points (San Francisco, Honolulu) are re-centered on land; a few big work sites that aren't Census places
(`SITES`, e.g. Cranberry Township PA, Hunt Valley MD) use their own ZIP area. Measured on 13,942 live listings: 94% placed,
99.9% of points in the stated state (rest = border towns). Listings store `geo_lat/geo_lng` (first point), `geo_pts`,
`geo_n`, `geo_kind` (place|remote|multi|state|none) — set in `fetchCompany`; old rows backfilled by `fillGeo` in
`api/sync.js`. API: `/api/listings?near=24060|City, ST&mi=5–300` → nearest first with `mi`, plus `meta.remote` and
`meta.unplacedInState` so the page says what isn't on the map. `/jobs`: one "Near [city, state or ZIP]" box (no radius dropdown since Nov 8: 50 mi
default, a "Show within 100 mi" link in the note; `?near=&mi=` still work); a bare city ("Blacksburg") works —
`cityMatches()` uses it when one state has it, else the API returns `choices` and the page shows state buttons; picking a state turns it off. Tests: `tests/geo-radius-test.mjs` (real formats + audit catches). Changing the geocoder?
Re-run the measure/audit against a fresh pull of live locations before shipping.

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
- Clone: `/home/claude/beat-the-pile` (repo adams1010/beat-the-pile; renamed from InternIQ). Push to `main` deploys (check
  `gh api repos/adams1010/beat-the-pile/commits/<sha>/status`).
- Tests: `bash tests/run.sh` (offline, everything faked via `tests/fakedb.mjs`). Add a test for every bot/reader/API change.
- Risky robot changes: push a branch, run `probe.yml` with `ref=<branch>` against real sites, then merge.
- Secrets in GitHub: `CRON_SECRET` only. Everything else lives in Vercel env.
- Owner prefs: short bullets, honest pushback, visuals, small targeted changes, test before deploying.
