// lib/jobabout.js (Nov 26 2026) — the back of a swipe card: a job's own description, read on demand from the employer's
// board (we don't store descriptions), plus quick facts pulled out of it. Only what the employer wrote; nothing invented.
//   Greenhouse / Lever / Ashby / SmartRecruiters → their public job APIs
//   anything else → the job page's schema.org JobPosting (JSON-LD), which most career sites publish for Google
// Used by GET /api/listings?about=<listing id> (cached a day at the CDN).
import { plain, parsePay } from "./pay.js";

const UA = { "User-Agent": "BeatThePile/1.0 (+https://www.beatthepile.com/bots/)", Accept: "application/json, text/html;q=0.9" };
const decode = (s) => String(s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

async function get(url, fetchImpl, as = "json") {
  const r = await fetchImpl(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`answered ${r.status}`);
  if (as === "json") return r.json();
  const t = await r.text(); return t.length > 2_000_000 ? t.slice(0, 2_000_000) : t;
}

/** The job's description HTML from its own board. */
export async function descriptionHtml({ ats, token, sourceId, url }, fetchImpl = fetch) {
  const t = encodeURIComponent(token || ""), id = encodeURIComponent(sourceId || "");
  if (ats === "greenhouse" && token) { const d = await get(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs/${id}`, fetchImpl); return decode(d.content); }
  if (ats === "lever" && token) {
    const d = await get(`https://api.lever.co/v0/postings/${t}/${id}`, fetchImpl);
    return [d.description, ...(d.lists || []).map((l) => `<h3>${l.text || ""}</h3><ul>${l.content || ""}</ul>`), d.additional].filter(Boolean).join("\n");
  }
  if (ats === "ashby" && token) {
    const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${t}?includeCompensation=true`, fetchImpl);
    const j = (d.jobs || []).find((x) => String(x.id) === String(sourceId)); if (!j) throw new Error("not on the board any more");
    return j.descriptionHtml || j.descriptionPlain || "";
  }
  if (ats === "smartrecruiters" && token) {
    const d = await get(`https://api.smartrecruiters.com/v1/companies/${t}/postings/${id}`, fetchImpl);
    const s = d.jobAd?.sections || {};
    return ["jobDescription", "qualifications", "additionalInformation"].map((k) => s[k]?.text ? `<h3>${s[k].title || ""}</h3>${s[k].text}` : "").join("\n");
  }
  if (ats === "amazon") {   // amazon.jobs pages carry no JobPosting data; its public search feed has the full text (lib/fetchers/amazon.js)
    const d = await get(`https://www.amazon.jobs/en/search.json?base_query=${id}&result_limit=5`, fetchImpl);
    const j = (d.jobs || []).find((x) => String(x.id_icims) === String(sourceId)); if (!j) throw new Error("not on the board any more");
    const list = (t, s) => s ? `<h3>${t}</h3><ul>${String(s).split(/<br\s*\/?>/i).map((x) => x.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean).map((x) => `<li>${x}</li>`).join("")}</ul>` : "";
    return `<p>${j.description || ""}</p>${list("Basic qualifications", j.basic_qualifications)}${list("Preferred qualifications", j.preferred_qualifications)}`;
  }
  if (!/^https:\/\//.test(String(url || ""))) throw new Error("no page to read");
  const html = await get(url, fetchImpl, "text");
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const all = [JSON.parse(m[1].trim())].flat().flatMap((x) => x && x["@graph"] ? x["@graph"] : [x]);
      const jp = all.find((x) => x && /JobPosting/i.test([].concat(x["@type"] || []).join(" ")));
      if (jp?.description) return decode(jp.description);
    } catch {}
  }
  const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']{40,})/i);
  if (meta) return decode(meta[1]);
  throw new Error("no description on the page");
}

const SAME = { pto: "paid time off", "401k": "401(k)", "401(k": "401(k)", "401 k": "401(k)" };
const tidy = (x) => SAME[x.toLowerCase()] || x;
const uniq = (arr, n) => [...new Map(arr.map(tidy).map((x) => [x.toLowerCase().replace(/s$/, ""), x])).values()].slice(0, n);
const words = (text, re, n) => uniq([...text.matchAll(re)].map((m) => m[0].replace(/\s+/g, " ").trim()), n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SCHEDULE = /\b(full[- ]time|part[- ]time|per diem|prn|seasonal|temporary|weekends?|overnights?|night shift|day shift|evening shift|(1st|2nd|3rd|first|second|third) shift|flexible (schedule|hours)|\d{1,2}\s?(?:-|–|to)\s?\d{1,2} hours (?:per|a|each) week|\d{1,2}[- ]week (internship|program|assignment))\b/gi;   // no "Summer 2028": in a description that's usually a graduation date
const ASKS = /\b(high school diploma( or (GED|equivalent))?|GED|no (prior )?experience (is )?(needed|required|necessary)|(currently )?(enrolled in|pursuing) (a |an )?(bachelor'?s|master'?s|associate'?s|undergraduate|graduate|ph\.?d\.?)( or (a |an )?(bachelor'?s|master'?s|associate'?s|graduate|ph\.?d\.?))?( degree| program)*|associate'?s degree|bachelor'?s degree|master'?s degree|\d{1,2}\+? years? of (relevant |related |professional )?experience|valid driver'?s license|cdl( class [ab])?|ability to lift \d{2,3} (lbs|pounds)|18 years of age|at least 1[68]( years old)?|background check|drug (screen|test))\b/gi;
const PERKS = /\b(health(, dental,? and vision)? insurance|medical,? dental,? (and )?vision|dental|vision|401\(?k\)?( match(ing)?)?|tuition (assistance|reimbursement)|paid time off|pto|paid holidays|paid sick (leave|time)|employee discounts?|relocation( assistance)?|housing( stipend)?|free (meals|lunch)|gym|parental leave|stock|equity|sign[- ]on bonus|referral bonus|mentor(ship)?|remote work|hybrid)\b/gi;

/** The first few requirement bullets: <li> items after a "Requirements / Qualifications / What you'll need" heading. */
export function requirementBullets(html, n = 5) {
  const h = String(html || "");
  const at = h.search(/(basic|minimum|required|preferred)?\s*(qualifications|requirements|what you('|’)ll (need|bring)|what we('|’)re looking for|you (have|bring|might be a fit)|who you are|skills|about you)/i);
  const from = at >= 0 ? h.slice(at) : h;
  return [...from.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => plain(m[1]).trim()).filter((x) => x.length > 8 && x.length < 260).slice(0, n);
}

function perksOf(text) {
  let p = words(text, PERKS, 10).map((x) => /^401/.test(x) ? "401(k)" + (/match/i.test(x) ? " match" : "") : x === x.toUpperCase() ? x : cap(x));
  if (/401\s?\(?k\)?/i.test(text) && !p.some((x) => /^401/.test(x))) p.push("401(k)");
  if (p.some((x) => /dental|vision/i.test(x) && /,/.test(x))) p = p.filter((x) => !/^(dental|vision)$/i.test(x));   // "Medical, dental and vision" covers both
  return uniq(p, 6);
}
/** Text + quick facts for the back of the card. */
export function summarize(html) {
  const text = plain(html).trim();
  let excerpt = text.slice(0, 2400);
  if (text.length > 2400) { const cut = excerpt.lastIndexOf(". "); excerpt = (cut > 1200 ? excerpt.slice(0, cut + 1) : excerpt) + " …"; }
  return {
    text: excerpt, full: text.length,
    bullets: requirementBullets(html),
    facts: { pay: parsePay(html), schedule: words(text, SCHEDULE, 4).map(cap), asks: words(text, ASKS, 4).map(cap), perks: perksOf(text) },
  };
}

/** Everything for one listing: { ok, source, text, bullets, facts } or { ok:false, reason }. */
export async function aboutJob({ listing, cfg }, fetchImpl = fetch) {
  const sourceId = String(listing.id).slice(String(listing.id).indexOf(":") + 1);
  try {
    const html = await descriptionHtml({ ats: cfg?.ats, token: cfg?.token, sourceId, url: listing.url }, fetchImpl);
    if (plain(html).trim().length < 40) return { ok: false, reason: "The employer's page has no description we can show." };
    return { ok: true, source: ["greenhouse", "lever", "ashby", "smartrecruiters", "amazon"].includes(cfg?.ats) ? cfg.ats : "page", ...summarize(html) };
  } catch (e) {
    return { ok: false, reason: "We couldn't read the description from the employer's site right now." };
  }
}
