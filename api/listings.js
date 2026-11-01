// /api/listings.js — what the site shows. Only listings that are still on the company's
// board AND whose link passed (or hasn't failed) the daily check.
//   GET /api/listings                      → every US listing
//   GET /api/listings?state=VA,PA          → listings covering VA or PA (multi-site postings included)
//   GET /api/listings?state=VA&match=me    → strict ME titles only
import { db } from "../lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const states = String(req.query.state || "").toUpperCase().split(",").map((x) => x.trim()).filter((x) => /^[A-Z]{2}$/.test(x));
  const match = req.query.match === "me" ? "me" : null;

  let q = "listings?select=id,company,title,location,state,url,match,posted_on,first_seen,link_checked_at"
        + "&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)"
        + "&order=first_seen.desc&limit=1000";
  // state column holds "VA" or "WA,VA,PA" — match any requested state inside it
  if (states.length) q += `&and=(or(${states.map((s) => `state.ilike.*${s}*`).join(",")}))`;
  if (match) q += `&match=eq.${match}`;

  try {
    const [listings, lastRun] = await Promise.all([
      db.select(q),
      db.select("feed_runs?select=ran_at&order=ran_at.desc&limit=1"),
    ]);
    // ilike on "VA" could also hit e.g. "NVA" — re-check exactly
    const rows = states.length ? listings.filter((l) => String(l.state).split(",").some((s) => states.includes(s))) : listings;
    return res.status(200).json({ listings: rows, meta: { count: rows.length, lastSync: lastRun?.[0]?.ran_at || null } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
