// Business side: work-email code, owner review, verified-only contact, company page, business Orbit, privacy.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.RESEND_API_KEY = "re_test";
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, clerkUsers: {
  u_emp: { email: "jane@boeing.com", role: "employer", first_name: "Jane" },
  u_emp2: { email: "raj@boeing.com", role: "employer" },
  u_adm: { email: "mdxp21@gmail.com", role: "student" },
  u_ana: { email: "ana@vt.edu", role: "student" }, u_ben: { email: "ben@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const { workEmailProblem, baseDomain, cleanBizProfile, slugify } = await import("../lib/employer.js");
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
const get = (query) => invoke(me, { method: "GET", query });

// pure helpers
assert.ok(workEmailProblem("jane@gmail.com"), "personal email refused");
assert.equal(workEmailProblem("jane@boeing.com"), null);
assert.equal(baseDomain("careers.boeing.com"), "boeing.com"); assert.equal(baseDomain("mail.bae.co.uk"), "bae.co.uk");
assert.equal(slugify("Lockheed Martin & Co."), "lockheed-martin-and-co");
assert.equal(cleanBizProfile({ website: "javascript:alert(1)" }).website, "");
assert.equal(cleanBizProfile({ website: "boeing.com/careers" }).website, "https://boeing.com/careers");
assert.equal(cleanBizProfile({ size: "huge" }).size, "");
console.log("✓ business helpers: free-mail refused, domains, slugs, safe links");

// students: ana public + open to employers + follows Boeing + interned there; ben public but NOT open
f.T("company_candidates").push({ id: "boeing", company: "Boeing", status: "live" });
for (const [s, h, extra] of [["u_ana", "ana", { openToEmployers: true, experience: [{ title: "Intern", org: "Boeing", when: "Summer 2025" }] }], ["u_ben", "ben", {}]])
  assert.equal((await call(s, { action: "profile", handle: h, public: true, profile: { name: h.toUpperCase(), school: "Virginia Tech", major: "Mechanical Engineering", ...extra } })).code, 200);
assert.equal((await call("u_ana", { action: "star", company: "boeing", on: true })).code, 200);

// setup: company → code → pending
assert.equal((await call("u_emp", { action: "biz_save", profile: {} })).code, 400, "needs a company name");
let r = await call("u_emp", { action: "biz_save", profile: { company: "Boeing", website: "boeing.com", name: "Jane Smith", title: "University Recruiter", size: "10,000+" } });
assert.equal(r.code, 200); assert.equal(r.body.status, "new"); assert.equal(r.body.slug, "boeing"); assert.equal(r.body.companyId, "boeing");
assert.equal((await call("u_emp", { action: "biz_email_start", email: "jane@gmail.com" })).code, 400);
r = await call("u_emp", { action: "biz_email_start", email: "jane@boeing.com" }); assert.equal(r.code, 200);
const code = f.calls.emails.at(-1).subject.match(/^(\d{6})/)[1];
assert.ok(!JSON.stringify(f.T("employers")).includes(`"${code}"`), "code is stored hashed");
assert.equal((await call("u_emp", { action: "biz_email_confirm", code: "000000" === code ? "111111" : "000000" })).code, 400);
r = await call("u_emp", { action: "biz_email_confirm", code }); assert.equal(r.code, 200);
assert.equal(r.body.status, "pending"); assert.equal(r.body.emailVerified, true); assert.equal(r.body.domain, "boeing.com");
assert.ok(!("email_code_hash" in r.body));
console.log("✓ business setup: company page → work-email code (hashed) → pending review");

// pending employers can't search, message or add students; no public page yet
assert.equal((await call("u_emp", { action: "talent" })).code, 403);
assert.equal((await call("u_emp", { action: "orbit_send", to: "ana", body: "hi" })).code, 403);
assert.equal((await call("u_emp", { action: "orbit_connect", to: "ana" })).code, 403);
assert.equal((await get({ co: "boeing" })).code, 404, "unverified company has no public page");

// owner review
assert.equal((await call("u_ana", { action: "biz_admin_list" })).code, 403, "students aren't owners");
r = await call("u_adm", { action: "biz_admin_list" }); assert.equal(r.code, 200);
const row = r.body.employers[0]; assert.equal(row.company, "Boeing"); assert.equal(row.domainMatchesWebsite, true);
assert.ok(!JSON.stringify(r.body).includes("u_emp"), "no Clerk ids to the browser");
assert.equal((await call("u_adm", { action: "biz_admin_review", key: row.key, status: "verified" })).code, 200);
console.log("✓ business review: owners only, domain-match hint, verify");

// verified: talent + connect + message work, only for opted-in students
assert.equal((await call("u_emp", { action: "talent" })).code, 200);
assert.equal((await call("u_emp", { action: "orbit_connect", to: "ben" })).code, 403, "ben isn't open to employers");
assert.equal((await call("u_emp", { action: "orbit_connect", to: "ana" })).body.link, "requested");
assert.equal((await call("u_emp", { action: "orbit_send", to: "ana", body: "Hi Ana!" })).code, 200);
r = await call("u_ana", { action: "orbit" });
assert.equal(r.body.requests[0].name, "Jane Smith"); assert.match(r.body.requests[0].headline, /University Recruiter at Boeing/);
r = await call("u_ana", { action: "orbit_inbox" }); assert.equal(r.body.threads[0].name, "Jane Smith");
console.log("✓ verified employers: talent, join orbit and messages — opted-in students only, named as recruiter at company");

// teammate at the same domain shows on the team ring + company page
await call("u_emp2", { action: "biz_save", profile: { company: "Boeing", name: "Raj P", title: "Recruiter" } });
await call("u_emp2", { action: "biz_email_start", email: "raj@boeing.com" });
await call("u_emp2", { action: "biz_email_confirm", code: f.calls.emails.at(-1).subject.slice(0, 6) });
const list = (await call("u_adm", { action: "biz_admin_list" })).body.employers;
await call("u_adm", { action: "biz_admin_review", key: list.find((x) => x.name === "Raj P").key, status: "verified" });
r = await call("u_emp", { action: "biz_orbit" });
assert.deepEqual(r.body.team.map((x) => x.name), ["Raj P"]);
assert.deepEqual(r.body.interested.map((x) => x.handle), ["ana"], "follows Boeing + open to employers");
assert.deepEqual(r.body.alumni.map((x) => x.handle), ["ana"]);
assert.ok(!JSON.stringify(r.body).includes("ben"), "students not open to employers never appear");
r = await call("u_emp", { action: "biz_home" });
assert.equal(r.body.stats.openStudents, 1); assert.equal(r.body.stats.following, 1); assert.equal(r.body.stats.team, 1);
r = await get({ co: "boeing" }); assert.equal(r.code, 200);
assert.equal(r.body.company.company, "Boeing"); assert.ok(!("name" in r.body.company), "recruiter's own name isn't company data");
assert.equal(r.body.team.length, 2); assert.deepEqual(r.body.alumni.map((x) => x.handle), ["ana"]);
assert.ok(!JSON.stringify(r.body).match(/u_emp|jane@|work_email/), "nothing private on the public page");
console.log("✓ business orbit + company page: team, interested students, former interns; public page shows nothing private");

// students can ask a verified company's recruiter to join their orbit (from the company page key)
{
  const page = (await get({ co: "boeing" })).body;
  assert.match(page.ownerKey, /^p_/); assert.ok(page.team.every((m) => /^p_/.test(m.key)), "recruiters carry keys, not ids");
  const r1 = await call("u_ben", { action: "orbit_connect", to: page.ownerKey });
  assert.equal(r1.body.link, "requested", "ben (not open to employers) can still reach OUT to a company");
  const req = (await call("u_emp", { action: "biz_orbit" })).body.requests;
  assert.deepEqual(req.map((x) => x.handle), ["ben"]);
  assert.equal((await call("u_emp", { action: "orbit_accept", to: req[0].key })).body.link, "connected");
  assert.equal((await call("u_emp", { action: "orbit_send", to: req[0].key, body: "Thanks for reaching out!" })).code, 200, "connected → messages both ways");
  assert.equal((await call("u_ben", { action: "orbit_send", to: page.ownerKey, body: "Hi!" })).code, 200);
  // an unverified company's key never resolves
  f.T("employers").find((e) => e.clerk_user_id === "u_emp2").status = "pending";
  const k2 = page.team.find((m) => m.name === "Raj P").key;
  assert.equal((await call("u_ana", { action: "orbit_connect", to: k2 })).code, 404, "only verified recruiters can be joined");
  console.log("✓ students join a company's orbit from its page; employer accepts; unverified recruiters can't be reached");
}
