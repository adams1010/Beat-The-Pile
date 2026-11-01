// /api/discovery.js — public progress feed for the /discovery page.
import { db } from "../lib/db.js";
import { COMPANIES } from "../lib/companies.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  try {
    const rows = await db.select("company_candidates?select=company,status,ats,detail,intern_count,checked_at,verified_at,source&order=company.asc&limit=1000");
    const counts = {};
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
    return res.status(200).json({
      handVerified: COMPANIES.filter((c) => c.enabled).map((c) => c.company),
      counts,
      rows,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
