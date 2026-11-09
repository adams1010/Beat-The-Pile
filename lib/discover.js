// lib/discover.js — finds a company's real job board and PROVES it belongs to that company
// before it's allowed to go live. Anything we can't prove is logged with a reason, never shown.
//
// Proof (any one is enough):
//   • the board link was found on the company's own website (e.g. corning.com/careers → corning.wd1.myworkdayjobs.com)
//   • the board's own name matches (Workday tenant "corning", SuccessFactors host "careers.bwxt.com")
//   • the board's postings name the company as the hiring organization
import { get, postJson } from "./http.js";
import { findInternFacets } from "./fetchers/workday.js";
import { parseSearchPage } from "./fetchers/successfactors.js";
import { parseIcimsPage, icimsSearchUrl } from "./fetchers/icims.js";
import { taleoPortal, taleoSearch, parseTaleo, ukgPage, parseUkg } from "./fetchers/taleo-ukg.js";
import { oracleSearchUrl, parseOracle, parsePaylocity, adpApi, parseAdp, pcsxUrl, parsePcsx, jibeUrl, parseJibe } from "./fetchers/more-boards.js";

export const norm = (s) => String(s || "").replace(/&amp;/gi, "&").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const decode = (s) => String(s || "").replace(/&amp;/gi, "&").replace(/&#0?39;|&apos;/gi, "'").replace(/&quot;/gi, '"');
// A board whose OWN official name (Greenhouse board name, Ashby page title) is the company's name proves itself
const sameName = (a, b) => { const x = norm(String(a).replace(/\b(inc|llc|ltd|corp|corporation|company|co|group|the|careers?|jobs)\b\.?/gi, "")), y = norm(String(b).replace(/\b(inc|llc|ltd|corp|corporation|company|co|group|the)\b\.?/gi, "")); return x.length >= 2 && (x === y || (y.length >= 4 && x.startsWith(y))); };
const firstWord = (s) => norm(String(s).split(/[\s&,.-]+/).find((w) => w && !/^the$/i.test(w)) || "");
/** Does `text` name the company? Long keys may appear inside a run-together name ("stanleyblackdecker");
 *  short keys (abb, hii, wsp) must be a whole word so "abb" never matches "Fabbricato". */
export function nameMatch(text, key) {
  key = norm(key);
  if (!key) return false;
  const t = String(text || "").toLowerCase();
  if (key.length >= 5 && norm(t).includes(key)) return true;
  return t.split(/[^a-z0-9]+/).includes(key);
}
const INTERN_TITLE = /\b(intern|internship|co-?op)\b/i;

// ── Board-name proof, round 2 (Nov 2026) ────────────────────────────────────────────────────────────────────────
// 175 companies were stuck at "couldn't prove it's theirs", almost always because OUR name for the company carried
// extra words ("Parexel Clinical Research" vs board "parexel") or the board used initials ("tri" = Toyota Research
// Institute). These three extra rules stay strict: real mismatches seen in the data (CMW vs "christies", Applied Fluid
// Power vs "applied", CareBridge vs parent "elevancehealth") still fail. tests/discovery-test.mjs keeps both lists.
const GENERIC_FIRST = new Set(["applied", "american", "national", "general", "united", "advanced", "western", "eastern", "northern",
  "southern", "international", "global", "first", "great", "pacific", "atlantic", "central", "premier", "universal", "standard",
  "digital", "integrated", "precision", "superior", "allied", "summit", "pioneer", "liberty", "capital", "quality", "total",
  "smart", "green", "excel", "modern", "dynamic", "creative", "strategic", "professional", "technical", "industrial", "medical",
  "health", "energy", "power", "systems", "solutions", "services", "technologies", "engineering", "construction", "consulting"]);
const LEGAL_WORDS = /^(inc|llc|ltd|corp|corporation|company|co|group|the|of|and|for|holdings?|plc|lp|llp)$/i;
const BOARD_SUFFIX = /(llc|inc|corp|co|careers?|jobs|usa|us|group|global|hq|external|internships?|earlycareers|university)$/;
const words = (name) => decode(name).replace(/\([^)]*\)/g, " ").split(/[^A-Za-z0-9]+/).filter(Boolean);
/** "greif" for Greif Packaging: the first word, when it's distinctive enough to stand for the company (4+ letters, not generic). */
function leadWordOf(company) { const core = words(company).filter((w) => !LEGAL_WORDS.test(w)); const f = norm(core[0] || ""); return core.length >= 2 && f.length >= 4 && !GENERIC_FIRST.has(f) ? f : null; }

/** Extra ways a board name (Workday tenant, Greenhouse/Lever/Ashby token, Taleo tenant) can prove it's this company. */
export function boardNameProof(token, company, onRename = null) {
  const t = norm(token), ws = words(company);
  if (t.length < 3 || !ws.length) return null;
  const core = ws.filter((w) => !LEGAL_WORDS.test(w));
  // 1) the distinctive first word: "parexel" ↔ Parexel Clinical Research (6+ letters, not a generic word, 2+ words)
  const first = norm(core[0] || ""), firstTwo = norm(core.slice(0, 2).join(""));
  const lead = core.length >= 2 && first.length >= 6 && !GENERIC_FIRST.has(first) && (t === first || t.replace(BOARD_SUFFIX, "") === first) ? core[0]
    : core.length >= 3 && firstTwo.length >= 9 && (t === firstTwo || t.replace(BOARD_SUFFIX, "") === firstTwo) ? core.slice(0, 2).join(" ") : null;
  if (lead) {
    // The board belongs to the whole organization ("Centerstone"), not just our longer name ("Centerstone of Tennessee"),
    // so its jobs are listed under the organization's name — never under a narrower name they may not belong to.
    if (onRename) onRename(lead);
    return `board name "${token}" is ${lead}'s (listed as ${lead})`;
  }
  // 2) initials: "tri" ↔ Toyota Research Institute, "cmt" ↔ Cambridge Mobile Telematics (3+ words, exact)
  // ALL-CAPS words count whole: "New York ISO" → "nyiso"
  const initials = core.map((w) => (/^[A-Z]{2,5}$/.test(w) ? w : w[0]).toLowerCase()).join("");
  if (core.length >= 3 && initials.length >= 3 && (t === initials || t.replace(BOARD_SUFFIX, "") === initials)) return `board name "${token}" is ${company}'s initials`;
  // 3) the name plus a routine suffix: "atcllc" ↔ ATC, "lkqcorp" ↔ LKQ
  const whole = norm(core.join(""));
  if (whole.length >= 3 && t !== whole && t.startsWith(whole) && BOARD_SUFFIX.test(t) && t.replace(BOARD_SUFFIX, "") === whole) return `board name "${token}" is ${company} + "${t.slice(whole.length)}"`;
  return null;
}

/** A company we only know by name (its old job-board link died): try its obvious website, and only accept it when the
 *  home page plainly carries the company's FULL name ("Aprio | …" for Aprio) and isn't a parked/for-sale domain. */
export async function guessDomain(company) {
  const core = words(company).filter((w) => !LEGAL_WORDS.test(w));
  const full = norm(core.join(""));
  if (full.length < 4) return null;
  // Nov 9: + .org / .net / .us (nonprofits, clinics, schools) and the bare domain when www doesn't answer. Same proof: the page
  // must carry the company's full name, and a board only goes live if that site links to it.
  const doms = [...new Set([`${full}.com`, `${norm(words(company).join(""))}.com`, `${full}.org`, `${full}.net`, `${full}.us`, `${full}.ai`, `${full}.io`, `${full}.co`])];
  const t0 = Date.now();
  for (const d of doms) {
    if (Date.now() - t0 > 20000) break;                      // never eat the whole company's time budget
    try {
      let r = await get(`https://www.${d}/`, { timeoutMs: 6000 }).catch(() => null);
      if (!r || !r.ok) r = await get(`https://${d}/`, { timeoutMs: 6000 }).catch(() => null);
      if (!r || !r.ok) continue;
      const html = (await r.text()).slice(0, 60000);
      const name = [(html.match(/<title>([^<]*)<\/title>/i) || [])[1], (html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i) || [])[1]].filter(Boolean).join(" ");
      if (/for sale|parked|buy this domain|domain (is|may be) for|godaddy|sedo|hugedomains|dan\.com/i.test(name + html.slice(0, 4000))) continue;
      if (norm(decode(name)).includes(full)) return d;
    } catch { /* next */ }
  }
  return null;
}

// Job systems we can recognize but don't scrape yet — logged so we know which scraper unlocks the most companies.
const UNSUPPORTED = [
  [/\.icims\.com/i, "iCIMS"],   // literal on purpose: "[a-z0-9-]+\.icims" took 110s on a page with an embedded image
  [/oraclecloud\.com\/hcmUI|\/hcmUI\/CandidateExperience/i, "Oracle"],
  [/brassring\.com|sjobs\.brassring/i, "BrassRing"],
  [/taleo\.net/i, "Taleo"],
  [/eightfold\.ai/i, "Eightfold"],
  [/avature\.net/i, "Avature"],
  [/smartrecruiters\.com/i, "SmartRecruiters"],
  [/jobvite\.com/i, "Jobvite"],
  [/ashbyhq\.com/i, "Ashby"],
  [/ultipro\.com|ukg\.net/i, "UKG"],
  [/paylocity\.com/i, "Paylocity"],
  [/workforcenow\.adp\.com|recruiting\.adp\.com|myjobs\.adp\.com/i, "ADP"],
  [/dayforcehcm\.com/i, "Dayforce"],
  [/applytojob\.com|jazzhr/i, "JazzHR"],
  [/paycomonline\.net/i, "Paycom"],
  [/career\d*\.successfactors\.(com|eu)\/career/i, "SuccessFactors (native)"],
  [/amazon\.jobs/i, "Amazon Jobs"],
];

const LINK_HINT = /career|job|opening|position|search|student|universit|intern|early|graduate|join|opportunit/i;
const LINK_SKIP = /login|signin|sign-in|privacy|cookie|benefit|blog|news|press|investor|linkedin|facebook|twitter|instagram|youtube|glassdoor|\.pdf($|\?)|mailto:|tel:|javascript:/i;

/** Find job boards, unsupported systems, and follow-up links in a page (or in a plain URL string). */
export function scanHtml(html, pageUrl) {
  // Careers sites built on Phenom etc. embed their real job-board links inside JSON ("https:\/\/abb.wd3…") — unescape them
  const raw = String(html || "");
  const text = raw.includes("\\/") ? raw + "\n" + raw.replace(/\\\//g, "/") : raw;
  const boards = [];
  const seen = new Set();
  const add = (b) => { const k = b.ats + "|" + JSON.stringify(b.config).toLowerCase(); if (!seen.has(k)) { seen.add(k); boards.push(b); } };

  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Za-z]{2}\/)?([A-Za-z0-9_-]+)/g)) {
    const [, tenant, wd, site] = m;
    if (/^(wday|job|login)$/i.test(site) || /internal|employee|alumni/i.test(site)) continue;
    add({ ats: "workday", config: { host: `${tenant}.${wd}.myworkdayjobs.com`, tenant, site } });
  }
  for (const m of text.matchAll(/https?:\/\/(wd\d+)\.myworkdaysite\.com\/(?:[a-z]{2}-[A-Za-z]{2}\/)?recruiting\/([a-z0-9_-]+)\/([A-Za-z0-9_-]+)/gi)) {
    const [, wd, tenant, site] = m;
    if (/internal|employee|alumni/i.test(site)) continue;
    const host = `${wd}.myworkdaysite.com`;
    add({ ats: "workday", config: { host, tenant, site, apiBase: `https://${host}/wday/cxs/${tenant}/${site}`, jobBase: `https://${host}/en-US/recruiting/${tenant}/${site}` } });
  }
  for (const m of text.matchAll(/(?:boards|job-boards)(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/|embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/gi)) {
    const token = m[1].toLowerCase();
    if (!["embed", "v1", "js"].includes(token)) add({ ats: "greenhouse", config: { token } });
  }
  for (const m of text.matchAll(/jobs\.lever\.co\/([a-z0-9_-]+)/gi)) add({ ats: "lever", config: { token: m[1].toLowerCase() } });

  for (const m of text.matchAll(/https?:\/\/((?:careers|jobs|uscareers|external|careers-)?[a-z0-9-]*)\.icims\.com/gi)) {
    const sub = m[1].toLowerCase();
    if (!sub || /^(www|login|cdn|assets|static|developer|community|marketing|jobs-?icims)$/.test(sub) || /internal|employee|alumni/.test(sub)) continue;
    add({ ats: "icims", config: { base: `https://${sub}.icims.com` } });
  }

  // Workable (Nov 9): apply.workable.com/{slug} or {slug}.workable.com
  for (const m of text.matchAll(/https?:\/\/(?:apply\.workable\.com\/(?!api\b|j\b)([a-z0-9-]{2,60})|([a-z0-9-]{2,60})\.workable\.com)/gi)) {
    const slug = (m[1] || m[2] || "").toLowerCase();
    if (slug && !/^(www|apply|api|help|resources|status|jobs|careers|blog|marketing)$/.test(slug)) add({ ats: "workable", config: { token: slug } });
  }
  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+)\.bamboohr\.com\/(?:careers|jobs)/gi)) {
    if (!/^(www|api|help|marketplace|partners|resources|status)$/i.test(m[1])) add({ ats: "bamboohr", config: { token: m[1].toLowerCase() } });
  }
  for (const m of text.matchAll(/(?:jobs\.ashbyhq\.com|api\.ashbyhq\.com\/posting-api\/job-board)\/([A-Za-z0-9._-]+)/g)) {
    if (!/^(api|embed|posting-api)$/i.test(m[1])) add({ ats: "ashby", config: { token: m[1] } });
  }
  for (const m of text.matchAll(/(?:jobs|careers)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/g)) {
    if (!/^(oneclick-ui|sr-jobs|ajax|static|api|my-applications|job|jobs|company|companies|careers|search|en|login)$/i.test(m[1])) add({ ats: "smartrecruiters", config: { token: m[1] } });
  }
  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)*\.oraclecloud\.com)\/hcmUI\/CandidateExperience\/[a-z]{2}(?:-[A-Za-z]{2})?\/sites\/([A-Za-z0-9_]+)/gi)) {
    add({ ats: "oracle", config: { host: m[1].toLowerCase(), site: m[2] } });
  }
  // Taleo Enterprise career sections (Taleo Business Edition — *.tbe.taleo.net — is a different system and isn't matched)
  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+)\.taleo\.net\/careersection\/([A-Za-z0-9_.]+)\/(?:jobsearch|moresearch|jobdetail|mysearches)\.ftl/gi)) {
    if (/^(rest|iam)$/i.test(m[2]) || /internal|employee|intern_only/i.test(m[2])) continue;
    add({ ats: "taleo", config: { host: (m[1] + ".taleo.net").toLowerCase(), section: m[2] } });
  }
  // UKG (UltiPro) job boards: recruiting(2).ultipro.com/{TENANT}/JobBoard/{guid}
  for (const m of text.matchAll(/https?:\/\/(recruiting2?\.ultipro\.com)\/([A-Za-z0-9]+)\/JobBoard\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)) {
    add({ ats: "ukg", config: { base: `https://${m[1].toLowerCase()}/${m[2].toUpperCase()}/JobBoard/${m[3].toLowerCase()}` } });
  }
  for (const m of text.matchAll(/recruiting\.paylocity\.com\/recruiting\/jobs\/(?:All|List)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)) {
    add({ ats: "paylocity", config: { token: m[1].toLowerCase() } });
  }
  for (const m of text.matchAll(/workforcenow\.adp\.com\/mascsr\/default\/mdf\/recruitment\/recruitment\.html\?(?:[^"'\s<>]*?&(?:amp;)?)?cid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)) {
    add({ ats: "adp", config: { token: m[1].toLowerCase() } });
  }
  // Oracle on the company's own address (careers.ti.com): the page names its Oracle host + site in data attributes
  {
    const api = text.match(/(?:data-)?apibaseurl=["']https?:\/\/([a-z0-9.-]+\.oraclecloud\.com)/i);
    const site = text.match(/data-sitenumber=["']([A-Za-z0-9_]+)["']/i) || text.match(/\bsitenumber=["']([A-Za-z0-9_]+)["']/i);
    if (api && site) add({ ats: "oracle", config: { host: api[1].toLowerCase(), site: site[1] } });
  }
  const efWithDomain = new Set();
  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+\.eightfold\.ai)\/careers[^"'\s<>]*?[?&](?:amp;)?domain=([a-z0-9.-]+)/gi)) {
    add({ ats: "eightfold", config: { host: m[1].toLowerCase(), domain: m[2].toLowerCase() } }); efWithDomain.add(m[1].toLowerCase());
  }
  // lockheedmartin.eightfold.ai/careers (no ?domain=) → the company's own domain is filled in at proof time
  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+)\.eightfold\.ai\/careers/gi)) {
    const host = (m[1] + ".eightfold.ai").toLowerCase();
    if (m[1].toLowerCase() !== "app" && !efWithDomain.has(host)) add({ ats: "eightfold", config: { host, domain: null } });
  }
  // Jibe = iCIMS's newer career site on the company's own domain (careers.mcdean.com) — reads /api/jobs
  if (pageUrl && /data-jibe-search-version|jibecdn\.com|jibe-search/i.test(text)) {
    try { add({ ats: "jibe", config: { base: new URL(pageUrl).origin } }); } catch { /* bad url */ }
  }

  if (pageUrl && /rmkcdn\.successfactors\.com|jobs2web|class="jobTitle-link|class="data-row/i.test(text)) {
    try { add({ ats: "successfactors", config: { base: new URL(pageUrl).origin } }); } catch { /* bad url */ }
  }

  const unsupported = new Set();
  for (const [re, name] of UNSUPPORTED) if (re.test(text) || re.test(pageUrl || "")) unsupported.add(name);

  const links = [];
  if (pageUrl) {
    for (const m of text.matchAll(/href=["']([^"'#\s]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
      const href = m[1], label = m[2].replace(/<[^>]+>/g, " ");
      if (LINK_SKIP.test(href)) continue;
      if (!LINK_HINT.test(href) && !LINK_HINT.test(label)) continue;
      try { links.push(new URL(href, pageUrl).toString()); } catch { /* skip */ }
    }
  }
  return { boards, unsupported: [...unsupported], links };
}

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };
export const isOwn = (url, domain) => { const h = hostOf(url); const d = String(domain || "").toLowerCase(); return !!d && (h === d || h.endsWith("." + d)); };

function looksBlocked(status, html) {
  if ([401, 403, 429].includes(status)) return true;
  return html.length < 25000 && /access denied|captcha|cf-chl|are you a robot|request unsuccessful|incapsula|pardon our interruption/i.test(html.slice(0, 6000));
}

async function fetchPage(url) {
  try {
    const r = await get(url, { timeoutMs: 6500, headers: { Accept: "text/html,application/xhtml+xml" } });
    const html = (await r.text()).slice(0, 1_500_000);
    return { url: r.url || url, status: r.status, html };
  } catch {
    return { url, status: 0, html: "" };
  }
}

// Jibe career site on the company's own domain. Proof: it's their own site, or the postings name them as employer.
async function verifyJibe(cfg, c, own) {
  const r = await get(jibeUrl(cfg, "intern", 1), { timeoutMs: 9000, headers: { Accept: "application/json" } });
  if (!r.ok) return { ok: false, why: `Career site ${hostOf(cfg.base)} answered ${r.status}` };
  let { jobs, total } = parseJibe(await r.json(), cfg);
  let sample = jobs;
  if (!jobs.length) { const r2 = await get(jibeUrl(cfg, "", 1), { timeoutMs: 9000, headers: { Accept: "application/json" } }); if (r2.ok) { const p = parseJibe(await r2.json(), cfg); sample = p.jobs; total = p.total; } }
  if (!sample.length) return { ok: false, why: `Career site ${hostOf(cfg.base)} returned no jobs` };
  const key = norm(c.key);
  let proof = own || isOwn(cfg.base, c.domain) ? "the company's own careers site" : null;
  if (!proof && sample.slice(0, 3).filter((j) => nameMatch(j.org || "", key)).length >= 2) proof = "postings name them as employer";
  if (!proof) return { ok: false, identityFailed: true, why: `Career site ${hostOf(cfg.base)} doesn't clearly belong to ${c.company}` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `iCIMS career site ${hostOf(cfg.base)} · ${proof}` };
}

// ── Proof checks per job system ──────────────────────────────────────────────
async function verifyWorkday(cfg, c, own) {
  const api = cfg.apiBase || `https://${cfg.host}/wday/cxs/${cfg.tenant}/${cfg.site}`;
  const r = await postJson(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset: 0, searchText: "" }, { timeoutMs: 8000 });
  if (!r.ok) return { ok: false, why: `Workday ${cfg.tenant}/${cfg.site} answered ${r.status}` };
  const d = await r.json();
  if (!d.total && !(d.jobPostings || []).length) return { ok: false, why: `Workday ${cfg.tenant}/${cfg.site} has no postings` };

  const facets = findInternFacets(d.facets);
  let internCount = 0, internPosts = [];
  const r2 = await postJson(`${api}/jobs`, Object.keys(facets).length
    ? { appliedFacets: facets, limit: 20, offset: 0, searchText: "" }
    : { appliedFacets: {}, limit: 20, offset: 0, searchText: "intern" }, { timeoutMs: 8000 });
  if (r2.ok) {
    const d2 = await r2.json();
    internPosts = Object.keys(facets).length ? (d2.jobPostings || []) : (d2.jobPostings || []).filter((j) => INTERN_TITLE.test(j.title));
    internCount = Object.keys(facets).length ? (d2.total || internPosts.length) : internPosts.length;
  }

  const key = norm(c.key);
  let proof = own ? "linked from their own careers site" : null;
  if (!proof && key.length >= 4 && norm(cfg.tenant).includes(key)) proof = `board name "${cfg.tenant}" matches`;
  if (!proof && key.length === 3 && norm(cfg.tenant) === key) proof = `board name "${cfg.tenant}" matches`;   // abb ↔ ABB
  if (!proof) proof = boardNameProof(cfg.tenant, c.company, (n) => { c.renameTo = n; });
  if (!proof && key.length >= 3) {
    // The board's name doesn't match, so it may be a PARENT company's board (Hillphoenix → Dover) holding many
    // subsidiaries' jobs. Only accept it if most sampled postings name this company as the employer.
    const sample = [...internPosts, ...(d.jobPostings || [])].filter((j) => j.externalPath).slice(0, 3);
    let hits = 0, seen = 0, lastOrg = "";
    for (const j of sample) {
      try {
        const g = await get(`${api}${j.externalPath}`, { headers: { Accept: "application/json" }, timeoutMs: 6000 });
        if (!g.ok) continue;
        const dd = await g.json();
        seen++;
        const org = dd.hiringOrganization?.name || "";
        if (nameMatch(org, key) || (key.length >= 4 && nameMatch(dd.jobPostingInfo?.jobDescription, key))) { hits++; lastOrg = org; }
        else if (leadWordOf(c.company) && norm(org.replace(/\b(inc|llc|corp|corporation|company|co|ltd)\b\.?/gi, "")) === leadWordOf(c.company)) { hits++; lastOrg = org; c.renameTo = org.trim(); }
      } catch { /* try next */ }
    }
    if (seen && hits >= Math.max(1, Math.ceil(seen * 2 / 3))) proof = `${hits} of ${seen} sampled postings name ${lastOrg || c.company} as employer`;
  }
  if (!proof) return { ok: false, identityFailed: true, why: `Found Workday board ${cfg.tenant}/${cfg.site} but couldn't prove it's ${c.company}` };
  return { ok: true, internCount, why: `Workday ${cfg.tenant}/${cfg.site} · ${proof}` };
}

async function verifySuccessFactors(cfg, c, own) {
  const r = await get(`${cfg.base}/search/?q=intern`, { timeoutMs: 8000 });
  if (!r.ok) return { ok: false, why: `${cfg.base} search answered ${r.status}` };
  const html = await r.text();
  const jobs = parseSearchPage(html, cfg.base);
  let any = jobs.length;
  if (!any) {
    const r2 = await get(`${cfg.base}/search/?q=`, { timeoutMs: 8000 });
    if (r2.ok) any = parseSearchPage(await r2.text(), cfg.base).length;
  }
  if (!any) return { ok: false, why: `${cfg.base} looks like SuccessFactors but returned no jobs` };
  const key = norm(c.key);
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
  let proof = own ? "it's on their own domain" : null;
  if (!proof && nameMatch(hostOf(cfg.base).replace(/[.-]/g, " "), key)) proof = "site address matches";
  if (!proof && key.length >= 4 && nameMatch(title, key)) proof = "page title matches";
  if (!proof) return { ok: false, identityFailed: true, why: `Found SuccessFactors site ${cfg.base} but couldn't prove it's ${c.company}` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `SuccessFactors ${hostOf(cfg.base)} · ${proof}` };
}

async function verifyJsonBoard(ats, cfg, c, own) {
  const url = {
    greenhouse: `https://boards-api.greenhouse.io/v1/boards/${cfg.token}/jobs`,
    lever: `https://api.lever.co/v0/postings/${cfg.token}?mode=json&limit=100`,      // full feeds can be 6 MB → timed out
    ashby: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(cfg.token)}?includeCompensation=false`,
    smartrecruiters: `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(cfg.token)}/postings?limit=100`,
    bamboohr: `https://${cfg.token}.bamboohr.com/careers/list`,
    workable: `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(cfg.token)}`,
  }[ats];
  const r = await get(url, { timeoutMs: ats === "lever" ? 15000 : 8000, headers: { Accept: "application/json" } });
  if (!r.ok) return { ok: false, why: `${ats} board "${cfg.token}" answered ${r.status}` };
  const d = await r.json();
  const jobs = ats === "greenhouse" ? (d.jobs || []) : ats === "ashby" ? (d.jobs || []) : ats === "smartrecruiters" ? (d.content || []) : ats === "bamboohr" ? (d.result || []).map((j) => ({ title: j.jobOpeningName })) : ats === "workable" ? (d.jobs || []) : (Array.isArray(d) ? d : []);
  if (ats === "smartrecruiters" && !jobs.length) return { ok: false, why: `SmartRecruiters "${cfg.token}" has no postings` };
  const key = norm(c.key);
  let proof = own ? "linked from their own careers site" : null;
  if (!proof && key.length >= 4 && norm(cfg.token).includes(key)) proof = `board name "${cfg.token}" matches`;
  const fw = firstWord(c.company);
  if (!proof && fw.length >= 4 && norm(cfg.token) === fw) proof = `board name "${cfg.token}" matches`;          // gritt ↔ Gritt Robotics
  if (!proof && key.length === 3 && norm(cfg.token) === key) proof = `board name "${cfg.token}" matches`;        // CRB ↔ "CRB"
  if (!proof) proof = boardNameProof(cfg.token, c.company, (n) => { c.renameTo = n; });
  if (!proof && ats === "greenhouse") {
    const meta = await get(`https://boards-api.greenhouse.io/v1/boards/${cfg.token}`, { timeoutMs: 6000, headers: { Accept: "application/json" } }).then((x) => x.ok ? x.json() : null).catch(() => null);
    if (meta?.name && sameName(decode(meta.name), c.company)) proof = `board's own name is "${decode(meta.name)}"`;   // DLR ↔ "DLR Group"
  }
  if (!proof && ats === "ashby") {
    const page = await get(`https://jobs.ashbyhq.com/${encodeURIComponent(cfg.token)}`, { timeoutMs: 6000 }).then((x) => x.ok ? x.text() : "").catch(() => "");
    const t = decode((page.match(/<title>([^<]+)<\/title>/i) || [])[1] || "").replace(/^jobs at\s+/i, "").replace(/\s*[|–-].*$/, "").replace(/\s+jobs$/i, "");
    if (t && sameName(t, c.company)) proof = `board's own name is "${t}"`;
  }
  if (!proof && ats === "bamboohr") {             // the board's own registered company name ("The Academy of Alameda")
    const info = await get(`https://${cfg.token}.bamboohr.com/careers/company-info`, { timeoutMs: 6000, headers: { Accept: "application/json" } }).then((x) => x.ok ? x.json() : null).catch(() => null);
    const nm = decode(info?.result?.name || "");
    if (nm && sameName(nm, c.company)) proof = `board's own name is "${nm}"`;
  }
  if (!proof && ats === "workable") {             // the account's own registered name ("Hugging Face")
    const nm = decode(String(d?.name || ""));
    if (nm && sameName(nm, c.company)) proof = `board's own name is "${nm}"`;
  }
  if (!proof && ats === "smartrecruiters" && key.length >= 4) {
    const org = jobs.map((j) => j.company?.name).find(Boolean) || "";
    if (nameMatch(org, key)) proof = `postings list "${org}" as employer`;
  }
  if (!proof) return { ok: false, identityFailed: true, why: `Found ${ats} board "${cfg.token}" but couldn't prove it's ${c.company}` };
  const titles = jobs.map((j) => j.title || j.text || j.name || "");
  return { ok: true, internCount: titles.filter((t) => INTERN_TITLE.test(t)).length, why: `${ats} "${cfg.token}" · ${proof}` };
}

/**
 * Try "{name}" directly on Greenhouse and Lever. Proof is stricter than for linked boards because
 * nothing on the company's site pointed here:
 *   Greenhouse — the board's registered company name must match the FULL company name.
 *   Lever      — the token must be the full name AND a posting must name the company.
 */
export async function guessJsonBoards(c) {
  const key = norm(c.key);
  if (key.length < 4) return null;
  const tokens = [...new Set([key, norm(c.company)])].filter((t) => t.length >= 4);
  for (const token of tokens) {
    try {
      const meta = await get(`https://boards-api.greenhouse.io/v1/boards/${token}`, { timeoutMs: 5000, headers: { Accept: "application/json" } });
      if (meta.ok) {
        const m = await meta.json();
        // Full-name match: "Gecko Robotics" ≈ "Gecko Robotics, Inc." but "Scout RFP" ≠ "Scout Motors"
        const a = norm(m.name).replace(/(inc|llc|corp|corporation|company|co)$/,""), b = norm(c.company);
        if (a.length >= 4 && (a.includes(b) || b.includes(a))) {
          const jr = await get(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`, { timeoutMs: 6000, headers: { Accept: "application/json" } });
          const jobs = jr.ok ? ((await jr.json()).jobs || []) : [];
          return { status: "live", ats: "greenhouse", config: { token }, intern_count: jobs.filter((j) => INTERN_TITLE.test(j.title)).length,
                   detail: `greenhouse "${token}" · board registered to "${m.name}"` };
        }
      }
    } catch { /* next */ }
    try {
      const lr = await get(`https://api.lever.co/v0/postings/${token}?mode=json&limit=100`, { timeoutMs: 10000, headers: { Accept: "application/json" } });
      if (lr.ok) {
        const posts = await lr.json();
        if (Array.isArray(posts) && posts.length && token === norm(c.company) &&
            posts.slice(0, 5).some((p) => nameMatch(p.descriptionPlain || p.description || p.additionalPlain || "", key))) {
          return { status: "live", ats: "lever", config: { token }, intern_count: posts.filter((p) => INTERN_TITLE.test(p.text)).length,
                   detail: `lever "${token}" · postings name the company` };
        }
      }
    } catch { /* next */ }
  }
  return null;
}

async function verifyIcims(cfg, c, own) {
  const r = await get(icimsSearchUrl(cfg.base, "intern", 0), { timeoutMs: 8000 });
  if (!r.ok) return { ok: false, why: `iCIMS ${hostOf(cfg.base)} answered ${r.status}` };
  const html = await r.text();
  const moved = html.length < 2000 && (html.match(/(?:window\.)?top\.location\.href\s*=\s*['"]([^'"]+)['"]/i) || [])[1];
  if (moved) {
    const to = moved.replace(/\\\//g, "/");
    return { ok: false, moved: to, why: `iCIMS ${hostOf(cfg.base)} now sends visitors to ${hostOf(to)}` };
  }
  const { jobs } = parseIcimsPage(html, cfg.base);
  let any = jobs.length;
  if (!any) {
    const r2 = await get(icimsSearchUrl(cfg.base, "", 0), { timeoutMs: 8000 });
    if (r2.ok) any = parseIcimsPage(await r2.text(), cfg.base).jobs.length;
  }
  if (!any) return { ok: false, why: `iCIMS ${hostOf(cfg.base)} returned no jobs` };
  const key = norm(c.key);
  const title = decode((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "");
  // iCIMS portals are often shared by a parent company (Bahnson → EMCOR's portal), so a link from the
  // company's own site is NOT enough here: the portal's address or title must name the company itself.
  let proof = null;
  const sub = norm(hostOf(cfg.base).replace(/\.icims\.com$/, "").replace(/^(careers|jobs|uscareers|external)-?/, ""));
  if (key.length >= 4 && sub.includes(key)) proof = "site address matches";
  if (!proof && key.length === 3 && sub === key) proof = "site address matches";               // careers-mpr ↔ MPR
  // Short names must appear as a whole word in the title ("…(MBP)") — nameMatch enforces that
  if (!proof && key.length >= 3 && nameMatch(title, key)) proof = "page title matches";
  if (proof && own) proof += " + linked from their own careers site";
  if (!proof) return { ok: false, identityFailed: true, why: `iCIMS site ${hostOf(cfg.base)} ("${title.trim().slice(0, 60)}") doesn't name ${c.company} — likely a parent company's portal` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `iCIMS ${hostOf(cfg.base)} · ${proof}` };
}

async function verifyOracle(cfg, c, own) {
  const r = await get(oracleSearchUrl(cfg, "intern"), { timeoutMs: 9000, headers: { Accept: "application/json" } });
  if (!r.ok) return { ok: false, why: `Oracle ${cfg.host}/${cfg.site} answered ${r.status}` };
  const { jobs } = parseOracle(await r.json(), cfg);
  // Oracle addresses (xyz.fa.us2.oraclecloud.com) never name the company, so only a link from their own site proves it
  if (!own) return { ok: false, identityFailed: true, why: `Found Oracle board ${cfg.host}/${cfg.site} but it wasn't linked from ${c.company}'s own site` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `Oracle ${cfg.site} · linked from their own careers site` };
}

// Paylocity / ADP addresses are random IDs that never name the company → only a link from their own site proves it
async function verifyGuidBoard(ats, cfg, c, own) {
  let jobs = [];
  if (ats === "paylocity") {
    const r = await get(`https://recruiting.paylocity.com/recruiting/jobs/All/${cfg.token}`, { timeoutMs: 9000 });
    if (!r.ok) return { ok: false, why: `Paylocity board answered ${r.status}` };
    jobs = parsePaylocity(await r.text());
  } else {
    const r = await get(adpApi(cfg.token), { timeoutMs: 9000, headers: { Accept: "application/json" } });
    if (!r.ok) return { ok: false, why: `ADP board answered ${r.status}` };
    jobs = parseAdp(await r.json(), cfg.token);
  }
  if (!own) return { ok: false, identityFailed: true, why: `Found ${ats} board but it wasn't linked from ${c.company}'s own site` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `${ats === "adp" ? "ADP" : "Paylocity"} · linked from their own careers site` };
}

// Taleo: the address names the tenant (drhorton.taleo.net) → a name match proves it, like Workday; else an own-site link.
async function verifyTaleo(cfg, c, own) {
  const portal = await taleoPortal(cfg);
  const d = await taleoSearch(cfg, portal, "intern");
  let total = d.pagingData?.totalCount || 0;
  if (!total) total = (await taleoSearch(cfg, portal, "")).pagingData?.totalCount || 0;
  if (!total) return { ok: false, why: `Taleo ${cfg.host}/${cfg.section} has no postings` };
  const key = norm(c.key), tenant = cfg.host.split(".")[0];
  let proof = own ? "linked from their own careers site" : null;
  if (!proof && key.length >= 4 && norm(tenant).includes(key)) proof = `board name "${tenant}" matches`;
  if (!proof && key.length === 3 && norm(tenant) === key) proof = `board name "${tenant}" matches`;
  if (!proof) proof = boardNameProof(tenant, c.company, (n) => { c.renameTo = n; });
  if (!proof) return { ok: false, identityFailed: true, why: `Found Taleo board ${cfg.host}/${cfg.section} but couldn't prove it's ${c.company}` };
  cfg.portal = portal;                                                       // saved with the config → sync skips the page lookup
  return { ok: true, internCount: parseTaleo(d, cfg).filter((j) => INTERN_TITLE.test(j.title)).length, why: `Taleo ${tenant}/${cfg.section} · ${proof}` };
}

// UKG tenant codes (TRE1006TRCI) never name the company → only a link from their own site proves it.
async function verifyUkg(cfg, c, own) {
  const d = await ukgPage(cfg, 0);
  const jobs = parseUkg(d, cfg);
  if (!jobs.length) return { ok: false, why: `UKG board has no postings` };
  if (!own) return { ok: false, identityFailed: true, why: `Found UKG board but it wasn't linked from ${c.company}'s own site` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `UKG · linked from their own careers site` };
}

async function verifyEightfold(cfg, c, own) {
  if (!cfg.domain) cfg.domain = String(c.domain || "").toLowerCase() || null;      // link had no ?domain= → use the company's
  if (!cfg.domain) return { ok: false, why: `Eightfold ${cfg.host}: no company domain to look up` };
  let d = null;
  const r1 = await get(pcsxUrl(cfg, "intern", 0), { timeoutMs: 9000, headers: { Accept: "application/json" } });
  if (r1.ok) { const p = parsePcsx(await r1.json(), cfg); d = { positions: p.jobs.map((j) => ({ name: j.title })) }; }
  else {
    const r = await get(`https://${cfg.host}/api/apply/v2/jobs?domain=${encodeURIComponent(cfg.domain)}&query=intern&start=0&num=50`, { timeoutMs: 9000, headers: { Accept: "application/json" } });
    if (!r.ok) return { ok: false, why: `Eightfold ${cfg.host} answered ${r1.status} (new feed) / ${r.status} (old feed)` };
    d = await r.json();
  }
  const key = norm(c.key);
  let proof = own ? "linked from their own careers site" : null;
  if (!proof && key.length >= 4 && (norm(cfg.domain).includes(key) || norm(cfg.host.split(".")[0]).includes(key))) proof = `board for ${cfg.domain}`;
  if (!proof) return { ok: false, identityFailed: true, why: `Found Eightfold board for ${cfg.domain} but couldn't prove it's ${c.company}` };
  return { ok: true, internCount: (d.positions || []).filter((j) => INTERN_TITLE.test(j.name)).length, why: `Eightfold ${cfg.domain} · ${proof}` };
}

function verify(b, c) {
  if (b.ats === "icims") return verifyIcims(b.config, c, b.own);
  if (b.ats === "jibe") return verifyJibe(b.config, c, b.own);
  if (b.ats === "oracle") return verifyOracle(b.config, c, b.own);
  if (b.ats === "eightfold") return verifyEightfold(b.config, c, b.own);
  if (b.ats === "paylocity" || b.ats === "adp") return verifyGuidBoard(b.ats, b.config, c, b.own);
  if (b.ats === "workday") return verifyWorkday(b.config, c, b.own);
  if (b.ats === "taleo") return verifyTaleo(b.config, c, b.own);
  if (b.ats === "ukg") return verifyUkg(b.config, c, b.own);
  if (b.ats === "successfactors") return verifySuccessFactors(b.config, c, b.own);
  return verifyJsonBoard(b.ats, b.config, c, b.own);
}

/**
 * Discover one company. Returns { status, ats?, config?, detail, intern_count? }
 * status: live | identity_failed | unsupported | blocked | board_error | no_board | no_domain
 */
// Paylocity / UKG boards are random IDs: the board's own page names the employer (that's where Board Scout got the name),
// but only a link from the employer's website to THIS exact board proves it. No website on file → try their likely
// website; it still counts only if that site links to this exact board (two independent facts must agree).
const GUID_BOARD = /recruiting\.paylocity\.com\/recruiting\/jobs\/(?:All|List)\/[0-9a-f-]{36}|ultipro\.com\/[A-Za-z0-9]+\/JobBoard\/[0-9a-f-]{36}/i;
export async function discoverOne(c, opts = {}) {
  if (!c.domain && c.hint && GUID_BOARD.test(c.hint) && Date.now() < (opts.deadline || Infinity)) {
    const domain = await guessDomain(c.company).catch(() => null);
    if (domain) {
      const r = await discoverOnce({ ...c, domain }, opts);
      const hintKey = (c.hint.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [""])[0].toLowerCase();
      const sameBoard = r.status === "live" && JSON.stringify(r.config || {}).toLowerCase().includes(hintKey);
      if (sameBoard) return { ...r, domain, detail: `${r.detail || ""} · their website ${domain} links to this exact board`.trim() };
      return { status: "identity_failed", detail: `Board names ${c.company}, but ${domain} doesn't link to this exact board — held back` };
    }
    return { status: "identity_failed", detail: `Board names ${c.company}, but we couldn't find their website to confirm — held back` };
  }
  const r = await discoverOnce(c, opts);
  // Old job-board link is dead (company switched systems) and we have no website on file → find their website, start over
  if (!c.domain && c.hint && (r.status === "board_error" || r.status === "no_board") && /answered 40[34]|answered 410|no postings|Couldn't reach/i.test(r.detail || "")
      && Date.now() < (opts.deadline || Infinity)) {
    const domain = await guessDomain(c.company).catch(() => null);
    if (domain) {
      let r2 = await discoverOnce({ ...c, domain, hint: null }, opts);
      // A GUESSED website is weaker evidence than one on file: its link alone isn't enough — the board's own name must
      // match too (revolution.com linked to Stord's board → held back, Nov 2026).
      if (r2.status === "live") {
        const ids = [r2.config?.tenant, r2.config?.site, r2.config?.token, r2.config?.host?.split(".")[0], r2.config?.domain].filter(Boolean);
        const key = norm(c.key || c.company);
        if (!ids.some((x) => (key.length >= 4 && norm(x).includes(key)) || boardNameProof(x, c.company) || sameName(x, c.company)))
          r2 = { status: "identity_failed", detail: `Guessed website ${domain} links to board ${ids.join("/")}, whose name doesn't match ${c.company} — held back` };
      }
      // Only a guess that PASSED is saved as their website — otherwise the next check would treat our own guess as proof
      // (that's how Revolution got back onto Stord's board, Nov 2026).
      return { ...r2, ...(r2.status === "live" ? { domain } : {}), detail: `${r2.detail || ""} · old board link was dead; ${r2.status === "live" ? "found" : "guessed"} their website ${domain}`.trim() };
    }
  }
  return r;
}

async function discoverOnce(c, { deadline = Date.now() + 25000 } = {}) {
  if (!c.domain && !c.hint) return { status: "no_domain", detail: "No website on file — add one to the candidate list" };

  const boards = [];
  const unsupported = new Set();
  let blocked = 0, reached = 0;
  const visited = new Set();
  const addBoards = (list, own) => list.forEach((b) => boards.push({ ...b, own }));

  // A hint can itself be a board URL (no fetch needed)
  if (c.hint) addBoards(scanHtml(c.hint, null).boards, false);

  // followHost: also follow links that stay on this host (used for a pasted careers-site link like careers.abb)
  const visit = async (url, own, followHost = null) => {
    if (visited.has(url) || Date.now() > deadline) return [];
    visited.add(url);
    const p = await fetchPage(url);
    if (!p.status) return [];
    if (looksBlocked(p.status, p.html)) { blocked++; return []; }
    if (p.status >= 400) return [];
    reached++;
    const s = scanHtml(p.html, p.url);
    const s2 = scanHtml(p.url, p.url);                      // careers.x.com may redirect straight to the board
    addBoards([...s.boards, ...s2.boards], own);
    [...s.unsupported, ...s2.unsupported].forEach((u) => unsupported.add(u));
    const extra = [];
    // Phenom careers sites (careers.abb, pgcareers.com): the job-board links live on the search page
    if (/phenompeople/i.test(p.html)) {
      const base = (p.url.match(/^(https?:\/\/[^/]+\/[a-z-]{2,10}\/[a-z]{2})(?:\/|$)/i) || [])[1];
      if (base) extra.push(`${base}/search-results?keywords=intern`);
    }
    const keep = (l) => (own && isOwn(l, c.domain)) || (followHost && hostOf(l) === followHost);
    return [...extra, ...s.links.filter(keep)];
  };

  const starts = [];
  if (c.hint && !boards.length) starts.push(c.hint);
  if (c.domain) starts.push(`https://www.${c.domain}/careers`, `https://${c.domain}/careers`, `https://careers.${c.domain}`, `https://jobs.${c.domain}`);

  const level1 = await Promise.all(starts.map((u) => visit(u, isOwn(u, c.domain), u === c.hint ? hostOf(u) : null)));
  if (!boards.length) {
    const next = [...new Set(level1.flat())].filter((l) => !visited.has(l))
      .sort((a, b) => (/search|job|opening/i.test(b) ? 1 : 0) - (/search|job|opening/i.test(a) ? 1 : 0)).slice(0, 6);
    for (let i = 0; i < next.length && Date.now() < deadline; i += 3) {
      await Promise.all(next.slice(i, i + 3).map((u) => visit(u, isOwn(u, c.domain))));
      if (boards.length) break;
    }
  }

  // Try boards in order: own-site first, then the ones we scrape best
  const rank = { workday: 0, successfactors: 1, greenhouse: 2, lever: 3, icims: 4, jibe: 4, ashby: 5, smartrecruiters: 6, bamboohr: 6, workable: 6, oracle: 7, eightfold: 8, taleo: 8, paylocity: 9, adp: 10, ukg: 10 };
  const uniq = [];
  const seen = new Set();
  for (const b of boards.sort((a, z) => (z.own - a.own) || (rank[a.ats] - rank[z.ats]))) {
    const k = b.ats + JSON.stringify(b.config).toLowerCase();
    if (!seen.has(k)) { seen.add(k); uniq.push(b); }
  }

  const notes = [];
  let identityFailed = null;
  for (let i = 0; i < Math.min(uniq.length, 5); i++) {
    const b = uniq[i];
    if (Date.now() > deadline + 8000) break;
    try {
      c.renameTo = null;                                     // only the board that actually passes may rename
      const v = await verify(b, c);
      // An old iCIMS portal that now forwards to the company's new career site → check that site next
      if (v.moved && !uniq.some((x) => x.ats === "jibe" && x.config.base === new URL(v.moved).origin)) {
        try { uniq.splice(i + 1, 0, { ats: "jibe", config: { base: new URL(v.moved).origin }, own: isOwn(v.moved, c.domain) }); } catch { /* bad url */ }
      }
      if (v.ok) {
        const { apiBase, jobBase, ...rest } = b.config;
        const config = { ...rest, ...(apiBase ? { apiBase, jobBase } : {}) };
        if (c.renameTo) config.listAs = c.renameTo;           // jobs listed under the organization the board belongs to
        return { status: "live", ats: b.ats, config, intern_count: v.internCount, detail: v.why };
      }
      if (v.identityFailed && !identityFailed) identityFailed = v.why;
      notes.push(v.why);
    } catch (e) {
      notes.push(`${b.ats} check failed: ${String(e.message || e).slice(0, 80)}`);
    }
  }

  if (identityFailed) return { status: "identity_failed", detail: identityFailed };
  // Found a board we CAN read but it failed → say why (not "needs a new scraper", which sent us chasing the wrong fix)
  if (uniq.length && notes.length) return { status: "board_error", detail: notes.slice(0, 2).join(" · ").slice(0, 280) };
  if (unsupported.size) return { status: "unsupported", detail: `Uses ${[...unsupported].join(" / ")} — needs a new scraper` };

  // Last resort: startups often use Greenhouse/Lever under their own name, unlinked from static HTML.
  if (Date.now() < deadline + 5000) {
    const g = await guessJsonBoards(c);
    if (g) return g;
  }
  if (blocked && !reached) return { status: "blocked", detail: "Careers site blocks automated visits — check in the browser" };
  if (notes.length) return { status: "board_error", detail: notes.join("; ").slice(0, 300) };
  return { status: "no_board", detail: reached ? "Careers pages load but link to no job system we recognize" : "Couldn't reach a careers page" };
}
