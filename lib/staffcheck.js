// Faculty & staff verification (Nov 15). Anyone could pick "Professor" at sign-up; now the "Faculty & staff" tag only shows
// once ALL of these hold:
//   1. a 6-digit code sent to an email ON the school's own web domain (schools/domains.json, from IPEDS) is entered
//      (students have school emails too, so this alone isn't enough)
//   2. a link to their own page in the school's faculty/staff directory, on that same school domain
//   3. an owner (ADMIN_EMAILS) opens that directory page and approves on /business/admin/
// Checks live in Clerk private_metadata.staffCheck (only our server can read/write it); approval writes
// user_jobs.profile.staffVerified {school, schoolId, role, at}, which the server keeps only while school + role stay the same.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HERE = path.dirname(new URL(import.meta.url).pathname);
let DOMAINS = null;
export function schoolDomain(schoolId) {
  if (!DOMAINS) {
    for (const f of [path.join(process.cwd(), "schools", "domains.json"), path.join(HERE, "..", "schools", "domains.json")]) {
      try { DOMAINS = JSON.parse(fs.readFileSync(f, "utf8")); break; } catch {}
    }
    DOMAINS ||= {};
  }
  return schoolId ? DOMAINS[String(schoolId)] || null : null;
}
export const _setDomains = (m) => { DOMAINS = m; };
/** email or URL host is the school's domain or a subdomain of it (cs.vt.edu ⊂ vt.edu) — never a look-alike (notvt.edu). */
export const onDomain = (host, dom) => { host = String(host || "").toLowerCase().replace(/\.$/, ""); return !!dom && (host === dom || host.endsWith("." + dom)); };
const codeHash = (uid, code) => crypto.createHmac("sha256", process.env.CLERK_SECRET_KEY || process.env.CRON_SECRET || "btp-dev").update(`staff:${uid}:${code}`).digest("hex");
const mask = (e) => String(e || "").replace(/^(.)[^@]*(@.*)$/, "$1…$2");
const sameSchool = (a, b) => (a.schoolId && b.schoolId ? String(a.schoolId) === String(b.schoolId) : String(a.school || "").trim().toLowerCase() === String(b.school || "").trim().toLowerCase());

/** Keep a verified badge only while the profile still says the same school + role (changing either needs a new check). */
export function keepStaffVerified(base, next) {
  const v = base?.staffVerified;
  if (!v || !next?.staff || next.staff !== v.role || !sameSchool(next, v)) return {};
  return { staffVerified: { school: v.school, schoolId: v.schoolId || null, role: v.role, at: v.at } };
}
/** What the public sees: the Faculty & staff tag only when verified. */
export const shownStaff = (p) => (p?.staffVerified && p.staff && p.staffVerified.role === p.staff ? p.staff : null);

/** deps: { clerkUser(uid), setPrivate(uid, obj), sendEmail(to, mail), rateOk(key, s, n), loadProfile(uid), setVerified(uid, v|null), listUsers(), isAdmin(uid) } */
export async function staffAction(uid, action, body, deps) {
  const ok = (b) => ({ status: 200, body: b }), no = (error, status = 400) => ({ status, body: { error } });
  const u = await deps.clerkUser(uid); if (!u) return no("Sign in again", 401);
  const chk = u.private_metadata?.staffCheck || {};
  const p = (await deps.loadProfile(uid)) || {};
  const dom = schoolDomain(p.schoolId);
  const view = (c = chk) => ({ status: c.status || (p.staffVerified ? "verified" : "none"), school: p.school || null, role: p.staff || null, schoolDomain: dom,
    email: c.email ? mask(c.email) : null, emailOk: !!c.emailOk, dir: c.dir || null, note: c.status === "rejected" ? c.note || null : null, verified: !!shownStaff(p) });

  if (action === "staff_status") return ok(view());
  if (!p.staff) return no("Pick your role at school on your profile first.");
  if (!p.school) return no("Pick your school on your profile first.");
  if (!dom) return no("We can't check this school automatically yet. Pick your school from the list on your profile, or use Report a problem.");

  if (action === "staff_email_start") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^@\s]{1,64}@[^@\s]{3,190}$/.test(email)) return no("Type your school email address.");
    if (!onDomain(email.split("@")[1], dom)) return no(`Use your email at ${dom} (your school's own domain).`);
    if (!process.env.RESEND_API_KEY) return no("Email checks aren't switched on yet. Try again soon.", 503);
    if (!(await deps.rateOk(`staff-code:${uid}`, 3600, 5))) return no("That's a lot of codes. Wait a bit and try again.", 429);
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
    const next = { ...chk, email, domain: dom, school: p.school, schoolId: p.schoolId || null, role: p.staff, emailOk: false,
      codeHash: codeHash(uid, code), codeExp: Date.now() + 15 * 6e4, tries: 0, status: chk.status === "verified" && sameSchool(chk, p) && chk.role === p.staff ? "verified" : "emailing" };
    await deps.setPrivate(uid, { staffCheck: next });
    await deps.sendEmail(email, { subject: `${code} is your Beat the Pile code`,
      text: `Your code is ${code}. Enter it on Beat the Pile to confirm this is your school email. It expires in 15 minutes.\n\nDidn't ask for this? Ignore this email.`,
      html: `<p style="font:16px/1.5 -apple-system,Segoe UI,sans-serif;color:#060A2C">Your code is</p><p style="font:700 32px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:4px;color:#060A2C">${code}</p><p style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;color:#55627A">Enter it on Beat the Pile to confirm this is your school email. It expires in 15 minutes. Didn't ask for this? Ignore this email.</p>`,
      unsub: "https://www.beatthepile.com/privacy/" });
    return ok({ ...view(next), sent: true });
  }
  if (action === "staff_email_confirm") {
    const code = String(body.code || "").replace(/\D/g, "");
    if (!chk.codeHash || !chk.codeExp) return no("Ask for a code first.");
    if (chk.codeExp < Date.now()) return no("That code expired. Send a new one.");
    if ((chk.tries || 0) >= 5) return no("Too many tries. Send a new code.");
    if (codeHash(uid, code) !== chk.codeHash) { await deps.setPrivate(uid, { staffCheck: { ...chk, tries: (chk.tries || 0) + 1 } }); return no("That code isn't right. Check the email and try again."); }
    const next = { ...chk, emailOk: true, emailAt: Date.now(), codeHash: null, codeExp: null, tries: 0 };
    await deps.setPrivate(uid, { staffCheck: next });
    return ok(view(next));
  }
  if (action === "staff_submit") {
    if (!chk.emailOk || !onDomain(String(chk.email).split("@")[1], dom)) return no("Confirm your school email first.");
    let url; try { url = new URL(String(body.dir || "").trim()); } catch { return no("Paste the link to your page in your school's directory."); }
    if (url.protocol !== "https:" || !onDomain(url.hostname, dom)) return no(`The directory link has to be on ${dom} (your school's own website).`);
    const next = { ...chk, dir: url.toString().slice(0, 400), school: p.school, schoolId: p.schoolId || null, role: p.staff, status: "pending", submittedAt: Date.now(), note: null };
    await deps.setPrivate(uid, { staffCheck: next });
    return ok(view(next));
  }

  return no("Unknown action");
}

/** Owners: everyone waiting for (or done with) a faculty/staff check. Keys are hashes, never Clerk ids. */
export async function staffAdmin(uid, action, body, deps) {
  const ok = (b) => ({ status: 200, body: b }), no = (error, status = 400) => ({ status, body: { error } });
  if (!(await deps.isAdmin(uid))) return no("Owners only", 403);
  const users = (await deps.listUsers()).filter((x) => x?.private_metadata?.staffCheck?.status && x.private_metadata.staffCheck.status !== "emailing");
  const key = (id) => crypto.createHash("sha1").update("staff:" + id).digest("hex").slice(0, 16);
  if (action === "staff_admin_list") {
    return ok({ staff: users.map((x) => { const c = x.private_metadata.staffCheck;
      return { key: key(x.id), name: [x.first_name, x.last_name].filter(Boolean).join(" ") || null, school: c.school, role: c.role, email: c.email, emailOk: !!c.emailOk,
        domain: c.domain, dir: c.dir || null, dirOnDomain: !!(c.dir && (() => { try { return onDomain(new URL(c.dir).hostname, c.domain); } catch { return false; } })()),
        status: c.status, note: c.note || null, submitted: c.submittedAt || null }; }).sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || (b.submitted || 0) - (a.submitted || 0)) });
  }
  if (action === "staff_admin_review") {
    const hit = users.find((x) => key(x.id) === String(body.key || "")); if (!hit) return no("Not found", 404);
    const status = ["verified", "rejected", "pending"].includes(body.status) ? body.status : null; if (!status) return no("Pick verified, rejected or pending");
    const c = hit.private_metadata.staffCheck;
    if (status === "verified" && (!c.emailOk || !c.dir)) return no("They haven't confirmed a school email and sent a directory link yet.");
    await deps.setPrivate(hit.id, { staffCheck: { ...c, status, note: String(body.note || "").slice(0, 300) || null, reviewedBy: uid, reviewedAt: Date.now() } });
    await deps.setVerified(hit.id, status === "verified" ? { school: c.school, schoolId: c.schoolId || null, role: c.role, at: new Date().toISOString() } : null);
    return ok({ ok: true, status });
  }
  return no("Unknown action");
}
