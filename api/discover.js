// /api/discover.js — the discovery robot (Vercel cron 2x/day + GitHub Actions every 15 min).
// Each run: refresh the candidate list, then try ~24 queued companies: find their job board,
// prove it's theirs, and enable it. Results (good or bad, with reasons) go to company_candidates.
import { CANDIDATES } from "../lib/candidates.js";
import { COMPANIES, boardKey } from "../lib/companies.js";
import { discoverOne } from "../lib/discover.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { mapLimit, get } from "../lib/http.js";
import { SIMPLIFY_URL, pickCompanies, normName } from "../lib/simplify.js";

export const config = { maxDuration: 60 };

const PER_RUN = 24;
const START_BUDGET_MS = 30000;
const RETRY_AFTER_DAYS = 14;

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const t0 = Date.now();

  // 0) Once a day (07:00–07:59 UTC, or ?import=1): look for brand-new companies on the SimplifyJobs list.
  //    That run only imports; the new companies are then checked by the normal runs (same proof rules).
  const hour = new Date().getUTCHours();
  if (req.query?.import === "1" || hour === 7) {
    try {
      const r = await get(SIMPLIFY_URL, { timeoutMs: 20000 });
      if (!r.ok) throw new Error(`list answered ${r.status}`);
      const listings = await r.json();
      const rows = await db.selectAsAdmin("company_candidates?select=company,ats,config&limit=5000");
      const names = new Set([...rows, ...COMPANIES].map((c) => normName(c.company)));
      const boards = new Set(COMPANIES.map(boardKey));
      for (const x of rows) if (x.ats && x.config) boards.add(boardKey({ ats: x.ats, ...x.config }));
      const fresh = pickCompanies(listings, names, boards);
      for (let i = 0; i < fresh.length; i += 200) await db.insertIgnore("company_candidates", fresh.slice(i, i + 200));
      return res.status(200).json({ imported: fresh.length, companies: fresh.slice(0, 50).map((f) => f.company) });
    } catch (e) {
      if (req.query?.import === "1") return res.status(500).json({ error: "Import failed: " + String(e.message || e).slice(0, 200) });
      // scheduled import failed → just carry on with a normal discovery run
    }
  }

  // 1) Sync the candidate list into the table (adds new rows; keeps each row's status/results)
  try {
    // Two batches so a link pasted on /discovery (stored only in the DB) is never wiped by a code row without one
    const row = (c) => ({ id: c.id, company: c.company, domain: c.domain || null, key: c.key || null, source: c.source || null });
    const withHint = CANDIDATES.filter((c) => c.hint).map((c) => ({ ...row(c), hint: c.hint }));
    const noHint = CANDIDATES.filter((c) => !c.hint).map(row);
    if (withHint.length) await db.upsert("company_candidates", withHint);
    if (noHint.length) await db.upsert("company_candidates", noHint);
  } catch (e) {
    return res.status(500).json({ error: "Couldn't update company_candidates — run supabase/discovery.sql first. " + e.message });
  }

  // 1b) New or changed hint (e.g. from a browser pass) → re-test now instead of waiting 2 weeks.
  //     Still goes through the same proof check; a hint can't make anything go live by itself.
  const hinted = await db.selectAsAdmin("company_candidates?select=id,hint,config,status&hint=not.is.null&status=neq.live&status=neq.pending&limit=1000");
  const requeue = hinted.filter((r) => r.hint && (r.config?.triedHint ?? null) !== r.hint).map((r) => r.id);
  if (requeue.length) {
    await db.update(`company_candidates?id=in.(${requeue.map(encodeURIComponent).join(",")})`, { status: "pending", checked_at: null });
  }

  // 1c) A job system we just learned to read → re-test every company parked as "unsupported" on it
  const NOW_READABLE = /\b(iCIMS|Oracle|Ashby|Eightfold|SmartRecruiters)\b/;   // add a system here when a new reader ships
  const parked = await db.selectAsAdmin("company_candidates?select=id,detail&status=eq.unsupported&limit=1000");
  const unpark = parked.filter((r) => NOW_READABLE.test(r.detail || "")).map((r) => r.id);
  if (unpark.length) {
    await db.update(`company_candidates?id=in.(${unpark.map(encodeURIComponent).join(",")})`, { status: "pending", checked_at: null });
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

  const results = await mapLimit(rows, 6, async (c) => {
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
      config: r.status === "live" ? r.config : { triedHint: c.hint || null },   // remember which hint failed
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
