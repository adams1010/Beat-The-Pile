// /api/listings.js — what the site shows. Only listings that are still on the company's
// board AND whose link passed (or hasn't failed) the link check.
//   GET /api/listings                            → engineering listings (match = me/general), all US
//   GET /api/listings?state=VA,PA                → listings covering VA or PA (multi-site postings included)
//   GET /api/listings?state=VA&match=me          → strict ME titles only
//   GET /api/listings?companies=x-abbott,boeing  → only these companies (career-fair lists)
//   GET /api/listings?field=all | field=finance  → every major / one field (see lib/fields.js)
//   GET /api/listings?near=24060&mi=50          → within 50 miles of a ZIP (or near=Blacksburg, VA), nearest first, with .mi
//   GET /api/listings?limit=200&offset=400       → one page (default: everything, up to 20,000)
//   GET /api/listings?ids=a:1,b:2                → these exact listings INCLUDING closed ones (your saved/applied history)
//   GET /api/listings?kind=intern (default) | fulltime | all  → internships, early-career full-time jobs, or both.
//       Told apart by title (PostgREST imatch on lib/fields.js INTERN_PG), so no extra column; each row carries kind.
//   GET /api/listings?summary=1                  → just counts + last update time (homepage/demo stats; tiny + cached)
//   GET /api/listings?names=1                    → just the companies with an open internship right now (any major; Radar)
//   GET /c/<id>        (→ ?page=<id>)            → the company's page as HTML (server-built so search engines can read it)
//   GET /sitemap.xml   (→ ?sitemap=1)            → main pages + every company hiring now
// Bad parameters → 400 with what's wrong. A database problem → 503 (never an empty list that looks like "no jobs").
import { db } from "../lib/db.js";
import { FIELDS, FULLTIME_PG, kindOf } from "../lib/fields.js";
import { COMPANIES } from "../lib/companies.js";
import { companyPage, radarFor, sitemap } from "../lib/companypage.js";
import { cityMatches, lookupPlace, geocodeOne, miles } from "../lib/geocode.js";
import { geoAlbersUsa } from "d3-geo";
// Same projection as map/us.json (scripts/build-map.mjs): d3 Albers USA, scale 1300, 975×610.
const PROJ = geoAlbersUsa().scale(1300).translate([487.5, 305]);
export const project = (lat, lng) => { const xy = PROJ([lng, lat]); return xy ? [Math.round(xy[0] * 10) / 10, Math.round(xy[1] * 10) / 10] : null; };
import { zipToState } from "../lib/geo.js";

const FIELD_KEYS = new Set([...FIELDS.map(([k]) => k), "other"]);
const STATES = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR".split(" "));
const LIVE = "closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)";
const COLS = "id,company_id,company,title,location,state,url,match,field,posted_on,first_seen,link_checked_at";

export function parse(q) {
  const errs = [];
  const raw = (k) => (q[k] == null ? "" : String(q[k]));
  const states = raw("state").toUpperCase().split(",").map((x) => x.trim()).filter(Boolean);
  if (states.some((s) => s !== "ALL" && !STATES.has(s))) errs.push("state must be 2-letter US state codes, e.g. state=VA,PA");
  const match = raw("match");
  if (match && match !== "me") errs.push("match can only be 'me'");
  const field = raw("field").toLowerCase();
  if (field && field !== "all" && !FIELD_KEYS.has(field)) errs.push(`unknown field '${field.slice(0, 30)}'`);
  const companies = raw("companies").split(",").map((x) => x.trim()).filter(Boolean);
  if (companies.some((c) => !/^[a-z0-9-]{2,80}$/.test(c)) || companies.length > 400) errs.push("companies must be up to 400 company ids");
  const ids = raw("ids").split(",").map((x) => x.trim()).filter(Boolean);
  if (ids.length > 200 || ids.some((x) => !/^[a-z0-9-]+:[^,()]{1,200}$/.test(x))) errs.push("ids must be up to 200 listing ids");
  const limit = raw("limit") ? Number(raw("limit")) : null, offset = raw("offset") ? Number(raw("offset")) : 0;
  if (limit != null && !(Number.isInteger(limit) && limit >= 1 && limit <= 1000)) errs.push("limit must be 1–1000");
  if (!(Number.isInteger(offset) && offset >= 0 && offset <= 20000)) errs.push("offset must be 0–20000");
  const near = raw("near").trim().slice(0, 60);
  if (near && !/^[A-Za-z0-9 .,'-]+$/.test(near)) errs.push("near must be a 5-digit ZIP or 'City, ST'");
  const mi = raw("mi") ? Number(raw("mi")) : 50;
  if (!(Number.isInteger(mi) && mi >= 5 && mi <= 300)) errs.push("mi must be 5–300");
  const kind = raw("kind").toLowerCase() || "intern";
  if (!["intern", "fulltime", "all"].includes(kind)) errs.push("kind must be intern, fulltime or all");
  return { errs, kind, near: near || null, mi, states: states.filter((s) => s !== "ALL"), match: match || null, field, companies, ids, limit, offset, summary: raw("summary") === "1", names: raw("names") === "1" };
}

/** Homepage map: every open internship with a real city, as dots on the US map (grouped into 6-px cells so nearby
 *  postings share one dot). Counts are real; nothing is placed that the geocoder couldn't place (lib/geocode.js). */
async function dots(p, res) {
  const rows = await db.selectAllAsAdmin(`listings?select=geo_lat,geo_lng&${LIVE}${majorFilter(p)}&geo_lat=not.is.null`);
  const cells = new Map(); let placed = 0;
  for (const r of rows) {
    const xy = project(r.geo_lat, r.geo_lng); if (!xy) continue;
    placed++;
    const k = `${Math.round(xy[0] / 6)},${Math.round(xy[1] / 6)}`;
    const c = cells.get(k); if (c) { c[0] += xy[0]; c[1] += xy[1]; c[2]++; } else cells.set(k, [xy[0], xy[1], 1]);
  }
  const out = [...cells.values()].map(([x, y, n]) => [Math.round((x / n) * 10) / 10, Math.round((y / n) * 10) / 10, n]).sort((a, b) => a[2] - b[2]);
  const total = await db.count(`listings?${LIVE}${majorFilter(p)}`);
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({ w: 975, h: 610, dots: out, placed, total });
}

/** Same major filters as the main list (field / strict ME / companies), as a PostgREST query string tail. */
// internships = every title that isn't a real early-career full-time title (keeps board-flagged interns);
// full-time = early-career title and not an internship. One regex, plain filters (no or()/and() quoting).
const KIND_ON = { intern: `&title=not.imatch.${encodeURIComponent(FULLTIME_PG)}`, fulltime: `&title=imatch.${encodeURIComponent(FULLTIME_PG)}`, all: "" };
// Safety net: if the database ever rejects the pattern, this instance stops filtering by kind (rows still carry kind)
// instead of failing every /jobs load. Logged as [listings] kind filter off.
let kindOk = true;
const KIND_Q = new Proxy(KIND_ON, { get: (t, k) => (kindOk ? t[k] : "") });
const withKind = (rows) => rows.map((l) => ({ ...l, kind: kindOf(l.title) === "fulltime" ? "fulltime" : "intern" }));   // board-flagged interns (BambooHR) stay "intern"
function majorFilter(p) {
  let q = KIND_Q[p.kind || "intern"];
  if (p.match) q += `&match=eq.${p.match}`;
  else if (!p.field) q += "&match=not.is.null";
  if (p.field && p.field !== "all") q += `&field=eq.${p.field}`;
  if (p.companies.length) q += `&company_id=in.(${p.companies.join(",")})`;
  return q;
}
/** "Within N miles of a ZIP / city": nearest first, each listing with its distance (city center to city center).
 *  Only listings whose location names a real US city are on the map; remote and "4 Locations" postings are counted
 *  separately so the page can say so instead of quietly hiding or guessing them. */
async function nearby(p, res) {
  let center = lookupPlace(p.near);
  if (!center && !/^\d{5}$/.test(p.near) && !/,/.test(p.near)) {        // just a city name: "Blacksburg"
    const m = cityMatches(p.near);
    if (m.length === 1) { center = m[0].pt; p.near = m[0].q; }
    else if (m.length > 1) { res.setHeader("Cache-Control", "s-maxage=86400");
      return res.status(400).json({ error: `There's more than one ${m[0].q.split(",")[0]}. Which state?`, choices: m.map((x) => x.q).slice(0, 30) }); }
  }
  if (!center) { res.setHeader("Cache-Control", "no-store"); return res.status(400).json({ error: "We couldn't find that place. Try a city and state (Blacksburg, VA) or a 5-digit ZIP code." }); }
  const st = /^\d{5}$/.test(p.near) ? zipToState(p.near) : geocodeOne(p.near)?.state || null;
  const dLat = p.mi / 69, dLng = p.mi / (69 * Math.cos((center[0] * Math.PI) / 180));
  const r4 = (x) => Math.round(x * 1e4) / 1e4;
  const box = `and(geo_lat.gte.${r4(center[0] - dLat)},geo_lat.lte.${r4(center[0] + dLat)},geo_lng.gte.${r4(center[1] - dLng)},geo_lng.lte.${r4(center[1] + dLng)})`;
  const q = `listings?select=${COLS},geo_pts&${LIVE}${majorFilter(p)}&and=(or(${box},geo_n.gt.1))&order=first_seen.desc,id.asc`;
  const cand = [];
  for (let off = 0; off < 20000; off += 1000) { const page = await db.select(`${q}&limit=1000&offset=${off}`); cand.push(...page); if (page.length < 1000) break; }
  const hits = [];
  for (const l of cand) {
    const d = Math.min(...(l.geo_pts || []).map((pt) => miles(center, pt)));
    if (d <= p.mi) { const { geo_pts, ...rest } = l; hits.push({ ...rest, mi: Math.round(d) }); }
  }
  hits.sort((a, b) => a.mi - b.mi || (a.first_seen < b.first_seen ? 1 : -1));
  const [remote, unplaced, lastRun] = await Promise.all([
    db.count(`listings?${LIVE}${majorFilter(p)}&geo_kind=eq.remote`),
    st ? db.count(`listings?${LIVE}${majorFilter(p)}&geo_kind=in.(multi,state)&state=ilike.*${st}*`) : 0,
    db.select("feed_runs?select=ran_at&order=ran_at.desc&limit=1"),
  ]);
  const page = p.limit != null ? hits.slice(p.offset, p.offset + p.limit) : hits;
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
  return res.status(200).json({ listings: withKind(page), meta: { count: hits.length, kind: p.kind, lastSync: lastRun?.[0]?.ran_at || null,
    near: { q: p.near, mi: p.mi, lat: center[0], lng: center[1], state: st, xy: project(center[0], center[1]) }, remote, unplacedInState: unplaced,
    ...(p.limit != null ? { limit: p.limit, offset: p.offset, more: p.offset + p.limit < hits.length } : {}) } });
}

/** One pass over every open internship: company_id → {company, n}, plus counts per field (major). */
async function liveScan() {
  const seen = new Map(), byField = {};
  for (let off = 0; off < 40000; off += 1000) {
    const page = await db.select(`listings?select=company_id,company,field&${LIVE}${KIND_Q.intern}&order=id.asc&limit=1000&offset=${off}`);
    for (const r of page) {
      const e = seen.get(r.company_id); if (e) e.n++; else seen.set(r.company_id, { company: r.company, n: 1 });
      const f = r.field || "other"; byField[f] = (byField[f] || 0) + 1;
    }
    if (page.length < 1000) break;
  }
  return { seen, byField };
}
/** company_id → name for every company with an open internship right now (any major). */
async function hiringCompanies() {
  const { seen } = await liveScan();
  return new Map([...seen].map(([id, v]) => [id, v.company]));
}

const plain = (res, code, title, msg) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(code).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Beat the Pile</title><link rel="stylesheet" href="/d.css"></head><body style="margin:0;font-family:Geist,system-ui,sans-serif"><script src="/nav.js"></script><main style="max-width:640px;margin:0 auto;padding:56px 20px"><h1 style="font-weight:600;letter-spacing:-.02em">${title}</h1><p style="color:#55627A">${msg}</p><p><a href="/jobs/" style="color:#4A7000;font-weight:600">Browse internships →</a></p></main></body></html>`);
};
/** /c/<id>: one company's page. Unknown company → 404; database trouble → 503 (never a page that pretends nothing is open). */
async function companyHtml(id, res) {
  if (!/^[a-z0-9-]{2,80}$/.test(id)) return plain(res, 404, "Company not found", "That link doesn't match a company we track.");
  let rows;
  try { rows = await db.select(`listings?select=${COLS}&${LIVE}&company_id=eq.${id}&order=first_seen.desc&limit=1000`); }
  catch (e) { console.error("[company page]", e); return plain(res, 503, "Couldn't load this company", "That's a problem on our side, not a sign they have no internships. Try again in a minute."); }
  const name = rows[0]?.company || "";
  const radar = radarFor(id, name);
  if (!rows.length && !radar) return plain(res, 404, "Company not found", "We don't have open internships or hiring history for this company right now.");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  return res.status(200).send(companyPage({ id, rows, radar }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const q0 = req.query || {};
  if (q0.page != null) return companyHtml(String(q0.page).toLowerCase(), res);
  if (q0.logos === "1") {                                  // company id → proven logo (Logo Finder). Small, cached.
    try {
      const rows = await db.selectAllAsAdmin("company_candidates?select=id,domain,logo&status=eq.live&logo=not.is.null&logo=neq.none&domain=not.is.null");
      const out = {};
      for (const r of rows) out[r.id] = r.logo === "fav" ? "fav:" + r.domain : r.logo;
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json(out);
    } catch (e) { console.error("[logos]", e); return res.status(503).json({ error: "Logos unavailable" }); }
  }
  if (q0.sitemap === "1") {
    try {
      const ids = [...(await hiringCompanies()).keys()].filter((id) => /^[a-z0-9-]{2,80}$/.test(id)).sort();
      res.setHeader("Content-Type", "application/xml; charset=utf-8"); res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(sitemap(ids));
    } catch (e) { console.error("[sitemap]", e); return res.status(503).send("Sitemap unavailable — try again later"); }
  }
  const p = parse(q0);
  if (p.errs.length) return res.status(400).json({ error: p.errs.join("; ") });

  try {
    if (p.summary) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
      const scan = await liveScan().catch(() => null);
      const hiringNow = scan ? scan.seen.size : null;
      const top = scan ? [...scan.seen].sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([id, v]) => ({ id, company: v.company, n: v.n })) : [];
      const I = KIND_Q.intern;     // the headline numbers stay internships; full-time is counted on its own
      const [engineering, me, allMajors, companies, lastRun, fulltime] = await Promise.all([
        db.count(`listings?${LIVE}${I}&match=not.is.null`), db.count(`listings?${LIVE}${I}&match=eq.me`), db.count(`listings?${LIVE}${I}`),
        db.count("company_candidates?status=eq.live"),
        db.select("feed_runs?select=ran_at&order=ran_at.desc&limit=1"),
        db.count(`listings?${LIVE}${KIND_Q.fulltime}`).catch(() => null),
      ]);
      // companies = boards the robot proved + the hand-checked starter list
      return res.status(200).json({ engineering, me, allMajors, fulltime, hiringNow, top, byField: scan?.byField || null, companies: companies + COMPANIES.length, lastSync: lastRun?.[0]?.ran_at || null, at: new Date().toISOString() });
    }

    if (p.names) {                                            // every company hiring right now, any major — small enough for a phone
      res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
      const seen = await hiringCompanies();
      const lastRun = await db.select("feed_runs?select=ran_at&order=ran_at.desc&limit=1");
      return res.status(200).json({ companies: [...seen].map(([id, company]) => ({ id, company })), meta: { count: seen.size, lastSync: lastRun?.[0]?.ran_at || null } });
    }

    if (p.ids.length) {                                        // personal history: include closed listings, say which are closed
      res.setHeader("Cache-Control", "no-store");
      const list = p.ids.map((x) => `"${x.replace(/"/g, "")}"`).join(",");
      const rows = await db.select(`listings?select=${COLS},closed_at,link_ok&id=in.(${encodeURIComponent(list)})`);
      return res.status(200).json({ listings: withKind(rows).map((l) => ({ ...l, open: !l.closed_at && l.link_ok !== false })), meta: { count: rows.length } });
    }

    if (p.near) return await nearby(p, res);
    if (req.query?.dots === "1") return await dots(p, res);

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    let q = `listings?select=${COLS}&${LIVE}${KIND_Q[p.kind]}&order=first_seen.desc,id.asc`;
    // state column holds "VA" or "WA,VA,PA" — match any requested state inside it (re-checked exactly below)
    if (p.states.length) q += `&and=(or(${p.states.map((s) => `state.ilike.*${s}*`).join(",")}))`;
    if (p.match) q += `&match=eq.${p.match}`;
    else if (!p.field) q += "&match=not.is.null";                       // engineering view (default)
    if (p.field && p.field !== "all") q += `&field=eq.${p.field}`;
    if (p.companies.length) q += `&company_id=in.(${p.companies.join(",")})`;

    let listings = [];
    if (p.limit != null) listings = await db.select(`${q}&limit=${p.limit}&offset=${p.offset}`);
    else for (let off = 0; off < 20000; off += 1000) {           // Supabase returns ≤1000 rows per request
      const page = await db.select(`${q}&limit=1000&offset=${off}`);
      listings.push(...page);
      if (page.length < 1000) break;
    }
    const lastRun = await db.select("feed_runs?select=ran_at&order=ran_at.desc&limit=1");
    const rows = p.states.length ? listings.filter((l) => String(l.state).split(",").some((s) => p.states.includes(s))) : listings;
    return res.status(200).json({ listings: withKind(rows), meta: { count: rows.length, kind: p.kind, lastSync: lastRun?.[0]?.ran_at || null,
      ...(p.limit != null ? { limit: p.limit, offset: p.offset, more: listings.length === p.limit } : {}) } });
  } catch (e) {
    console.error("[listings]", e);
    if (kindOk && /imatch|regular expression|PGRST|400/i.test(String(e?.message || e))) { kindOk = false; console.error("[listings] kind filter off"); return handler(req, res); }
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "Couldn't load internships right now — try again in a minute" });
  }
}
