// lib/talent.js — "Find talent" for employers (Nov 2026).
// Who can appear: ONLY students whose profile is public AND who turned on "Let employers find me"
// (profile.openToEmployers === true). A public profile alone is not consent to be in a searchable directory.
// Who can search: signed-in accounts that chose "I'm hiring" (Clerk unsafe_metadata.role === "employer").
// Cards carry only what the student already shows on their public page — never ids, email or the application kit.
import { db } from "./db.js";
import { schoolKey, sameMajor, card } from "./orbit.js";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();

/** Pure: filter + rank opted-in public profiles. Tested in tests/talent-test.mjs. */
export function searchTalent(rows, q = {}) {
  const words = norm(q.q).split(" ").filter((w) => w.length > 1).slice(0, 8);
  const sk = schoolKey(q.school), yr = Number(q.gradYear) || null;
  const out = [];
  for (const r of rows || []) {
    const p = r.profile;
    if (r.profile_public !== true || !r.handle || !p || p.openToEmployers !== true) continue;
    if (q.major && !sameMajor(p.major, q.major)) continue;
    if (sk && schoolKey(p.school) !== sk) continue;
    if (yr && Number(p.gradYear) !== yr) continue;
    const hay = norm([p.name, p.headline, p.major, p.school, p.lookingFor, p.about, ...(p.skills || []),
      ...(p.experience || []).flatMap((e) => [e.title, e.org]), ...(p.projects || []).map((x) => x.name)].join(" "));
    const hits = words.filter((w) => hay.includes(w)).length;
    if (words.length && !hits) continue;
    const skills = (p.skills || []).slice(0, 8);
    const latest = (p.experience || [])[0];
    out.push({ score: hits * 10 + skills.length + (p.photo ? 1 : 0) + (latest ? 2 : 0),
      card: card(r, { skills, lookingFor: p.lookingFor || "", latest: latest ? { title: latest.title || "", org: latest.org || "" } : null }) });
  }
  out.sort((a, b) => b.score - a.score || String(a.card.handle).localeCompare(b.card.handle));
  return { total: out.length, results: out.slice(0, 60).map((x) => x.card) };
}

/** The account's chosen role, read from Clerk (unsafe_metadata.role, set on /start/). */
export async function roleOf(uid) {
  if (!process.env.CLERK_SECRET_KEY) return null;
  const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (!r.ok) return null;
  const u = await r.json();
  const role = u?.unsafe_metadata?.role;
  return role === "employer" || role === "student" ? role : null;
}

export async function talentFor(q) {
  const rows = await db.selectAllAsAdmin("user_jobs?select=handle,profile,profile_public&profile_public=eq.true&order=handle.asc");
  return searchTalent(rows, q);
}
