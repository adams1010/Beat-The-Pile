// lib/simplify.js — finds NEW companies for the robot from the SimplifyJobs internship list
// (a free, community-kept list on GitHub, updated daily).
// We only take company NAMES + the job-board address their posting used. Nothing is copied or shown from it:
// each company still goes through the robot, which must prove the board belongs to that company
// before a single listing appears.
import { classify, extractStates } from "./filter.js";
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
export function pickCompanies(listings, knownNames, knownBoards) {
  const by = new Map();
  for (const x of listings || []) {
    const match = classify(x?.title || "");
    if (!match) continue;                                                     // engineering-type internships only
    if (!(x.locations || []).some((l) => extractStates(l).length || /^(remote|remote in usa|united states|usa)$/i.test(String(l).trim()))) continue;   // US only
    const name = String(x.company_name || "").trim();
    const n = normName(name);
    if (n.length < 3 || SKIP_NAME.test(name)) continue;
    if (knownNames.has(n) || [...knownNames].some((k) => k.length >= 5 && (k.startsWith(n) || n.startsWith(k)))) continue;
    const b = scanHtml(String(x.url || ""), null).boards[0];
    if (!b || SKIP_BOARD.test(JSON.stringify(b.config))) continue;
    if (b.ats === "oracle") continue;          // Oracle addresses never name the company → can't be proven from an outside link
    const bk = boardKey({ ats: b.ats, ...b.config });
    if (knownBoards.has(bk)) continue;
    const e = by.get(n) || { company: name, score: 0, hint: x.url, bk };
    e.score += match === "me" ? 3 : 1;
    by.set(n, e);
  }
  return [...by.values()]
    .filter((e) => e.score >= 2)                                              // at least one ME title or two engineering ones
    .sort((a, z) => z.score - a.score)
    .map((e) => ({ id: "s-" + slug(e.company), company: e.company, domain: null, key: keyFor(e.company), hint: e.hint, source: "SimplifyJobs list", status: "pending" }));
}
