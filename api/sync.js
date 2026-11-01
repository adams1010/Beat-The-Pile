// /api/sync.js — daily cron. Pulls every enabled company's own job board,
// keeps ME internships in VA/PA, and closes anything that disappeared from the feed.
import { COMPANIES } from "../lib/companies.js";
import { fetchCompany } from "../lib/fetchers/index.js";
import { db, isAuthorizedCron } from "../lib/db.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  const runStart = new Date().toISOString();
  const report = [];

  for (const cfg of COMPANIES.filter((c) => c.enabled)) {
    const entry = { company_id: cfg.id, ran_at: runStart, ok: false, raw_count: 0, kept_count: 0, closed_skipped: false, error: null };
    try {
      const { raw, listings } = await fetchCompany(cfg);
      entry.raw_count = raw;
      entry.kept_count = listings.length;

      // 1) Upsert everything we saw. last_seen=now, and reopen if it was closed.
      await db.upsert("listings", listings.map((l) => ({ ...l, last_seen: runStart, closed_at: null })));

      // 2) FEED HEALTH GUARD: board returned literally nothing, but we had open jobs yesterday?
      //    That's almost always a broken scraper, not a hiring freeze. Don't wipe; flag it.
      const open = await db.selectAsAdmin(`listings?select=id&company_id=eq.${cfg.id}&closed_at=is.null`);
      if (raw === 0 && open.length > 0) {
        entry.closed_skipped = true;
        entry.error = "Board returned 0 jobs; kept existing listings. Check the fetcher.";
      } else {
        // 3) Anything we didn't see this run is gone from the company's board → closed.
        await db.update(
          `listings?company_id=eq.${cfg.id}&closed_at=is.null&last_seen=lt.${encodeURIComponent(runStart)}`,
          { closed_at: runStart }
        );
      }
      entry.ok = !entry.closed_skipped;
    } catch (e) {
      entry.error = String(e.message || e).slice(0, 500);   // fetch failed → close nothing
    }
    report.push(entry);
  }

  try { await db.insert("feed_runs", report); } catch (e) { console.error("feed_runs log failed:", e.message); }
  const broken = report.filter((r) => !r.ok);
  if (broken.length) console.warn("[sync] needs attention:", broken.map((b) => `${b.company_id}: ${b.error}`));
  return res.status(200).json({ ranAt: runStart, report });
}
