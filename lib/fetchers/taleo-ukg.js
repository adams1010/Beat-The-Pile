// lib/fetchers/taleo-ukg.js — two systems big non-tech employers use (banks, hospitals, builders, defense).
//
// TALEO (Oracle Taleo Enterprise): https://{tenant}.taleo.net/careersection/{section}/jobsearch.ftl
//   The search page names a numeric "portal"; jobs come from POST /careersection/rest/jobboard/searchjobs?portal=…
//   Keyword search works well, so we search "intern" and "co-op" (25 per page). Job link: jobdetail.ftl?job={contestNo}.
//   Locations come in mixed shapes: "AL-Montgomery", "North Carolina-Charlotte", "US-ME-Waterboro", "CA-Quebec-Mirabel"
//   (three parts = COUNTRY-region-city, so that last one is Canada, not California).
//
// UKG (UltiPro Recruiting): https://recruiting{,2}.ultipro.com/{TENANT}/JobBoard/{guid}
//   POST …/JobBoardView/LoadSearchResults (50 per page). Its keyword search ignores the keyword, so we read every job
//   and the shared filter keeps internships. Job link: …/OpportunityDetail?opportunityId={Id}.
//   Every detail URL answers 200 (even made-up ones), so the link checker skips UKG; closures come from the sync.
import { get, postJson } from "../http.js";
import { STATE_NAMES } from "../filter.js";

const CODE_OF = Object.fromEntries(Object.entries(STATE_NAMES).map(([c, n]) => [n.toLowerCase(), c]));
const STATE_CODES = new Set(Object.keys(STATE_NAMES));
const COUNTRIES = { CA: "Canada", MX: "Mexico", IN: "India", GB: "United Kingdom", UK: "United Kingdom", DE: "Germany", FR: "France", CN: "China",
  JP: "Japan", PL: "Poland", IE: "Ireland", NL: "Netherlands", SG: "Singapore", IL: "Israel", PH: "Philippines", KR: "Korea", IT: "Italy",
  ES: "Spain", BR: "Brazil", AU: "Australia", CZ: "Czech Republic", HU: "Hungary", RO: "Romania", CH: "Switzerland", SE: "Sweden", BE: "Belgium" };
const stateCode = (s) => { const t = String(s || "").trim(); return STATE_CODES.has(t.toUpperCase()) ? t.toUpperCase() : CODE_OF[t.toLowerCase()] || null; };

/** One Taleo location string → "City, ST" (US), "City, Region, Country" (abroad), or the original text. */
export function taleoLocation(s) {
  const parts = String(s || "").split("-").map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const [country, region, ...rest] = parts;
    if (/^(US|USA|United States)$/i.test(country)) { const st = stateCode(region); return st ? `${rest.join("-")}, ${st}` : `${rest.join("-")}, ${region}`; }
    if (stateCode(country) && !COUNTRIES[country.toUpperCase()]) return `${parts.slice(1).join("-")}, ${stateCode(country)}`;   // "Texas-Fort Worth-Downtown"
    return `${rest.join("-")}, ${region}, ${COUNTRIES[country.toUpperCase()] || "outside the United States"}`;
  }
  if (parts.length === 2) { const st = stateCode(parts[0]); if (st) return `${parts[1]}, ${st}`; }
  return String(s || "").trim();
}

const taleoBody = (keyword, pageNo) => ({
  multilineEnabled: false, sortingSelection: { sortBySelectionParam: "3", ascendingSortingOrder: "false" },
  fieldData: { fields: { KEYWORD: keyword, LOCATION: "" }, valid: true },
  filterSelectionParam: { searchFilterSelections: [] }, advancedSearchFiltersSelectionParam: { searchFilterSelections: [] }, pageNo,
});

/** Parse one Taleo searchjobs response. Exported for tests. */
export function parseTaleo(d, cfg) {
  return (d?.requisitionList || []).map((r) => {
    const col = Array.isArray(r.column) ? r.column : [];
    const title = String(col[r.linkedColumn ?? 0] || "").trim();
    let locs = [];
    for (const i of r.locationsColumns || []) {
      try { const v = JSON.parse(col[i]); locs.push(...(Array.isArray(v) ? v : [v])); } catch { if (col[i]) locs.push(col[i]); }
    }
    const date = col.find((c, i) => i !== (r.linkedColumn ?? 0) && /\d{4}/.test(String(c)) && !isNaN(Date.parse(c)));
    return { sourceId: String(r.contestNo || r.jobId), title, location: locs.map(taleoLocation).join(" | "),
             url: `https://${cfg.host}/careersection/${cfg.section}/jobdetail.ftl?job=${encodeURIComponent(r.contestNo || r.jobId)}&lang=en`,
             postedOn: date || null };
  }).filter((j) => j.title);
}

export async function taleoPortal(cfg) {
  if (cfg.portal) return cfg.portal;
  const r = await get(`https://${cfg.host}/careersection/${cfg.section}/jobsearch.ftl?lang=en`, { timeoutMs: 12000 });
  if (!r.ok) throw new Error(`${cfg.id || cfg.host}: Taleo page HTTP ${r.status}`);
  const portal = ((await r.text()).match(/[?&;]portal=(\d{3,})/) || [])[1];
  if (!portal) throw new Error(`${cfg.id || cfg.host}: Taleo portal id not found`);
  return portal;
}

export async function taleoSearch(cfg, portal, keyword, pageNo = 1) {
  const r = await fetch(`https://${cfg.host}/careersection/rest/jobboard/searchjobs?lang=en&portal=${portal}`, {
    method: "POST", headers: { "User-Agent": "Mozilla/5.0 (compatible; BeatThePileBot/2.0; +https://www.beatthepile.com)", "Content-Type": "application/json", Accept: "application/json", tz: "GMT-05:00", tzname: "America/New_York" },
    body: JSON.stringify(taleoBody(keyword, pageNo)), signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${cfg.id || cfg.host}: Taleo search HTTP ${r.status}`);
  return r.json();
}

export async function fetchTaleo(cfg) {
  let portal = await taleoPortal(cfg);
  try { await taleoSearch(cfg, portal, "intern", 1); }
  catch (e) { if (!cfg.portal) throw e; portal = await taleoPortal({ ...cfg, portal: null }); }   // saved portal id went stale
  const all = new Map();
  for (const kw of ["intern", "co-op"]) {
    for (let p = 1; p <= 12; p++) {
      const d = await taleoSearch(cfg, portal, kw, p);
      const jobs = parseTaleo(d, cfg);
      jobs.forEach((j) => all.set(j.sourceId, j));
      const pg = d.pagingData || {};
      if (!jobs.length || p * (pg.pageSize || 25) >= (pg.totalCount || 0)) break;
    }
  }
  return [...all.values()];
}

// ── UKG ──
const ukgBody = (skip) => ({
  opportunitySearch: { Top: 50, Skip: skip, QueryString: "", OrderBy: [{ Value: "postedDateDesc", PropertyName: "PostedDate", Ascending: false }], Filters: [] },
  matchCriteria: { PreferredJobs: [], Educations: [], LicenseAndCertifications: [], Skills: [], hasNoLicenses: false, SkippedSkills: [] },
});
const ukgCountry = (c) => /^(USA?|United States)$/i.test(String(c || "USA"));

/** Parse one UKG LoadSearchResults response. Exported for tests. */
export function parseUkg(d, cfg) {
  return (d?.opportunities || []).map((o) => {
    const locs = (o.Locations || []).map((l) => {
      const a = l.Address || {};
      const city = a.City || l.LocalizedDescription || "", st = a.State?.Code || a.State?.Name || "";
      return ukgCountry(a.Country?.Code) ? [city, st].filter(Boolean).join(", ") : [city, st, a.Country?.Name || a.Country?.Code].filter(Boolean).join(", ");
    }).filter(Boolean);
    if (!locs.length && /remote/i.test(String(o.JobLocationType || ""))) locs.push("Remote, United States");
    return { sourceId: String(o.Id), title: String(o.Title || "").trim(), location: locs.join(" | "),
             url: `${cfg.base}/OpportunityDetail?opportunityId=${encodeURIComponent(o.Id)}`, postedOn: o.PostedDate || null };
  }).filter((j) => j.title && j.sourceId);
}

export async function ukgPage(cfg, skip = 0) {
  const r = await postJson(`${cfg.base}/JobBoardView/LoadSearchResults`, ukgBody(skip), { timeoutMs: 12000 });
  if (!r.ok) throw new Error(`${cfg.id || cfg.base}: UKG HTTP ${r.status}`);
  return r.json();
}

export async function fetchUkg(cfg) {
  const all = [];
  for (let skip = 0; skip < 3000; skip += 50) {
    const d = await ukgPage(cfg, skip);
    const jobs = parseUkg(d, cfg);
    all.push(...jobs);
    if ((d.opportunities || []).length < 50 || all.length >= (d.totalCount || 0)) break;
  }
  return all;
}
