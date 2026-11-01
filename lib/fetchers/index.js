// lib/fetchers/index.js — one entry point: fetch a company, return only listings we'd show.
import { fetchSuccessFactors } from "./successfactors.js";
import { fetchWorkday } from "./workday.js";
import { fetchGreenhouse, fetchLever } from "./greenhouse-lever.js";
import { classify, extractState } from "../filter.js";
import { TARGET_STATES } from "../companies.js";

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
    // Multi-site postings ("Everett, WA | Ridley Park, PA | ..."): keep if ANY site is in a target state.
    const states = String(j.location || "").split("|").map((s) => extractState(s)).filter(Boolean);
    if (!states.length) { const s = extractState(j.url); if (s) states.push(s); }
    const state = states.find((s) => TARGET_STATES.includes(s));
    if (!state) continue;
    listings.push({
      id: `${cfg.id}:${j.sourceId}`,
      company_id: cfg.id,
      company: cfg.company,          // from config, never parsed from the posting
      title: j.title,
      location: j.location,
      state,
      url: j.url,                    // the company's own URL
      ats: cfg.ats,
      match,                         // "me" | "general"
      posted_on: j.postedOn,
      external_path: j.externalPath || null,
    });
  }
  return { raw: raw.length, listings };
}
