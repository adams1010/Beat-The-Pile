// lib/employer.js — the business side (Nov 2026). Table `employers` (supabase/business.sql), one row per employer account.
// Trust model:
//   1. Anyone can pick "I'm hiring" (Clerk unsafeMetadata.role) — that only changes their top bar.
//   2. They prove a WORK email: a 6-digit code to that address (free-mail domains refused) → email_verified_at, domain.
//   3. An owner/admin approves the company (status pending → verified) on /business/admin/.
//   Only VERIFIED employers can search students (Find talent), message them, or ask to join their orbit,
//   and only companies that are verified get a public page (/co/<slug>).
// Students only ever show up to employers if they turned on "Let employers find me" AND have a public profile.
import crypto from "node:crypto";
import { db } from "./db.js";
import { card } from "./orbit.js";
import { normName } from "./simplify.js";

const enc = encodeURIComponent;
export const ADMINS = () => (process.env.ADMIN_EMAILS || "shiloniadam10@gmail.com,mdxp21@gmail.com").toLowerCase().split(/[,\s]+/).filter(Boolean);
export const FREEMAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.us", "mail.com", "zoho.com", "yandex.com",
  "hey.com", "fastmail.com", "tutanota.com", "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "cox.net", "charter.net"]);
export const SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,001–5,000", "5,001–10,000", "10,000+"];
const MAJORS_MAX = 12;

const t = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const para = (v, n) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
export const httpsUrl = (v) => { try { let s = String(v || "").trim(); if (!s) return ""; if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  const u = new URL(s); return (u.protocol === "https:" || u.protocol === "http:") && /\./.test(u.hostname) ? ("https://" + u.host + u.pathname.replace(/\/$/, "") + u.search).slice(0, 300) : ""; } catch { return ""; } };
export const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
/** "careers.boeing.com" and "boeing.com" belong together; "mail.boeing.co.uk" → "boeing.co.uk". */
export const baseDomain = (h) => { const p = String(h || "").toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (p.length <= 2) return p.join("."); return (/^(co|com|org|net|ac|gov|edu)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2 ? p.slice(-3) : p.slice(-2)).join("."); };
export const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

export function cleanBizProfile(p) {
  p = p && typeof p === "object" ? p : {};
  const h = p.hiring && typeof p.hiring === "object" ? p.hiring : {};
  const logo = typeof p.logo === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logo) && p.logo.length < 90000 ? p.logo : null;
  return {
    company: t(p.company, 100), website: httpsUrl(p.website), industry: t(p.industry, 80),
    size: SIZES.includes(p.size) ? p.size : "", hq: t(p.hq, 80), founded: Number.isInteger(+p.founded) && +p.founded > 1700 && +p.founded <= 2030 ? +p.founded : null,
    tagline: t(p.tagline, 140), about: para(p.about, 2500), logo, linkedin: httpsUrl(p.linkedin), careers: httpsUrl(p.careers),
    name: t(p.name, 80), title: t(p.title, 80),
    hiring: { types: (Array.isArray(h.types) ? h.types : []).filter((x) => x === "intern" || x === "fulltime").slice(0, 2),
      majors: [...new Set((Array.isArray(h.majors) ? h.majors : []).map((x) => t(x, 60)).filter(Boolean))].slice(0, MAJORS_MAX),
      locations: t(h.locations, 200), roles: para(h.roles, 600), when: t(h.when, 80) },
    perks: (Array.isArray(p.perks) ? p.perks : []).map((x) => t(x, 60)).filter(Boolean).slice(0, 10),
  };
}
/** What the owner of the account sees (never the code hash). */
export function bizView(row) {
  if (!row) return { status: "none", profile: cleanBizProfile({}), slug: null, emailVerified: false, workEmail: null, fairs: [] };
  return { status: row.status, profile: cleanBizProfile(row.profile), slug: row.slug, domain: row.domain || null, workEmail: row.work_email || null,
    emailVerified: !!row.email_verified_at, reviewNote: row.status === "rejected" ? row.review_note || null : null,
    fairs: Array.isArray(row.fairs) ? row.fairs : [], companyId: row.company_id || null };
}
const isMissingTable = (e) => /employers|42P01|PGRST205|relation .* does not exist|Could not find the table/i.test(String(e?.message));
export class NotReady extends Error {}
export async function loadEmp(uid) {
  try { return (await db.selectAsAdmin(`employers?select=*&clerk_user_id=eq.${enc(uid)}&limit=1`))[0] || null; }
  catch (e) { if (isMissingTable(e)) throw new NotReady("Business accounts are being set up. Try again soon."); throw e; }
}
async function upsertEmp(uid, patch) {
  await db.upsert("employers", [{ clerk_user_id: uid, ...patch, updated_at: new Date().toISOString() }], "clerk_user_id");
  return loadEmp(uid);
}
/** Is this employer allowed to contact students? */
export async function isVerifiedEmployer(uid) {
  try { return (await loadEmp(uid))?.status === "verified"; } catch { return false; }
}

/** Our jobs data for this company (exact normalized name, live companies only). */
async function companyIdFor(name) {
  const k = normName(name); if (!k || k.length < 2) return null;
  const rows = await db.selectAsAdmin(`company_candidates?select=id,company,status&status=eq.live&company=ilike.${enc(String(name).replace(/[*,()]/g, " ").trim())}&limit=20`).catch(() => []);
  return rows.find((r) => normName(r.company) === k)?.id || null;
}
async function freeSlug(uid, want) {
  let base = slugify(want) || "company", s = base;
  for (let i = 2; i < 50; i++) {
    const hit = (await db.selectAsAdmin(`employers?select=clerk_user_id&slug=eq.${enc(s)}&limit=1`))[0];
    if (!hit || hit.clerk_user_id === uid) return s;
    s = `${base}-${i}`;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

// ── work-email check ──
const codeHash = (uid, code) => crypto.createHash("sha256").update(`${uid}:${code}:${process.env.CLERK_SECRET_KEY || "btp"}`).digest("hex");
export function workEmailProblem(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/.test(e) || e.length > 120) return "Enter a work email address, like jane@company.com.";
  const d = e.split("@")[1];
  if (FREEMAIL.has(d)) return "Use your work email (at your company's domain), not a personal Gmail, Outlook or Yahoo address.";
  return null;
}

/** Talk to the outside world through deps so tests can fake it: { sendEmail, rateOk, clerkUser }. */
export async function bizAction(uid, action, body, deps) {
  const ok = (b) => ({ status: 200, body: b }), no = (error, status = 400) => ({ status, body: { error } });
  try {
    if (action === "biz_get") return ok(bizView(await loadEmp(uid)));

    if (action === "biz_save") {
      const row = await loadEmp(uid);
      const profile = cleanBizProfile(body.profile);
      if (!profile.company) return no("Add your company's name.");
      if (row?.status === "verified" && row.profile?.company && normName(row.profile.company) !== normName(profile.company))
        return no("Your company is verified under its current name. To change it, use Report a problem and we'll re-check it.");
      const slug = row?.slug || await freeSlug(uid, profile.company);
      const status = row?.status === "verified" || row?.status === "rejected" ? row.status : row?.email_verified_at ? "pending" : "new";
      const company_id = await companyIdFor(profile.company);
      return ok(bizView(await upsertEmp(uid, { profile, slug, status, company_id })));
    }

    if (action === "biz_email_start") {
      const email = String(body.email || "").trim().toLowerCase();
      const bad = workEmailProblem(email); if (bad) return no(bad);
      if (!process.env.RESEND_API_KEY) return no("Email checks aren't switched on yet. Try again soon.", 503);
      if (!(await deps.rateOk(`biz-code:${uid}`, 3600, 5))) return no("That's a lot of codes. Wait a bit and try again.", 429);
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
      await upsertEmp(uid, { work_email: email, email_code_hash: codeHash(uid, code), email_code_expires: new Date(Date.now() + 15 * 6e4).toISOString(), email_tries: 0 });
      await deps.sendEmail(email, {
        subject: `${code} is your Beat the Pile code`,
        text: `Your code is ${code}. Enter it on Beat the Pile to confirm this is your work email. It expires in 15 minutes.\n\nDidn't ask for this? Ignore this email.`,
        html: `<p style="font:16px/1.5 -apple-system,Segoe UI,sans-serif;color:#060A2C">Your code is</p><p style="font:700 32px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:4px;color:#060A2C">${code}</p><p style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;color:#55627A">Enter it on Beat the Pile to confirm this is your work email. It expires in 15 minutes. Didn't ask for this? Ignore this email.</p>`,
        unsub: "https://www.beatthepile.com/privacy/" });
      return ok({ sent: true, to: email });
    }

    if (action === "biz_email_confirm") {
      const row = await loadEmp(uid);
      const code = String(body.code || "").replace(/\D/g, "");
      if (!row?.email_code_hash || !row.email_code_expires) return no("Ask for a code first.");
      if (Date.parse(row.email_code_expires) < Date.now()) return no("That code expired. Send a new one.");
      if ((row.email_tries || 0) >= 5) return no("Too many tries. Send a new code.");
      if (codeHash(uid, code) !== row.email_code_hash) { await upsertEmp(uid, { email_tries: (row.email_tries || 0) + 1 }); return no("That code isn't right. Check the email and try again."); }
      const domain = baseDomain(String(row.work_email).split("@")[1]);
      const status = row.status === "verified" ? "verified" : row.profile?.company ? "pending" : "new";
      return ok(bizView(await upsertEmp(uid, { email_verified_at: new Date().toISOString(), domain, email_code_hash: null, email_code_expires: null, email_tries: 0, status })));
    }

    if (action === "biz_fairs") {
      const fairs = [...new Set((Array.isArray(body.fairs) ? body.fairs : []).map(String).filter((x) => /^[a-z0-9-]{3,80}$/.test(x)))].slice(0, 30);
      return ok(bizView(await upsertEmp(uid, { fairs })));
    }

    if (action === "biz_fair_counts") {      // how many students said they're going to each fair (counts only — no names)
      const rows = await db.selectAllAsAdmin("user_jobs?select=orbit_fair&orbit_fair_on=eq.true&order=clerk_user_id.asc").catch(() => []);
      const counts = {}; for (const r of rows) if (r.orbit_fair) counts[r.orbit_fair] = (counts[r.orbit_fair] || 0) + 1;
      const going = await db.selectAllAsAdmin("employers?select=fairs&status=eq.verified&order=clerk_user_id.asc").catch(() => []);
      const cos = {}; for (const r of going) for (const f of Array.isArray(r.fairs) ? r.fairs : []) cos[f] = (cos[f] || 0) + 1;
      return ok({ students: counts, companies: cos, mine: bizView(await loadEmp(uid)).fairs });
    }
    if (action === "biz_home") return ok(await bizHome(uid));
    if (action === "biz_orbit") return ok(await bizOrbit(uid));

    if (action === "biz_admin_list" || action === "biz_admin_review") {
      if (!(await isAdmin(uid, deps))) return no("Owners only", 403);
      if (action === "biz_admin_list") {
        const rows = await db.selectAllAsAdmin("employers?select=clerk_user_id,slug,profile,domain,status,work_email,email_verified_at,review_note,created_at,updated_at&order=updated_at.desc");
        return ok({ employers: rows.map((r) => {
          const p = cleanBizProfile(r.profile), site = baseDomain(hostOf(p.website));
          return { key: crypto.createHash("sha1").update(r.clerk_user_id).digest("hex").slice(0, 16), slug: r.slug, status: r.status, company: p.company, website: p.website,
            name: p.name, title: p.title, workEmail: r.work_email, emailVerified: !!r.email_verified_at, domain: r.domain,
            domainMatchesWebsite: !!(r.domain && site && r.domain === site), reviewNote: r.review_note, created: r.created_at, updated: r.updated_at };
        }) });
      }
      const rows = await db.selectAllAsAdmin("employers?select=clerk_user_id&order=clerk_user_id.asc");
      const hit = rows.find((r) => crypto.createHash("sha1").update(r.clerk_user_id).digest("hex").slice(0, 16) === String(body.key || ""));
      if (!hit) return no("Not found", 404);
      const status = ["verified", "rejected", "pending"].includes(body.status) ? body.status : null; if (!status) return no("Pick verified, rejected or pending");
      await db.update(`employers?clerk_user_id=eq.${enc(hit.clerk_user_id)}`, { status, review_note: t(body.note, 300) || null, reviewed_by: uid, updated_at: new Date().toISOString() });
      return ok({ ok: true, status });
    }
    return no("Unknown action");
  } catch (e) {
    if (e instanceof NotReady) return no(e.message, 503);
    throw e;
  }
}

export async function isAdmin(uid, deps) {
  const u = deps?.clerkUser ? await deps.clerkUser(uid) : null;
  const emails = (u?.email_addresses || []).filter((e) => e.verification?.status === "verified").map((e) => String(e.email_address).toLowerCase());
  return emails.some((e) => ADMINS().includes(e));
}

// ── what employers see about students: ONLY public + "Let employers find me" ──
const openRows = () => db.selectAllAsAdmin("user_jobs?select=clerk_user_id,handle,profile,profile_public,starred,orbit_fair,orbit_fair_on&profile_public=eq.true&order=handle.asc")
  .then((rows) => rows.filter((r) => r.handle && r.profile && r.profile.openToEmployers === true));
const sameOrg = (org, company) => { const a = normName(org), b = normName(company); return !!a && !!b && a.length >= 2 && a === b; };

/** Business home dashboard numbers — all live counts. */
export async function bizHome(uid) {
  const row = await loadEmp(uid), p = cleanBizProfile(row?.profile);
  const open = await openRows();
  const following = row?.company_id ? open.filter((r) => (r.starred || []).includes(row.company_id)).length : 0;
  const alumni = p.company ? open.filter((r) => (r.profile.experience || []).some((e) => sameOrg(e.org, p.company))).length : 0;
  const majors = {}; for (const r of open) { const m = String(r.profile.major || "").trim(); if (m) majors[m] = (majors[m] || 0) + 1; }
  const [unread, team, jobs] = await Promise.all([
    db.countAsAdmin(`orbit_messages?recipient=eq.${enc(uid)}&read_at=is.null`).catch(() => 0),
    row?.domain ? db.selectAsAdmin(`employers?select=clerk_user_id&domain=eq.${enc(row.domain)}&status=eq.verified&limit=200`).then((x) => x.filter((r) => r.clerk_user_id !== uid).length).catch(() => 0) : 0,
    row?.company_id ? db.count(`listings?company_id=eq.${enc(row.company_id)}&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)`).catch(() => 0) : 0,
  ]);
  return { ...bizView(row), stats: { openStudents: open.length, following, alumni, unread, team, liveJobs: jobs,
    topMajors: Object.entries(majors).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([major, n]) => ({ major, n })) } };
}

/** Business Orbit: your team · students following your company · former interns · your orbit (connections). */
export async function bizOrbit(uid) {
  const row = await loadEmp(uid), p = cleanBizProfile(row?.profile);
  const { orbitExtras } = await import("./orbitnet.js");
  const open = await openRows();
  const x = await orbitExtras(uid, null, []);
  const ln = (r) => ({ link: x.states.get(r.clerk_user_id) || "none" });
  const interested = row?.company_id ? open.filter((r) => (r.starred || []).includes(row.company_id)).slice(0, 40).map((r) => card(r, ln(r))) : [];
  const alumni = p.company ? open.filter((r) => (r.profile.experience || []).some((e) => sameOrg(e.org, p.company))).slice(0, 40)
    .map((r) => { const e = r.profile.experience.find((z) => sameOrg(z.org, p.company)); return card(r, { ...ln(r), role: e?.title || "", when: e?.when || "", at: p.company }); }) : [];
  // fair overlap: opted-in students going to a fair you're attending (counts only per fair + their cards when they also let employers find them)
  const fairs = Array.isArray(row?.fairs) ? row.fairs : [];
  const atFairs = fairs.length ? open.filter((r) => r.orbit_fair_on === true && fairs.includes(r.orbit_fair)).slice(0, 40).map((r) => card(r, { ...ln(r), fair: r.orbit_fair })) : [];
  let team = [];
  if (row?.domain) {
    const mates = await db.selectAsAdmin(`employers?select=clerk_user_id,profile&domain=eq.${enc(row.domain)}&status=eq.verified&limit=100`).catch(() => []);
    const { peerKey } = await import("./orbitnet.js");
    team = mates.filter((m) => m.clerk_user_id !== uid).map((m) => { const q = cleanBizProfile(m.profile);
      return { handle: null, key: peerKey(m.clerk_user_id), name: q.name || "Recruiter", headline: [q.title, q.company].filter(Boolean).join(" · "), photo: null, link: x.states.get(m.clerk_user_id) || "none", employer: true }; });
  }
  return { me: { company: p.company, name: p.name, title: p.title, status: row?.status || "none", logo: p.logo, slug: row?.slug || null },
    team, interested, alumni, atFairs, connections: x.connections, requests: x.requests, unread: x.unread };
}

/** Public company page (verified companies only). */
export async function publicCompany(slug) {
  slug = slugify(slug); if (!slug) return null;
  let row; try { row = (await db.selectAsAdmin(`employers?select=clerk_user_id,slug,profile,domain,company_id,status,fairs&slug=eq.${enc(slug)}&limit=1`))[0]; } catch { return null; }
  if (!row || row.status !== "verified") return null;
  const p = cleanBizProfile(row.profile);
  const [mates, jobs, open] = await Promise.all([
    row.domain ? db.selectAsAdmin(`employers?select=clerk_user_id,profile&domain=eq.${enc(row.domain)}&status=eq.verified&limit=50`).catch(() => []) : [],
    row.company_id ? db.selectAsAdmin(`listings?select=id,title,location,url,first_seen,field&company_id=eq.${enc(row.company_id)}&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)&order=first_seen.desc&limit=60`).catch(() => []) : [],
    openRows().catch(() => []),
  ]);
  const alumni = open.filter((r) => (r.profile.experience || []).some((e) => sameOrg(e.org, p.company))).slice(0, 24)
    .map((r) => { const e = r.profile.experience.find((z) => sameOrg(z.org, p.company)); return card(r, { role: e?.title || "", when: e?.when || "" }); });
  const { name, title, ...company } = p;
  const { peerKey } = await import("./orbitnet.js");
  const team = (mates.length ? mates : [{ clerk_user_id: row.clerk_user_id, profile: row.profile }])
    .map((m) => { const q = cleanBizProfile(m.profile); return { name: q.name || "Recruiter", title: q.title || "", key: peerKey(m.clerk_user_id) }; });
  return { slug: row.slug, company, domain: row.domain || null, companyId: row.company_id || null, ownerKey: peerKey(row.clerk_user_id), team,
    jobs, alumni, fairs: Array.isArray(row.fairs) ? row.fairs : [] };
}

/** Names for employer peers in Orbit/inbox (students see "Jane Smith · Recruiter at Boeing"). */
export async function employerCards(uids) {
  const ids = [...new Set(uids)].filter((x) => /^[A-Za-z0-9_]{3,80}$/.test(x));
  if (!ids.length) return new Map();
  const rows = await db.selectAsAdmin(`employers?select=clerk_user_id,profile,slug,status&clerk_user_id=in.(${ids.map((x) => `"${x}"`).join(",")})&limit=200`).catch(() => []);
  return new Map(rows.map((r) => { const p = cleanBizProfile(r.profile);
    return [r.clerk_user_id, { name: p.name || p.company || "Employer", headline: [p.title, p.company].filter(Boolean).join(" at ") || "Employer",
      photo: p.logo, company: p.company, companySlug: r.status === "verified" ? r.slug : null, employer: true, verified: r.status === "verified", hiring: r.status === "verified" }]; }));
}
