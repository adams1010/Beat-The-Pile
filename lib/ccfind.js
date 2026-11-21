// Common Crawl careers finder (Nov 21 2026, owner: "bypass manually entering the 3,695 companies").
// For a company parked as no_board / blocked we ask Common Crawl's public archive (index.commoncrawl.org + data.commoncrawl.org,
// the same public dataset Board Scout reads) which careers-looking pages exist on THEIR domain, read the archived copy of those
// pages, and pull out (a) the real careers page address and (b) any job-board links on it. Nothing goes live from this file:
// the finder re-checks every result with the normal proof rules (lib/discover.js).
import { scanHtml } from "./discover.js";

export const CAREER_PATH = /(career|jobs?\b|jobs[\/.?-]|join-?us|join-our|employment|opportunit|work-?with|work-?for|work-?at|hiring|openings|vacanc|recruit)/i;
const SKIP_PATH = /\.(pdf|jpe?g|png|gif|svg|css|js|ico|xml|txt|zip|mp4|woff2?)(\?|$)|\/(wp-json|feed|tag|category|author|blog|news|press|events?)\//i;

/** CDX lines (output=json, one object per line) → up to `max` best careers captures on that domain, newest first. */
export function pickCaptures(lines, domain, max = 3) {
  const d = String(domain || "").toLowerCase().replace(/^www\./, "");
  const rows = [];
  for (const line of String(lines || "").split("\n")) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (!r?.url || !r.filename || String(r.status || "200") !== "200") continue;
    if (r.mime && !/html/i.test(r.mime)) continue;
    let u; try { u = new URL(r.url); } catch { continue; }
    const h = u.hostname.toLowerCase();
    if (!(h === d || h.endsWith("." + d))) continue;
    const path = u.pathname + u.search;
    if (SKIP_PATH.test(path) || !CAREER_PATH.test(h.split(".")[0] + "/" + path)) continue;
    // shorter, more "index-like" pages first: /careers beats /careers/2019/some-old-posting
    const depth = path.split("/").filter(Boolean).length;
    rows.push({ ...r, score: depth * 10 + path.length / 20 - (/career|jobs|join/i.test(path) ? 5 : 0), clean: `${u.protocol}//${h}${u.pathname}` });
  }
  const seen = new Set(), out = [];
  for (const r of rows.sort((a, b) => a.score - b.score || String(b.timestamp).localeCompare(String(a.timestamp)))) {
    if (seen.has(r.clean)) continue; seen.add(r.clean); out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/** A WARC record (already gunzipped) → its HTML body. */
export function warcHtml(text) {
  const s = String(text || "");
  const i = s.indexOf("\r\n\r\n");                 // end of WARC headers
  const j = i < 0 ? -1 : s.indexOf("\r\n\r\n", i + 4);   // end of HTTP headers
  return j < 0 ? "" : s.slice(j + 4);
}

/** Archived page → boards it links (scanHtml) + whether it looks like a real careers page. */
export function readCapture(html, url) {
  const s = scanHtml(html, url);
  return { boards: s.boards, unsupported: [...(s.unsupported || [])], careersish: /career|job|join our team|employment|opening|position/i.test(String(html).slice(0, 200000)) };
}

/** "jobs.acme.co.uk" / "www.acme.com" → SURT host prefix "com,acme" (www dropped, like Common Crawl's index keys). */
export function surtOf(domain) {
  const parts = String(domain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").split(".").filter(Boolean);
  return parts.length >= 2 ? parts.reverse().join(",") : "";
}
/** Does an index line belong to this domain (the host itself or any subdomain)? */
export const lineIsDomain = (line, surt) => line.startsWith(surt) && (line[surt.length] === ")" || line[surt.length] === ",");

/** cluster.idx lines (sorted) → [lo, hi] block indexes that can hold keys starting with `surt` (binary search). */
export function blocksFor(keys, surt) {
  let a = 0, b = keys.length;                        // first index with key >= surt
  while (a < b) { const m = (a + b) >> 1; if (keys[m] < surt) a = m + 1; else b = m; }
  const lo = Math.max(0, a - 1);
  let hi = lo;
  while (hi + 1 < keys.length && keys[hi + 1].startsWith(surt) && hi - lo < 8) hi++;   // a huge site spans blocks; 8 is plenty for careers pages
  return [lo, hi];
}

/** One cdxj index line → { url, status, mime, filename, offset, length, timestamp } */
export function parseIndexLine(l) {
  const j = l.indexOf("{"); if (j < 0) return null;
  try { const o = JSON.parse(l.slice(j)); o.timestamp = l.slice(l.indexOf(" ") + 1, j).trim(); return o; } catch { return null; }
}

/** Every job-board link on an archived page, as URLs the finder can use as a hint (each re-detected by scanHtml). */
export function boardLinks(html) {
  const raw = String(html || "");
  const text = /\\\/|\\u002F/i.test(raw) ? raw + "\n" + raw.replace(/\\+u002F/gi, "/").replace(/\\+\//g, "/") : raw;
  const out = new Map();
  for (const u of text.match(/https?:\/\/[^\s"'<>\\)]+/g) || []) {
    const b = scanHtml(u, null).boards[0];
    if (!b) continue;
    const k = b.ats + "|" + JSON.stringify(b.config).toLowerCase();
    if (!out.has(k)) out.set(k, { ats: b.ats, url: u.replace(/[.,;]+$/, "") });
  }
  return [...out.values()];
}

const isOwnHost = (url, domain) => { try { const h = new URL(url).hostname.toLowerCase(), d = String(domain || "").toLowerCase().replace(/^www\./, ""); return h === d || h.endsWith("." + d); } catch { return false; } };
const DEFAULT_TRIED = (url, domain) => { const d = String(domain || "").replace(/^www\./, ""); return [`https://www.${d}/careers`, `https://${d}/careers`, `https://careers.${d}`, `https://jobs.${d}`].some((x) => url.replace(/\/$/, "").toLowerCase() === x.toLowerCase()); };
const ccDate = (ts) => { const m = String(ts || "").match(/^(\d{4})(\d{2})(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };

/**
 * Server side of parked_cc: one Careers Finder result → the new hint for that company (or null).
 *   1st choice: a job-board link seen on THEIR OWN archived page → hint = that board, config.ccSeen records where/when,
 *              so the finder may count it as "linked from their own site" (lib/discover.js ccOwn).
 *   2nd choice: their real careers page (own domain, not one of the four addresses the finder already tries).
 * A hint that was already tried (config.triedHint) is never sent back.
 */
export function ccHint(row, r) {
  const tried = row.config?.triedHint || null;
  for (const b of Array.isArray(r.boards) ? r.boards : []) {
    const url = String(b?.url || "").slice(0, 500);
    if (!/^https?:\/\//i.test(url) || !scanHtml(url, null).boards.length || url === tried || url === row.hint) continue;
    const page = /^https?:\/\//i.test(String(r.page || "")) && isOwnHost(r.page, row.domain) ? String(r.page).slice(0, 500) : null;
    return { hint: url, config: { ...(page ? { ccSeen: { board: url, page, at: ccDate(r.at) } } : {}) } };
  }
  const c = String(r.careers || "").slice(0, 500);
  if (/^https?:\/\//i.test(c) && isOwnHost(c, row.domain) && !DEFAULT_TRIED(c, row.domain) && c !== tried && c !== row.hint) return { hint: c, config: {} };
  return null;
}
