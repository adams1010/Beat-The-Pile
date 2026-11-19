// lib/talent.js — "Find talent" for employers (Nov 2026).
// Who can appear: ONLY students whose profile is public AND who turned on "Let employers find me"
// (profile.openToEmployers === true). A public profile alone is not consent to be in a searchable directory.
// Who can search: signed-in accounts that chose "I'm hiring" (Clerk unsafe_metadata.role === "employer").
// Cards carry only what the student already shows on their public page — never ids, email or the application kit.
import { db } from "./db.js";
import { schoolKey, sameMajor, card } from "./orbit.js";
import { shortSchool } from "./schools.js";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();

/** Pure: filter + rank opted-in public profiles. Tested in tests/talent-test.mjs.
 *  Nov 19 (owner): every filter is a dropdown built from the whole pool (`facets`, before filtering), bigger cards, 24 per page. */
export const PAGE = 24;
export function searchTalent(rows, q = {}) {
  const words = norm(q.q).split(" ").filter((w) => w.length > 1).slice(0, 8);
  const sk = schoolKey(q.school), yr = Number(q.gradYear) || null, skill = norm(q.skill), open = q.openTo === "intern" || q.openTo === "fulltime" ? q.openTo : "";
  const pool = (rows || []).filter((r) => r.profile_public === true && r.handle && r.profile && r.profile.openToEmployers === true && !r.profile.staff);   // faculty & staff are never in Find talent
  const tally = (f) => { const m = new Map(); for (const r of pool) for (const v of f(r.profile)) { const k = String(v || "").trim(); if (k) m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, n]) => ({ value, n })); };
  const facets = {
    majors: tally((p) => [p.major]).slice(0, 200),
    schools: tally((p) => [shortSchool(p.schoolId || p.school) || p.school]).slice(0, 200),
    gradYears: tally((p) => [p.gradYear]).sort((a, b) => Number(a.value) - Number(b.value)),
    skills: tally((p) => [...new Set((p.skills || []).map((x) => String(x).trim()))]).slice(0, 150),
    openTo: tally((p) => (Array.isArray(p.openTo) ? p.openTo : []).filter((x) => x === "intern" || x === "fulltime")),
  };
  const out = [];
  for (const r of pool) {
    const p = r.profile;
    if (q.major && !sameMajor(p.major, q.major)) continue;
    if (sk && schoolKey(p.school) !== sk && schoolKey(shortSchool(p.schoolId || p.school)) !== sk) continue;
    if (yr && Number(p.gradYear) !== yr) continue;
    if (skill && !(p.skills || []).some((x) => norm(x) === skill)) continue;
    if (open && !(p.openTo || []).includes(open)) continue;
    const hay = norm([p.name, p.headline, p.major, p.school, p.lookingFor, p.about, ...(p.skills || []),
      ...(p.experience || []).flatMap((e) => [e.title, e.org]), ...(p.projects || []).map((x) => x.name)].join(" "));
    const hits = words.filter((w) => hay.includes(w)).length;
    if (words.length && !hits) continue;
    const skills = (p.skills || []).slice(0, 10);
    const exp = (p.experience || []).filter((e) => e && (e.title || e.org)).slice(0, 2).map((e) => ({ title: String(e.title || "").slice(0, 80), org: String(e.org || "").slice(0, 80), when: String(e.when || "").slice(0, 40), type: String(e.type || "").slice(0, 20) }));
    const filled = [p.photo, p.headline, p.about, skills.length, exp.length, (p.projects || []).length].filter(Boolean).length;
    out.push({ score: hits * 10 + filled * 2 + skills.length,
      card: card(r, { skills, lookingFor: p.lookingFor || "", latest: exp[0] || null, exp, about: String(p.about || "").replace(/\s+/g, " ").slice(0, 240),
        gradTerm: ["Spring", "Summer", "Fall", "Winter"].includes(p.gradTerm) ? p.gradTerm : "", openTo: (p.openTo || []).filter((x) => x === "intern" || x === "fulltime"),
        hometown: String(p.hometown || "").slice(0, 60), projects: (p.projects || []).length, expCount: (p.experience || []).length }) });
  }
  out.sort((a, b) => b.score - a.score || String(a.card.handle).localeCompare(b.card.handle));
  const pages = Math.max(1, Math.ceil(out.length / PAGE)), page = Math.min(Math.max(1, Number(q.page) || 1), pages);
  return { total: out.length, pool: pool.length, page, pages, facets, results: out.slice((page - 1) * PAGE, page * PAGE).map((x) => x.card) };
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
