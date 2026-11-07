// lib/logos.js — find each company's real website and its logo, and PROVE the site is theirs before we show a logo.
// A wrong logo is worse than initials, so a site only counts when (1) it links to the company's own job board,
// or (2) the job board itself lives on the company's domain, or (3) the page's title / site name names the company.
// Guessed domains (acme.com) need (1) or (3) with the name in the TITLE, not just somewhere on the page.

const ATS_HOST = /(myworkdayjobs|myworkdaysite|workday|greenhouse\.io|lever\.co|ashbyhq|icims\.com|smartrecruiters|oraclecloud|taleo\.net|ultipro|ukg|adp\.com|paylocity|successfactors|eightfold\.ai|jobvite|bamboohr|recruitee|workable|brassring|dayforce|avature|simplify\.jobs|linkedin|indeed|glassdoor|google\.com|github\.io|jobs\.|careers\.)/i;
const STOP = new Set(["the", "inc", "llc", "ltd", "corp", "corporation", "company", "co", "group", "holdings", "plc", "lp", "llp", "and", "of", "us", "usa", "na", "america", "americas", "international", "global", "services", "solutions", "technologies", "technology", "systems"]);

/** Lowercase name words that identify the company (drops "Inc", "Group", "The"…). */
export function nameWords(name = "") {
  return String(name).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
}
/** "Southland Industries, Inc." → "southlandindustries" */
export const compact = (name) => nameWords(name).join("");

/** example.co.uk / careers.acme.com → registrable domain (good enough: last 2 labels, 3 for 2-letter SLD ccTLDs). */
export function regDomain(host = "") {
  const h = String(host).toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  const p = h.split("."); if (p.length < 2) return "";
  const two = p.slice(-2).join(".");
  return /^(co|com|org|net|ac|gov)\.[a-z]{2}$/.test(two) && p.length >= 3 ? p.slice(-3).join(".") : two;
}
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ""; } };

/**
 * Where to look, best first. kind: "known" (already in our DB) · "board" (the job board / a listing lives on their own domain)
 * · "guess" (name.com / board token .com). Each is checked before use.
 */
export function candidates({ company, domain, config = {}, urls = [] }) {
  const out = [], seen = new Set();
  const add = (d, kind) => { d = regDomain(d); if (d && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !seen.has(d)) { seen.add(d); out.push({ domain: d, kind }); } };
  if (domain) add(domain, "known");
  for (const u of urls) { const h = hostOf(u); if (h && !ATS_HOST.test(regDomain(h))) add(h, "board"); }
  for (const k of ["host", "apiBase", "jobBase", "base", "url"]) { const h = hostOf(config[k] || ""); if (h && !ATS_HOST.test(regDomain(h))) add(h, "board"); }
  const c = compact(company); if (c.length >= 3) add(c + ".com", "guess");
  const w = nameWords(company); if (w.length > 1 && w[0].length >= 4) add(w[0] + ".com", "guess");
  for (const t of [config.token, config.tenant]) if (t && /^[a-z][a-z0-9-]{2,30}$/i.test(t)) add(String(t).toLowerCase().replace(/-\d+$/, "") + ".com", "guess");
  return out.slice(0, 6);
}

function textBits(html = "") {
  const s = String(html).slice(0, 300000);
  const pick = (re) => ((s.match(re) || [])[1] || "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
  return {
    title: pick(/<title[^>]*>([^<]{1,300})<\/title>/i),
    site: pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{1,200})["']/i) || pick(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:site_name["']/i),
    app: pick(/<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']{1,200})["']/i),
    lower: s.toLowerCase(),
  };
}
const LEGAL = new Set(["the", "inc", "llc", "ltd", "corp", "corporation", "company", "co", "plc", "lp", "llp", "and", "of"]);
/** Does this text name the company? Every word of the name (only legal suffixes like "Inc" dropped), or the joined name,
 *  must appear — so "Apex Clean Energy" never proves "Apex Systems". */
export function names(text, company) {
  const t = String(text || "").toLowerCase(), tc = t.replace(/[^a-z0-9]/g, "");
  const w = String(company).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((x) => x && !LEGAL.has(x)), c = w.join("");
  if (!c || c.length < 3) return false;
  if (c.length >= 4 && tc.includes(c)) return true;
  return w.length > 0 && w.every((x) => new RegExp(`\\b${x.replace(/[^a-z0-9]/g, "")}\\b`).test(t));
}
/** Board fingerprints for "the site links to their own job board". */
export function boardMarks({ ats, config = {} }) {
  const m = [];
  if (config.token) m.push(`${ats === "lever" ? "lever.co" : ats === "ashby" ? "ashbyhq.com" : ats === "smartrecruiters" ? "smartrecruiters.com" : "greenhouse.io"}/${String(config.token).toLowerCase()}`);
  if (config.tenant && /workday/.test(ats || "")) m.push(`${String(config.tenant).toLowerCase()}.wd`, `/${String(config.tenant).toLowerCase()}/`);
  if (config.host && /icims/.test(String(config.host))) m.push(String(config.host).toLowerCase());
  return m.filter((x) => x.length >= 8);
}

/** Is the page at finalUrl really this company's site? Returns the reason, or null. */
export function proveSite({ html, finalUrl, cand, company, ats, config }) {
  const finalDom = regDomain(hostOf(finalUrl));
  if (!finalDom || ATS_HOST.test(finalDom)) return null;
  if (finalDom !== cand.domain && cand.kind === "guess") return null;            // a guess that redirects elsewhere = someone else's site
  const b = textBits(html);
  if (boardMarks({ ats, config }).some((m) => b.lower.includes(m))) return "links to their job board";
  const strong = names(b.title, company) || names(b.site, company) || names(b.app, company);
  if (strong) return "page title names them";
  if (cand.kind !== "guess" && names(b.lower.slice(0, 60000), company)) return cand.kind === "board" ? "job board is on this site" : "page names them";
  return null;
}

/** Best icon on the page: apple-touch-icon, else the largest declared icon ≥64px. Absolute https URL or null. */
export function pickIcon(html = "", base = "") {
  const links = [...String(html).slice(0, 300000).matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  let best = null, bestScore = -1;
  for (const l of links) {
    const rel = (l.match(/rel=["']([^"']+)["']/i) || [])[1] || "", href = (l.match(/href=["']([^"']+)["']/i) || [])[1] || "";
    if (!href || !/icon/i.test(rel) || /mask-icon/i.test(rel) || /\.svg(\?|$)/i.test(href) && !/apple/i.test(rel)) continue;
    const sz = Math.max(0, ...((l.match(/sizes=["']([^"']+)["']/i) || [])[1] || "").split(/\s+/).map((x) => parseInt(x, 10) || 0));
    const score = /apple-touch/i.test(rel) ? 1000 + (sz || 180) : sz;
    if (score >= 64 && score > bestScore) { bestScore = score; best = href; }
  }
  if (!best) return null;
  try { const u = new URL(best.replace(/&amp;/g, "&"), base); return u.protocol === "https:" ? u.href : null; } catch { return null; }
}
