// lib/aggfinder.js — Adzuna + Jooble as COMPANY FINDERS only (Nov 18 2026).
// Their listings come from many job sites, so we never show them (non-negotiable: every listing comes from a board the robot
// proved belongs to the company). We only read employer NAMES: a US employer we don't track yet becomes a pending
// company_candidates row; the Company Finder then finds its website (guessDomain: the page must carry the full name)
// and proves its real job board like any other company.
import { get, postJson } from "./http.js";
import { extractStates } from "./filter.js";
import { isInternship, isEarlyCareer } from "./fields.js";
import { normName, keyFor } from "./simplify.js";

export const AGG_TERMS = ["intern", "internship", "co-op", "new grad", "entry level", "graduate program", "apprentice", "summer analyst"];
// Staffing agencies and job boards post other companies' jobs: never queue them. Plus nameless/confidential posters.
const AGENCY = /\b(staffing|recruit\w*|talent|aerotek|robert half|insight global|teksystems|randstad|adecco|kelly services|manpower\w*|jobot|cybercoders|apex systems|kforce|hays|motion recruitment|actalent|allegis|vaco|beacon hill|collabera|experis|modis|spherion|express employment|employbridge|people ?ready|hire\w*|headhunt\w*|placement|personnel|outsourc\w*|lensa|dice|ziprecruiter|indeed|monster|careerbuilder|jooble|adzuna|handshake|wayup|ripplematch|simplify|confidential|undisclosed|anonymous|private (company|employer)|various|multiple)\b/i;
const slug = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const wanted = (t) => isInternship(t) || isEarlyCareer(t);

/** Adzuna US search page → [{ company, title, location }] */
export function parseAdzuna(d) {
  return (d?.results || []).filter((j) => (j.location?.area || [])[0] === "US" || /\bUS\b/.test(j.location?.display_name || ""))
    .map((j) => ({ company: String(j.company?.display_name || "").trim(), title: String(j.title || "").replace(/<[^>]+>/g, "").trim(), location: [...(j.location?.area || [])].reverse().slice(0, 2).join(", ") || j.location?.display_name || "" }));
}
/** Jooble search page → [{ company, title, location }] (US places only) */
export function parseJooble(d) {
  return (d?.jobs || []).map((j) => ({ company: String(j.company || "").trim(), title: String(j.title || "").replace(/<[^>]+>/g, "").trim(), location: String(j.location || "") }))
    .filter((j) => extractStates(j.location).length || /\b(united states|usa|remote)\b/i.test(j.location));
}

/** Postings from either source → new pending candidates (US employers we don't know, not agencies), busiest first. */
export function pickAggCompanies(postings, knownNames, source, max = 150) {
  const by = new Map();
  for (const p of postings) {
    const name = p.company.replace(/\s+/g, " ").trim(), n = normName(name);
    if (n.length < 3 || name.length > 80 || AGENCY.test(name) || !wanted(p.title)) continue;
    if (knownNames.has(n) || [...knownNames].some((k) => k.length >= 5 && (k.startsWith(n) || n.startsWith(k)))) continue;
    const e = by.get(n) || { company: name, n: 0 }; e.n++; by.set(n, e);
  }
  return [...by.values()].sort((a, z) => z.n - a.n).slice(0, max)
    .map((e) => ({ id: "a-" + slug(e.company), company: e.company, domain: null, key: keyFor(e.company), hint: null, source, status: "pending", priority: Math.min(35, 15 + 2 * Math.min(10, e.n)) }));
}

/** One day's reads: 8 terms × 2 pages per source (≈16 Adzuna + 16 Jooble calls; Adzuna's free tier allows 250/day),
 *  8 at a time with a hard time cap so the daily import stays inside the finder's 60 s. Missing keys → that source is skipped. */
export async function fetchAggPostings({ adzunaId, adzunaKey, joobleKey } = {}, { budgetMs = 25000 } = {}) {
  const out = { adzuna: [], jooble: [], errors: [] }, t0 = Date.now();
  const jobs = [];
  for (const what of AGG_TERMS) for (let page = 1; page <= 2; page++) {
    if (adzunaId && adzunaKey) jobs.push(async () => {
      const r = await get(`https://api.adzuna.com/v1/api/jobs/us/search/${page}?app_id=${encodeURIComponent(adzunaId)}&app_key=${encodeURIComponent(adzunaKey)}&results_per_page=50&max_days_old=21&what=${encodeURIComponent(what)}&content-type=application/json`, { timeoutMs: 9000, headers: { Accept: "application/json" } });
      if (r.ok) out.adzuna.push(...parseAdzuna(await r.json())); else out.errors.push(`Adzuna ${r.status}`);
    });
    if (joobleKey) jobs.push(async () => {
      const r = await postJson(`https://jooble.org/api/${encodeURIComponent(joobleKey)}`, { keywords: what, location: "United States", page: String(page) }, { timeoutMs: 9000 });
      if (r.ok) out.jooble.push(...parseJooble(await r.json())); else out.errors.push(`Jooble ${r.status}`);
    });
  }
  for (let i = 0; i < jobs.length && Date.now() - t0 < budgetMs; i += 8)
    await Promise.all(jobs.slice(i, i + 8).map((f) => f().catch((e) => out.errors.push(String(e.message || e).slice(0, 60)))));
  return out;
}
