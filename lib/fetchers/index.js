// lib/fetchers/index.js — one entry point: fetch a company, return only listings we'd show.
// Keeps every US internship (all majors, tagged by field); the engineering pages show match=me|general.
import { fetchSuccessFactors } from "./successfactors.js";
import { fetchWorkday } from "./workday.js";
import { fetchGreenhouse, fetchLever } from "./greenhouse-lever.js";
import { fetchIcims } from "./icims.js";
import { fetchTaleo, fetchUkg } from "./taleo-ukg.js";
import { fetchAshby, fetchSmartRecruiters, fetchOracle, fetchEightfold, fetchPaylocity, fetchAdp, fetchJibe } from "./more-boards.js";
import { classify, extractStates, cleanLocation } from "../filter.js";
import { isInternship, fieldOf } from "../fields.js";

const FETCHERS = {
  successfactors: fetchSuccessFactors,
  workday: fetchWorkday,
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  icims: fetchIcims,
  ashby: fetchAshby,
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
  for (const j of raw) {
    // Every US internship for college students is kept and tagged with its field (all majors).
    // `match` stays the engineering view: "me" | "general" for engineering roles, null for everything else.
    const match = classify(j.title);
    if (!match && !isInternship(j.title)) continue;
    // Every US state the posting covers ("Everett, WA | Ridley Park, PA" → WA,PA). Non-US → dropped.
    let states = extractStates(j.location);
    if (!states.length && cfg.ats !== "icims") states = extractStates(j.url);   // iCIMS gives explicit locations; its URLs are just title slugs
    if (!states.length) continue;
    listings.push({
      id: `${cfg.id}:${j.sourceId}`,
      company_id: cfg.id,
      company: cfg.company,          // from config, never parsed from the posting
      title: j.title,
      location: cleanLocation(j.location),
      state: states.join(","),       // "VA" or "WA,VA,PA" for multi-site postings
      url: j.url,                    // the company's own URL
      ats: cfg.ats,
      match,                         // "me" | "general" | null (not an engineering role)
      field: fieldOf(j.title),       // mechanical | electrical | civil | software | finance | … | other
      posted_on: j.postedOn,
      external_path: j.externalPath || null,
    });
  }
  return { raw: raw.length, listings };
}
