// lib/companies.js — the ONLY place companies come from.
// Each entry is one company's own job system. A feed can only produce jobs for the
// company named here, so the company name on a listing can never be wrong.
//
// enabled:false = board URL not verified yet. Flip to true after you open the board
// and run `node scripts/test-fetchers.mjs <id>` successfully.

export const COMPANIES = [
  // ── SAP SuccessFactors career sites ─────────────────────────────────────────
  { id: "volvo-group",  company: "Volvo Group (Volvo / Mack Trucks)", ats: "successfactors", base: "https://jobs.volvogroup.com",              enabled: true },
  { id: "bwxt",         company: "BWX Technologies (BWXT)",           ats: "successfactors", base: "https://careers.bwxt.com",               enabled: true },
  { id: "westinghouse", company: "Westinghouse Electric",             ats: "successfactors", base: "https://careers.westinghousenuclear.com", enabled: true },
  { id: "l3harris",     company: "L3Harris",                          ats: "successfactors", base: "https://jobs.l3harris.com",              enabled: true },
  { id: "hii-nns",      company: "HII Newport News Shipbuilding",     ats: "successfactors", base: "https://careers.huntingtoningalls.com",  enabled: true },

  // ── Workday ─────────────────────────────────────────────────────────────────
  { id: "boeing",       company: "Boeing",                            ats: "workday", host: "boeing.wd1.myworkdayjobs.com",     tenant: "boeing",     site: "EXTERNAL_CAREERS",              enabled: true },
  { id: "northrop",     company: "Northrop Grumman",                  ats: "workday", host: "ngc.wd1.myworkdayjobs.com",        tenant: "ngc",        site: "Northrop_Grumman_External_Site", enabled: false },

  // ── Greenhouse / Lever (add startups here once you confirm their board token) ─
  // { id: "gecko", company: "Gecko Robotics", ats: "greenhouse", token: "geckorobotics", enabled: false },
];

// Where your users are. A listing outside these states is dropped.
export const TARGET_STATES = ["VA", "PA"];
