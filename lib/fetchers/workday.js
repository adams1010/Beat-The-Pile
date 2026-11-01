// lib/fetchers/workday.js — Workday career sites via their public JSON endpoint.
// POST https://{host}/wday/cxs/{tenant}/{site}/jobs  (max 20 per page)
import { postJson, get, mapLimit } from "../http.js";
import { extractState } from "../filter.js";

const PAGE = 20;
const MAX_PAGES = 15;
const QUERIES = ["intern", "co-op"];

const api = (c) => `https://${c.host}/wday/cxs/${c.tenant}/${c.site}`;
export const jobUrl = (c, externalPath) => `https://${c.host}/en-US/${c.site}${externalPath}`;

export async function fetchWorkday(cfg) {
  const found = new Map();
  for (const searchText of QUERIES) {
    for (let p = 0; p < MAX_PAGES; p++) {
      const res = await postJson(`${api(cfg)}/jobs`, { appliedFacets: {}, limit: PAGE, offset: p * PAGE, searchText });
      if (!res.ok) throw new Error(`${cfg.id}: Workday HTTP ${res.status}`);
      const data = await res.json();
      const posts = data.jobPostings || [];
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
      if (posts.length < PAGE || (data.total && (p + 1) * PAGE >= data.total)) break;
    }
  }

  // "3 Locations" hides the real locations — look those up in the job detail.
  const jobs = [...found.values()];
  await mapLimit(jobs.filter((j) => !extractState(j.location)), 4, async (j) => {
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
