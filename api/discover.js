// /api/discover.js — the discovery robot (cron, twice a day).
// Each run: refresh the candidate list, then try ~16 queued companies: find their job board,
// prove it's theirs, and enable it. Results (good or bad, with reasons) go to company_candidates.
import { CANDIDATES } from "../lib/candidates.js";
import { COMPANIES, boardKey } from "../lib/companies.js";
import { discoverOne } from "../lib/discover.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { mapLimit } from "../lib/http.js";

export const config = { maxDuration: 60 };

const PER_RUN = 16;
const START_BUDGET_MS = 30000;
const RETRY_AFTER_DAYS = 14;

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const t0 = Date.now();

  // 1) Sync the candidate list into the table (adds new rows; keeps each row's status/results)
  try {
    await db.upsert("company_candidates", CANDIDATES.map((c) => ({
      id: c.id, company: c.company, domain: c.domain || null, key: c.key || null, hint: c.hint || null, source: c.source || null,
    })));
  } catch (e) {
    return res.status(500).json({ error: "Couldn't update company_candidates — run supabase/discovery.sql first. " + e.message });
  }

  // 2) Boards already live (hand-verified + previously discovered) → never add the same board twice
  const liveRows = await db.selectAsAdmin("company_candidates?select=id,ats,config&enabled=eq.true&limit=1000");
  const taken = new Map(COMPANIES.map((c) => [boardKey(c), c.company]));
  for (const r of liveRows) if (r.ats && r.config) taken.set(boardKey({ ats: r.ats, ...r.config }), r.id);

  // 3) Next batch: never-tried first; failures get retried after 2 weeks (max 4 tries)
  const cutoff = new Date(Date.now() - RETRY_AFTER_DAYS * 86400000).toISOString();
  const rows = await db.selectAsAdmin(
    `company_candidates?select=*&or=(status.eq.pending,and(status.in.(error,blocked,no_board,board_error),checked_at.lt.${cutoff},attempts.lt.4))` +
    `&order=checked_at.asc.nullsfirst&limit=${PER_RUN}`
  );

  const results = await mapLimit(rows, 4, async (c) => {
    if (Date.now() - t0 > START_BUDGET_MS) return { id: c.id, skipped: true };
    let r;
    try { r = await discoverOne(c, { deadline: t0 + 47000 }); }
    catch (e) { r = { status: "error", detail: String(e.message || e).slice(0, 300) }; }

    if (r.status === "live") {
      const k = boardKey({ ats: r.ats, ...r.config });
      if (taken.has(k) && taken.get(k) !== c.id) r = { status: "duplicate", detail: `Same board as ${taken.get(k)} — already listed` };
      else taken.set(k, c.id);
    }
    const now = new Date().toISOString();
    await db.update(`company_candidates?id=eq.${encodeURIComponent(c.id)}`, {
      status: r.status,
      ats: r.ats || null,
      config: r.config || null,
      enabled: r.status === "live",
      detail: r.detail || null,
      intern_count: r.intern_count ?? null,
      attempts: (c.attempts || 0) + 1,
      checked_at: now,
      ...(r.status === "live" ? { verified_at: now } : {}),
    });
    return { company: c.company, status: r.status, detail: r.detail };
  });

  const done = results.filter((r) => !r.skipped);
  return res.status(200).json({
    tried: done.length,
    wentLive: done.filter((r) => r.status === "live").map((r) => r.company),
    results: done,
  });
}
