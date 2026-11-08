# Beat the Pile bots — runbook

Everything here is also visible live at **/bots** (system map, ranked "where to spend time", switches, run history).

## Daily health check (2 minutes)
1. Open /bots. Every dot green? The amber/grey ones say what's wrong ("no run for 3 hr", "switched off").
2. "Where to spend time" is ranked from live numbers — work top to bottom.
3. AI spend vs cap (bottom of the map). Anthropic balance itself is only at console.anthropic.com.

## Common problems → fix
| Symptom | Likely cause | Fix |
|---|---|---|
| Finder dot amber, "no run for N hr" | GitHub's 15-min schedule skipped runs (it does) — Vercel's hourly cron is the backstop | Usually self-heals. Force one: `gh api -X POST repos/adams1010/beat-the-pile/actions/workflows/discover.yml/dispatches -f ref=main` |
| Queue 0 and backlog 0 | Sources exhausted | Run Board Scout now (`board-scout.yml`), paste links on /discovery, or rebuild the backlog |
| Many `board_error` with "answered 403/429" | Site rate-limits datacenter IPs | They retry in 14 days automatically; browser pass handles JS sites |
| Many `identity_failed` | Board found but can't prove it's theirs (parent company portal, odd name) | Paste the company's real careers link on /discovery — an own-site link is proof |
| `unsupported` piling up for one system | We don't read that job system yet | /bots lists the counts → build that reader (see CLAUDE.md "Adding a reader") |
| Listings vanish for a company | Board redesign broke the reader; the sync's health guard keeps old listings and flags it | Check `feed_runs` for that company's error; fix the reader |
| AI features say "paused" | Monthly cap reached on /bots | Raise the cap (signed in as owner) or wait for the 1st |
| Site errors after a deploy | Bad code | Vercel dashboard → previous deployment → Promote (instant rollback) |
| Community posts never appear | AI moderation unavailable / over budget → posts wait as "pending" | Review them: `POST /api/community?action=admin_list` then `admin_review` (owner sign-in) |
| Students say sign-in "works" but saving fails with 401 | New domain not in the token check | Add it to `originAllowed` in lib/auth.js or the `ALLOWED_ORIGINS` env; look for `[auth] rejected` in Vercel logs |
| Link Checker "never page-checked" stays high | Rotation is behind | It opens ~400/run hourly; script-only systems (Ashby, SmartRecruiters, Jibe…) are skipped on purpose — the sync closes those |

## Board Scout details
- Reads `https://data.commoncrawl.org/cc-index/collections/<crawl>/indexes/cluster.idx` (~100 MB), finds the blocks
  whose keys start with the job-system prefixes (`com,myworkdayjobs,`, `io,greenhouse,`, `com,ashbyhq,jobs)`,
  `com,smartrecruiters,jobs)`, `com,icims,`), and downloads only those gzip blocks with HTTP Range requests. The CDX
  API server (index.commoncrawl.org/…-index?url=) times out — don't use it.
- Two latest crawls ≈ 14,600 boards. Probing runs at ~12 boards/sec; ~12–15% have US internships.
- `data/scout-state.json` remembers what was probed; re-probes after 30 days (internships are seasonal — run it in
  Aug–Oct for summer recruiting). The workflow commits that file back.
- Priority it assigns: ME internships 55–90, other engineering ~18–40, other majors ≤8.
- Names come from the board itself and are cleaned (`cleanName` in lib/scout.js): legal suffixes, "(Region)",
  leading tenant codes only when they're the initials of what follows ("GAIC Great American Insurance" → "Great
  American Insurance", but "USAA Federal Savings Bank" stays).

## Scale notes
- Supabase returns ≤1000 rows per request: anything that lists companies/listings must use `db.selectAll*`.
- Vercel Hobby is fine at current volume (bots mostly wait on network, little CPU). If usage nears limits
  (Vercel → Usage), move the finder's bulk work to GitHub Actions — `lib/discover.js` is plain Node.
- Sync rotates least-recently-synced first under a time budget; with 1,000+ live companies each one is refreshed
  every few hours. If that gets too slow, add more `sync.yml` runs.
- `listings` now holds every major. The engineering pages filter `match` not null.
