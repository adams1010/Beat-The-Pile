// /api/results.js — the homepage quiz's results. ONLY real, open internships from companies' own job boards
// (the `listings` table the robot fills). Nothing here is AI-generated or guessed.
//   POST { zip, major, type }  → { results: [...], meta }
// Search area grows honestly: your state → your state + neighboring states → all of the US,
// and meta.expansionLabel says exactly which one was used. Remote-only searches look for listings that say "Remote".
import { db } from "../lib/db.js";
import { zipToState, NEIGHBORS, fieldsForMajor } from "../lib/geo.js";

const WANT = 21;          // grow the area until at least this many openings
const MAX = 60;

export function toCard(l) {
  return {
    name: l.company, role: l.title, location: l.location || "", industry: "", website: "",
    hasLinkedin: false, tier: "regional", locationBand: null,
    applyUrl: l.url, listingId: l.id, companyId: l.company_id, firstSeen: l.first_seen, postedOn: l.posted_on || null,
    source: "db", verified: true,
    reason: `Open now on ${l.company}'s own job board — we found it there ourselves.`,
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
  const state = zipToState(zip);
  if (!remote && !state) return res.status(400).json({ error: "We couldn't read that ZIP code — check it and try again" });

  const fields = fieldsForMajor(major);
  let base = "listings?select=id,company_id,company,title,location,state,url,posted_on,first_seen"
           + "&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)&order=first_seen.desc,id.asc";
  if (fields) base += `&field=in.(${fields.join(",")})`;
  else base += "&match=not.is.null";
  if (remote) base += "&location=ilike.*remote*";

  const rings = remote ? [{ states: null, label: null }] : [
    { states: [state], label: null },
    { states: [state, ...(NEIGHBORS[state] || [])], label: `${state} + neighboring states` },
    { states: null, label: "all of the US" },
  ];
  try {
    let rows = [], used = rings[0];
    for (const ring of rings) {
      const q = ring.states ? `${base}&and=(or(${ring.states.map((s) => `state.ilike.*${s}*`).join(",")}))` : base;
      const got = await db.select(`${q}&limit=400`);
      rows = ring.states ? got.filter((l) => String(l.state || "").split(",").some((s) => ring.states.includes(s))) : got;
      used = ring;
      if (rows.length >= WANT) break;
    }
    // One card per company first (most variety), then fill with extra roles
    const seen = new Set(), first = [], rest = [];
    for (const l of rows) (seen.has(l.company_id) ? rest : (seen.add(l.company_id), first)).push(l);
    const results = [...first, ...rest].slice(0, MAX).map(toCard);
    return res.status(200).json({
      results,
      meta: { studentState: state, radiusExpanded: !!used.label, expansionLabel: used.label, remote,
              fields: fields || ["engineering"], dbCount: results.length, total: results.length, aiUsed: false, aiCount: 0 },
    });
  } catch (e) {
    console.error("[results]", e);
    return res.status(503).json({ error: "Couldn't load internships right now — try again in a minute" });
  }
}
