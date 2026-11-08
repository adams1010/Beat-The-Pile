import { EARLY_QUERIES, EARLY_PAGES } from "../fields.js";
// lib/fetchers/successfactors.js — SAP SuccessFactors (Recruiting Marketing) career sites.
// These sites render a search page at /search/?q=...&startrow=N, 25 results per page,
// with each job linking to /job/{City}-{Title}-{ST}-{zip}/{id}/.
import { get } from "../http.js";

const PAGE_SIZE = 25;
const MAX_PAGES = 12;            // 300 results per query is plenty for "intern"
const QUERIES = ["intern", "co-op", ...EARLY_QUERIES];   // early-career searches stop after EARLY_PAGES pages

const decode = (s) => s
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();

/** Parse one search-results page into jobs. Exported for tests. */
export function parseSearchPage(html, base) {
  const jobs = new Map(); // href -> job (pages repeat each job for mobile + desktop)

  // Preferred: proper result rows
  const rowRe = /<tr[^>]*class="[^"]*data-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(html))) {
    const r = row[1];
    const a = r.match(/<a[^>]*class="[^"]*jobTitle-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
           || r.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*jobTitle-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const loc = r.match(/class="[^"]*jobLocation[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const date = r.match(/class="[^"]*jobDate[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const href = a[1];
    if (!jobs.has(href)) jobs.set(href, { href, title: decode(a[2]), location: loc ? decode(loc[1]) : "", posted: date ? decode(date[1]) : "" });
  }

  // Fallback: any /job/... link (if the site's markup differs) — derive title from the slug
  if (jobs.size === 0) {
    const linkRe = /href="(\/job\/[^"]+?\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
    let l;
    while ((l = linkRe.exec(html))) {
      const href = l[1];
      const text = decode(l[2]);
      if (!jobs.has(href) && text) jobs.set(href, { href, title: text, location: "", posted: "" });
    }
  }

  return [...jobs.values()].map((j) => {
    const url = new URL(j.href, base).toString();
    const id = (j.href.match(/\/(\d+)\/?$/) || [])[1] || j.href;
    return { sourceId: id, title: j.title, location: j.location || slugLocation(j.href), url, postedOn: j.posted || null };
  });
}

function slugLocation(href) {
  const m = href.match(/\/job\/([^/]+)\//);
  if (!m) return "";
  const s = decodeURIComponent(m[1]);
  const st = s.match(/-([A-Z]{2})-(\d{5})$/);
  const city = s.split("-")[0];
  return st ? `${city}, ${st[1]}` : city;
}

export function parseTotal(html) {
  // "Results 1 – 25 of 132"
  const m = html.match(/of\s*<b>?\s*([\d,]+)/i) || html.match(/Results[^<]*?of\s+([\d,]+)/i);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

export async function fetchSuccessFactors(cfg) {
  const all = new Map();
  for (const q of QUERIES) {
    try {   // a failed early-career search never costs the internships
      for (let page = 0; page < (EARLY_QUERIES.includes(q) ? EARLY_PAGES : MAX_PAGES); page++) {
        const url = `${cfg.base}/search/?q=${encodeURIComponent(q)}&startrow=${page * PAGE_SIZE}`;
        const res = await get(url);
        if (!res.ok) throw new Error(`${cfg.id}: search page HTTP ${res.status}`);
        const html = await res.text();
        const jobs = parseSearchPage(html, cfg.base);
        for (const j of jobs) all.set(j.sourceId, j);
        const total = parseTotal(html);
        if (jobs.length < PAGE_SIZE || (total && (page + 1) * PAGE_SIZE >= total)) break;
      }
    } catch (e) { if (!EARLY_QUERIES.includes(q)) throw e; }
  }
  return [...all.values()];
}
