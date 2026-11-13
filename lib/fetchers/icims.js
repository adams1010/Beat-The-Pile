import { EARLY_QUERIES, EARLY_PAGES, isEarlyCareer, isInternship, isHourlyRole } from "../fields.js";
// lib/fetchers/icims.js — iCIMS career sites (careers-{company}.icims.com).
// The real job list lives at /jobs/search?...&in_iframe=1 (the normal page just wraps it in an iframe).
// 20 results per page, pages are pr=0,1,2…  Each job links to /jobs/{id}/{slug}/job.
import { get } from "../http.js";

const QUERIES = ["intern", "co-op", ...EARLY_QUERIES];   // early-career searches stop after EARLY_PAGES pages
const MAX_PAGES = 10;
const BROWSE_PAGES = 20;   // fallback: up to 400 jobs unfiltered
const INTERNISH = /\b(intern|internship|co-?op)\b/i;

const decode = (s) => String(s || "")
  .replace(/<span[^>]*sr-only[^>]*>[\s\S]*?<\/span>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();

/** "US-FL-Lakeland" → "Lakeland, FL". Non-US sites are dropped (their region codes can look like US states, e.g. CA-ON). */
export function icimsLocations(text) {
  const out = [];
  for (const m of String(text).matchAll(/\b([A-Z]{2})-([A-Z]{2})-([A-Za-z][A-Za-z .'()\/-]*?)(?=\s*(?:\||,\s*[A-Z]{2}-[A-Z]{2}-|$|\s{2}|[A-Z]{2}-[A-Z]{2}-))/g)) {
    const [, country, region, city] = m;
    if (country === "US") out.push(`${city.trim().replace(/(\.{2,}|…)$/, "").trim()}, ${region}`);   // long lists end "Freehold..."
  }
  return out;
}

/** Parse one in_iframe search page. Exported for tests. */
export function parseIcimsPage(html, base) {
  // Newer card layout (<li class="iCIMS_JobCardItem">): each card's locations sit ABOVE its title link, so cards must be
  // read one <li> at a time — slicing from link to link would hand every job the NEXT job's locations (fixed Nov 2026).
  if (/iCIMS_JobCardItem/.test(html)) return parseCards(html, base);
  const jobs = new Map();
  const hrefRe = /href="((?:https?:\/\/[^"\/]+)?\/jobs\/(\d+)\/([^"\/?]+)\/job)[^"]*"/gi;
  const hits = [...String(html).matchAll(hrefRe)];
  for (let i = 0; i < hits.length; i++) {
    const [, , id, slug] = hits[i];
    if (jobs.has(id)) continue;
    let end = html.length;
    for (let k = i + 1; k < hits.length; k++) if (hits[k][2] !== id) { end = hits[k].index; break; }
    const card = html.slice(hits[i].index, end);
    const h = card.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i) || card.match(/^[^>]*>([\s\S]*?)<\/a>/i);
    let title = decode(h ? h[1] : "");
    if (!title) title = slug.replace(/-/g, " ");
    const locBlock = card.match(/Job Locations?[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i);
    const locText = decode(locBlock ? locBlock[1] : card);
    const locs = icimsLocations(locText);
    jobs.set(id, { sourceId: id, title, location: locs.join(" | "), url: `${base}/jobs/${id}/${slug}/job`, postedOn: null });
  }
  const pages = [...String(html).matchAll(/[?&]pr=(\d+)/g)].map((m) => +m[1]);
  return { jobs: [...jobs.values()], lastPage: pages.length ? Math.max(...pages) : 0 };
}

function parseCards(html, base) {
  const jobs = new Map();
  const parts = String(html).split(/<li[^>]*class="[^"]*iCIMS_JobCardItem[^"]*"[^>]*>/i).slice(1);
  for (const raw of parts) {
    const card = raw.split(/<\/li>/i)[0];
    const link = card.match(/href="((?:https?:\/\/[^"\/]+)?\/jobs\/(\d+)\/([^"\/?]+)\/job)[^"]*"/i);
    if (!link) continue;
    const [, , id, slug] = link;
    if (jobs.has(id)) continue;
    const h = card.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    const title = decode(h ? h[1] : "") || slug.replace(/-/g, " ");
    const lb = card.match(/Job Locations?\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i) || card.match(/Job Locations?[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i);
    const locs = icimsLocations(decode(lb ? lb[1] : ""));
    jobs.set(id, { sourceId: id, title, location: locs.join(" | "), url: `${base}/jobs/${id}/${slug}/job`, postedOn: null });
  }
  const pages = [...String(html).matchAll(/[?&]pr=(\d+)/g)].map((m) => +m[1]);
  return { jobs: [...jobs.values()], lastPage: pages.length ? Math.max(...pages) : 0 };
}

export const icimsSearchUrl = (base, q, page) =>
  `${base}/jobs/search?ss=1&searchKeyword=${encodeURIComponent(q)}&in_iframe=1&pr=${page}`;

export async function fetchIcims(cfg) {
  const base = cfg.base;
  const all = new Map();
  for (const q of QUERIES) {
    let last = 0;
    for (let p = 0; p <= Math.min(last, (EARLY_QUERIES.includes(q) ? EARLY_PAGES : MAX_PAGES) - 1); p++) {
      const r = await get(icimsSearchUrl(base, q, p), { timeoutMs: 10000 });
      if (!r.ok) { if (p === 0 && q === QUERIES[0]) throw new Error(`${cfg.id}: iCIMS HTTP ${r.status}`); break; }
      const { jobs, lastPage } = parseIcimsPage(await r.text(), base);
      if (p === 0) last = lastPage;
      jobs.forEach((j) => all.set(j.sourceId, j));
      if (!jobs.length) break;
    }
  }
  // Some portals' keyword search started returning 0 for every keyword (Nov 2026, iCIMS platform 189) while the
  // unfiltered list still works. If the searches found nothing, page through everything and keep intern/co-op titles.
  if (!all.size) {
    for (let p = 0; p < BROWSE_PAGES; p++) {
      const r = await get(icimsSearchUrl(base, "", p), { timeoutMs: 10000 });
      if (!r.ok) break;
      const { jobs } = parseIcimsPage(await r.text(), base);
      jobs.filter((j) => INTERNISH.test(j.title) || isInternship(j.title) || isEarlyCareer(j.title) || isHourlyRole(j.title)).forEach((j) => all.set(j.sourceId, j));
      if (jobs.length < 20) break;   // last page
    }
  }
  return [...all.values()];
}
