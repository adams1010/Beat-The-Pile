// /api/sync.js — pulls every enabled company's own job board, keeps ME internships in the US,
// and closes anything that disappeared from the feed.
// Companies rotate (least-recently-synced first) under a time budget, so as the list grows
// every company still gets synced. Runs: Vercel cron 24x/day + GitHub sync.yml (3 passes each time GitHub fires it).
import { loadCompanies } from "../lib/companies.js";
import { fetchCompany } from "../lib/fetchers/index.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { botOn, logRun } from "../lib/bots.js";
import { mapLimit } from "../lib/http.js";

export const config = { maxDuration: 60 };

const START_BUDGET_MS = 40000;   // don't start a new company after this
const HARD_STOP_MS = 54000;      // give up on a slow company before Vercel kills the function

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${Math.round(ms / 1000)}s`)), ms))]);

async function syncOne(cfg, runStart, msLeft) {
  const entry = { company_id: cfg.id, ran_at: runStart, ok: false, raw_count: 0, kept_count: 0, closed_skipped: false, error: null };
  try {
    const { raw, listings } = await withTimeout(fetchCompany(cfg), msLeft);
    entry.raw_count = raw;
    entry.kept_count = listings.length;

    // 1) Upsert everything we saw. last_seen=now, and reopen if it was closed.
    await db.upsert("listings", listings.map((l) => ({ ...l, last_seen: runStart, closed_at: null })));

    // 2) FEED HEALTH GUARD: board returned literally nothing, but we had open jobs before?
    //    That's almost always a broken scraper, not a hiring freeze. Don't wipe; flag it.
    const open = await db.selectAsAdmin(`listings?select=id&company_id=eq.${encodeURIComponent(cfg.id)}&closed_at=is.null`);
    if (raw === 0 && open.length > 0) {
      entry.closed_skipped = true;
      entry.error = "Board returned 0 jobs; kept existing listings. Check the fetcher.";
    } else {
      // 3) Anything we didn't see this run is gone from the company's board → closed.
      await db.update(
        `listings?company_id=eq.${encodeURIComponent(cfg.id)}&closed_at=is.null&last_seen=lt.${encodeURIComponent(runStart)}`,
        { closed_at: runStart }
      );
    }
    entry.ok = !entry.closed_skipped;
  } catch (e) {
    entry.error = String(e.message || e).slice(0, 500);   // fetch failed or timed out → close nothing
  }
  try { await db.insert("feed_runs", [entry]); } catch (e) { console.error(`feed_runs log failed (${cfg.id}):`, e.message); }
  if (!entry.ok) console.warn(`[sync] ${cfg.id}: ${entry.error}`);
  return entry;
}

export const HOT_BOOST_MS = 3 * 3600e3;
/** Queue position: last sync time (never-synced = 0, first), minus a boost for companies posting right now. Exported for tests. */
export function syncKey(id, last, hot) {
  if (!last[id]) return 0;
  return Date.parse(last[id]) - (hot.has(id) ? HOT_BOOST_MS : 0);
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!(await botOn("sync"))) return res.status(200).json({ off: true, bot: "sync" });
  const t0 = Date.now();
  const runStart = new Date().toISOString();

  const companies = (await loadCompanies()).filter((c) => c.enabled);
  const last = {};
  try {
    const runs = await db.selectAllAsAdmin("feed_last?select=company_id,ran_at&order=company_id.asc");
    for (const r of runs) if (!last[r.company_id]) last[r.company_id] = r.ran_at;
  } catch { /* first run */ }
  // Companies that posted something new in the last 3 days are read about twice as often (they count as 3 hours
  // "older" in the queue): same total work, aimed where new internships actually appear. Never-synced stay first.
  let hot = new Set();
  try {
    const since = new Date(Date.now() - 3 * 864e5).toISOString();
    hot = new Set((await db.selectAllAsAdmin(`listings?select=company_id&first_seen=gte.${since}&closed_at=is.null&order=company_id.asc`)).map((r) => r.company_id));
  } catch { /* no boost this run */ }
  companies.sort((a, b) => syncKey(a.id, last, hot) - syncKey(b.id, last, hot));

  const report = await mapLimit(companies, 14, async (cfg) => {   // mostly waiting on company sites, so more at once
    const elapsed = Date.now() - t0;
    if (elapsed > START_BUDGET_MS) return { company_id: cfg.id, skipped: true };
    return syncOne(cfg, runStart, HARD_STOP_MS - elapsed);
  });
  const doneRuns = report.filter((r) => !r.skipped), failed = doneRuns.filter((r) => !r.ok);
  const kept = doneRuns.reduce((n, r) => n + (r.kept_count || 0), 0);
  await logRun("sync", failed.length < doneRuns.length, `Synced ${doneRuns.length} companies · ${kept} internships seen${failed.length ? ` · ${failed.length} boards didn't answer` : ""}`,
    { synced: doneRuns.length, failed: failed.length, kept, deferred: report.length - doneRuns.length });
  return res.status(200).json({
    ranAt: runStart,
    synced: report.filter((r) => !r.skipped).length,
    deferred: report.filter((r) => r.skipped).map((r) => r.company_id),
    report: report.filter((r) => !r.skipped),
  });
}
