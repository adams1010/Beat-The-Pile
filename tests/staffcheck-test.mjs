// Nov 15: faculty & staff verification (school-domain email + directory link + owner approval) and the hardened company checks
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
process.env.RESEND_API_KEY ||= "test";
const S = await import("../lib/staffcheck.js");
S._setDomains({ 233921: "vt.edu" });
assert.equal(S.schoolDomain(233921), "vt.edu");
assert.ok(S.onDomain("vt.edu", "vt.edu") && S.onDomain("cs.vt.edu", "vt.edu"));
assert.ok(!S.onDomain("notvt.edu", "vt.edu") && !S.onDomain("vt.edu.evil.com", "vt.edu"), "no look-alike domains");
// badge kept only while school + role stay the same
const v = { staffVerified: { school: "Virginia Tech", schoolId: 233921, role: "Professor", at: "x" } };
assert.ok(S.keepStaffVerified(v, { staff: "Professor", schoolId: 233921 }).staffVerified);
assert.deepEqual(S.keepStaffVerified(v, { staff: "Academic advisor", schoolId: 233921 }), {}, "role changed → re-check");
assert.deepEqual(S.keepStaffVerified(v, { staff: "Professor", schoolId: 199120 }), {}, "school changed → re-check");
assert.deepEqual(S.keepStaffVerified({}, { staff: "Professor", staffVerified: { role: "Professor" } }), {}, "a client can't send its own badge");
assert.equal(S.shownStaff({ staff: "Professor" }), null, "unverified → no tag");
assert.equal(S.shownStaff({ staff: "Professor", staffVerified: { role: "Professor" } }), "Professor");

// the flow, with Clerk/email faked
let meta = {}, profile = { staff: "Professor", school: "Virginia Tech", schoolId: 233921 }, sent = null, verified;
const deps = { clerkUser: async () => ({ id: "u1", private_metadata: meta }), setPrivate: async (_, o) => { meta = { ...meta, ...o }; },
  sendEmail: async (to, m) => { sent = { to, code: m.subject.slice(0, 6) }; }, rateOk: async () => true, loadProfile: async () => profile,
  listUsers: async () => [{ id: "u1", first_name: "Pat", private_metadata: meta }], isAdmin: async (id) => id === "owner", setVerified: async (_, x) => { verified = x; } };
const A = (a, b = {}) => S.staffAction("u1", a, b, deps);
assert.match((await A("staff_email_start", { email: "pat@gmail.com" })).body.error, /vt\.edu/, "email must be on the school's domain");
assert.match((await A("staff_email_start", { email: "pat@vt.edu.evil.com" })).body.error, /vt\.edu/);
assert.equal((await A("staff_email_start", { email: "pat@cs.vt.edu" })).status, 200); assert.equal(sent.to, "pat@cs.vt.edu");
assert.match((await A("staff_submit", { dir: "https://www.vt.edu/p" })).body.error, /Confirm your school email/, "no link before the code");
assert.equal((await A("staff_email_confirm", { code: "000000" === sent.code ? "111111" : "000000" })).status, 400, "wrong code refused");
assert.equal((await A("staff_email_confirm", { code: sent.code })).body.emailOk, true);
assert.match((await A("staff_submit", { dir: "https://linkedin.com/in/pat" })).body.error, /vt\.edu/, "directory link must be on the school's site");
assert.match((await A("staff_submit", { dir: "http://www.vt.edu/p" })).body.error, /vt\.edu/, "https only");
assert.equal((await A("staff_submit", { dir: "https://me.vt.edu/people/pat" })).body.status, "pending");
assert.equal(verified, undefined, "nothing is verified without an owner");
assert.equal((await S.staffAdmin("u1", "staff_admin_list", {}, deps)).status, 403, "owners only");
const list = (await S.staffAdmin("owner", "staff_admin_list", {}, deps)).body.staff;
assert.equal(list.length, 1); assert.ok(list[0].dirOnDomain && list[0].emailOk);
assert.equal((await S.staffAdmin("owner", "staff_admin_review", { key: list[0].key, status: "verified" }, deps)).status, 200);
assert.equal(verified.role, "Professor"); assert.equal(verified.schoolId, 233921);

// wiring
const me = readFileSync(new URL("../api/me.js", import.meta.url), "utf8");
assert.ok(me.includes("keepStaffVerified(r.profile, profile)") && me.includes("p.staff = shownStaff(r.profile)"), "server keeps/strips the badge; public tag gated");
assert.ok(readFileSync(new URL("../lib/orbit.js", import.meta.url), "utf8").includes("p.staffVerified && p.staffVerified.role === p.staff"), "Orbit cards gated");
assert.ok(readFileSync(new URL("../vercel.json", import.meta.url), "utf8").includes("schools/domains.json"));

// companies: throwaway inboxes refused; hard rules in review
const E = await import("../lib/employer.js");
assert.ok(E.workEmailProblem("hr@mailinator.com") && E.workEmailProblem("x@duck.com"), "throwaway inboxes refused");
assert.equal(E.workEmailProblem("jane@boeing.com"), null);
const emp = readFileSync(new URL("../lib/employer.js", import.meta.url), "utf8");
assert.ok(emp.includes("already has a company page at") && emp.includes('doesn\'t match their website') && emp.includes("is a school's domain") && emp.includes("doesn't receive email"), "review rules");
console.log("✓ verification: staff need a school-domain email + directory page + owner approval; companies need matching domains, real mail, one page per domain");
