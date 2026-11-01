// /api/check-links.js — daily cron, runs after /api/sync.
// Opens every live listing's link the way a student would and hides any that are dead —
// including pages that load fine but say "no longer available" (what broke v1).
import { loadCompanies } from "../lib/companies.js";
import { fetchWorkdayDetail } from "../lib/fetchers/workday.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { get, mapLimit } from "../lib/http.js";

export const config = { maxDuration: 60 };

const BATCH = 400;          // oldest-checked first; runs twice a day so everything is re-checked daily
const TIME_BUDGET_MS = 50000;

const DEAD_PHRASES = [
  "no longer available", "no longer accepting", "no longer open",
  "position has been filled", "job has expired", "this job is closed",
  "job you are looking for", "page you are looking for", "job not found",
  "posting has been removed", "not currently accepting",
];

/** @returns {Promise<true|false|null>} true=live, false=dead, null=couldn't tell (leave as is) */
export async function checkListing(l, cfg) {
  try {
    if (l.ats === "workday" && l.external_path) {
      const d = await fetchWorkdayDetail(cfg, l.external_path);
      return !!(d && d.canApply);
    }
    const res = await get(l.url, { timeoutMs: 10000 });
    if (res.status === 404 || res.status === 410) return false;
    if (res.status >= 500 || res.status === 429 || res.status === 403) return null; // site hiccup or bot block — don't punish
    if (!res.ok) return false;
    // Redirected away from the job (to search page / homepage)?
    const jobId = l.id.split(":").pop();
    if (res.url && jobId && !res.url.includes(jobId)) return false;
    const body = (await res.text()).toLowerCase();
    return !DEAD_PHRASES.some((p) => body.includes(p));
  } catch {
    return null; // timeout / network error
  }
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  const started = Date.now();
  const byId = Object.fromEntries((await loadCompanies()).map((c) => [c.id, c]));
  const rows = await db.selectAsAdmin(
    `listings?select=id,company_id,url,ats,external_path&closed_at=is.null&order=link_checked_at.asc.nullsfirst&limit=${BATCH}`
  );

  const results = await mapLimit(rows, 10, async (l) => {
    if (Date.now() - started > TIME_BUDGET_MS) return { id: l.id, skipped: true };
    // Company was turned off (or removed) → take its listings down
    if (!byId[l.company_id]) {
      await db.update(`listings?id=eq.${encodeURIComponent(l.id)}`, { closed_at: new Date().toISOString() });
      return { id: l.id, ok: false, retired: true };
    }
    const ok = await checkListing(l, byId[l.company_id]);
    if (ok === null) return { id: l.id, unknown: true };
    await db.update(`listings?id=eq.${encodeURIComponent(l.id)}`, { link_ok: ok, link_checked_at: new Date().toISOString() });
    return { id: l.id, ok };
  });

  const dead = results.filter((r) => r.ok === false).map((r) => r.id);
  return res.status(200).json({
    checked: results.filter((r) => r.ok !== undefined).length,
    live: results.filter((r) => r.ok === true).length,
    dead, unknown: results.filter((r) => r.unknown).length,
    skippedForTime: results.filter((r) => r.skipped).length,
  });
}
