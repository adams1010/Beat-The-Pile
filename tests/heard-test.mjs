// Nov 23: "How did you hear about Beat the Pile?" — sign-up dropdowns (students + businesses), set once, private,
// owner counts, and the one-time email (test first, SEND, never twice, link page records only on POST).
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.RESEND_API_KEY = "re_test";
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, clerkUsers: {
  u_own: { email: "owner@example.com", role: "student", first_name: "Adam" },
  u_a: { email: "a@vt.edu", role: "student" }, u_b: { email: "b@vt.edu", role: "student" }, u_c: { email: "c@vt.edu", role: "student" },
  u_d: { email: "d@vt.edu", role: "student" }, u_p: { email: "p@vt.edu", role: "educator" }, u_x: { email: "x@vt.edu", role: "student" },
  u_emp: { email: "jane@boeing.com", role: "employer", first_name: "Jane" } } });
const me = (await import("../api/me.js")).default;
const H = await import("../lib/heard.js");
const { buildHeardEmail } = await import("../lib/heardmail.js");
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
const link = (t, method = "GET", body) => invoke(me, { method, query: { heard: t }, body });
const row = (id) => f.T("user_jobs").find((r) => r.clerk_user_id === id);
const VT = { school: "Virginia Tech", schoolId: 233921, major: "Mechanical Engineering" };

// ── pure rules ──
assert.equal(H.cleanHeard({ src: "myspace" }), null, "only listed answers");
assert.equal(H.cleanHeard({ src: "student" }, "student"), null, "business answers aren't student answers");
assert.equal(H.cleanHeard({ src: "student" }, "business").src, "student");
assert.equal(H.cleanHeard({ src: "instagram", detail: "hi" }).detail, undefined, "only Other keeps a note");
const o = H.cleanHeard({ src: "other", detail: "my RA told me https://evil.example/x <b>" + "z".repeat(90) });
assert.ok(!/https?:|evil|</.test(o.detail) && o.detail.length <= 60, "Other note: links and tags out, 60 chars");
assert.equal(H.shuffled("student", () => 0).at(-1)[0], "other", "Other stays last");
assert.equal(H.shuffled("student").length, H.STUDENT.length);
for (const [, l] of [...H.STUDENT, ...H.BUSINESS]) assert.ok(!/[—]/.test(l), "no em dashes: " + l);
console.log("✓ heard: fixed lists, Other note cleaned, Other last");

// ── students at sign-up: stored once, bad answers ignored, sign-up never fails over it ──
let r = await call("u_a", { action: "onboard", name: "Ana A", ...VT, heard: { src: "instagram" } });
assert.equal(r.code, 200); assert.equal(row("u_a").heard_from.src, "instagram"); assert.equal(row("u_a").heard_from.via, "signup");
await call("u_a", { action: "onboard", name: "Ana A", ...VT, heard: { src: "tiktok" } });
assert.equal(row("u_a").heard_from.src, "instagram", "first answer wins");
r = await call("u_b", { action: "onboard", name: "Ben B", ...VT, heard: { src: "nope" } });
assert.equal(r.code, 200); assert.equal(row("u_b").heard_from, undefined, "bad key → nothing stored");
await call("u_c", { action: "onboard", name: "Cal C", ...VT });       // skipped the question
await call("u_d", { action: "onboard", name: "Dee D", ...VT, alerts: false });   // unticked weekly emails → never emailed
await call("u_p", { action: "onboard", name: "Dr P", ...VT, staff: "Professor" });
await call("u_x", { action: "onboard", name: "Xan X", ...VT });
await call("u_own", { action: "onboard", name: "Adam S", ...VT });
// private: never in the public profile or the student's own payload
const pub = await invoke(me, { method: "GET", query: { u: row("u_a").handle } });
assert.equal(pub.code, 200); assert.ok(!JSON.stringify(pub.body).includes("instagram"), "public profile never shows it");
const own = await invoke(me, { method: "GET", headers: { authorization: "Bearer " + tok("u_a") } });
assert.ok(!JSON.stringify(own.body).includes("heard"), "not sent back to the page");
console.log("✓ heard: sign-up answer stored once, bad keys ignored, never public");

// ── businesses: set once, kept off the public company page ──
r = await call("u_emp", { action: "biz_save", profile: { company: "Boeing", website: "boeing.com", name: "Jane" }, heard: { src: "linkedin" } });
assert.equal(r.code, 200); assert.equal(r.body.heardDone, true); assert.ok(!("heard" in r.body.profile), "own view: only heardDone");
await call("u_emp", { action: "biz_save", profile: { company: "Boeing", website: "boeing.com", name: "Jane", heard: { src: "event" } }, heard: { src: "event" } });
const emp = f.T("employers").find((e) => e.clerk_user_id === "u_emp");
assert.equal(emp.profile.heard.src, "linkedin", "first business answer wins (and can't be set through profile)");
r = await call("u_emp", { action: "biz_posts", posts: [{ title: "Intern" }] });
assert.equal(f.T("employers").find((e) => e.clerk_user_id === "u_emp").profile.heard.src, "linkedin", "posting jobs keeps it");
emp.status = "verified";
const co = await invoke(me, { method: "GET", query: { co: emp.slug } });
assert.equal(co.code, 200); const cs = JSON.stringify(co.body); assert.ok(!cs.includes("heard"), "never on the public company page: " + cs.slice(0, 400));
console.log("✓ heard: business answer set once, not on /co/ page");

// ── owner counts ──
assert.equal((await call("u_a", { action: "admin_heard" })).code, 403, "owners only");
r = await call("u_own", { action: "admin_heard" });
assert.equal(r.code, 200);
assert.equal(r.body.students.total, 1); assert.equal(r.body.students.rows[0].src, "instagram"); assert.equal(r.body.students.rows[0].n7, 1);
assert.equal(r.body.businesses.total, 1); assert.equal(r.body.businesses.rows[0].src, "linkedin");
assert.ok(!JSON.stringify(r.body).includes("u_a") && !JSON.stringify(r.body).includes("@"), "counts only, no ids or emails");
// waiting = students, not answered, still get emails: Ben, Cal, Xan, Adam (owner) — not Ana (answered), Dee (no emails), Dr P (staff)
assert.equal(r.body.email.waiting, 4);
console.log("✓ heard: owner counts, no names");

// ── the one-time email ──
assert.equal((await call("u_a", { action: "admin_heard_email", test: true })).code, 403);
assert.equal((await call("u_own", { action: "admin_heard_email" })).code, 400, "needs SEND");
r = await call("u_own", { action: "admin_heard_email", test: true });
assert.equal(r.code, 200); assert.equal(f.calls.emails.length, 1); assert.deepEqual(f.calls.emails[0].to, ["owner@example.com"]);
assert.equal(row("u_own").heard_asked_at, undefined, "a test doesn't count as asked");
const m = f.calls.emails[0];
assert.ok(/how did you find Beat the Pile/i.test(m.subject) && !/—/.test(m.html + m.subject + m.text), "subject, no em dashes");
assert.ok(H.STUDENT.every(([k]) => m.html.includes(`s=${k}`)), "a button per answer");
assert.ok(m.html.includes(`t=${row("u_own").heard_token}`) && m.headers["List-Unsubscribe"], "working link + unsubscribe header");
r = await call("u_own", { action: "admin_heard_email", confirm: "SEND" });
assert.equal(r.code, 200); assert.equal(r.body.sent, 3, "Ben, Cal, Xan"); assert.equal(r.body.skipped, 1, "the owner uses the test copy");
assert.deepEqual(f.calls.emails.slice(1).map((e) => e.to[0]).sort(), ["b@vt.edu", "c@vt.edu", "x@vt.edu"]);
r = await call("u_own", { action: "admin_heard_email", confirm: "SEND" });
assert.equal(r.body.sent, 0, "never twice"); assert.equal(f.calls.emails.length, 4);
console.log("✓ heard email: test to owner first, SEND, skips answered/unsubscribed/staff, never twice");

// ── the link page: opening it records nothing, Send does, first answer wins, tokens are per person ──
const tb = row("u_b").heard_token, tc = row("u_c").heard_token;
assert.ok(tb && tc && tb !== tc && !tb.includes("u_b"), "random token, not the account id");
assert.equal((await link("nope")).code, 404); assert.equal((await link("A".repeat(24))).code, 404);
r = await link(tb); assert.equal(r.code, 200); assert.equal(r.body.answered, false);
assert.equal(row("u_b").heard_from, undefined, "opening the link (email scanners) records nothing");
assert.equal((await link(tb, "POST", { src: "myspace" })).code, 400);
r = await link(tb, "POST", { src: "fair" }); assert.equal(r.code, 200);
assert.equal(row("u_b").heard_from.src, "fair"); assert.equal(row("u_b").heard_from.via, "email");
assert.equal(row("u_c").heard_from, undefined, "Ben's token only answers for Ben");
r = await link(tb, "POST", { src: "flyer" }); assert.equal(r.body.already, true); assert.equal(row("u_b").heard_from.src, "fair", "first answer wins");
assert.equal((await link(tb)).body.answered, true);
r = await call("u_own", { action: "admin_heard" });
assert.equal(r.body.email.answered, 1); assert.equal(r.body.email.asked, 4); assert.equal(r.body.students.total, 2);
console.log("✓ heard link: GET only checks, POST records, per-person token, first answer wins");

// email builder without an unsubscribe token still has a way out
assert.ok(buildHeardEmail({ token: "t".repeat(24) }).unsub.includes("/u/#settings"));
// Delete all my data removes the answer with the row
await call("u_b", { action: "delete_all", confirm: "DELETE" }); assert.equal(row("u_b"), undefined);
console.log("✓ heard: all checks passed");
