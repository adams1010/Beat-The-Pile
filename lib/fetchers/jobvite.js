// lib/fetchers/jobvite.js — Jobvite career sites (Nov 20): https://jobs.jobvite.com/{slug}/jobs
// A plain public HTML table, every open job on it (no search needed): rows of
//   <td class="jv-job-list-name"><a href="/{slug}/job/{id}">Title</a></td><td class="jv-job-list-location">City, State</td>
// Long boards page with a "next" link (?p=N). A slug that isn't a Jobvite customer answers 200 with Jobvite's own
// "Job Seeker FAQs and Support" page, so that page never counts as a board. robots.txt: none (checked Nov 20).
import { get } from "../http.js";

export const jobviteList = (slug, p = 0) => `https://jobs.jobvite.com/${encodeURIComponent(slug)}/jobs${p ? `?p=${p}` : ""}`;
const MAX_PAGES = 20;

const text = (s) => String(s || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();

/** Jobvite's "this company isn't here" page, or anything that isn't a Jobvite job list. */
export function isJobviteBoard(html = "") {
  return /jv-job-list|jv-page-body|jv-careersite/i.test(html) && !/<title>\s*Job Seeker FAQs/i.test(html);
}

/** The board's own name from its page title: "Hoar Careers" → "Hoar". */
export function jobviteName(html = "") {
  const t = text((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "");
  if (!t || /jobvite/i.test(t)) return "";
  return t.replace(/\s*[|–-].*$/, "").replace(/\s+(careers?|jobs|job openings|open positions)$/i, "").trim();
}

export function parseJobvite(html = "", slug = "") {
  const out = new Map();
  const re = /<td[^>]*class="[^"]*jv-job-list-name[^"]*"[^>]*>\s*<a[^>]*href="([^"]*\/job\/([A-Za-z0-9]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class="[^"]*jv-job-list-location[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;
  for (const m of html.matchAll(re)) {
    const id = m[2];
    if (out.has(id)) continue;
    const href = m[1].startsWith("http") ? m[1] : `https://jobs.jobvite.com${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (slug && !new RegExp(`/${slug}/job/`, "i").test(href)) continue;     // own board's jobs only
    out.set(id, { sourceId: id, title: text(m[3]), location: text(m[4]), url: href, postedOn: null });
  }
  // Layout 2 (Laborie and others): the whole row is one link with divs inside —
  //   <a href="/{slug}/job/{id}"><div class="jv-job-list-name">Title</div><div class="jv-job-list-location">City, ST</div></a>
  // (also the "Featured jobs" cards: jv-featured-job-title / jv-featured-job-location)
  const card = /<a[^>]*href="([^"]*\/job\/([A-Za-z0-9]+)[^"]*)"[^>]*>([\s\S]{0,2000}?)<\/a>/gi;
  for (const m of html.matchAll(card)) {
    const id = m[2], inner = m[3];
    if (out.has(id)) continue;
    const t = inner.match(/class="[^"]*(?:jv-job-list-name|jv-featured-job-title)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p|h\d)>/i);
    if (!t) continue;
    const l = inner.match(/class="[^"]*(?:jv-job-list-location|jv-featured-job-location)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p)>/i);
    const href = m[1].startsWith("http") ? m[1] : `https://jobs.jobvite.com${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (slug && !new RegExp(`/${slug}/job/`, "i").test(href)) continue;
    out.set(id, { sourceId: id, title: text(t[1]), location: l ? text(l[1]) : "", url: href, postedOn: null });
  }
  return [...out.values()].filter((j) => j.title);
}

/** "next page" link → its p= number, if the board has more pages. */
export function jobviteNext(html = "") {
  const m = html.match(/<a[^>]*class="[^"]*jv-pagination-next[^"]*"[^>]*href="[^"]*[?&]p=(\d+)/i)
         || html.match(/<a[^>]*href="[^"]*[?&]p=(\d+)"[^>]*class="[^"]*jv-pagination-next/i);
  return m ? +m[1] : null;
}

export async function fetchJobvite(cfg) {
  const all = new Map();
  let p = 0;
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await get(jobviteList(cfg.token, p));
    if (!res.ok) throw new Error(`${cfg.id}: Jobvite HTTP ${res.status}`);
    const html = await res.text();
    if (!isJobviteBoard(html)) throw new Error(`${cfg.id}: Jobvite board "${cfg.token}" not found`);
    const before = all.size;
    for (const j of parseJobvite(html, cfg.token)) all.set(j.sourceId, j);
    const next = jobviteNext(html);
    if (next == null || next <= p || all.size === before) break;
    p = next;
  }
  return [...all.values()];
}
