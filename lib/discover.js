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

export const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

// Job systems we can recognize but don't scrape yet — logged so we know which scraper unlocks the most companies.
const UNSUPPORTED = [
  [/[a-z0-9-]+\.icims\.com/i, "iCIMS"],
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
  [/bamboohr\.com/i, "BambooHR"],
  [/applytojob\.com|jazzhr/i, "JazzHR"],
  [/paycomonline\.net/i, "Paycom"],
  [/career\d*\.successfactors\.(com|eu)\/career/i, "SuccessFactors (native)"],
  [/amazon\.jobs/i, "Amazon Jobs"],
];

const LINK_HINT = /career|job|opening|position|search|student|universit|intern|early|graduate|join|opportunit/i;
const LINK_SKIP = /login|signin|sign-in|privacy|cookie|benefit|blog|news|press|investor|linkedin|facebook|twitter|instagram|youtube|glassdoor|\.pdf($|\?)|mailto:|tel:|javascript:/i;

/** Find job boards, unsupported systems, and follow-up links in a page (or in a plain URL string). */
export function scanHtml(html, pageUrl) {
  const text = String(html || "");
  const boards = [];
  const seen = new Set();
  const add = (b) => { const k = b.ats + "|" + JSON.stringify(b.config).toLowerCase(); if (!seen.has(k)) { seen.add(k); boards.push(b); } };

  for (const m of text.matchAll(/https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([A-Za-z0-9_-]+)/g)) {
    const [, tenant, wd, site] = m;
    if (/^(wday|job|login)$/i.test(site) || /internal|employee|alumni/i.test(site)) continue;
    add({ ats: "workday", config: { host: `${tenant}.${wd}.myworkdayjobs.com`, tenant, site } });
  }
  for (const m of text.matchAll(/https?:\/\/(wd\d+)\.myworkdaysite\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?recruiting\/([a-z0-9_-]+)\/([A-Za-z0-9_-]+)/gi)) {
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
    if (!sub || /^(www|login|cdn|assets|static|developer|community|marketing|jobs-?icims)$/.test(sub)) continue;
    add({ ats: "icims", config: { base: `https://${sub}.icims.com` } });
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
  if (!proof && key.length >= 3) {
    const sample = [...internPosts, ...(d.jobPostings || [])].filter((j) => j.externalPath).slice(0, 3);
    for (const j of sample) {
      try {
        const g = await get(`${api}${j.externalPath}`, { headers: { Accept: "application/json" }, timeoutMs: 6000 });
        if (!g.ok) continue;
        const dd = await g.json();
        const org = dd.hiringOrganization?.name || "";
        if (nameMatch(org, key)) { proof = `postings list "${org}" as employer`; break; }
        if (key.length >= 4 && nameMatch(dd.jobPostingInfo?.jobDescription, key)) { proof = "postings name the company"; break; }
      } catch { /* try next */ }
    }
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
  const url = ats === "greenhouse"
    ? `https://boards-api.greenhouse.io/v1/boards/${cfg.token}/jobs`
    : `https://api.lever.co/v0/postings/${cfg.token}?mode=json`;
  const r = await get(url, { timeoutMs: 8000, headers: { Accept: "application/json" } });
  if (!r.ok) return { ok: false, why: `${ats} board "${cfg.token}" answered ${r.status}` };
  const d = await r.json();
  const jobs = ats === "greenhouse" ? (d.jobs || []) : (Array.isArray(d) ? d : []);
  const key = norm(c.key);
  let proof = own ? "linked from their own careers site" : null;
  if (!proof && key.length >= 4 && norm(cfg.token).includes(key)) proof = `board name "${cfg.token}" matches`;
  if (!proof) return { ok: false, identityFailed: true, why: `Found ${ats} board "${cfg.token}" but couldn't prove it's ${c.company}` };
  const titles = jobs.map((j) => j.title || j.text || "");
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
      const lr = await get(`https://api.lever.co/v0/postings/${token}?mode=json`, { timeoutMs: 5000, headers: { Accept: "application/json" } });
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
  const { jobs } = parseIcimsPage(html, cfg.base);
  let any = jobs.length;
  if (!any) {
    const r2 = await get(icimsSearchUrl(cfg.base, "", 0), { timeoutMs: 8000 });
    if (r2.ok) any = parseIcimsPage(await r2.text(), cfg.base).jobs.length;
  }
  if (!any) return { ok: false, why: `iCIMS ${hostOf(cfg.base)} returned no jobs` };
  const key = norm(c.key);
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
  let proof = own ? "linked from their own careers site" : null;
  if (!proof && key.length >= 4 && norm(hostOf(cfg.base).replace(/\.icims\.com$/, "").replace(/^(careers|jobs|uscareers|external)-?/, "")).includes(key)) proof = "site address matches";
  if (!proof && key.length >= 4 && nameMatch(title, key)) proof = "page title matches";
  if (!proof) return { ok: false, identityFailed: true, why: `Found iCIMS site ${cfg.base} but couldn't prove it's ${c.company}` };
  return { ok: true, internCount: jobs.filter((j) => INTERN_TITLE.test(j.title)).length, why: `iCIMS ${hostOf(cfg.base)} · ${proof}` };
}

function verify(b, c) {
  if (b.ats === "icims") return verifyIcims(b.config, c, b.own);
  if (b.ats === "workday") return verifyWorkday(b.config, c, b.own);
  if (b.ats === "successfactors") return verifySuccessFactors(b.config, c, b.own);
  return verifyJsonBoard(b.ats, b.config, c, b.own);
}

/**
 * Discover one company. Returns { status, ats?, config?, detail, intern_count? }
 * status: live | identity_failed | unsupported | blocked | board_error | no_board | no_domain
 */
export async function discoverOne(c, { deadline = Date.now() + 25000 } = {}) {
  if (!c.domain && !c.hint) return { status: "no_domain", detail: "No website on file — add one to the candidate list" };

  const boards = [];
  const unsupported = new Set();
  let blocked = 0, reached = 0;
  const visited = new Set();
  const addBoards = (list, own) => list.forEach((b) => boards.push({ ...b, own }));

  // A hint can itself be a board URL (no fetch needed)
  if (c.hint) addBoards(scanHtml(c.hint, null).boards, false);

  const visit = async (url, own) => {
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
    return own ? s.links.filter((l) => isOwn(l, c.domain)) : [];
  };

  const starts = [];
  if (c.hint && !boards.length) starts.push(c.hint);
  if (c.domain) starts.push(`https://www.${c.domain}/careers`, `https://${c.domain}/careers`, `https://careers.${c.domain}`, `https://jobs.${c.domain}`);

  const level1 = await Promise.all(starts.map((u) => visit(u, isOwn(u, c.domain))));
  if (!boards.length) {
    const next = [...new Set(level1.flat())].filter((l) => !visited.has(l)).slice(0, 6);
    for (let i = 0; i < next.length && Date.now() < deadline; i += 3) {
      await Promise.all(next.slice(i, i + 3).map((u) => visit(u, true)));
      if (boards.length) break;
    }
  }

  // Try boards in order: own-site first, then the ones we scrape best
  const rank = { workday: 0, successfactors: 1, greenhouse: 2, lever: 3, icims: 4 };
  const uniq = [];
  const seen = new Set();
  for (const b of boards.sort((a, z) => (z.own - a.own) || (rank[a.ats] - rank[z.ats]))) {
    const k = b.ats + JSON.stringify(b.config).toLowerCase();
    if (!seen.has(k)) { seen.add(k); uniq.push(b); }
  }

  const notes = [];
  let identityFailed = null;
  for (const b of uniq.slice(0, 4)) {
    if (Date.now() > deadline + 8000) break;
    try {
      const v = await verify(b, c);
      if (v.ok) {
        const { apiBase, jobBase, ...rest } = b.config;
        const config = { ...rest, ...(apiBase ? { apiBase, jobBase } : {}) };
        return { status: "live", ats: b.ats, config, intern_count: v.internCount, detail: v.why };
      }
      if (v.identityFailed && !identityFailed) identityFailed = v.why;
      notes.push(v.why);
    } catch (e) {
      notes.push(`${b.ats} check failed: ${String(e.message || e).slice(0, 80)}`);
    }
  }

  if (identityFailed) return { status: "identity_failed", detail: identityFailed };
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
