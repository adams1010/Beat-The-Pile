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
