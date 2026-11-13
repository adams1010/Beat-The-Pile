import { EARLY_QUERIES, EARLY_MAX_PAGES, isEarlyCareer, isInternship, isHourlyRole } from "../fields.js";
// lib/fetchers/workday.js — Workday career sites via their public JSON endpoint.
// POST https://{host}/wday/cxs/{tenant}/{site}/jobs  (max 20 per page)
//
// Most Workday boards have a built-in "Intern" / "Co-op" job-type filter. We find it and use it,
// which returns ONLY real internships (e.g. Northrop: 28 interns out of 3,700 jobs). Keyword search
// for "intern" is a fallback — it's noisy (matches "International", "Internal", etc.).
import { postJson, get, mapLimit } from "../http.js";
import { extractState, classify } from "../filter.js";

const PAGE = 20;
const MAX_PAGES = 30;           // 600 internships per company is far more than any board has
const FALLBACK_QUERIES = ["intern", "co-op"];

// Most boards live at {tenant}.wdN.myworkdayjobs.com; some use wdN.myworkdaysite.com/recruiting/{tenant}/{site} (apiBase/jobBase set).
const api = (c) => c.apiBase || `https://${c.host}/wday/cxs/${c.tenant}/${c.site}`;
export const jobUrl = (c, externalPath) => (c.jobBase || `https://${c.host}/en-US/${c.site}`) + externalPath;

const INTERN_FACET = /\b(intern|interns|internship|co-?op|student)\b/i;
const NOT_INTERN_FACET = /non-?intern/i;

/** Walk Workday's (sometimes nested) facets and collect every "Intern"/"Co-op" job-type value. Exported for tests. */
export function findInternFacets(facets = []) {
  const applied = {};
  const walk = (node, param) => {
    for (const v of node.values || []) {
      if (v.values) { walk(v, v.facetParameter || param); continue; }
      if (/location/i.test(param)) continue;                        // "...International Airport" etc.
      if (INTERN_FACET.test(v.descriptor || "") && !NOT_INTERN_FACET.test(v.descriptor || "")) {
        (applied[param] = applied[param] || []).push(v.id);
      }
    }
  };
  for (const f of facets) walk(f, f.facetParameter);
  return applied;
}

// Workday rate-limits per server cluster (wd1, wd5, …), not per company: 14 companies at once on the same cluster
// drew HTTP 429s from Vercel (Nov 2026: 55 companies a day). So: at most 10 requests at a time per cluster, and a 429 waits
// and retries (twice, honoring Retry-After up to 4s) instead of failing the whole company.
const PER_CLUSTER = 10, slots = new Map();   // Nov 6: 3 and 6 cut companies/run from ~341 to ~248; 10 still caps a burst
const clusterOf = (cfg) => (String(cfg.apiBase || cfg.host || "").match(/\b(wd\d+)\b/i) || [, "wd"])[1].toLowerCase();
async function withSlot(key, fn) {
  const s = slots.get(key) || { busy: 0, wait: [] }; slots.set(key, s);
  if (s.busy >= PER_CLUSTER) await new Promise((ok) => s.wait.push(ok));
  s.busy++;
  try { return await fn(); } finally { s.busy--; const next = s.wait.shift(); if (next) next(); }
}
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
export const _wdTest = { clusterOf, slots, PER_CLUSTER };

// If a cluster still says 429 after the retries, leave it alone for 90s: the companies on it are skipped this run
// (not counted as failures) and stay first in line for the next one. Hammering a busy cluster only makes it worse.
const COOL_MS = 90e3, cooled = new Map();
function busyError(cfg) { const e = new Error(`${cfg.id}: Workday busy (${clusterOf(cfg)}), will retry next run`); e.busy = true; return e; }
_wdTest.cooled = cooled;

async function page(cfg, body) {
  const key = clusterOf(cfg);
  for (let attempt = 0; ; attempt++) {
    if ((cooled.get(key) || 0) > Date.now()) throw busyError(cfg);
    const res = await withSlot(key, () => postJson(`${api(cfg)}/jobs`, body));
    if (res.status === 429 && attempt >= 2) { cooled.set(key, Date.now() + COOL_MS); throw busyError(cfg); }
    if (res.status === 429 && attempt < 2) {
      const ra = Number(res.headers?.get?.("retry-after")) || 0;
      await sleep(Math.min(4000, ra ? ra * 1000 : 1200 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${cfg.id}: Workday HTTP ${res.status}`);
    return res.json();
  }
}

export async function fetchWorkday(cfg) {
  const found = new Map();
  const add = (posts) => {
    for (const j of posts) {
      if (!j.externalPath) continue;
      found.set(j.externalPath, {
        sourceId: j.externalPath.split("_").pop() || j.externalPath,
        externalPath: j.externalPath,
        title: j.title || "",
        location: j.locationsText || "",
        url: jobUrl(cfg, j.externalPath),
        postedOn: j.postedOn || null, // e.g. "Posted 3 Days Ago"
      });
    }
  };

  const first = await page(cfg, { appliedFacets: {}, limit: 1, offset: 0, searchText: "" });
  const facets = findInternFacets(first.facets);

  if (Object.keys(facets).length) {
    for (let p = 0; p < MAX_PAGES; p++) {
      const d = await page(cfg, { appliedFacets: facets, limit: PAGE, offset: p * PAGE, searchText: "" });
      const posts = d.jobPostings || [];
      add(posts);
      if (posts.length < PAGE || (d.total && (p + 1) * PAGE >= d.total)) break;
    }
  } else {
    for (const searchText of FALLBACK_QUERIES) {
      for (let p = 0; p < 15; p++) {
        const d = await page(cfg, { appliedFacets: {}, limit: PAGE, offset: p * PAGE, searchText });
        const posts = d.jobPostings || [];
        add(posts);
        if (posts.length < PAGE || (d.total && (p + 1) * PAGE >= d.total)) break;
      }
    }
  }

  // Early-career full-time roles aren't behind the intern facet: a few keyword searches, EARLY_PAGES pages each
  // Nov 13: 4 searches at a time (21 searches now; most find nothing and cost one request)
  await mapLimit(EARLY_QUERIES, 4, async (searchText) => {
    for (let p = 0; p < EARLY_MAX_PAGES; p++) {
      let d; try { d = await page(cfg, { appliedFacets: {}, limit: PAGE, offset: p * PAGE, searchText }); } catch { break; }
      const posts = (d.jobPostings || []).filter((x) => isEarlyCareer(x.title) || isInternship(x.title) || isHourlyRole(x.title));   // + student roles (Nov 12)
      add(posts);
      // Nov 10: keep paging only while a page still holds early-career roles (a dud search costs one request)
      if ((d.jobPostings || []).length < PAGE || !posts.length) break;
    }
  });

  // "3 Locations" hides the real locations — look those up in the job detail,
  // but only for postings we'd actually show (keeps big boards fast).
  const jobs = [...found.values()];
  await mapLimit(jobs.filter((j) => (classify(j.title) || isInternship(j.title) || isEarlyCareer(j.title) || isHourlyRole(j.title)) && !extractState(j.location)), 4, async (j) => {
    try {
      const d = await fetchWorkdayDetail(cfg, j.externalPath);
      if (d) j.location = d.locations.join(" | ");
    } catch { /* keep "N Locations"; it will be dropped by the state filter */ }
  });
  return jobs;
}

/** Job detail; null if Workday says the posting no longer exists. Used by the link checker too. */
export async function fetchWorkdayDetail(cfg, externalPath) {
  const res = await get(`${api(cfg)}${externalPath}`, { headers: { Accept: "application/json" } });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`Workday detail HTTP ${res.status}`);
  const d = await res.json();
  const info = d.jobPostingInfo;
  if (!info) return null;
  return {
    canApply: info.canApply !== false,
    locations: [info.location, ...(info.additionalLocations || [])].filter(Boolean),
  };
}
