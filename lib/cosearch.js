// Company search + follow any company (Nov 15). Students can find and follow:
//   · companies we track (key = company_candidates id, e.g. "x-boeing") → new jobs, alerts, fair plans
//   · business pages on Beat the Pile (/co/<slug>, verified only) → key = their company_id, or "co-<slug>" when they
//     have no job board we read (e.g. the Beat the Pile business account itself)
//   Nov 15 (owner): only companies a verified person claimed are searchable/followable/"Verified" here; jobs from every
//   proven board stay on /jobs. (The earlier "follow any name → queue it for the finder" path is gone.)
import { db } from "./db.js";
import { normName } from "./simplify.js";
import { cleanBizProfile } from "./employer.js";

const enc = encodeURIComponent;
/** Logo Finder value → image URL ("fav:<domain>" = Google's icon for the PROVEN domain; "none"/junk → null). */
export const logoUrl = (v) => !v ? null : String(v).startsWith("fav:") ? `https://www.google.com/s2/favicons?domain=${enc(String(v).slice(4))}&sz=128` : /^https:\/\//.test(v) ? v : null;
const LIVE_L = "closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)";
export const cleanQ = (q) => String(q || "").replace(/[*,()"\\%.:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
/** Same id the Company Finder gives a queued company (api/discover.js refill). */
export const finderId = (name) => "s-" + String(name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
/** What a student stores to follow a business page. */
export const empKey = (row) => row.company_id || "co-" + row.slug;
/** Every key that counts as following this business page (old "co-" follows still count after a job board is linked). */
export const empKeys = (row) => [row.company_id, row.slug && "co-" + row.slug].filter(Boolean);

function rank(name, q) {
  const n = normName(name), k = normName(q);
  if (!k) return 3;
  return n === k ? 0 : n.startsWith(k) ? 1 : String(name).toLowerCase().split(/[^a-z0-9]+/).some((w) => w.startsWith(q.toLowerCase().split(" ")[0])) ? 2 : 3;
}

/** Up to `limit` VERIFIED companies (a person at the company claimed the page and an owner approved it) whose name matches q.
 *  Nov 15 (owner): companies nobody has claimed don't get a page, a Verified tag, Follow or a logo; their jobs stay on /jobs. */
export async function searchCompanies(q, { limit = 24 } = {}) {
  const t = cleanQ(q); if (t.length < 2) return [];
  const pat = enc(`*${t.replace(/ /g, "*")}*`);
  const emps = await db.selectAsAdmin(`employers?select=slug,profile,company_id,status&status=eq.verified&profile->>company=ilike.${pat}&limit=40`).catch(() => []);
  const out = new Map();
  for (const e of emps) {
    const p = cleanBizProfile(e.profile); if (p.kind === "recruiter" || !p.company) continue;
    const k = empKey(e); if (out.has(k)) continue;
    out.set(k, { key: k, name: p.company, page: "/co/" + e.slug, verified: true, logo: p.logo || null, tagline: p.tagline || "", companyId: e.company_id || null });
  }
  const list = [...out.values()].map((r, i) => ({ r, i, s: rank(r.name, t) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.r).slice(0, limit);
  await Promise.all(list.filter((r) => r.companyId).map(async (r) => { r.open = await db.count(`listings?company_id=eq.${enc(r.companyId)}&${LIVE_L}`).catch(() => null); r.jobs = r.companyId; }));
  return list.map(({ companyId, ...r }) => r);
}

/** Names for follow keys (the "Companies you follow" list). Unknown keys come back with name null. */
export async function namesForKeys(keys) {
  keys = [...new Set(keys)].filter((k) => /^[a-z0-9-]{1,80}$/.test(k)).slice(0, 200);
  if (!keys.length) return [];
  const co = keys.filter((k) => k.startsWith("co-")).map((k) => k.slice(3));
  const ids = keys.filter((k) => !k.startsWith("co-"));
  const [cands, emps] = await Promise.all([
    ids.length ? db.selectAsAdmin(`company_candidates?select=id,company,status,logo&id=in.(${ids.map(enc).join(",")})`).catch(() => []) : [],
    db.selectAsAdmin(`employers?select=slug,profile,company_id,status&status=eq.verified&or=(${[co.length ? `slug.in.(${co.map(enc).join(",")})` : "", ids.length ? `company_id.in.(${ids.map(enc).join(",")})` : ""].filter(Boolean).join(",")})&limit=200`).catch(() => []),
  ]);
  const by = new Map();
  for (const c of cands) by.set(c.id, { key: c.id, name: c.company, tracked: c.status === "live" });
  for (const e of emps) {
    const p = cleanBizProfile(e.profile); if (p.kind === "recruiter") continue;
    for (const k of empKeys(e)) if (keys.includes(k)) by.set(k, { ...(by.get(k) || {}), key: k, name: p.company, page: "/co/" + e.slug, verified: true, logo: p.logo || null });
  }
  await Promise.all([...by.values()].filter((r) => r.tracked).map(async (r) => { r.open = await db.count(`listings?company_id=eq.${enc(r.key)}&${LIVE_L}`).catch(() => null); }));
  return keys.map((k) => by.get(k) || { key: k, name: null });
}

/** Exact-name lookups for profile experience ("HITT Contracting" → that company's VERIFIED page, if someone there claimed it). */
export async function matchNames(list) {
  const names = [...new Set((list || []).map((n) => String(n || "").replace(/\s+/g, " ").trim()).filter((n) => normName(n).length >= 2))].slice(0, 15);
  if (!names.length) return [];
  const orE = names.map((n) => cleanQ(n)).filter(Boolean).map((n) => `profile->>company.ilike.${enc('"' + n + '"')}`).join(",");
  const emps = await db.selectAsAdmin(`employers?select=slug,profile,company_id,status&status=eq.verified&or=(${orE})&limit=30`).catch(() => []);
  return names.map((n) => {
    const k = normName(n);
    const e = emps.find((x) => { const p = cleanBizProfile(x.profile); return p.kind !== "recruiter" && normName(p.company) === k; });
    if (!e) return { name: n, key: null };
    const p = cleanBizProfile(e.profile);
    return { name: n, key: empKey(e), company: p.company, logo: p.logo || null, page: "/co/" + e.slug, verified: true };
  });
}
