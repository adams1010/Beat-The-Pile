// /api/usersync.js — the homepage's profile / tracker / resumes for signed-in students (table user_home).
// Every request needs a genuine Clerk session token; you can only ever read or write your own row.
//
//   POST { action:"get_all" }                                → { data: { profile, tracker, resumes } }
//   POST { action:"get", kind }                              → { data }
//   POST { action:"set", kind, data }                        → { ok }
//   POST { action:"migrate", profile, tracker, resumes }     → { ok } — first sign-in: MERGES this device's data
//                                                              into what's already saved (never wipes either side)
// kind = "profile" | "tracker" | "resumes".
// Writes are versioned (two tabs saving at once can't erase each other). Homepage tracker entries are also
// copied into My Season (user_jobs.apps, ids "h:…") so there is one list of applications across the site.
import crypto from "node:crypto";
import { verifyClerkJWT, bearer } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { mutate } from "../lib/userdata.js";

const KINDS = ["profile", "tracker", "resumes"];
const MAX_BYTES = 400 * 1024;            // per slice
const STAGE = { applied: "applied", interview: "interview", offer: "offer", rejected: "rejected" };

const trackerKey = (t) => `${String(t?.company || "").toLowerCase().trim()}|${String(t?.role || "").toLowerCase().trim()}`;
/** Union of two tracker lists by company+role; the entry changed most recently wins. */
export function mergeTracker(a, b) {
  const by = new Map();
  for (const t of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (!t || !t.company) continue;
    const k = trackerKey(t), prev = by.get(k);
    const ts = (x) => Number(x?.updatedAt || x?.appliedAt || Date.parse(x?.date || "") || 0);
    if (!prev || ts(t) >= ts(prev)) by.set(k, { ...prev, ...t });
  }
  return [...by.values()];
}
function mergeResumes(a, b) {
  const list = [...(a?.list || []), ...(b?.list || [])], seen = new Set(), out = [];
  for (const r of list) { const k = r?.id ?? r?.name; if (k == null || seen.has(k)) continue; seen.add(k); out.push(r); }
  return { list: out };
}

/** Homepage tracker → My Season applications (skips "Saved"). */
export function trackerToApps(tracker) {
  const out = [];
  for (const t of Array.isArray(tracker) ? tracker : []) {
    const stage = STAGE[String(t?.status || "").toLowerCase()];
    if (!stage || !t.company) continue;
    const id = "h:" + crypto.createHash("sha1").update(trackerKey(t)).digest("hex").slice(0, 16);
    const at = new Date(t.appliedAt || t.date || Date.now());
    out.push({ id, company: String(t.company).slice(0, 100), title: String(t.role || "Intern").slice(0, 160), url: null, stage,
               appliedAt: isNaN(at) ? new Date().toISOString() : at.toISOString(), postedAt: null, firstSeenAt: null, postedEstimate: false,
               source: "home", updatedAt: new Date().toISOString(), ...(t.followedUp ? { _fu: true } : {}) });
  }
  return out;
}
async function mirrorToSeason(uid, tracker) {
  const fromHome = trackerToApps(tracker);
  await mutate(uid, (row) => {
    const others = (Array.isArray(row.apps) ? row.apps : []).filter((a) => !String(a.id).startsWith("h:"));
    const kept = new Map((row.apps || []).filter((a) => String(a.id).startsWith("h:")).map((a) => [a.id, a]));
    const apps = [...others, ...fromHome.map((a) => {
      const m = { ...kept.get(a.id), ...a };            // keeps My Season-only fields (like followedUpAt) across syncs
      if (m._fu && !m.followedUpAt) m.followedUpAt = new Date().toISOString();   // "Followed up" on the homepage tracker counts too
      delete m._fu; return m;
    })];
    return { apps: apps.slice(0, 500) };
  });
}

async function loadHome(uid) {
  return (await db.selectAsAdmin(`user_home?select=*&clerk_user_id=eq.${encodeURIComponent(uid)}&limit=1`))[0] || null;
}
async function writeHome(uid, change) {
  for (let i = 0; i < 5; i++) {
    let row = await loadHome(uid);
    if (!row) { await db.insertIgnore("user_home", [{ clerk_user_id: uid }], "clerk_user_id"); row = await loadHome(uid); }
    const patch = change(row);
    const v = Number(row.version || 0);
    const done = await db.updateReturning(`user_home?clerk_user_id=eq.${encodeURIComponent(uid)}&version=eq.${v}`,
      { ...patch, version: v + 1, updated_at: new Date().toISOString() });
    if (done?.length) return done[0];
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
  }
  throw new Error("busy");
}
const tooBig = (x) => Buffer.byteLength(JSON.stringify(x ?? null)) > MAX_BYTES;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let uid;
  try { uid = await verifyClerkJWT(bearer(req)); } catch { return res.status(503).json({ error: "Sign-in check is temporarily unavailable" }); }
  if (!uid) return res.status(401).json({ error: "Not signed in" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  try {
    if (body.action === "get_all") {
      const r = await loadHome(uid);
      return res.status(200).json({ data: { profile: r?.profile ?? null, tracker: r?.tracker ?? null, resumes: r?.resumes ?? null } });
    }
    if (body.action === "get") {
      if (!KINDS.includes(body.kind)) return res.status(400).json({ error: "Invalid kind" });
      const r = await loadHome(uid);
      return res.status(200).json({ data: r?.[body.kind] ?? null });
    }
    if (body.action === "set") {
      if (!KINDS.includes(body.kind) || body.data === undefined) return res.status(400).json({ error: "Invalid kind or data" });
      if (tooBig(body.data)) return res.status(413).json({ error: "That's too much data to save" });
      await writeHome(uid, () => ({ [body.kind]: body.data }));
      if (body.kind === "tracker") await mirrorToSeason(uid, body.data);
      return res.status(200).json({ ok: true });
    }
    if (body.action === "migrate") {
      if ([body.profile, body.tracker, body.resumes].some(tooBig)) return res.status(413).json({ error: "That's too much data to save" });
      const row = await writeHome(uid, (r) => ({
        profile: r.profile ? { ...(body.profile || {}), ...r.profile } : (body.profile ?? null),   // saved account data wins over this device
        tracker: mergeTracker(r.tracker, body.tracker),
        resumes: mergeResumes(r.resumes, body.resumes),
      }));
      await mirrorToSeason(uid, row.tracker);
      return res.status(200).json({ ok: true, data: { profile: row.profile, tracker: row.tracker, resumes: row.resumes } });
    }
    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    console.error("[usersync]", e);
    return res.status(500).json({ error: "Couldn't sync, try again" });
  }
}
