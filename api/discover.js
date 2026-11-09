// /api/discover.js — the discovery robot (Vercel cron 2x/day + GitHub Actions every 15 min).
// Each run: refresh the candidate list, then try ~24 queued companies: find their job board,
// prove it's theirs, and enable it. Results (good or bad, with reasons) go to company_candidates.
import { CANDIDATES } from "../lib/candidates.js";
import { COMPANIES, boardKey } from "../lib/companies.js";
import { discoverOne } from "../lib/discover.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { botOn, logRun } from "../lib/bots.js";
import { mapLimit, get } from "../lib/http.js";
import { SIMPLIFY_URL, SIMPLIFY_NEWGRAD_URL, pickCompanies, normName, keyFor } from "../lib/simplify.js";
import BACKLOG from "../data/backlog.json" with { type: "json" };

export const config = { maxDuration: 60 };

const PER_RUN = 60;               // most checks finish in a few seconds (queued companies come with a board link)
const START_BUDGET_MS = 22000;   // don't start a company after this
const HARD_STOP_MS = 50000;      // give up on any company still running (Vercel kills the function at 60s)
const READERS_UPDATED_AT = "2026-11-07T06:00:00Z";   // bump when a new reader ships → re-test companies parked before it
// Failed checks are retried after 14 days — 7 in peak hiring season (Aug–Feb), when boards fill up fast — up to 6 tries.
const inSeason = (d = new Date()) => { const m = d.getUTCMonth(); return m >= 7 || m <= 1; };
const RETRY_AFTER_DAYS = inSeason() ? 7 : 14;
const MAX_TRIES = 6;

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const t0 = Date.now();
  const marks = [];
  const mark = (name) => { marks.push(`${name}:${Date.now() - t0}ms`); return req.query?.stage && marks.length >= +req.query.stage; };

  // 0) Once a day (07:00–07:59 UTC, or ?import=1): look for brand-new companies on the SimplifyJobs list.
  //    That run only imports; the new companies are then checked by the normal runs (same proof rules).
  const hour = new Date().getUTCHours();
  if (req.query?.import === "1" || (hour === 7 && await botOn("import"))) {
    try {
      const r = await get(SIMPLIFY_URL, { timeoutMs: 20000 });
      if (!r.ok) throw new Error(`list answered ${r.status}`);
      const listings = await r.json();
      const rows = await db.selectAllAsAdmin("company_candidates?select=id,company,ats,config");
      const names = new Set([...rows, ...COMPANIES].map((c) => normName(c.company)));
      const boards = new Set(COMPANIES.map(boardKey));
      for (const x of rows) if (x.ats && x.config) boards.add(boardKey({ ats: x.ats, ...x.config }));
      const fresh = pickCompanies(listings, names, boards, { anyMajor: true });   // all majors (Nov 2026)
      // + the new-grad list (Nov 9). A failure there never costs the internship import.
      let ng = [];
      try {
        const r2 = await get(SIMPLIFY_NEWGRAD_URL, { timeoutMs: 20000 });
        if (r2.ok) { for (const f of fresh) names.add(normName(f.company));
          ng = pickCompanies(await r2.json(), names, boards, { newGrad: true }); }
      } catch (e) { console.error("[import new-grad]", e.message); }
      fresh.push(...ng);
      for (let i = 0; i < fresh.length; i += 200) await db.insertIgnore("company_candidates", fresh.slice(i, i + 200));
      await logRun("import", true, fresh.length ? `Found ${fresh.length} new companies: ${fresh.slice(0, 5).map((f) => f.company).join(", ")}${fresh.length > 5 ? "…" : ""}` : "No new companies today", { imported: fresh.length, newGrad: ng.length });
      return res.status(200).json({ imported: fresh.length, companies: fresh.slice(0, 50).map((f) => f.company) });
    } catch (e) {
      await logRun("import", false, "Import failed: " + String(e.message || e).slice(0, 150));
      if (req.query?.import === "1") return res.status(500).json({ error: "Import failed: " + String(e.message || e).slice(0, 200) });
      // scheduled import failed → just carry on with a normal discovery run
    }
  }

  // Switched off on /bots → stop here (the nightly import above has its own switch)
  if (!(await botOn("finder"))) return res.status(200).json({ off: true, bot: "finder" });

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

  if (mark("upsert")) return res.status(200).json({ marks });
  // 1b) New or changed hint (e.g. from a browser pass) → re-test now instead of waiting 2 weeks.
  //     Still goes through the same proof check; a hint can't make anything go live by itself.
  const hinted = await db.selectAllAsAdmin("company_candidates?select=id,hint,config,status&hint=not.is.null&status=neq.live&status=neq.pending");
  const requeue = hinted.filter((r) => r.hint && (r.config?.triedHint ?? null) !== r.hint).map((r) => r.id);
  if (requeue.length) {
    await db.update(`company_candidates?id=in.(${requeue.map(encodeURIComponent).join(",")})`, { status: "pending", checked_at: null });
  }

  if (mark("hints")) return res.status(200).json({ marks });
  // 1c) A job system we just learned to read → re-test every company parked as "unsupported" on it
  const NOW_READABLE = /\b(iCIMS|Oracle|Ashby|Eightfold|SmartRecruiters|Paylocity|ADP|Jibe|Taleo|UKG|BambooHR)\b/;   // add a system here when a new reader ships
  // Only companies parked BEFORE the latest readers shipped — otherwise ones that are still unreadable loop forever
  const parked = await db.selectAllAsAdmin(`company_candidates?select=id,detail&status=eq.unsupported&checked_at=lt.${READERS_UPDATED_AT}`);
  const unpark = parked.filter((r) => NOW_READABLE.test(r.detail || "")).map((r) => r.id);
  if (unpark.length) {
    await db.update(`company_candidates?id=in.(${unpark.map(encodeURIComponent).join(",")})`, { status: "pending", checked_at: null });
  }

  if (mark("unpark")) return res.status(200).json({ marks });
  // 1d) Queue running low → pull the next companies from the backlog (data/backlog.json), so the finder never idles.
  //     Same proof rules: a backlog company only goes live if the robot proves the board is theirs.
  let promoted = [];
  try { promoted = await refillFromBacklog(); } catch (e) { marks.push("backlog-error:" + String(e.message).slice(0, 80)); }
  // 2) Boards already live (hand-verified + previously discovered) → never add the same board twice
  const liveRows = await db.selectAllAsAdmin("company_candidates?select=id,ats,config&enabled=eq.true");
  const taken = new Map(COMPANIES.map((c) => [boardKey(c), c.company]));
  for (const r of liveRows) if (r.ats && r.config) taken.set(boardKey({ ats: r.ats, ...r.config }), r.id);

  if (mark("taken")) return res.status(200).json({ marks });
  // 3) Next batch: never-tried first; failures get retried after RETRY_AFTER_DAYS (max MAX_TRIES tries)
  const cutoff = new Date(Date.now() - RETRY_AFTER_DAYS * 86400000).toISOString();
  const rows = await db.selectAsAdmin(
    `company_candidates?select=*&or=(status.eq.pending,and(status.in.(error,blocked,no_board,board_error),checked_at.lt.${cutoff},attempts.lt.${MAX_TRIES}))` +
    `&order=priority.desc,checked_at.asc.nullsfirst&limit=${Math.min(+req.query?.n || PER_RUN, PER_RUN)}`
  );

  if (mark("select")) return res.status(200).json({ marks, rows: rows.length });
  const results = await mapLimit(rows, 12, async (c) => {
    if (Date.now() - t0 > START_BUDGET_MS) return { id: c.id, skipped: true };
    let r;
    // Each company gets ~25s of its own (never past the hard stop), so slow careers sites can't sink the whole run
    const deadline = Math.min(Date.now() + 25000, t0 + HARD_STOP_MS - 12000);
    const left = t0 + HARD_STOP_MS - Date.now();
    try {
      r = await Promise.race([discoverOne(c, { deadline }),
        new Promise((ok) => setTimeout(() => ok({ status: "no_board", detail: `Careers site too slow to check — retried in ${RETRY_AFTER_DAYS} days` }), left))]);
    }
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
      // live: keep a name fix made earlier (config.listAs) unless this check found a better one
      config: r.status === "live" ? { ...r.config, ...(c.config?.listAs && !r.config?.listAs ? { listAs: c.config.listAs } : {}) } : { triedHint: c.hint || null },   // failed: remember which hint failed
      enabled: r.status === "live",
      detail: r.detail || null,
      intern_count: r.intern_count ?? null,
      ...(r.domain && !c.domain ? { domain: r.domain } : {}),   // website we found for a company known only by a dead link
      attempts: (c.attempts || 0) + 1,
      checked_at: now,
      ...(r.status === "live" ? { verified_at: now } : {}),
    });
    return { company: c.company, status: r.status, detail: r.detail };
  });

  mark("discover");
  const done = results.filter((r) => !r.skipped);
  const live = done.filter((r) => r.status === "live").map((r) => r.company);
  if (done.length || promoted.length) await logRun("finder", true,
    `Checked ${done.length} companies · ${live.length} went live${live.length ? ` (${live.slice(0, 4).join(", ")}${live.length > 4 ? "…" : ""})` : ""}${promoted.length ? ` · +${promoted.length} queued from backlog` : ""}`,
    { tried: done.length, live: live.length, backlog: promoted.length, statuses: done.reduce((m, r) => (m[r.status] = (m[r.status] || 0) + 1, m), {}) });
  else await logRun("finder", true, "Queue empty, nothing to check", { tried: 0 });
  return res.status(200).json({
    tried: done.length, marks, ms: Date.now() - t0, addedFromBacklog: promoted.length,
    wentLive: done.filter((r) => r.status === "live").map((r) => r.company),
    results: done,
  });
}

// ── Backlog refill ──
const REFILL_BELOW = PER_RUN * 2, REFILL_SIZE = 60;
const slug = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
export async function refillFromBacklog() {
  const pending = await db.selectAsAdmin(`company_candidates?select=id&status=eq.pending&limit=${REFILL_BELOW}`);
  if (pending.length >= REFILL_BELOW) return [];
  const rows = await db.selectAllAsAdmin("company_candidates?select=id,company,ats,config");
  const ids = new Set(rows.map((r) => r.id));
  const names = new Set([...rows, ...COMPANIES].map((c) => normName(c.company)));
  // Exact name only. A prefix match blocked parents behind subsidiaries (Amazon ⟵ "Amazon (Project Leo)", Sony ⟵ "Sony Interactive")
  // and unrelated names (Squarespace ⟵ "Square"). Real duplicates are still caught: the same board is never listed twice (step 2).
  const known = (n) => names.has(n);
  const next = [];
  for (const b of BACKLOG.companies || []) {
    const n = normName(b.company), id = "s-" + slug(b.company);
    if (n.length < 3 || ids.has(id) || known(n)) continue;
    next.push({ id, company: b.company, domain: b.domain || null, key: b.key || keyFor(b.company), hint: b.hint || null, source: "Backlog (SimplifyJobs history)", status: "pending", priority: b.priority ?? 10 });
    names.add(n); ids.add(id);
    if (next.length >= REFILL_SIZE) break;
  }
  if (next.length) await db.insertIgnore("company_candidates", next);
  return next;
}
