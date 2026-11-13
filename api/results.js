// /api/results.js — the homepage quiz's results. ONLY real, open internships from companies' own job boards
// (the `listings` table the robot fills). Nothing here is AI-generated or guessed.
//   POST { zip, major, type }  → { results: [...], meta }
// Nov 10: in-person / hybrid / any = ONLY openings within the student's radius of their ZIP (10–200 mi, default 50),
// measured city to city like /jobs "near". Never widened to far-away states: too few nearby → say so, and the page
// offers a wider radius. "Any" also adds openings that say Remote (labeled). Remote-only = listings that say "Remote".
import { db } from "../lib/db.js";
import { zipToState, fieldsForMajor } from "../lib/geo.js";
import { lookupPlace, miles } from "../lib/geocode.js";

const MAX = 60;

export function toCard(l) {
  return {
    name: l.company, role: l.title, location: l.location || "", industry: "", website: "",
    hasLinkedin: false, tier: "regional", locationBand: l.remote ? "remote" : null,
    applyUrl: l.url, listingId: l.id, companyId: l.company_id, firstSeen: l.first_seen, postedOn: l.posted_on || null,
    source: "db", verified: true,
    reason: `Open now on ${l.company}'s own job board, we found it there ourselves.`,
    ...(l.mi != null ? { mi: l.mi } : {}), ...(l.remote ? { remote: true } : {}),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const zip = String(body?.zip || "").trim(), major = String(body?.major || "").slice(0, 300), type = String(body?.type || "Any");
  if (!major) return res.status(400).json({ error: "Missing major" });
  const remote = type === "Remote";
  const radius = Math.min(200, Math.max(10, Math.round(Number(body?.radius) || 50)));
  const state = zipToState(zip), center = remote ? null : lookupPlace(zip);
  if (!remote && (!state || !center)) return res.status(400).json({ error: "We couldn't read that ZIP code, check it and try again" });

  const fields = fieldsForMajor(major);
  let base = "listings?select=id,company_id,company,title,location,state,url,posted_on,first_seen,geo_pts"
           + "&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)&order=first_seen.desc,id.asc";
  if (fields) base += `&field=in.(${fields.join(",")})`;      // unknown major ("Other") → every major
  const remoteQ = `${base}&location=ilike.*remote*&limit=400`;
  try {
    let rows = [];
    if (remote) rows = await db.select(remoteQ);
    else {
      const dLat = radius / 69, dLng = radius / (69 * Math.cos((center[0] * Math.PI) / 180)), r4 = (x) => Math.round(x * 1e4) / 1e4;
      const box = `and(geo_lat.gte.${r4(center[0] - dLat)},geo_lat.lte.${r4(center[0] + dLat)},geo_lng.gte.${r4(center[1] - dLng)},geo_lng.lte.${r4(center[1] + dLng)})`;
      const cand = [];
      for (let off = 0; off < 10000; off += 1000) { const page = await db.select(`${base}&and=(or(${box},geo_n.gt.1))&limit=1000&offset=${off}`); cand.push(...page); if (page.length < 1000) break; }
      for (const l of cand) {
        const pts = Array.isArray(l.geo_pts) ? l.geo_pts : [];
        const d = pts.length ? Math.min(...pts.map((pt) => miles(center, pt))) : Infinity;
        if (d <= radius) rows.push({ ...l, mi: Math.round(d) });        // the hard rule: inside the radius, no exceptions
      }
      rows.sort((x, y) => x.mi - y.mi || (x.first_seen < y.first_seen ? 1 : -1));
      if (type === "Any") rows.push(...(await db.select(remoteQ)).filter((l) => !rows.some((x) => x.id === l.id)).map((l) => ({ ...l, remote: true })));
    }
    // One card per company first (most variety), then fill with extra roles
    const seen = new Set(), first = [], rest = [];
    for (const l of rows) (seen.has(l.company_id) ? rest : (seen.add(l.company_id), first)).push(l);
    const results = [...first, ...rest].slice(0, MAX).map(toCard);
    const nearby = results.filter((c) => c.mi != null).length;
    return res.status(200).json({
      results,
      meta: { studentState: state, zip: remote ? null : zip, radius: remote ? null : radius, nearby, radiusExpanded: false, expansionLabel: null, remote,
              fields: fields || ["all"], dbCount: results.length, total: results.length, aiUsed: false, aiCount: 0 },
    });
  } catch (e) {
    console.error("[results]", e);
    return res.status(503).json({ error: "Couldn't load internships right now, try again in a minute" });
  }
}
