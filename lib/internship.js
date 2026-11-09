// lib/internship.js — "My Internship" (Nov 2026): for students who already have an offer. Prepare, do great, turn it into a
// return offer. Stored in user_jobs.internship (jsonb; supabase/internship.sql). Saved through mutate() like every user_jobs write.
//   internship = { company, companyId, role, team, location, start, end, manager, checks{id:true}, log[{id,week,did,learned,win}],
//                  visible (show me to other incoming interns at the same company), notes }
// "Your people" only ever shows PUBLIC profiles (same rule as Orbit): students who list the company in their experience, and
// incoming interns who turned "visible" on.
import { db } from "./db.js";
import { card } from "./orbit.js";
import { normName } from "./simplify.js";

const t = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const para = (v, n) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
const day = (v) => { const s = String(v || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : null; };
const ID = /^[a-z0-9-]{2,40}$/;

export function cleanInternship(x) {
  if (!x || typeof x !== "object") return null;
  const company = t(x.company, 100);
  if (!company) return null;
  const checks = {};
  for (const [k, v] of Object.entries(x.checks && typeof x.checks === "object" ? x.checks : {}).slice(0, 80)) if (ID.test(k) && v === true) checks[k] = true;
  const log = (Array.isArray(x.log) ? x.log : []).slice(0, 30).map((e) => ({
    id: ID.test(String(e?.id || "")) ? e.id : "w-" + Math.random().toString(36).slice(2, 10),
    week: day(e?.week), did: para(e?.did, 800), learned: para(e?.learned, 500), win: para(e?.win, 400),
  })).filter((e) => e.did || e.learned || e.win);
  return {
    company, companyId: /^[a-z0-9-]{1,80}$/.test(String(x.companyId || "")) ? x.companyId : null,
    role: t(x.role, 120), team: t(x.team, 100), location: t(x.location, 100),
    start: day(x.start), end: day(x.end), manager: t(x.manager, 80),
    checks, log, visible: x.visible === true, notes: para(x.notes, 2000),
  };
}

/** Which phase of the internship are we in? (pure; tested) */
export function phaseOf(ix, now = Date.now()) {
  if (!ix?.start) return "after-offer";
  const s = Date.parse(ix.start), e = ix.end ? Date.parse(ix.end) : s + 70 * 864e5, d = 864e5;
  if (now < s - 14 * d) return "after-offer";
  if (now < s) return "before-start";
  if (now < s + 7 * d) return "first-week";
  if (now < e - 14 * d) return "middle";
  return "wrap-up";
}

/** Students who interned at this company (public profiles) + incoming interns at the same company who opted in. */
export async function internPeers(uid, ix) {
  const k = normName(ix?.company); if (!k) return { alumni: [], incoming: [] };
  const rows = await db.selectAllAsAdmin("user_jobs?select=clerk_user_id,handle,profile,profile_public,internship&profile_public=eq.true&order=clerk_user_id.asc");
  const others = rows.filter((r) => r.clerk_user_id !== uid && r.handle && r.profile);
  const alumni = others.filter((r) => (r.profile.experience || []).some((e) => normName(e.org) === k)).slice(0, 24)
    .map((r) => { const e = r.profile.experience.find((z) => normName(z.org) === k); return card(r, { role: e?.title || "", when: e?.when || "" }); });
  const incoming = others.filter((r) => r.internship?.visible === true && normName(r.internship.company) === k).slice(0, 40)
    .map((r) => card(r, { role: t(r.internship.role, 120), location: t(r.internship.location, 100), start: day(r.internship.start) }));
  return { alumni, incoming };
}
