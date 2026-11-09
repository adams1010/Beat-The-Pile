// lib/orbit.js — Orbit (the people side of Beat the Pile), part 1: no new tables.
//   classmates  = PUBLIC profiles at your school, same major (then same school, other majors)
//   atTargets   = PUBLIC profiles whose experience lists a company you follow (★ on Jobs / Career Fair)
//   feed        = new internships at companies you follow (last 7 days) + approved community posts
// Only profiles the student turned public (profile_public = true) are ever read. Nothing private leaves the server:
// cards carry name, headline, school, major, grad year, photo and the public /u/<handle> link — never ids or emails.
// Part 2 (supabase/orbit.sql, lib/orbitnet.js): two-way connections, messages, "going to the same fair".
import { db } from "./db.js";
import { normName } from "./simplify.js";

// "Virginia Tech" and "Virginia Polytechnic Institute and State University" are the same school.
const SCHOOL_ALIASES = { vt: "virginiatech", virginiapolytechnicinstituteandstateuniversity: "virginiatech", virginiapolytechnicinstitute: "virginiatech" };
export function schoolKey(s) {
  const k = String(s || "").toLowerCase().replace(/&/g, "and").replace(/\b(the)\b/g, "").replace(/[^a-z0-9]/g, "");
  return SCHOOL_ALIASES[k] || k;
}
const MAJOR_DROP = /\b(b\.?s\.?|b\.?a\.?|bachelor'?s?|of|in|science|arts|major|degree|and|&)\b/g;
export function majorKey(s) { return String(s || "").toLowerCase().replace(MAJOR_DROP, " ").replace(/[^a-z]/g, ""); }
export function sameMajor(a, b) {
  const x = majorKey(a), y = majorKey(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 6 && y.length >= 6 && (x.includes(y) || y.includes(x)));
}

/** Same school? The official school id when both picked from the list (Nov 9), otherwise the name. */
export function sameSchool(a, b) {
  if (a?.schoolId && b?.schoolId) return +a.schoolId === +b.schoolId;
  const x = schoolKey(a?.school); return !!x && x === schoolKey(b?.school);
}
export function card(r, extra = {}) {
  const p = r.profile || {};
  return {
    handle: r.handle, name: p.name || r.handle, headline: p.headline || "", school: p.school || "", major: p.major || "",
    gradYear: p.gradYear || null,
    photo: typeof p.photo === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p.photo) && p.photo.length < 200000 ? p.photo : null,
    ...extra,
  };
}

/** Pure: everything Orbit shows, from rows already loaded. Tested in tests/orbit-test.mjs. */
export function buildOrbit({ uid, me, publics, followed, fresh, posts, states }) {
  const mine = me?.profile || {};
  const others = (publics || []).filter((r) => r.clerk_user_id !== uid && r.profile_public === true && r.handle && r.profile);
  const sk = schoolKey(mine.school) || (mine.schoolId ? String(mine.schoolId) : "");
  const atSchool = sk ? others.filter((r) => sameSchool(r.profile, mine)) : [];
  const yr = Number(mine.gradYear) || 0;
  const byYear = (a, b) => Math.abs((a.profile.gradYear || 0) - yr) - Math.abs((b.profile.gradYear || 0) - yr) || String(a.handle).localeCompare(b.handle);
  const ln = (r) => ({ link: states?.get(r.clerk_user_id) || "none" });
  const classmates = atSchool.filter((r) => sameMajor(r.profile.major, mine.major)).sort(byYear).slice(0, 24).map((r) => card(r, ln(r)));
  const seen = new Set(classmates.map((c) => c.handle));
  const schoolmates = atSchool.filter((r) => !seen.has(r.handle)).sort(byYear).slice(0, 12).map((r) => card(r, ln(r)));

  // followed: [{ id, company }] → match against each public profile's experience orgs (exact normalized name)
  const want = new Map((followed || []).map((c) => [normName(c.company), c.company]).filter(([k]) => k.length >= 2));
  const atTargets = [];
  for (const r of others) {
    const hit = (r.profile.experience || []).find((e) => want.has(normName(e.org)));
    if (hit) atTargets.push(card(r, { ...ln(r), at: want.get(normName(hit.org)), role: hit.title || "", when: hit.when || "" }));
    if (atTargets.length >= 24) break;
  }

  const feed = [
    ...(fresh || []).map((l) => ({ kind: "job", at: l.first_seen, company: l.company, companyId: l.company_id, title: l.title, location: l.location || l.state || "", url: l.url })),
    ...(posts || []).map((p) => ({ kind: "post", at: p.created_at, name: p.display_name || "A student", category: p.category || "", text: String(p.content || "").slice(0, 600), id: p.id })),
  ].filter((x) => x.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 40);

  return {
    me: { name: mine.name || "", school: mine.school || "", major: mine.major || "", gradYear: mine.gradYear || null, handle: me?.handle || null,
          isPublic: me?.profile_public === true, hasSchool: !!sk, hasMajor: !!majorKey(mine.major), following: (followed || []).length },
    classmates, schoolmates, atTargets, feed,
  };
}

/** Loads the rows and builds Orbit for one signed-in student. */
export async function orbitFor(uid, row, extras) {
  const starred = (row?.starred || []).filter((x) => /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 300);
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const LIVE = "closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)";
  const ids = starred.map(encodeURIComponent).join(",");
  const [publics, followed, fresh, posts] = await Promise.all([
    db.selectAllAsAdmin("user_jobs?select=clerk_user_id,handle,profile,profile_public,orbit_fair,orbit_fair_on&profile_public=eq.true&order=handle.asc"),
    starred.length ? db.selectAsAdmin(`company_candidates?select=id,company&id=in.(${ids})&limit=300`) : [],
    starred.length ? db.selectAsAdmin(`listings?select=id,company_id,company,title,location,state,url,first_seen&${LIVE}&company_id=in.(${ids})&first_seen=gt.${week}&order=first_seen.desc&limit=25`) : [],
    db.selectAsAdmin("community_posts?select=id,content,display_name,category,created_at&status=eq.approved&order=created_at.desc&limit=12").catch(() => []),
  ]);
  const x = extras ? await extras(uid, row, publics) : null;
  const out = buildOrbit({ uid, me: row, publics, followed, fresh, posts, states: x?.states });
  if (x) { const { states, ...rest } = x; Object.assign(out, rest); }
  return out;
}
