// /api/discovery.js — the /discovery page's data.
//   GET  → public progress feed (every candidate company, its status, and any link already tried)
//   POST → admin only (InternIQ owner, signed in with Clerk):
//          { id, hint }                 paste a job-board link for a company the robot couldn't find
//          { company, domain, hint? }   add a brand-new company to the robot's list
//          A pasted link is never trusted by itself — the robot re-checks it and must still prove it's theirs.
import { db, isAuthorizedCron } from "../lib/db.js";
import { COMPANIES } from "../lib/companies.js";
import { verifyClerkJWT, bearer } from "../lib/auth.js";

const ADMINS = (process.env.ADMIN_EMAILS || "shiloniadam10@gmail.com,mdxp21@gmail.com").toLowerCase().split(/[,\s]+/).filter(Boolean);
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanUrl = (u) => { try { const x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol) ? x.toString() : null; } catch { return null; } };
const cleanDomain = (d) => String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

async function adminEmail(req) {
  const uid = await verifyClerkJWT(bearer(req));
  if (!uid) return null;
  const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (!r.ok) return null;
  const u = await r.json();
  const emails = (u.email_addresses || []).filter((e) => e.verification?.status === "verified").map((e) => e.email_address.toLowerCase());
  return emails.find((e) => ADMINS.includes(e)) || null;
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    res.setHeader("Cache-Control", "no-store");
    let who;
    // The nightly browser pass (GitHub Actions, holds CRON_SECRET) may also suggest links — they get the same proof checks
    if (isAuthorizedCron(req)) who = "robot";
    else try { who = await adminEmail(req); } catch { return res.status(503).json({ error: "Sign-in check unavailable" }); }
    if (!who) return res.status(403).json({ error: "Only the InternIQ owner can edit the robot's list" });

    let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
    try {
      if (b?.id) {                                        // link for an existing company
        const hint = cleanUrl(b.hint);
        if (!hint) return res.status(400).json({ error: "That doesn't look like a link (needs https://…)" });
        await db.update(`company_candidates?id=eq.${encodeURIComponent(b.id)}`, { hint, status: "pending", checked_at: null,
          detail: who === "robot" ? "Browser pass found a job board — robot will verify it" : "Link added — robot will check it within the hour" });
        return res.status(200).json({ ok: true });
      }
      const company = String(b?.company || "").trim().slice(0, 80);
      const domain = cleanDomain(b?.domain);
      const hint = b?.hint ? cleanUrl(b.hint) : null;
      if (company.length < 2 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return res.status(400).json({ error: "Need a company name and its website (like acme.com)" });
      const key = slug(company).replace(/-(inc|llc|corp|corporation|company|co|group)$/g, "").replace(/-/g, "");
      await db.insert("company_candidates", [{ id: "x-" + slug(company), company, domain, key, hint, source: "Added on /discovery", status: "pending" }]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      const dup = /duplicate|23505/.test(String(e.message));
      return res.status(dup ? 409 : 500).json({ error: dup ? "That company is already on the list" : "Couldn't save", detail: String(e.message).slice(0, 160) });
    }
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  try {
    const rows = await db.select("company_candidates?select=id,company,domain,hint,status,ats,detail,intern_count,attempts,checked_at,verified_at,source&order=company.asc&limit=2000");
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
