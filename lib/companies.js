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
  // Verified live Nov 1 2026 (intern filter found, postings returned):
  { id: "northrop",     company: "Northrop Grumman",                  ats: "workday", host: "ngc.wd1.myworkdayjobs.com",        tenant: "ngc",        site: "Northrop_Grumman_External_Site", enabled: true },
  { id: "rtx",          company: "RTX (Raytheon / Collins / Pratt)",  ats: "workday", host: "globalhr.wd5.myworkdayjobs.com",   tenant: "globalhr",   site: "REC_RTX_Ext_Gateway",           enabled: true },
  { id: "jnj",          company: "Johnson & Johnson",                 ats: "workday", host: "jj.wd5.myworkdayjobs.com",         tenant: "jj",         site: "JJ",                            enabled: true },
  { id: "merck",        company: "Merck",                             ats: "workday", host: "msd.wd5.myworkdayjobs.com",        tenant: "msd",        site: "SearchJobs",                    enabled: true },
  { id: "philips",      company: "Philips",                           ats: "workday", host: "philips.wd3.myworkdayjobs.com",    tenant: "philips",    site: "jobs-and-careers",              enabled: true },

  // ── Greenhouse / Lever (add startups here once you confirm their board token) ─
  // { id: "gecko", company: "Gecko Robotics", ats: "greenhouse", token: "geckorobotics", enabled: false },
];

// Default view on /jobs. Every US internship is stored; students can pick other states on the page.
export const DEFAULT_STATES = ["VA", "PA"];

/** One fingerprint per job board, so the same board can never be added twice under two names. */
export function boardKey(c) {
  if (c.ats === "workday") return `workday:${c.tenant}/${c.site}`.toLowerCase();
  if (c.ats === "oracle") return `oracle:${c.host}/${c.site}`.toLowerCase();
  if (c.ats === "jibe") { try { return "jibe:" + new URL(c.base).hostname.toLowerCase(); } catch { return "jibe:" + c.base; } }
  if (c.ats === "eightfold") return `eightfold:${c.host}/${c.domain}`.toLowerCase();
  if (c.ats === "icims") { try { return "icims:" + new URL(c.base).hostname.toLowerCase(); } catch { return "icims:" + c.base; } }
  if (c.ats === "taleo") return `taleo:${c.host}/${c.section}`.toLowerCase();
  if (c.ats === "ukg") { const m = String(c.base || "").match(/ultipro\.com\/([A-Za-z0-9]+)\/JobBoard\/([0-9a-f-]{36})/i); return m ? `ukg:${m[1]}/${m[2]}`.toLowerCase() : `ukg:${c.base}`; }
  if (c.ats === "successfactors") { try { return "sf:" + new URL(c.base).hostname.toLowerCase(); } catch { return "sf:" + c.base; } }
  return `${c.ats}:${c.token}`.toLowerCase();
}

/**
 * Hand-verified companies above + companies the discovery robot proved and enabled
 * (table company_candidates). Turn one off any time: set enabled=false in Supabase.
 */
export async function loadCompanies() {
  let found = [];
  try {
    const { db } = await import("./db.js");
    const rows = await db.selectAllAsAdmin("company_candidates?select=id,company,ats,config&enabled=eq.true");
    found = rows.filter((r) => r.ats && r.config).map((r) => ({ id: r.id, company: r.company, ats: r.ats, ...r.config, enabled: true, discovered: true }));
  } catch { /* table not created yet → hand-verified list only */ }
  const ids = new Set(COMPANIES.map((c) => c.id));
  const boards = new Set(COMPANIES.map(boardKey));
  return [...COMPANIES, ...found.filter((f) => !ids.has(f.id) && !boards.has(boardKey(f)))];
}
