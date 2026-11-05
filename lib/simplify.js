// lib/simplify.js — finds NEW companies for the robot from the SimplifyJobs internship list
// (a free, community-kept list on GitHub, updated daily).
// We only take company NAMES + the job-board address their posting used. Nothing is copied or shown from it:
// each company still goes through the robot, which must prove the board belongs to that company
// before a single listing appears.
import { classify, extractStates } from "./filter.js";
import { isInternship } from "./fields.js";
import { scanHtml } from "./discover.js";
import { boardKey } from "./companies.js";

export const SIMPLIFY_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

export const normName = (s) => String(s || "").toLowerCase().replace(/&/g, "and")
  .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the|group|plc|holdings|incorporated)\b\.?/g, "").replace(/[^a-z0-9]/g, "");
const slug = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const GENERIC = new Set(["general", "american", "united", "national", "international", "global", "advanced", "applied", "first", "north", "south", "southern", "northern", "western", "eastern", "central", "pacific", "atlantic", "digital", "systems", "energy", "power", "health", "medical", "capital", "data", "smart"]);
const SKIP_NAME = /universit|college|school district|bank|capital|financial|insurance|staffing|recruit/i;
const SKIP_BOARD = /private|internal|employee|alumni|staff/i;

/** Proof keyword: a distinctive first word (≥6 letters, not generic) or the whole name. */
export function keyFor(company) {
  const words = String(company).toLowerCase().replace(/&/g, " ").split(/[^a-z0-9]+/).filter(Boolean)
    .filter((w) => !["the", "inc", "llc", "corp", "co"].includes(w));
  const first = words[0] || "";
  return first.length >= 6 && !GENERIC.has(first) ? first : normName(company);
}

/**
 * @param listings  SimplifyJobs listings array
 * @param knownNames Set of normName() for every company already tracked
 * @param knownBoards Set of boardKey() for every board already tracked
 * @returns candidate rows ready to insert (status pending)
 */
// Job sites that aren't the company's own domain (a posting there with no readable board link → skip)
const NOT_OWN_SITE = /(^|\.)(eightfold\.ai|greenhouse\.io|lever\.co|jobvite\.com|workable\.com|rippling\.com|applytojob\.com|linkedin\.com|simplify\.jobs|indeed\.com|glassdoor\.com|handshake|ziprecruiter\.com|avature\.net|paylocity\.com|pinpointhq\.com|careerpuck\.com|adp\.com|oraclecloud\.com|hirebridge|recruitee|teamtailor|personio|jazzhr|catsone|myworkdayjobs\.com|icims\.com|taleo\.net|successfactors|ultipro|dayforce|paycom|bamboohr|breezy\.hr|smartrecruiters|ashbyhq|wellfound|builtin|jobs\.|careers\.)/i;

/** Robot queue priority (higher = sooner). All majors: more internships = sooner, small boost for engineering ones. */
export const priorityOf = (e) => { const n = (e.me || 0) + (e.gen || 0) + (e.other || 0); return Math.min(95, 20 + 3 * Math.min(15, n) + (e.me ? 12 : 0) + (e.gen ? 6 : 0)); };

export function pickCompanies(listings, knownNames, knownBoards, { minGen = 4, ownSites = false, anyMajor = false } = {}) {
  const by = new Map();
  for (const x of listings || []) {
    const match = classify(x?.title || "");
    if (!match && !(anyMajor && isInternship(x?.title || ""))) continue;     // engineering internships (any major in backlog mode)
    if (!(x.locations || []).some((l) => extractStates(l).length || /^(remote|remote in usa|united states|usa)$/i.test(String(l).trim()))) continue;   // US only
    const name = String(x.company_name || "").trim();
    const n = normName(name);
    if (n.length < 3 || SKIP_NAME.test(name)) continue;
    if (knownNames.has(n) || [...knownNames].some((k) => k.length >= 5 && (k.startsWith(n) || n.startsWith(k)))) continue;
    const b = scanHtml(String(x.url || ""), null).boards[0];
    let domain = null, bk = null;
    if (b) {
      if (SKIP_BOARD.test(JSON.stringify(b.config))) continue;
      if (b.ats === "oracle") continue;          // Oracle addresses never name the company → can't be proven from an outside link
      bk = boardKey({ ats: b.ats, ...b.config });
      if (knownBoards.has(bk)) continue;
    } else {
      // Backlog mode: a posting on the company's OWN site (tesla.com/careers…) → start the robot from that domain
      if (!ownSites) continue;
      try { const h = new URL(String(x.url)).hostname.replace(/^www\./, ""); if (NOT_OWN_SITE.test(h) || h.split(".").length > 3) continue; domain = h.split(".").slice(-2).join("."); } catch { continue; }
    }
    const prev = by.get(n);
    if (prev && !prev.bk && bk) { prev.bk = bk; prev.hint = x.url; prev.domain = null; }   // prefer a readable board over a bare domain
    const e = prev || { company: name, me: 0, gen: 0, other: 0, hint: bk ? x.url : null, domain, bk };
    if (match === "me") e.me++; else if (match) e.gen++; else e.other++;
    by.set(n, e);
  }
  return [...by.values()]
    .filter((e) => e.me >= 1 || e.gen >= minGen || (anyMajor && e.other >= 1))   // a real ME internship, a steady stream of engineering ones, or (backlog) any internships
    .sort((a, z) => priorityOf(z) - priorityOf(a))
    .map((e) => ({ id: "s-" + slug(e.company), company: e.company, domain: e.domain || null, key: keyFor(e.company), hint: e.hint, source: "SimplifyJobs list", status: "pending", priority: priorityOf(e) }));
}
