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
import { isInternship, fieldOf } from "./fields.js";
import { normName } from "./simplify.js";
import { icimsSearchUrl, parseIcimsPage } from "./fetchers/icims.js";
import { jibeUrl, parseJibe } from "./fetchers/more-boards.js";

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
  for (const [ats, p] of Object.entries(prefixes)) {
    // the block that starts just before the prefix, plus every block whose first key is inside it
    let lo = -1, hi = -1;
    for (let i = 0; i < lines.length; i++) { const k = keyOf(lines[i]); if (k < p) lo = i; else if (k.startsWith(p)) hi = i; else if (k > p) break; }
    if (lo < 0) continue;
    const urls = [];
    for (let i = lo; i <= Math.max(lo, hi); i++) {
      const [, file, off, len] = lines[i].split("\t");
      const g = await get(base + file, { timeoutMs: 60000, headers: { Range: `bytes=${off}-${+off + +len - 1}` } });
      const text = zlib.gunzipSync(Buffer.from(await g.arrayBuffer())).toString();
      for (const l of text.split("\n")) {
        if (!l.startsWith(p)) continue;
        const j = l.indexOf("{"); if (j < 0) continue;
        try { const o = JSON.parse(l.slice(j)); if (/^(200|301|302)$/.test(String(o.status))) urls.push(o.url); } catch { /* skip */ }
      }
    }
    out[ats] = urls;
  }
  return out;
}

/** @returns Map boardKey → { ats, config, hint } */
export async function enumerate(crawls) {
  const boards = new Map();
  const add = (key, b) => { if (!boards.has(key)) boards.set(key, b); };
  for (const crawl of crawls) {
    const urls = await crawlUrls(crawl, PREFIX);
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
  return { interns: interns.length, me, eng, fields, sample: interns.slice(0, 3).map((r) => r.title) };
};
// All majors (Nov 2026): rank by how many US internships the board has, with a small boost for engineering ones
// (the first audience). A bank with 12 internships now outranks a company with one generic engineering role.
export const scoutPriority = (s) => Math.min(90, 20 + 3 * Math.min(15, s.interns) + (s.me ? 12 : 0) + (s.eng ? 6 : 0));
const json = async (u, opts = {}) => { const r = await get(u, { timeoutMs: 12000, headers: { Accept: "application/json" }, ...opts }); if (!r.ok) throw new Error(String(r.status)); return r.json(); };
// "3220 Analog Devices (Thailand) Co., Ltd." → "Analog Devices"; "ABA - American Bankers Association" → "American Bankers Association"
const LEGAL = /,?\s*\b(inc|incorporated|llc|l\.l\.c|ltd|limited|co\.?,?\s*ltd|corp|corporation|company|plc|lp|llp|gmbh|s\.?a|ag|n\.?a|u\.s\.a?|usa|us|holdings?|group)\.?\s*$/i;
export const decodeEntities = (s) => String(s || "").replace(/&amp;/gi, "&").replace(/&#0?39;|&apos;|&rsquo;/gi, "'").replace(/&quot;/gi, '"').replace(/&nbsp;/gi, " ").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
export function cleanName(n) {
  let s = decodeEntities(n).replace(/\s+/g, " ").trim();
  s = s.replace(/^[A-Z]\d{2,6}\s+/, "");                                     // "U339 Alcon Vision" (Workday entity codes)
  s = s.replace(/,\s*the\b.*$/i, "");                                         // "MSA, The Safety Company" → "MSA"
  s = s.replace(/^\d+\s*[-–:]?\s*/, "");                                   // "3220 Analog…" / "001-Dialysis…"
  s = s.replace(/\s*\([^)]*\)/g, "");                                       // "(Thailand)", "(Corporate)"
  s = s.replace(/\b(careers?( page| site)?|jobs( page)?|job board|hiring)\b\s*$/i, "").trim();
  const parts = s.split(/\s+[-–|]\s+|-(?=\s*[A-Z][a-z]+,?\s+[A-Z]{2}\b)/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) s = /^[A-Z&.]{2,6}$/.test(parts[0]) && parts[1].length > parts[0].length ? parts[1] : parts[0];
  for (let i = 0; i < 3; i++) s = s.replace(LEGAL, "").replace(/[,.\s/\\-]+$/, "").trim();
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
    if (!s.interns) return { ...s };
    const meta = await json(`https://boards-api.greenhouse.io/v1/boards/${b.token}`).catch(() => ({}));
    return { ...s, company: cleanName(meta.name), hint: `https://job-boards.greenhouse.io/${b.token}` };
  }
  if (b.ats === "ashby") {
    const d = await json(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(b.token)}?includeCompensation=false`);
    const s = summarize((d.jobs || []).filter((j) => j.isListed !== false).map((j) => ({ title: j.title, loc: [j.location, j.address?.postalAddress?.addressCountry].filter(Boolean).join(", ") })));
    if (!s.interns) return { ...s };
    // Ashby's feed has no company name → use the board page's title ("Jobs at Acme" / "Acme Jobs")
    const page = await get(`https://jobs.ashbyhq.com/${encodeURIComponent(b.token)}`, { timeoutMs: 10000 }).then((r) => r.text()).catch(() => "");
    const t = (page.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
    const name = cleanName(t.replace(/^jobs at\s+/i, "").replace(/\s*[|–-].*$/, "").replace(/\s+jobs$/i, ""));
    return { ...s, company: name && !/^jobs?$/i.test(name) ? name : null, hint: `https://jobs.ashbyhq.com/${b.token}` };
  }
  if (b.ats === "smartrecruiters") {
    const d = await json(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(b.token)}/postings?q=intern&limit=100`);
    const rows = (d.content || []).map((j) => ({ title: j.name, loc: j.location?.country === "us" ? (j.location?.fullLocation || "United States") : (j.location?.country ? "abroad " + j.location.country : "") , org: j.company?.name }));
    const s = summarize(rows);
    if (!s.interns) return { ...s };
    return { ...s, company: cleanName(rows.map((r) => r.org).find(Boolean)), hint: `https://jobs.smartrecruiters.com/${b.token}` };
  }
  if (b.ats === "workday") {
    for (const site of b.sites.slice(0, 3)) {
      const api = `https://${b.tenant}.${b.wd}.myworkdayjobs.com/wday/cxs/${b.tenant}/${site}`;
      const r = await postJson(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset: 0, searchText: "intern" }, { timeoutMs: 12000 });
      if (!r.ok) continue;
      const d = await r.json();
      const posts = d.jobPostings || [];
      const s = summarize(posts.map((j) => ({ title: j.title, loc: [j.locationsText, j.externalPath].join(" ") })));
      if (!s.interns) { if (posts.length || d.total) return { ...s }; continue; }
      // Employer name: postings carry legal entities ("Baker Hughes Energy Services LLC"); keep the shortest leading
      // part that matches the board's own address ("bakerhughes" → "Baker Hughes"). If no posting's employer matches
      // the board, it's a parent company's shared portal → skip (the finder couldn't prove it anyway).
      let company = null; const orgs = [];
      for (const j of posts.filter((p) => isInternship(p.title)).slice(0, 3)) {
        const dd = await json(`${api}${j.externalPath}`).catch(() => null);
        const org = cleanName(dd?.hiringOrganization?.name); if (org) orgs.push(org);
        company = brandFromEntity(org, b.tenant); if (company) break;
      }
      // Abbreviated board ("lmco", "mdlz"): accept only if every sampled internship names the same employer
      if (!company && orgs.length >= 2 && orgs.every((o) => normName(o) === normName(orgs[0]))) company = orgs[0];
      return { ...s, company, hint: `https://${b.tenant}.${b.wd}.myworkdayjobs.com/${site}` };
    }
    return { interns: 0 };
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
      if (!s.interns) return { ...s };
      return { ...s, company: cleanName(jobs.map((j) => j.org).find(Boolean)), hint: site };
    }
    const { jobs } = parseIcimsPage(html, base);
    const s = summarize(jobs.map((j) => ({ title: j.title, loc: j.location })));
    if (!s.interns) return { ...s };
    const t = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
    const m = t.match(/(?:job listings at|careers at|jobs at)\s+(.+)$/i) || t.match(/^(.+?)\s+(?:careers|jobs)\b/i);
    return { ...s, company: m ? cleanName(m[1]) : null, hint: base };
  }
  return { interns: 0 };
}

/** "Baker Hughes Energy Services" + tenant "bakerhughes" → "Baker Hughes"; null when the entity doesn't match the board */
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
  let done = 0;
  await mapLimit([...boards.entries()], concurrency, async ([key, b]) => {
    if (Date.now() > deadline) return;
    let r;
    try { r = await probe(b); } catch (e) { r = { interns: 0, error: String(e.message || e).slice(0, 60) }; }
    checked.push(key);
    if (++done % 250 === 0 && onProgress) onProgress(done, found.length);
    if (!r.interns || !r.company || !r.hint) return;
    if (SKIP_COMPANY.test(r.company) || normName(r.company).length < 2) return;
    found.push({ key, ats: b.ats, company: r.company, hint: r.hint, priority: scoutPriority(r), interns: r.interns, me: r.me, eng: r.eng, fields: r.fields, sample: r.sample });
  });
  return { found: found.sort((a, z) => z.priority - a.priority), checked };
}
