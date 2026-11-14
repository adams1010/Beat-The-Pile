import { extractState } from "../filter.js";
// lib/fetchers/greenhouse-lever.js — public JSON boards (for startups, added later).
import { get } from "../http.js";

export async function fetchGreenhouse(cfg) {
  const res = await get(`https://boards-api.greenhouse.io/v1/boards/${cfg.token}/jobs`);
  if (!res.ok) throw new Error(`${cfg.id}: Greenhouse HTTP ${res.status}`);
  const data = await res.json();
  const jobs = (data.jobs || []).map((j) => ({
    sourceId: String(j.id), title: j.title, location: j.location?.name || "",
    url: j.absolute_url, postedOn: j.updated_at || null,
  }));
  // Nov 14: some boards put only "Hybrid" / "In-Office" / "Remote" in the location (Cloudflare). The same feed with
  // content=true lists each job's offices ("Austin, TX"): one extra request, only when a location has no US state.
  if (jobs.some((j) => !extractState(j.location))) {
    try {
      const o = await get(`https://boards-api.greenhouse.io/v1/boards/${cfg.token}/jobs?content=true`, { timeoutMs: 30000 });
      if (o.ok) {
        const where = new Map();
        for (const x of (await o.json()).jobs || []) where.set(String(x.id), (x.offices || []).map((f) => f.location || f.name || "").filter(Boolean));
        for (const j of jobs) { const w = where.get(j.sourceId); if (!extractState(j.location) && w?.length) j.location = [j.location, ...w].filter(Boolean).join(" | "); }
      }
    } catch { /* the plain locations still work */ }
  }
  return jobs;
}

// Lever returns every posting with its full description: big companies are ~6 MB in one response, which timed out
// (Nov 2026: 28 companies a day). Read it in pages of 200 instead.
// Lever also stalls when one server sends it many requests at once (Nov 6: small boards "aborted" together from Vercel),
// so at most 4 Lever requests run at a time, and a stalled one is retried once.
const LEVER_PAGE = 200, LEVER_MAX_PAGES = 25, LEVER_AT_ONCE = 4;
let leverBusy = 0; const leverWait = [];
async function leverGet(url) {
  if (leverBusy >= LEVER_AT_ONCE) await new Promise((ok) => leverWait.push(ok));
  leverBusy++;
  try {
    try { return await get(url, { timeoutMs: 15000 }); }
    catch (e) { if (!/abort/i.test(String(e?.name) + String(e?.message))) throw e; return await get(url, { timeoutMs: 15000 }); }
  } finally { leverBusy--; const next = leverWait.shift(); if (next) next(); }
}
export const _leverTest = { LEVER_AT_ONCE, busy: () => leverBusy };
export async function fetchLever(cfg) {
  const data = [];
  for (let p = 0; p < LEVER_MAX_PAGES; p++) {
    const res = await leverGet(`https://api.lever.co/v0/postings/${cfg.token}?mode=json&limit=${LEVER_PAGE}&skip=${p * LEVER_PAGE}`);
    if (!res.ok) throw new Error(`${cfg.id}: Lever HTTP ${res.status}`);
    const page = await res.json();
    if (!Array.isArray(page)) break;
    data.push(...page);
    if (page.length < LEVER_PAGE) break;
  }
  return data.map((j) => ({
    sourceId: j.id, title: j.text, location: j.categories?.location || "",
    url: j.hostedUrl, postedOn: j.createdAt ? new Date(j.createdAt).toISOString() : null,
  }));
}
