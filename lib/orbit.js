import { schoolIdFor, shortSchool } from "./schools.js";
// lib/orbit.js — Orbit (the people side of Beat the Pile), part 1: no new tables.
//   classmates  = PUBLIC profiles at your school, same major (then same school, other majors)
//   schoolmates = PUBLIC profiles at your school, every major (Campus; your major first)
//   insiders    = PUBLIC profiles whose experience lists a company you want (followed ★, your Tracker, or typed on the tab) + their role there
//   everyone    = every other PUBLIC profile on the app (the "All" tab = classmates + campus + everyone)
//   feed        = new internships at companies you follow (last 7 days) + approved community posts
// Only profiles the student turned public (profile_public = true) are ever read. Nothing private leaves the server:
// cards carry name, headline, school, major, grad year, photo and the public /u/<handle> link — never ids or emails.
// Part 2 (supabase/orbit.sql, lib/orbitnet.js): two-way connections, messages, "going to the same fair".
import { db } from "./db.js";
import { normName } from "./simplify.js";
import { readFileSync } from "node:fs";

// "Northrop" / "NG" / "Northrop Grumman Corporation" are one company (data/company-aliases.json, the same list Interview practice uses)
let ALIAS = null;
function aliasOf(k) {
  if (!ALIAS) { ALIAS = new Map(); try {
    const j = JSON.parse(readFileSync(new URL("../data/company-aliases.json", import.meta.url), "utf8"));
    (j.aliases || []).forEach((g, i) => g.forEach((n) => { const x = normName(n); if (x.length >= 3) ALIAS.set(x, i); }));
  } catch {} }
  return ALIAS.get(k);
}
const words = (s) => String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(inc|llc|ltd|corp|corporation|company|co|the|plc)$/.test(w));
/** Does an experience org ("Northrop Grumman Mission Systems") belong to a company you want ("Northrop Grumman")? */
export function sameCompany(org, want) {
  const a = normName(org), b = normName(want);
  if (a.length < 2 || b.length < 2) return false;
  if (a === b) return true;
  const ga = aliasOf(a), gb = aliasOf(b); if (ga != null && ga === gb) return true;
  const wa = words(org), wb = words(want);   // the company's full name starts the org's name ("Northrop" → "Northrop Grumman …")
  return wb.length > 0 && wb.join("").length >= 5 && wb.every((w, i) => wa[i] === w);
}
const isCurrent = (e) => /present|current|now/i.test(String(e?.end || e?.when || ""));

// "Virginia Tech" and "Virginia Polytechnic Institute and State University" are the same school.
const SCHOOL_ALIASES = { vt: "virginiatech", virginiapolytechnicinstituteandstateuniversity: "virginiatech", virginiapolytechnicinstitute: "virginiatech" };
export function schoolKey(s) {
  const k = String(s || "").toLowerCase().replace(/&/g, "and").replace(/\b(the)\b/g, "").replace(/[^a-z0-9]/g, "");
  const a = SCHOOL_ALIASES[k] || k;
  const id = schoolIdFor(a); return id ? "id:" + id : a;           // any IPEDS name or alias → the same school
}
// Short forms students type → the full name (so "ME" and "Mechanical Engineering" are classmates)
const MAJOR_SHORT = { me: "mechanical engineering", mecheng: "mechanical engineering", mech: "mechanical engineering", ee: "electrical engineering",
  ece: "electrical and computer engineering", cpe: "computer engineering", cs: "computer science", cmda: "computational modeling and data analytics",
  ise: "industrial and systems engineering", ie: "industrial engineering", isye: "industrial and systems engineering", aoe: "aerospace and ocean engineering",
  ae: "aerospace engineering", bme: "biomedical engineering", cee: "civil and environmental engineering", ce: "civil engineering", che: "chemical engineering",
  chemeng: "chemical engineering", mse: "materials science and engineering", bit: "business information technology", mis: "management information systems",
  econ: "economics", psych: "psychology", poli: "political science", polisci: "political science", bio: "biology", chem: "chemistry", acct: "accounting", fin: "finance" };
const MAJOR_DROP = /\b(b\.?s\.?|b\.?a\.?|bachelor'?s?|of|in|science|arts|major|degree|and|&)\b/g;
export function majorKey(s) {
  let t = String(s || "").toLowerCase().trim();
  const short = MAJOR_SHORT[t.replace(/[^a-z]/g, "")]; if (short) t = short;
  return t.replace(/\bengr?\b|\beng\.?(?=\s|$)/g, "engineering").replace(MAJOR_DROP, " ").replace(/[^a-z]/g, "");
}
export function sameMajor(a, b) {
  const x = majorKey(a), y = majorKey(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 6 && y.length >= 6 && (x.includes(y) || y.includes(x)));
}

/** Same school? The official school id when both picked from the list (Nov 9), otherwise the name. */
export function sameSchool(a, b) {
  if (a?.schoolId && b?.schoolId) return +a.schoolId === +b.schoolId;
  const idOf = (p) => p?.schoolId || (schoolKey(p?.school).startsWith("id:") ? +schoolKey(p.school).slice(3) : null);
  const ia = idOf(a), ib = idOf(b);
  if (ia && ib) return +ia === +ib;
  const x = schoolKey(a?.school); return !!x && x === schoolKey(b?.school);
}
export function card(r, extra = {}) {
  const p = r.profile || {};
  return {
    handle: r.handle, name: p.name || r.handle, headline: p.headline || "", school: shortSchool(p.schoolId || p.school) || "", major: p.major || "",
    gradYear: p.gradYear || null, staff: p.staff || null,
    coffee: p.coffee === true, askMe: (Array.isArray(p.askMe) ? p.askMe : []).slice(0, 3).map((x) => String(x).slice(0, 40)),
    photo: typeof p.photo === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p.photo) && p.photo.length < 200000 ? p.photo : null,
    ...extra,
  };
}

/** Pure: everything Orbit shows, from rows already loaded. Tested in tests/orbit-test.mjs. */
export function buildOrbit({ uid, me, publics, followed, fresh, posts, states, targets }) {
  const mine = me?.profile || {};
  const others = (publics || []).filter((r) => r.clerk_user_id !== uid && r.profile_public === true && r.handle && r.profile);
  const sk = schoolKey(mine.school) || (mine.schoolId ? String(mine.schoolId) : "");
  const atSchool = sk ? others.filter((r) => sameSchool(r.profile, mine)) : [];
  const yr = Number(mine.gradYear) || 0;
  const byYear = (a, b) => Math.abs((a.profile.gradYear || 0) - yr) - Math.abs((b.profile.gradYear || 0) - yr) || String(a.handle).localeCompare(b.handle);
  const ln = (r) => ({ link: states?.get(r.clerk_user_id) || "none" });
  const classmates = atSchool.filter((r) => sameMajor(r.profile.major, mine.major)).sort(byYear).slice(0, 24).map((r) => card(r, ln(r)));
  const seen = new Set(classmates.map((c) => c.handle));
  // Campus (Nov 15 pm): the whole school, your major first.
  const schoolmates = [...classmates, ...atSchool.filter((r) => !seen.has(r.handle)).sort(byYear).slice(0, 36).map((r) => card(r, ln(r)))];

  // Everyone else on the app with a public profile (the "All" tab = classmates + campus + these).
  for (const c of schoolmates) seen.add(c.handle);
  const everyone = others.filter((r) => !seen.has(r.handle)).sort(byYear).slice(0, 60).map((r) => card(r, ln(r)));

  // Insiders: people who interned or work where you want to be. Companies you want = followed ★ + your Tracker + typed on the tab.
  const want = [];
  for (const n of [...(followed || []).map((c) => c.company), ...(targets || [])]) {
    const t = String(n || "").trim().slice(0, 80); if (t && !want.some((w) => normName(w) === normName(t))) want.push(t);
  }
  const insiders = [];
  if (want.length) for (const r of others) {
    const exp = (r.profile.experience || []).filter((e) => e && e.org);
    let hit = null, co = null;
    for (const e of exp) { co = want.find((w) => sameCompany(e.org, w)); if (co) { hit = e; break; } }
    if (!hit) continue;
    const type = hit.type || (/intern|co-?op/i.test(hit.title || "") ? "internship" : "");
    insiders.push([r, card(r, { ...ln(r), at: String(hit.org).slice(0, 80), role: String(hit.title || "").slice(0, 80), when: String(hit.when || "").slice(0, 40),
      now: isCurrent(hit), type: type === "internship" ? "internship" : "job", wanted: co })]);
  }
  insiders.sort((x, y) => (y[1].now - x[1].now) || byYear(x[0], y[0]));

  const feed = [
    ...(fresh || []).map((l) => ({ kind: "job", at: l.first_seen, company: l.company, companyId: l.company_id, title: l.title, location: l.location || l.state || "", url: l.url })),
    ...(posts || []).map((p) => ({ kind: "post", at: p.created_at, name: p.display_name || "A student", category: p.category || "", text: String(p.content || "").slice(0, 600), id: p.id })),
  ].filter((x) => x.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 40);

  return {
    me: { name: mine.name || "", photo: card({ profile: mine }).photo, school: shortSchool(mine.schoolId || mine.school) || "", major: mine.major || "", gradYear: mine.gradYear || null, handle: me?.handle || null,
          isPublic: me?.profile_public === true, hasPhoto: !!me?.profile?.photo, hasSchool: !!sk, hasMajor: !!majorKey(mine.major), hasExperience: (mine.experience || []).some((e) => e && e.org), following: (followed || []).length },
    classmates, schoolmates, everyone, insiders: insiders.slice(0, 48).map(([, c]) => c), targets: want.slice(0, 30), feed,
  };
}

/** Loads the rows and builds Orbit for one signed-in student. */
export async function orbitFor(uid, row, extras, typed) {
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
  const tracker = (Array.isArray(row?.apps) ? row.apps : []).map((a) => a?.company).filter(Boolean).slice(0, 40);
  const mine = (Array.isArray(typed) ? typed : []).map((t) => String(t || "").trim()).filter((t) => t.length >= 2).slice(0, 10);
  const out = buildOrbit({ uid, me: row, publics, followed, fresh, posts, states: x?.states, targets: [...mine, ...tracker] });
  if (x) { const { states, ...rest } = x; Object.assign(out, rest); }
  return out;
}
