// lib/fetchers/index.js — one entry point: fetch a company, return only listings we'd show.
// Keeps every US internship; the /jobs page lets students pick states.
import { fetchSuccessFactors } from "./successfactors.js";
import { fetchWorkday } from "./workday.js";
import { fetchGreenhouse, fetchLever } from "./greenhouse-lever.js";
import { classify, extractStates } from "../filter.js";

const FETCHERS = {
  successfactors: fetchSuccessFactors,
  workday: fetchWorkday,
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
};

/** @returns {{raw:number, listings:Array}} raw = everything the board returned before filtering */
export async function fetchCompany(cfg) {
  const fn = FETCHERS[cfg.ats];
  if (!fn) throw new Error(`No fetcher for ats "${cfg.ats}"`);
  const raw = await fn(cfg);

  const listings = [];
  for (const j of raw) {
    const match = classify(j.title);
    if (!match) continue;
    // Every US state the posting covers ("Everett, WA | Ridley Park, PA" → WA,PA). Non-US → dropped.
    let states = extractStates(j.location);
    if (!states.length) states = extractStates(j.url);
    if (!states.length) continue;
    listings.push({
      id: `${cfg.id}:${j.sourceId}`,
      company_id: cfg.id,
      company: cfg.company,          // from config, never parsed from the posting
      title: j.title,
      location: j.location,
      state: states.join(","),       // "VA" or "WA,VA,PA" for multi-site postings
      url: j.url,                    // the company's own URL
      ats: cfg.ats,
      match,                         // "me" | "general"
      posted_on: j.postedOn,
      external_path: j.externalPath || null,
    });
  }
  return { raw: raw.length, listings };
}
