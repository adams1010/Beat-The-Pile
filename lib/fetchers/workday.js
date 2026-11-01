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

async function page(cfg, body) {
  const res = await postJson(`${api(cfg)}/jobs`, body);
  if (!res.ok) throw new Error(`${cfg.id}: Workday HTTP ${res.status}`);
  return res.json();
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

  // "3 Locations" hides the real locations — look those up in the job detail,
  // but only for postings we'd actually show (keeps big boards fast).
  const jobs = [...found.values()];
  await mapLimit(jobs.filter((j) => classify(j.title) && !extractState(j.location)), 4, async (j) => {
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
