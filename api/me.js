// /api/me.js — the signed-in student's saved + applied internships.
//   GET  /api/me                              → { saved: [...ids], applied: [...ids] }
//   POST /api/me  { list, id, on }            → toggles one id in "saved" or "applied"
// Requires a genuine Clerk session token (signature-checked in lib/auth.js).
import { verifyClerkJWT, bearer } from "../lib/auth.js";
import { db } from "../lib/db.js";

const LISTS = ["saved", "applied"];
const MAX = 500;
const ID_OK = /^[a-z0-9-]+:.{1,200}$/;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  let uid;
  try { uid = await verifyClerkJWT(bearer(req)); }
  catch { return res.status(503).json({ error: "Sign-in check is temporarily unavailable" }); }
  if (!uid) return res.status(401).json({ error: "Not signed in" });

  const load = async () => {
    const rows = await db.selectAsAdmin(`user_jobs?select=saved,applied&clerk_user_id=eq.${encodeURIComponent(uid)}&limit=1`);
    return { saved: rows[0]?.saved || [], applied: rows[0]?.applied || [] };
  };

  try {
    if (req.method === "GET") return res.status(200).json(await load());
    if (req.method !== "POST") return res.status(405).json({ error: "GET or POST" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const list = body?.list, id = String(body?.id || ""), on = body?.on === true;
    if (!LISTS.includes(list) || !ID_OK.test(id)) return res.status(400).json({ error: "Bad request" });

    const cur = await load();
    const set = new Set(cur[list]);
    if (on) set.add(id); else set.delete(id);
    if (set.size > MAX) return res.status(400).json({ error: `List is full (${MAX})` });
    const next = { ...cur, [list]: [...set] };
    await db.upsert("user_jobs", [{ clerk_user_id: uid, saved: next.saved, applied: next.applied, updated_at: new Date().toISOString() }], "clerk_user_id");
    return res.status(200).json(next);
  } catch (e) {
    return res.status(500).json({ error: "Couldn't update your list", detail: String(e.message || e).slice(0, 160) });
  }
}
