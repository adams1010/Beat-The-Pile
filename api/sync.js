// /api/sync.js — pulls every enabled company's own job board, keeps ME internships in the US,
// and closes anything that disappeared from the feed.
// Companies rotate (least-recently-synced first) under a time budget, so as the list grows
// every company still gets synced — the cron runs twice a day.
import { loadCompanies } from "../lib/companies.js";
import { fetchCompany } from "../lib/fetchers/index.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { mapLimit } from "../lib/http.js";

export const config = { maxDuration: 60 };

const START_BUDGET_MS = 35000;   // don't start a new company after this
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

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const t0 = Date.now();
  const runStart = new Date().toISOString();

  const companies = (await loadCompanies()).filter((c) => c.enabled);
  const last = {};
  try {
    const runs = await db.selectAsAdmin("feed_runs?select=company_id,ran_at&order=ran_at.desc&limit=3000");
    for (const r of runs) if (!last[r.company_id]) last[r.company_id] = r.ran_at;
  } catch { /* first run */ }
  companies.sort((a, b) => (last[a.id] || "").localeCompare(last[b.id] || ""));   // never-synced first

  const report = await mapLimit(companies, 8, async (cfg) => {
    const elapsed = Date.now() - t0;
    if (elapsed > START_BUDGET_MS) return { company_id: cfg.id, skipped: true };
    return syncOne(cfg, runStart, HARD_STOP_MS - elapsed);
  });
  return res.status(200).json({
    ranAt: runStart,
    synced: report.filter((r) => !r.skipped).length,
    deferred: report.filter((r) => r.skipped).map((r) => r.company_id),
    report: report.filter((r) => !r.skipped),
  });
}
