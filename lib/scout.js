// lib/scout.js — the Board Scout: finds companies by starting from their JOB BOARDS instead of their names.
//
// 1) enumerate()  — Common Crawl's public index lists every Workday / Greenhouse / Ashby / SmartRecruiters / iCIMS
//                   job-board address it saw on the web (~10,000 boards per monthly crawl, read in seconds by
//                   downloading only the index slices for those sites: data.commoncrawl.org, no API server needed).
// 2) probe()      — for each board we don't already track: does it have US internships right now? Who is the
//                   employer? (real name from the board itself: Greenhouse board name, Workday/iCIMS "hiring
//                   organization", SmartRecruiters company name.)
// 3) the result goes to the Company Finder as a candidate with the board link as its hint — the finder still runs
//    its normal proof check before anything goes live.
// Runs on GitHub Actions (scripts/board-scout.mjs); nothing here needs database access.
import zlib from "node:zlib";
import { get, postJson, mapLimit } from "./http.js";
import { extractStates } from "./filter.js";
import { classify } from "./filter.js";
import { isInternship, isEarlyCareer, isHourlyRole, fieldOf } from "./fields.js";
import { normName } from "./simplify.js";
import { icimsSearchUrl, parseIcimsPage } from "./fetchers/icims.js";
import { jibeUrl, parseJibe, parsePaylocity, parseBamboo, bambooList, bambooInfo } from "./fetchers/more-boards.js";
import { ukgPage, parseUkg } from "./fetchers/taleo-ukg.js";

const CC = "https://data.commoncrawl.org/cc-index/collections";
const SKIP_COMPANY = /staffing|recruit(ing|ment|ers)?\b|talent solutions|universit|college|school district|\btest\b|demo|sandbox/i;
const SKIP_SITE = /^(robots|wday|login|search|en|es|fr|de|it|pt|ja|zh|nl|pl|[a-z]{2}-[a-z]{2})$/i;
const SKIP_INTERNAL = /internal|employee|alumni|private|staff|contractor|referral/i;

// ── 1) Enumerate boards from Common Crawl ───────────────────────────────────
const PREFIX = {
  workday: "com,myworkdayjobs,",
  greenhouse: "io,greenhouse,",
  ashby: "com,ashbyhq,jobs)",
  smartrecruiters: "com,smartrecruiters,jobs)",
  icims: "com,icims,",
  lever: "co,lever,jobs)",            // Nov 2026: jobs.lever.co/<company> — we already read Lever boards
  // Nov 2026: US payroll systems we already read. Their addresses are random IDs, so a board only goes live when the
  // company's own website links to that exact board (lib/discover.js verifyGuidBoard / verifyUkg).
  paylocity: "com,paylocity,recruiting)/",
  bamboohr: "com,bamboohr,",           // Nov 2026: {slug}.bamboohr.com/careers — the board names its company (company-info)
  ukg: "com,ultipro,",
  // taleo: "net,taleo," — tried Nov 2026: 542 Taleo sites in the crawl, but their pages never name the employer
  // ("Job Search"), so none could be proven. Taleo companies come in through their own careers pages instead.
};

export async function latestCrawls(n = 2) {
  const info = await (await get("https://index.commoncrawl.org/collinfo.json", { timeoutMs: 20000 })).json();
  return info.slice(0, n).map((c) => c.id);
}

async function crawlUrls(crawl, prefixes) {
  const base = `${CC}/${crawl}/indexes/`;
  const r = await get(base + "cluster.idx", { timeoutMs: 120000 });
  if (!r.ok) throw new Error(`cluster.idx ${crawl} → ${r.status}`);
  const lines = (await r.text()).split("\n").filter(Boolean);
  const keyOf = (l) => l.slice(0, l.indexOf(" "));
  const out = {};
  let skipped = 0;
  for (const [ats, p] of Object.entries(prefixes)) {
    // the block that starts just before the prefix, plus every block whose first key is inside it
    let lo = -1, hi = -1;
    for (let i = 0; i < lines.length; i++) { const k = keyOf(lines[i]); if (k < p) lo = i; else if (k.startsWith(p)) hi = i; else if (k > p) break; }
    if (lo < 0) continue;
    const urls = [];
    for (let i = lo; i <= Math.max(lo, hi); i++) {
      const [, file, off, len] = lines[i].split("\t");
      // Common Crawl sometimes answers a slice with an error page (rate limit) → retry, then skip that slice, never crash the run
      let text = null;
      for (let attempt = 0; attempt < 3 && text === null; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 4000 * attempt));
        try {
          const g = await get(base + file, { timeoutMs: 60000, headers: { Range: `bytes=${off}-${+off + +len - 1}` } });
          if (!g.ok) continue;
          text = zlib.gunzipSync(Buffer.from(await g.arrayBuffer())).toString();
        } catch { /* bad slice — try again */ }
      }
      if (text === null) { skipped++; continue; }
      for (const l of text.split("\n")) {
        if (!l.startsWith(p)) continue;
        const j = l.indexOf("{"); if (j < 0) continue;
        // BambooHR refuses Common Crawl's crawler (403s), but the address still tells us the board exists — we probe it ourselves
        try { const o = JSON.parse(l.slice(j)); if (/^(200|301|302)$/.test(String(o.status)) || ats === "bamboohr") urls.push(o.url); } catch { /* skip */ }
      }
    }
    out[ats] = urls;
  }
  if (skipped) console.warn(`[scout] ${crawl}: skipped ${skipped} index slices that would not download`);
  return out;
}

/** @returns Map boardKey → { ats, config, hint } */
export async function enumerate(crawls, only = null) {
  const boards = new Map();
  const add = (key, b) => { if (!boards.has(key)) boards.set(key, b); };
  const prefixes = only ? Object.fromEntries(Object.entries(PREFIX).filter(([k]) => only.includes(k))) : PREFIX;
  for (const crawl of crawls) {
    const urls = await crawlUrls(crawl, prefixes);
    const wdSites = new Map();                      // tenant → { wd, sites:Set }
    for (const u of urls.workday || []) {
      const m = u.match(/^https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Za-z]{2}\/)?([A-Za-z0-9_-]+)/i);
      if (!m || SKIP_SITE.test(m[3]) || SKIP_INTERNAL.test(m[3])) continue;
      const t = m[1].toLowerCase(); const e = wdSites.get(t) || { wd: m[2].toLowerCase(), sites: new Map() };
      const s = m[3]; if (!e.sites.has(s.toLowerCase())) e.sites.set(s.toLowerCase(), s);
      wdSites.set(t, e);
    }
    for (const [tenant, e] of wdSites) add(`workday:${tenant}`, { ats: "workday", tenant, wd: e.wd, sites: [...e.sites.values()] });
    for (const u of urls.greenhouse || []) {
      const m = u.match(/greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i);
      if (m && !/^(embed|job_board|v1|jobs|robots)$/i.test(m[1])) add(`greenhouse:${m[1].toLowerCase()}`, { ats: "greenhouse", token: m[1].toLowerCase() });
    }
    for (const u of urls.ashby || []) {
      const m = u.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i);
      if (m && !/^(api|robots\.txt)$/i.test(m[1])) { const t = decodeURIComponent(m[1]); add(`ashby:${t.toLowerCase()}`, { ats: "ashby", token: t }); }
    }
    for (const u of urls.smartrecruiters || []) {
      const m = u.match(/jobs\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/i);
      if (m && !/^(robots|oneclick-ui|sr-jobs|ni|api)$/i.test(m[1])) add(`smartrecruiters:${m[1].toLowerCase()}`, { ats: "smartrecruiters", token: m[1] });
    }
    for (const u of urls.lever || []) {
      const m = u.match(/jobs\.lever\.co\/([A-Za-z0-9_.-]+)/i);
      if (m && !/^(robots\.txt|favicon\.ico|static|assets|_next|api)$/i.test(m[1])) add(`lever:${m[1].toLowerCase()}`, { ats: "lever", token: m[1].toLowerCase() });
    }
    for (const u of urls.bamboohr || []) {
      const m = u.match(/^https?:\/\/([a-z0-9-]+)\.bamboohr\.com\/(careers|jobs)/i);
      if (m && !/^(www|api|help|marketplace|partners|resources|status)$/i.test(m[1])) add(`bamboohr:${m[1].toLowerCase()}`, { ats: "bamboohr", token: m[1].toLowerCase() });
    }
    for (const u of urls.paylocity || []) {
      const m = u.match(/recruiting\.paylocity\.com\/recruiting\/jobs\/(?:All|List)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) add(`paylocity:${m[1].toLowerCase()}`, { ats: "paylocity", token: m[1].toLowerCase() });
    }
    for (const u of urls.ukg || []) {
      const m = u.match(/(recruiting2?)\.ultipro\.com\/([A-Za-z0-9]+)\/JobBoard\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) add(`ukg:${m[2]}/${m[3]}`.toLowerCase(), { ats: "ukg", base: `https://${m[1].toLowerCase()}.ultipro.com/${m[2].toUpperCase()}/JobBoard/${m[3].toLowerCase()}` });
    }
    for (const u of urls.icims || []) {
      const m = u.match(/^https?:\/\/([a-z0-9-]+)\.icims\.com/i);
      if (m && !/^(www|login|cdn|assets|static|developer|community|marketing|jobs-?icims|careers|global)$/i.test(m[1]) && !SKIP_INTERNAL.test(m[1])) add(`icims:${m[1].toLowerCase()}`, { ats: "icims", sub: m[1].toLowerCase() });
    }
  }
  return boards;
}

// ── 2) Probe one board: US internships now? real employer name? ─────────────
const isUS = (loc) => !loc || /united states|\busa?\b|remote/i.test(loc) || extractStates(loc).length > 0;
const summarize = (rows) => {
  const interns = rows.filter((r) => isInternship(r.title) && isUS(r.loc));
  const me = interns.filter((r) => classify(r.title) === "me").length;
  const eng = interns.filter((r) => classify(r.title)).length;
  const fields = {}; for (const r of interns) { const f = fieldOf(r.title); fields[f] = (fields[f] || 0) + 1; }
  // Nov 13: entry-level jobs count too (medical assistant, bank teller, new grad…): a hospital with 40 of those and no
  // "intern" in any title is worth tracking now. A board needs ≥1 internship OR ≥2 entry-level jobs (see worth()).
  const early = rows.filter((r) => !isInternship(r.title) && (isEarlyCareer(r.title) || isHourlyRole(r.title)) && isUS(r.loc));   // + part-time & hourly (Nov 13)
  return { interns: interns.length, early: early.length, me, eng, fields, sample: interns.concat(early).slice(0, 3).map((r) => r.title) };
};
export const worth = (s) => !!s && (s.interns > 0 || (s.early || 0) >= 2);
// All majors (Nov 2026): rank by how many US internships the board has, with a small boost for engineering ones
// (the first audience). A bank with 12 internships now outranks a company with one generic engineering role.
export const scoutPriority = (s) => Math.min(90, 20 + 3 * Math.min(15, s.interns) + Math.min(20, s.early || 0) + (s.me ? 12 : 0) + (s.eng ? 6 : 0));
const json = async (u, opts = {}) => { const r = await get(u, { timeoutMs: 12000, headers: { Accept: "application/json" }, ...opts }); if (!r.ok) throw new Error(String(r.status)); return r.json(); };
// "3220 Analog Devices (Thailand) Co., Ltd." → "Analog Devices"; "ABA - American Bankers Association" → "American Bankers Association"
const LEGAL = /,?\s*\b(inc|incorporated|llc|l\.l\.c|ltd|limited|co\.?,?\s*ltd|corp|corporation|company|plc|lp|llp|gmbh|s\.?a|ag|n\.?a|u\.s\.a?|usa|us|holdings?|group)\.?\s*$/i;
export const decodeEntities = (s) => String(s || "").replace(/&reg;|&#174;/gi, "®").replace(/&trade;|&#8482;/gi, "™").replace(/&amp;/gi, "&").replace(/&#0?39;|&apos;|&rsquo;/gi, "'").replace(/&quot;/gi, '"').replace(/&nbsp;/gi, " ").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
export function cleanName(n) {
  let s = decodeEntities(n).replace(/\s+/g, " ").trim().replace(/\s*[®™©].*$/, "");   // "YellaWood® Pressure Treated Pine" → "YellaWood"
  s = s.replace(/^[A-Z]\d{2,6}\s+/, "");                                     // "U339 Alcon Vision" (Workday entity codes)
  s = s.replace(/,\s*the\b.*$/i, "");                                         // "MSA, The Safety Company" → "MSA"
  { const t = s.replace(/^\d{3,}\s*[-–:]?\s*(?!(st|nd|rd|th)\b)/i, "");     // "3220 Analog Devices" / "001-Dialysis Clinic" — but "1010 Games",
    if (t !== s && t.split(/\s+/).length >= 2) s = t; }                     // "11th Second" keep their number
  s = s.replace(/\s*\([^)]*\)/g, "");                                       // "(Thailand)", "(Corporate)"
  s = s.replace(/^(work (at|with|for)|careers? (at|with)|jobs at|join)\s+(the\s+)?/i, "").replace(/\s+team!?$/i, "").replace(/[!?]+$/, "");   // "Work at Simmons", "Join the Imagine team!"
  s = s.replace(/\s+(portal|external|public)$/i, "");                         // "Fenner Drives Portal"
  for (let i = 0; i < 2; i++) s = s.replace(/\s*\b(careers?( page| site)?|jobs( page)?|job board|hiring|talent acquisition|recruiting|recruitment|internships?|intern program|website|early careers|university recruiting|campus recruiting|uk|canada|emea)\b\s*$/i, "").trim();
  const parts = s.split(/\s+[-–|]\s+|-(?=\s*[A-Z][a-z]+,?\s+[A-Z]{2}\b)/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) s = /^[A-Z&.]{2,6}$/.test(parts[0]) && parts[1].length > parts[0].length ? parts[1] : parts[0];
  for (let i = 0; i < 3; i++) {
    const next = s.replace(LEGAL, "").replace(/[,.\s/\\-]+$/, "").trim();
    if (/^the\s/i.test(s) || !next) break;                                  // "The Nuclear Company" / "The Options Clearing Corporation" stay whole
    s = next;
  }
  // SHOUTING NAMES → normal capitals, but short acronyms stay ("HYDRIL USA DISTRIBUTION" → "Hydril USA Distribution")
  if (/\s/.test(s) && s === s.toUpperCase() && /[A-Z]{4,}/.test(s))
    s = s.split(/\s+/).map((w) => w.length <= 3 || !/^[A-Z]+$/.test(w) ? w : w[0] + w.slice(1).toLowerCase()).join(" ");
  // Workday tenant codes in front of a full name: "GAIC Great American Insurance" → "Great American Insurance"
  // (only when at least three capitalized words follow, so "BAE Systems" / "GE Aerospace" stay intact)
  const code = (s.match(/^([A-Z]{3,8})\s+[A-Z][a-z]/) || [])[1];
  if (code) {
    const initials = s.slice(code.length).trim().split(/\s+/).filter((w) => !/^(of|and|&|the)$/i.test(w)).map((w) => w[0]).join("").toUpperCase();
    if (initials.startsWith(code.slice(0, 3))) s = s.slice(code.length).trim();   // the code just abbreviates what follows
  }
  return s.slice(0, 80);
}

export async function probe(b) {
  if (b.ats === "greenhouse") {
    const d = await json(`https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs`);
    const s = summarize((d.jobs || []).map((j) => ({ title: j.title, loc: j.location?.name })));
    if (!worth(s)) return { ...s };
    const meta = await json(`https://boards-api.greenhouse.io/v1/boards/${b.token}`).catch(() => ({}));
    return { ...s, company: cleanName(meta.name), hint: `https://job-boards.greenhouse.io/${b.token}` };
  }
  if (b.ats === "ashby") {
    const d = await json(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(b.token)}?includeCompensation=false`);
    const s = summarize((d.jobs || []).filter((j) => j.isListed !== false).map((j) => ({ title: j.title, loc: [j.location, j.address?.postalAddress?.addressCountry].filter(Boolean).join(", ") })));
    if (!worth(s)) return { ...s };
    // Ashby's feed has no company name → use the board page's title ("Jobs at Acme" / "Acme Jobs")
    const page = await get(`https://jobs.ashbyhq.com/${encodeURIComponent(b.token)}`, { timeoutMs: 10000 }).then((r) => r.text()).catch(() => "");
    const t = (page.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
    const name = cleanName(t.replace(/^jobs at\s+/i, "").replace(/\s*[|–-].*$/, "").replace(/\s+jobs$/i, ""));
    return { ...s, company: name && !/^jobs?$/i.test(name) ? name : null, hint: `https://jobs.ashbyhq.com/${b.token}` };
  }
  if (b.ats === "lever") {
    const d = await json(`https://api.lever.co/v0/postings/${encodeURIComponent(b.token)}?mode=json`);
    const rows = (Array.isArray(d) ? d : []).map((j) => ({ title: j.text, loc: [j.categories?.location, j.country === "US" ? "United States" : j.country ? "abroad " + j.country : ""].filter(Boolean).join(", ") }));
    const s = summarize(rows);
    if (!worth(s)) return { ...s };
    // Lever's feed has no company name → the board page's title is the employer ("Acme" / "Acme - Jobs")
    const page = await get(`https://jobs.lever.co/${encodeURIComponent(b.token)}`, { timeoutMs: 10000 }).then((r) => r.text()).catch(() => "");
    const t = decodeEntities((page.match(/<title>([^<]+)<\/title>/i) || [])[1] || "");
    const name = cleanName(t.replace(/\s*[|–-]\s*(jobs|careers).*$/i, "").replace(/^jobs at\s+/i, ""));
    return { ...s, company: name && !/^(jobs?|lever)$/i.test(name) ? name : null, hint: `https://jobs.lever.co/${b.token}` };
  }
  if (b.ats === "smartrecruiters") {
    let d = await json(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(b.token)}/postings?q=intern&limit=100`);
    if (!(d.content || []).length) d = await json(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(b.token)}/postings?limit=100`).catch(() => d);
    const rows = (d.content || []).map((j) => ({ title: j.name, loc: j.location?.country === "us" ? (j.location?.fullLocation || "United States") : (j.location?.country ? "abroad " + j.location.country : "") , org: j.company?.name }));
    const s = summarize(rows);
    if (!worth(s)) return { ...s };
    return { ...s, company: cleanName(rows.map((r) => r.org).find(Boolean)), hint: `https://jobs.smartrecruiters.com/${b.token}` };
  }
  if (b.ats === "workday") {
    for (const site of b.sites.slice(0, 3)) {
      const api = `https://${b.tenant}.${b.wd}.myworkdayjobs.com/wday/cxs/${b.tenant}/${site}`;
      const r = await postJson(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset: 0, searchText: "intern" }, { timeoutMs: 12000 });
      if (!r.ok) continue;
      const d = await r.json();
      let posts = d.jobPostings || [];
      let s = summarize(posts.map((j) => ({ title: j.title, loc: [j.locationsText, j.externalPath].join(" ") })));
      // Nov 12: hospitals and schools hire students without the word "intern" ("Student Nurse", "Radiology Student Tech")
      if (!s.interns) {
        const r2 = await postJson(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset: 0, searchText: "student" }, { timeoutMs: 12000 }).catch(() => null);
        const p2 = r2?.ok ? ((await r2.json()).jobPostings || []) : [];
        const s2 = summarize(p2.map((j) => ({ title: j.title, loc: [j.locationsText, j.externalPath].join(" ") })));
        if (s2.interns) { posts = p2; s = s2; }
      }
      // Nov 13: still none → the newest jobs and an "assistant" search, for entry-level jobs (hospitals, banks, schools)
      if (!s.interns) {
        for (const q of ["", "assistant"]) {
          const r3 = await postJson(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset: 0, searchText: q }, { timeoutMs: 12000 }).catch(() => null);
          const p3 = r3?.ok ? ((await r3.json()).jobPostings || []) : [];
          const s3 = summarize(p3.map((j) => ({ title: j.title, loc: [j.locationsText, j.externalPath].join(" ") })));
          if ((s3.early || 0) > (s.early || 0)) { posts = p3; s = s3; }
          if (worth(s)) break;
        }
      }
      if (!worth(s)) { if (posts.length || d.total) return { ...s }; continue; }
      // Employer name: postings carry legal entities ("Baker Hughes Energy Services LLC"); keep the shortest leading
      // part that matches the board's own address ("bakerhughes" → "Baker Hughes"). If no posting's employer matches
      // the board, it's a parent company's shared portal → skip (the finder couldn't prove it anyway).
      let company = null; const orgs = [];
      for (const j of posts.filter((p) => isInternship(p.title) || isEarlyCareer(p.title) || isHourlyRole(p.title)).slice(0, 3)) {
        const dd = await json(`${api}${j.externalPath}`).catch(() => null);
        const org = cleanName(dd?.hiringOrganization?.name); if (org) orgs.push(org);
        company = brandFromEntity(org, b.tenant); if (company) break;
      }
      // Abbreviated board ("lmco", "mdlz"): accept only if every sampled job names the same employer
      if (!company && orgs.length >= 2 && orgs.every((o) => normName(o) === normName(orgs[0]))) company = orgs[0];
      return { ...s, company, hint: `https://${b.tenant}.${b.wd}.myworkdayjobs.com/${site}` };
    }
    return { interns: 0 };
  }
  if (b.ats === "bamboohr") {
    const d = await json(bambooList(b.token));
    const jobs = parseBamboo(d, b.token);
    // summarize() counts titles; BambooHR's own "Internship" employment type counts too
    const s = summarize(jobs.map((j) => ({ title: j.isIntern && !isInternship(j.title) ? j.title + " (Internship)" : j.title, loc: j.location })));
    if (!worth(s)) return { ...s };
    const info = await json(bambooInfo(b.token)).catch(() => null);
    return { ...s, company: cleanName(info?.result?.name) || null, hint: `https://${b.token}.bamboohr.com/careers` };
  }
  if (b.ats === "paylocity") {
    // The page title / module title names the employer ("Frasco Inc - Job Opportunities"); LogoHref is often their website
    const r = await paylocityGet(`https://recruiting.paylocity.com/recruiting/jobs/All/${b.token}`);
    if (r.status === 429) return { interns: 0, busy: true };          // rate-limited → not checked; next run tries again
    if (!r.ok) return { interns: 0 };
    const html = await r.text();
    const s = summarize(parsePaylocity(html).map((j) => ({ title: j.title, loc: j.location })));
    if (!worth(s)) return { ...s };
    let d = {}; try { d = JSON.parse((html.match(/window\.pageData\s*=\s*(\{.*?\});\s*(?:\n|<\/script>)/s) || [])[1] || "{}"); } catch {}
    const t = decodeEntities((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "").replace(/\s*-\s*Job Opportunities\s*$/i, "");
    return { ...s, company: cleanName(d.ModuleTitle || t) || null, domain: siteDomain(d.LogoHref), hint: `https://recruiting.paylocity.com/recruiting/jobs/All/${b.token}` };
  }
  if (b.ats === "ukg") {
    // UKG pages are built by script: no employer name in the page, but the header usually links to their website.
    // Name = that website's own title; the finder then needs that site to link back to this exact board.
    const d = await ukgPage({ base: b.base }, 0).catch(() => null);
    if (!d) return { interns: 0 };
    const s = summarize(parseUkg(d, { base: b.base }).map((j) => ({ title: j.title, loc: j.location })));
    if (!worth(s)) return { ...s };
    const page = await get(b.base + "/", { timeoutMs: 10000 }).then((r) => r.text()).catch(() => "");
    const site = [...page.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]).find((u) => !/ultipro|ukg|mozilla|google|microsoft|apple\.com|arcgis|transparency|bluelink|linkedin|facebook|twitter|instagram|youtube|glassdoor|indeed/i.test(u));
    const domain = siteDomain(site);
    if (!domain) return { ...s };
    const home = await get(`https://${domain}/`, { timeoutMs: 10000 }).then((r) => r.text()).catch(() => "");
    const og = decodeEntities((home.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,80})/i) || [])[1] || "");
    const ttl = decodeEntities((home.match(/<title[^>]*>([^<]{2,160})<\/title>/i) || [])[1] || "");
    const name = nameForSite([og, ttl], domain);
    return { ...s, company: name, domain, hint: b.base };
  }
  if (b.ats === "icims") {
    const base = `https://${b.sub}.icims.com`;
    const r = await get(icimsSearchUrl(base, "intern", 0), { timeoutMs: 12000 });
    if (!r.ok) return { interns: 0 };
    const html = await r.text();
    const moved = html.length < 2000 && (html.match(/top\.location\.href\s*=\s*['"]([^'"]+)['"]/i) || [])[1];
    if (moved) {                                  // newer iCIMS career site on the company's own domain
      const site = new URL(moved.replace(/\\\//g, "/")).origin;
      const d = await json(jibeUrl({ base: site }, "intern", 1)).catch(() => null);
      if (!d) return { interns: 0 };
      const { jobs } = parseJibe(d, { base: site });
      const s = summarize(jobs.map((j) => ({ title: j.title, loc: j.location })));
      if (!worth(s)) return { ...s };
      return { ...s, company: cleanName(jobs.map((j) => j.org).find(Boolean)), hint: site };
    }
    const { jobs } = parseIcimsPage(html, base);
    const s = summarize(jobs.map((j) => ({ title: j.title, loc: j.location })));
    if (!worth(s)) return { ...s };
    const t = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
    const m = t.match(/(?:job listings at|careers at|jobs at)\s+(.+)$/i) || t.match(/^(.+?)\s+(?:careers|jobs)\b/i);
    return { ...s, company: m ? cleanName(m[1]) : null, hint: base };
  }
  return { interns: 0 };
}

/** "Baker Hughes Energy Services" + tenant "bakerhughes" → "Baker Hughes"; null when the entity doesn't match the board */
// Paylocity answers 429 to anything faster than a trickle (98 of 100 parallel requests, Nov 2026): 2 at a time, spaced
// out, and a 429 waits and tries again twice.
let payActive = 0; const payWait = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function paylocityGet(url, { gapMs = 600, tries = 3 } = {}) {
  while (payActive >= 2) await new Promise((r) => payWait.push(r));
  payActive++;
  try {
    for (let i = 0; ; i++) {
      const r = await get(url, { timeoutMs: 12000 });
      if (r.status !== 429 || i >= tries - 1) { await sleep(gapMs); return r; }
      await sleep(Math.min(20000, (+r.headers.get("retry-after") || 0) * 1000 || 4000 * (i + 1)));
    }
  } finally { payActive--; const n = payWait.shift(); if (n) n(); }
}
/** "https://www.maxwellroofing.com/careers" → "maxwellroofing.com" (never a job-board or social site) */
export function siteDomain(u) {
  try { const h = new URL(String(u || "").trim()).hostname.toLowerCase().replace(/^www\./, "");
    return /\.[a-z]{2,}$/.test(h) && !/paylocity|ultipro|ukg|workday|greenhouse|lever\.co|icims|linkedin|facebook|indeed|glassdoor/.test(h) ? h : null; } catch { return null; }
}
/** A website's own title → company name, or null for bot walls / generic titles ("Attention Required!", "Just a moment…"). */
export function siteName(title) {
  const t = decodeEntities(title).replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
  if (!t || /attention required|just a moment|access denied|cloudflare|captcha|403|404|not found|forbidden|page not found|error|loading/i.test(t)) return null;
  const head = t.split(/\s+[|–—-]\s+|:\s+/)[0];
  const n = cleanName(head).replace(/\s*&\s*$/, "").trim();
  return n.length >= 2 && !/^(home|homepage|welcome|careers?|jobs?|official site|official website)$/i.test(n) ? n : null;
}
/** Pick the part of a site's name/title that matches its own address: "Geotechnical, Water… | GZA" + gza.com → "GZA".
 *  Accepts: address inside the name (mycanopy.org ↔ "Canopy Children's Solutions"), name inside the address, a shared
 *  first word (memorialohio.com ↔ "Memorial Health"), or initials (oco.org ↔ "Oswego County Opportunities"). Else null. */
export function nameForSite(titles, domain) {
  const label = normName(String(domain || "").split(".").slice(0, -1).join("").replace(/^www/, ""));
  if (label.length < 2) return null;
  for (const t of titles) {
    for (const seg of decodeEntities(t || "").replace(/[®™©]/g, "").split(/\s+[|–—-]\s+|:\s+|\s*\|\s*/)) {
      const n = siteName(seg); if (!n) continue;
      const k = normName(n), first = normName(n.split(/\s+/)[0]);
      const initials = n.split(/\s+/).filter((w) => !/^(of|and|&|the|for)$/i.test(w)).map((w) => w[0]).join("").toLowerCase();
      if ((label.length >= 3 && k.includes(label)) || (k.length >= 3 && label.includes(k)) || (first.length >= 4 && label.startsWith(first)) || (first.length >= 5 && label.includes(first)) || (initials.length >= 2 && initials === label)) return n;
    }
  }
  return null;
}
export function brandFromEntity(name, tenant) {
  const t = normName(tenant).replace(/careers?$|jobs$|external$/, "");
  const words = String(name || "").split(/\s+/).filter(Boolean);
  if (!words.length || t.length < 2) return null;
  for (let i = 1; i <= words.length; i++) {
    const n = normName(words.slice(0, i).join(" "));
    if (n === t || (t.length >= 4 && n.startsWith(t)) || (n.length >= 4 && t.startsWith(n) && i === words.length)) return words.slice(0, i).join(" ").replace(/[,.]+$/, "");
  }
  return null;
}

/** Probe many boards; returns candidates ready for the Company Finder (company name + board hint + priority). */
export async function scout(boards, { concurrency = 12, deadline = Infinity, onProgress } = {}) {
  const found = [], checked = [];
  let done = 0, busy = 0;
  // Paylocity gets its own slow lane (2 at a time) so its rate limit never ties up the workers for the other systems
  const one = async ([key, b]) => {
    if (Date.now() > deadline) return;
    let r;
    try { r = await probe(b); } catch (e) { r = { interns: 0, error: String(e.message || e).slice(0, 60) }; }
    if (r.busy) { busy++; return; }                                   // rate-limited: not marked checked, so it's retried
    checked.push(key);
    if (++done % 250 === 0 && onProgress) onProgress(done, found.length);
    if (!worth(r) || !r.company || !r.hint) return;
    if (SKIP_COMPANY.test(r.company) || normName(r.company).length < 2) return;
    if (/&$|^(all|all jobs|entry level|jobs|careers|lg)$/i.test(r.company.trim()) || normName(r.company).length < 3) return;   // not a clear employer name
    found.push({ key, ats: b.ats, company: r.company, hint: r.hint, domain: r.domain || null, priority: scoutPriority(r), interns: r.interns, early: r.early || 0, me: r.me, eng: r.eng, fields: r.fields, sample: r.sample });
  };
  const all = [...boards.entries()], slow = all.filter(([, b]) => b.ats === "paylocity"), fast = all.filter(([, b]) => b.ats !== "paylocity");
  await Promise.all([mapLimit(fast, concurrency, one), mapLimit(slow, 2, one)]);
  return { found: found.sort((a, z) => z.priority - a.priority), checked, busy };
}
