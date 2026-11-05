// /api/listings.js — what the site shows. Only listings that are still on the company's
// board AND whose link passed (or hasn't failed) the link check.
//   GET /api/listings                            → engineering listings (match = me/general), all US
//   GET /api/listings?state=VA,PA                → listings covering VA or PA (multi-site postings included)
//   GET /api/listings?state=VA&match=me          → strict ME titles only
//   GET /api/listings?companies=x-abbott,boeing  → only these companies (career-fair lists)
//   GET /api/listings?field=all | field=finance  → every major / one field (see lib/fields.js)
//   GET /api/listings?limit=200&offset=400       → one page (default: everything, up to 20,000)
//   GET /api/listings?ids=a:1,b:2                → these exact listings INCLUDING closed ones (your saved/applied history)
//   GET /api/listings?summary=1                  → just counts + last update time (homepage/demo stats; tiny + cached)
//   GET /api/listings?names=1                    → just the companies with an open internship right now (any major; Radar)
// Bad parameters → 400 with what's wrong. A database problem → 503 (never an empty list that looks like "no jobs").
import { db } from "../lib/db.js";
import { FIELDS } from "../lib/fields.js";
import { COMPANIES } from "../lib/companies.js";

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
  return { errs, states: states.filter((s) => s !== "ALL"), match: match || null, field, companies, ids, limit, offset, summary: raw("summary") === "1", names: raw("names") === "1" };
}

/** One pass over every open internship: company_id → {company, n}, plus counts per field (major). */
async function liveScan() {
  const seen = new Map(), byField = {};
  for (let off = 0; off < 40000; off += 1000) {
    const page = await db.select(`listings?select=company_id,company,field&${LIVE}&order=id.asc&limit=1000&offset=${off}`);
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const p = parse(req.query || {});
  if (p.errs.length) return res.status(400).json({ error: p.errs.join("; ") });

  try {
    if (p.summary) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
      const scan = await liveScan().catch(() => null);
      const hiringNow = scan ? scan.seen.size : null;
      const top = scan ? [...scan.seen].sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([id, v]) => ({ id, company: v.company, n: v.n })) : [];
      const [engineering, me, allMajors, companies, lastRun] = await Promise.all([
        db.count(`listings?${LIVE}&match=not.is.null`), db.count(`listings?${LIVE}&match=eq.me`), db.count(`listings?${LIVE}`),
        db.count("company_candidates?status=eq.live"),
        db.select("feed_runs?select=ran_at&order=ran_at.desc&limit=1"),
      ]);
      // companies = boards the robot proved + the hand-checked starter list
      return res.status(200).json({ engineering, me, allMajors, hiringNow, top, byField: scan?.byField || null, companies: companies + COMPANIES.length, lastSync: lastRun?.[0]?.ran_at || null, at: new Date().toISOString() });
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
      return res.status(200).json({ listings: rows.map((l) => ({ ...l, open: !l.closed_at && l.link_ok !== false })), meta: { count: rows.length } });
    }

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    let q = `listings?select=${COLS}&${LIVE}&order=first_seen.desc,id.asc`;
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
    return res.status(200).json({ listings: rows, meta: { count: rows.length, lastSync: lastRun?.[0]?.ran_at || null,
      ...(p.limit != null ? { limit: p.limit, offset: p.offset, more: listings.length === p.limit } : {}) } });
  } catch (e) {
    console.error("[listings]", e);
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "Couldn't load internships right now — try again in a minute" });
  }
}
