// Badges (Nov 16, owner): everyone signs up with a PERSONAL account (or sets up a company page). Roles are earned as badges:
//   · Recruiter · <Company>  = a VERIFIED employers row for this person (work-email code + owner approval, lib/employer.js);
//     it also unlocks Find talent from the personal account
//   · Professor / Advisor … · <School> = profile.staffVerified (school-domain email + directory page + owner approval,
//     lib/staffcheck.js)
// Nothing self-declared shows as a badge.
import { db } from "./db.js";
import { cleanBizProfile } from "./employer.js";

let CACHE = null, AT = 0;
/** uid → { org, title, kind, page } for every verified business row (cached 60 s; small table). */
export async function loadRecruiters(force = false) {
  if (!force && CACHE && Date.now() - AT < 60000) return CACHE;
  const rows = await db.selectAllAsAdmin("employers?select=clerk_user_id,profile,slug,domain,status&status=eq.verified").catch(() => null);
  if (!rows) return CACHE || new Map();
  const pageAt = new Map();
  for (const r of rows) { const p = cleanBizProfile(r.profile); if (p.kind !== "recruiter" && r.domain && !pageAt.has(r.domain)) pageAt.set(r.domain, r.slug); }
  CACHE = new Map(rows.map((r) => { const p = cleanBizProfile(r.profile);
    return [r.clerk_user_id, { org: p.company || "", title: p.title || "", kind: p.kind || "company", page: pageAt.get(r.domain) ? "/co/" + pageAt.get(r.domain) : r.slug ? "/co/" + r.slug : null }]; }));
  AT = Date.now();
  return CACHE;
}
export const _setRecruiters = (m) => { CACHE = m; AT = Date.now(); };
const recruiterNow = (uid) => (CACHE && uid ? CACHE.get(uid) : null) || null;

/** Badges for one person (call loadRecruiters() first). */
export function badgesOf(uid, profile) {
  const out = [], p = profile || {};
  const r = recruiterNow(uid);
  if (r && r.org) out.push({ kind: "recruiter", label: r.kind === "recruiter" ? "Recruiter" : (r.title || "Company team"), org: r.org, page: r.page });
  const v = p.staffVerified;
  if (v && p.staff && v.role === p.staff) out.push({ kind: "staff", label: p.staff, org: v.school || p.school || "" });
  return out;
}
