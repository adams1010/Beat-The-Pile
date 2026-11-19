// lib/fetchers/avature.js — Avature career sites (Nov 18 2026).
// Lives at {tenant}.avature.net/{portal} or on a company's own domain (careers.dhl.com/global/…).
// The public search page lists up to 50 jobs per page: title, JobDetail link, location; ?jobOffset= pages it.
// Avature's robots.txt allows /{portal} (only "*qtvc=" tracking URLs are blocked, and we never send those).
import { EARLY_QUERIES, EARLY_PAGES } from "../fields.js";
import { get } from "../http.js";

const dec = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();

export const avatureBase = (cfg) => `https://${cfg.host}/${cfg.portal}`;
export const avatureSearch = (cfg, q, offset = 0) => `${avatureBase(cfg)}/SearchJobs/?search=${encodeURIComponent(q)}&jobRecordsPerPage=50&jobOffset=${offset}`;
export const avatureTotal = (html) => { const m = String(html).match(/([\d,]+)\s*results/i); return m ? +m[1].replace(/,/g, "") : null; };
export const avatureName = (html) => dec((String(html).match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "")
  .replace(/\b(careers?|jobs|job search|search jobs|opportunities)\b/gi, " ").replace(/[|:–-]+/g, " ").replace(/\s+/g, " ").trim();

/** One search-results page → [{ sourceId, title, location, url, postedOn }]. Only links on this board's own host count.
 *  Templates seen live (Nov 18): Bloomberg (span.list-item-location), Koch (a "Location:" label/value pair),
 *  Maximus ("/Job-Description/" links instead of "/JobDetail/"). */
const JOB_PATH = /\/(?:JobDetail|Job-Description|JobDescription)\/[^"?#]*?\/(\d{2,12})(?:[/?#]|$)/i;
const NOT_TITLE = /^(apply|save|share|email|facebook|x|twitter|linkedin|more|view|details|learn more|see more)$/i;
export function parseAvature(html, cfg) {
  const out = [], seen = new Set();
  for (const block of String(html).split(/<article\b/i).slice(1)) {
    let job = null;
    for (const m of block.matchAll(/<a\b([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = m[2].replace(/&amp;/g, "&");
      if (/^(mailto|javascript):/i.test(href)) continue;
      let url; try { url = new URL(href, avatureBase(cfg) + "/"); } catch { continue; }
      if (url.hostname.toLowerCase() !== String(cfg.host).toLowerCase()) continue;     // never send students off the company's own board
      const id = (url.pathname.match(JOB_PATH) || [])[1]; if (!id) continue;
      const title = dec(m[4]) || dec((m[1] + m[3]).match(/data-jobname="([^"]+)"/i)?.[1]);
      if (!job) job = { sourceId: id, url: url.origin + url.pathname, title: "" };
      if (id === job.sourceId && title && !NOT_TITLE.test(title) && !job.title) job.title = title;
    }
    if (!job || seen.has(job.sourceId)) continue;
    if (!job.title) job.title = dec(block.match(/data-jobname="([^"]+)"/i)?.[1]) || dec(block.match(/aria-label="Share (.+?) (?:in|on|with) /i)?.[1]);
    if (!job.title) continue;
    const loc = block.match(/class="[^"]*list-item-location[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|p|li)>/i)
      || block.match(/>\s*Locations?\s*:?\s*<\/[a-z]+>\s*<[a-z]+[^>]*>([\s\S]*?)<\/(?:span|div|p|dd|li)>/i)
      || block.match(/class="[^"]*\blocation\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|p|li)>/i);
    seen.add(job.sourceId);
    out.push({ sourceId: job.sourceId, title: job.title, location: loc ? dec(loc[1]) : "", url: job.url, postedOn: null });
  }
  return out;
}

export async function fetchAvature(cfg) {
  const seen = new Map();
  for (const q of ["intern", "co-op", ...EARLY_QUERIES]) {
    const early = EARLY_QUERIES.includes(q);
    try {
      for (let p = 0; p < (early ? EARLY_PAGES : 12); p++) {
        const r = await get(avatureSearch(cfg, q, p * 50), { timeoutMs: 15000, headers: { Accept: "text/html" } });
        if (!r.ok) throw new Error(`${cfg.id}: Avature HTTP ${r.status}`);
        const jobs = parseAvature(await r.text(), cfg);
        for (const j of jobs) if (!seen.has(j.sourceId)) seen.set(j.sourceId, j);
        if (jobs.length < 50) break;
      }
    } catch (e) { if (!early) throw e; }     // a failed new-grad search never costs the internships
  }
  return [...seen.values()];
}
