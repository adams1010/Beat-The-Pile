// /api/check-links.js — cron (Vercel 09:45 + 21:45 UTC, plus GitHub links.yml every few hours).
// Opens live listings' links the way a student would, oldest-checked first, and hides dead ones —
// including pages that load fine but say "no longer available" (what broke v1).
// What this does NOT do: check every link every day. Freshness mainly comes from the sync, which re-reads every
// company's whole job board at least twice a day and closes jobs that disappear. This is the second net.
// A listing is only hidden after TWO dead results in a row (one bad answer can be a hiccup or an odd redirect).
import { loadCompanies } from "../lib/companies.js";
import { fetchWorkdayDetail } from "../lib/fetchers/workday.js";
import { db, isAuthorizedCron } from "../lib/db.js";
import { botOn, logRun } from "../lib/bots.js";
import { get, mapLimit } from "../lib/http.js";

export const config = { maxDuration: 60 };

const BATCH = 700;          // oldest-checked first; whatever doesn't fit the time budget waits for the next run
const FAILS_TO_HIDE = 2;
// These job pages are blank shells filled in by script, so a page fetch can't tell open from closed.
// They're skipped here (and not queued) — the sync closes them when they leave the company's feed.
export const PAGE_UNCHECKABLE = ["ashby", "smartrecruiters", "oracle", "eightfold", "paylocity", "adp", "jibe"];
const TIME_BUDGET_MS = 50000;

const DEAD_PHRASES = [
  "no longer available", "no longer accepting", "no longer open",
  "position has been filled", "job has expired", "this job is closed",
  "job you are looking for", "page you are looking for", "job not found",
  "posting has been removed", "not currently accepting",
  "requested job could not be found",
];

/** @returns {Promise<true|false|null>} true=live, false=dead, null=couldn't tell (leave as is) */
export async function checkListing(l, cfg) {
  try {
    if (l.ats === "workday" && l.external_path) {
      const d = await fetchWorkdayDetail(cfg, l.external_path);
      return !!(d && d.canApply);
    }
    // These job pages are blank shells filled in by script — a page fetch can't tell open from closed.
    // Their listings are closed by the hourly sync instead (gone from the company's feed = closed).
    if (PAGE_UNCHECKABLE.includes(l.ats)) return null;
    // iCIMS pages wrap the real content in an iframe — ask for the inner page directly
    const url = l.ats === "icims" ? l.url + (l.url.includes("?") ? "&" : "?") + "in_iframe=1" : l.url;
    const res = await get(url, { timeoutMs: 10000 });
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

  if (!(await botOn("links"))) return res.status(200).json({ off: true, bot: "links" });
  const started = Date.now();
  const byId = Object.fromEntries((await loadCompanies()).map((c) => [c.id, c]));
  const rows = await db.selectAsAdmin(
    `listings?select=id,company_id,url,ats,external_path,link_fails&closed_at=is.null&ats=not.in.(${PAGE_UNCHECKABLE.join(",")})&order=link_checked_at.asc.nullsfirst&limit=${BATCH}`
  );

  const results = await mapLimit(rows, 16, async (l) => {
    if (Date.now() - started > TIME_BUDGET_MS) return { id: l.id, skipped: true };
    // Company was turned off (or removed) → take its listings down
    if (!byId[l.company_id]) {
      await db.update(`listings?id=eq.${encodeURIComponent(l.id)}`, { closed_at: new Date().toISOString() });
      return { id: l.id, ok: false, retired: true };
    }
    const ok = await checkListing(l, byId[l.company_id]);
    const now = new Date().toISOString();
    if (ok === null) {                       // can't tell from a page fetch — record that we looked, so the queue moves on
      await db.update(`listings?id=eq.${encodeURIComponent(l.id)}`, { link_checked_at: now });
      return { id: l.id, unknown: true };
    }
    if (ok) { await db.update(`listings?id=eq.${encodeURIComponent(l.id)}`, { link_ok: true, link_fails: 0, link_checked_at: now }); return { id: l.id, ok }; }
    const fails = Number(l.link_fails || 0) + 1;
    await db.update(`listings?id=eq.${encodeURIComponent(l.id)}`, { link_fails: fails, link_checked_at: now, ...(fails >= FAILS_TO_HIDE ? { link_ok: false } : {}) });
    return { id: l.id, ok: fails >= FAILS_TO_HIDE ? false : undefined, suspect: fails < FAILS_TO_HIDE };
  });

  const dead = results.filter((r) => r.ok === false).map((r) => r.id);
  const opened = results.filter((r) => !r.skipped && !r.retired).length;
  const suspect = results.filter((r) => r.suspect).length, unknown = results.filter((r) => r.unknown).length;
  // How far behind is the rotation? (oldest page check among open listings; never-checked count)
  let oldestHours = null, neverChecked = null;
  try {
    const [o] = await db.selectAsAdmin(`listings?select=link_checked_at&closed_at=is.null&ats=not.in.(${PAGE_UNCHECKABLE.join(",")})&link_checked_at=not.is.null&order=link_checked_at.asc&limit=1`);
    oldestHours = o ? Math.round((Date.now() - Date.parse(o.link_checked_at)) / 36e5) : null;
    neverChecked = await db.countAsAdmin(`listings?closed_at=is.null&link_checked_at=is.null&ats=not.in.(${PAGE_UNCHECKABLE.join(",")})`);
  } catch { /* stats are best-effort */ }
  await logRun("links", true, `Opened ${opened} links · ${dead.length} dead removed · ${suspect} look dead (re-check before hiding) · ${unknown} can't be checked by page${neverChecked != null ? ` · ${neverChecked} never page-checked yet` : ""}`,
    { opened, dead: dead.length, suspect, unknown, oldestHours, neverChecked });
  return res.status(200).json({
    opened, live: results.filter((r) => r.ok === true).length, dead, suspect, unknown,
    skippedForTime: results.filter((r) => r.skipped).length, oldestHours, neverChecked,
  });
}
