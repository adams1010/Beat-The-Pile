// Company search + follow any company (Nov 15). Students can find and follow:
//   · companies we track (key = company_candidates id, e.g. "x-boeing") → new jobs, alerts, fair plans
//   · business pages on Beat the Pile (/co/<slug>, verified only) → key = their company_id, or "co-<slug>" when they
//     have no job board we read (e.g. the Beat the Pile business account itself)
//   · any other company by name → we add it to the Company Finder's queue (pending, "Followed by a student") and the
//     follow uses the id the finder will give it ("s-<slug>"), so jobs show up under it once the board is proven.
import { db } from "./db.js";
import { normName, keyFor } from "./simplify.js";
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

/** Up to `limit` companies whose name matches q: tracked companies + verified business pages, best match first. */
export async function searchCompanies(q, { limit = 24 } = {}) {
  const t = cleanQ(q); if (t.length < 2) return [];
  const pat = enc(`*${t.replace(/ /g, "*")}*`);
  const [cands, emps] = await Promise.all([
    db.selectAsAdmin(`company_candidates?select=id,company,domain,logo&status=eq.live&company=ilike.${pat}&order=intern_count.desc.nullslast&limit=60`).catch(() => []),
    db.selectAsAdmin(`employers?select=slug,profile,company_id,status&status=eq.verified&profile->>company=ilike.${pat}&limit=30`).catch(() => []),
  ]);
  const out = new Map();
  for (const c of cands) out.set(c.id, { key: c.id, name: c.company, domain: c.domain || null, logo: logoUrl(c.logo), tracked: true });
  for (const e of emps) {
    const p = cleanBizProfile(e.profile); if (p.kind === "recruiter" || !p.company) continue;
    const hit = e.company_id && out.get(e.company_id);
    if (hit) { hit.page = "/co/" + e.slug; hit.verified = true; if (p.logo) hit.logo = p.logo; continue; }
    out.set(empKey(e), { key: empKey(e), name: p.company, page: "/co/" + e.slug, verified: true, logo: p.logo || null, tagline: p.tagline || "" });
  }
  const list = [...out.values()].map((r, i) => ({ r, i, s: rank(r.name, t) - (r.verified ? 0.5 : 0) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.r).slice(0, limit);
  // open jobs right now (top results only, one count each)
  await Promise.all(list.filter((r) => r.tracked).slice(0, 16).map(async (r) => { r.open = await db.count(`listings?company_id=eq.${enc(r.key)}&${LIVE_L}`).catch(() => null); }));
  return list;
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
  for (const c of cands) by.set(c.id, { key: c.id, name: c.company, tracked: c.status === "live", queued: c.status !== "live", logo: logoUrl(c.logo) });
  for (const e of emps) {
    const p = cleanBizProfile(e.profile); if (p.kind === "recruiter") continue;
    for (const k of empKeys(e)) if (keys.includes(k)) by.set(k, { ...(by.get(k) || {}), key: k, name: by.get(k)?.name || p.company, page: "/co/" + e.slug, verified: true, logo: p.logo || by.get(k)?.logo || null });
  }
  await Promise.all([...by.values()].filter((r) => r.tracked).map(async (r) => { r.open = await db.count(`listings?company_id=eq.${enc(r.key)}&${LIVE_L}`).catch(() => null); }));
  return keys.map((k) => by.get(k) || { key: k, name: null });
}

/** Follow a company by name (one we may not track yet). Returns the key to store. */
export async function keyForName(name) {
  const n = String(name || "").replace(/\s+/g, " ").trim().slice(0, 100), k = normName(n);
  if (k.length < 2) return null;
  const t = cleanQ(n);
  const [cands, emps] = await Promise.all([
    db.selectAsAdmin(`company_candidates?select=id,company,status&company=ilike.${enc(t.replace(/ /g, "*"))}&limit=20`).catch(() => []),
    db.selectAsAdmin(`employers?select=slug,profile,company_id,status&status=eq.verified&profile->>company=ilike.${enc(t.replace(/ /g, "*"))}&limit=10`).catch(() => []),
  ]);
  const live = cands.find((c) => normName(c.company) === k && c.status === "live");
  if (live) return { key: live.id, name: live.company };
  const emp = emps.find((e) => normName(cleanBizProfile(e.profile).company) === k && cleanBizProfile(e.profile).kind !== "recruiter");
  if (emp) return { key: empKey(emp), name: cleanBizProfile(emp.profile).company };
  const any = cands.find((c) => normName(c.company) === k);
  if (any) return { key: any.id, name: any.company, queued: true };
  // new to us: queue it for the Company Finder (it still has to prove the board before any job shows)
  const id = finderId(n);
  await db.insertIgnore("company_candidates", [{ id, company: n, domain: null, key: keyFor(n), hint: null, source: "Followed by a student", status: "pending", priority: 50 }]);
  return { key: id, name: n, queued: true };
}

/** Exact-name lookups for profile experience ("HITT Contracting" → our tracked company or business page). One query each side. */
export async function matchNames(list) {
  const names = [...new Set((list || []).map((n) => String(n || "").replace(/\s+/g, " ").trim()).filter((n) => normName(n).length >= 2))].slice(0, 15);
  if (!names.length) return [];
  const qs = names.map((n) => cleanQ(n)).filter(Boolean);
  const or = qs.map((n) => `company.ilike.${enc('"' + n + '"')}`).join(",");
  const orE = qs.map((n) => `profile->>company.ilike.${enc('"' + n + '"')}`).join(",");
  const [cands, emps] = await Promise.all([
    db.selectAsAdmin(`company_candidates?select=id,company,logo&status=eq.live&or=(${or})&order=intern_count.desc.nullslast&limit=60`).catch(() => []),
    db.selectAsAdmin(`employers?select=slug,profile,company_id,status&status=eq.verified&or=(${orE})&limit=30`).catch(() => []),
  ]);
  return names.map((n) => {
    const k = normName(n);
    const e = emps.find((x) => normName(cleanBizProfile(x.profile).company) === k && cleanBizProfile(x.profile).kind !== "recruiter");
    const c = cands.find((x) => normName(x.company) === k) || (e?.company_id && cands.find((x) => x.id === e.company_id));
    if (!c && !e) return { name: n, key: null };
    const p = e ? cleanBizProfile(e.profile) : null;
    return { name: n, key: c ? c.id : empKey(e), company: c ? c.company : p.company, logo: p?.logo || logoUrl(c?.logo), page: e ? "/co/" + e.slug : null, verified: true, tracked: !!c };
  });
}
