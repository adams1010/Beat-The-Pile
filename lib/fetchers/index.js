// lib/fetchers/index.js — one entry point: fetch a company, return only listings we'd show.
// Keeps every US internship (all majors, tagged by field) plus early-career full-time roles (new grad, entry level,
// "Engineer I" — lib/fields.js isEarlyCareer). The engineering pages show match=me|general. /api/listings tells the two
// kinds apart by title (kind=intern|fulltime), so no new database column is needed.
import { geoFields, bigCityState } from "../geocode.js";
const DEAD_TITLE = /^\s*(unsubscribed|offline|inactive|closed|do not (use|post|apply)|test posting|template)\s*[-–:|]/i;
// "Remote, United States" / "US Remote" / "Remote - USA" / "United States" / "Anywhere in the US" — US-wide, no state
const US_REMOTE = (t = "") => /\b(united states|usa|u\.s\.a?\.?|us)\b/i.test(t) && /\b(remote|anywhere|work from home|virtual|united states|usa)\b/i.test(t)
  && !/\b(canada|mexico|united kingdom|uk|europe|emea|apac|latam|india|brazil|germany|ireland|spain|poland|philippines|singapore|japan|australia)\b/i.test(t);
import { fetchSuccessFactors } from "./successfactors.js";
import { fetchWorkday } from "./workday.js";
import { fetchGreenhouse, fetchLever } from "./greenhouse-lever.js";
import { fetchIcims } from "./icims.js";
import { fetchTaleo, fetchUkg } from "./taleo-ukg.js";
import { fetchWorkable, fetchBamboo, fetchAshby, fetchSmartRecruiters, fetchOracle, fetchEightfold, fetchPaylocity, fetchAdp, fetchJibe } from "./more-boards.js";
import { classify, extractStates, cleanLocation, isForeignPlace } from "../filter.js";
import { isInternship, isEarlyCareer, isHourlyRole, fieldOf } from "../fields.js";

const FETCHERS = {
  successfactors: fetchSuccessFactors,
  workday: fetchWorkday,
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  icims: fetchIcims,
  ashby: fetchAshby,
  bamboohr: fetchBamboo,
  workable: fetchWorkable,
  smartrecruiters: fetchSmartRecruiters,
  oracle: fetchOracle,
  eightfold: fetchEightfold,
  paylocity: fetchPaylocity,
  adp: fetchAdp,
  jibe: fetchJibe,
  taleo: fetchTaleo,
  ukg: fetchUkg,
};

/** @returns {{raw:number, listings:Array}} raw = everything the board returned before filtering */
export async function fetchCompany(cfg) {
  const fn = FETCHERS[cfg.ats];
  if (!fn) throw new Error(`No fetcher for ats "${cfg.ats}"`);
  const raw = await fn(cfg);

  const listings = [];
  const seenIds = new Set();   // one upsert can't carry the same id twice (Postgres 21000) — some boards (Workable) repeat a posting
  for (const j of raw) {
    // Nov 14: some boards leave internal status words on the title ("Unsubscribed - …", "Offline - …"): not a real opening
    if (DEAD_TITLE.test(j.title || "")) continue;
    // Every US internship for college students is kept and tagged with its field (all majors).
    // `match` stays the engineering view: "me" | "general" for engineering roles, null for everything else.
    const early = !isInternship(j.title) && !j.isIntern && isEarlyCareer(j.title);
    // engineering view for full-time roles: same rules as internships (classify needs the word "intern", so lend it one)
    const match = classify(j.title) ?? (early ? classify(j.title + " (intern)") : null);
    const hourly = !early && !isInternship(j.title) && !j.isIntern && isHourlyRole(j.title);   // Nov 13: part-time & hourly
    if (!match && !isInternship(j.title) && !j.isIntern && !early && !hourly) continue;      // isIntern: the board's own "Internship" employment type (BambooHR)
    // Every US state the posting covers ("Everett, WA | Ridley Park, PA" → WA,PA). Non-US → dropped.
    let states = extractStates(j.location);
    if (!states.length && cfg.ats !== "icims" && !isForeignPlace(j.location)) states = extractStates(j.url);   // iCIMS gives explicit locations; its URLs are just title slugs
    // Nov 14: a big US city with no state ("San Francisco - SF9") or a US-wide remote job ("Remote, United States") → keep
    if (!states.length && !isForeignPlace(j.location)) { const st = bigCityState(j.location); if (st) states = [st]; }
    if (!states.length && !isForeignPlace(j.location) && US_REMOTE(j.location)) states = ["US"];
    if (!states.length) continue;
    if (seenIds.has(`${cfg.id}:${j.sourceId}`)) continue;
    seenIds.add(`${cfg.id}:${j.sourceId}`);
    listings.push({
      id: `${cfg.id}:${j.sourceId}`,
      company_id: cfg.id,
      company: cfg.listAs || cfg.company,   // from config, never parsed from the posting (listAs: the board is a wider org's)
      title: j.title,
      location: cleanLocation(j.location),
      state: states.join(","),       // "VA" or "WA,VA,PA" for multi-site postings
      url: j.url,                    // the company's own URL
      ats: cfg.ats,
      match,                         // "me" | "general" | null (not an engineering role)
      field: fieldOf(j.title),
      kind: early ? "fulltime" : hourly ? "hourly" : "intern",   // stored + indexed: /api/listings?kind= filters on it (Nov 13)       // mechanical | electrical | civil | software | finance | … | other
      posted_on: j.postedOn,
      external_path: j.externalPath || null,
      ...geoFields(cleanLocation(j.location), states),   // map points for "within N miles" (lib/geocode.js)
    });
  }
  return { raw: raw.length, listings, ...(raw.partial ? { partial: true } : {}) };   // partial: some searches failed (Workday)
}
