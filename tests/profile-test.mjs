// /api/me profile + email-reminder switch + unsubscribe
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
const f = installFake({ jwk });
const me = (await import("../api/me.js")).default;
const call = (method, sub, body, query = {}) => invoke(me, { method, query, body, headers: sub ? { authorization: "Bearer " + tok(sub) } : {} });

// private by default; public needs a handle + name
let r = await call("POST", "pa", { action: "profile", profile: { name: "Adam S", headline: "ME student", skills: ["SolidWorks", "SolidWorks", "MATLAB"] }, handle: "adam-s" });
assert.equal(r.code, 200); assert.equal(r.body.profilePublic, false); assert.deepEqual(r.body.profile.skills, ["SolidWorks", "MATLAB"], "skills de-duplicated");
assert.equal((await call("GET", null, null, { u: "adam-s" })).code, 404, "private profile is invisible");
assert.equal((await call("POST", "pa", { action: "profile", profile: { name: "A" }, public: true })).code, 400, "public needs a link name");
assert.equal((await call("POST", "pa", { action: "profile", profile: {}, handle: "adam-s", public: true })).code, 400, "public needs a name");
assert.equal((await call("POST", "pa", { action: "profile", profile: { name: "A" }, handle: "admin" })).code, 400, "reserved handle");
assert.equal((await call("POST", "pa", { action: "profile", profile: { name: "A" }, handle: "a b<script>" })).code, 400, "bad handle");
console.log("✓ profile: private by default; public needs name + valid, non-reserved link");

// public + cleaned output, unsafe links dropped
r = await call("POST", "pa", { action: "profile", handle: "Adam-S", public: true, profile: {
  name: "Adam S", gradYear: "2029", links: { linkedin: "javascript:alert(1)", github: "https://github.com/x" },
  projects: [{ name: "Bike", link: "http://insecure.example" }], experience: [{ title: "Intern", org: "Scheerer", desc: "x".repeat(900) }], showResume: true } });
assert.equal(r.code, 200); assert.equal(r.body.handle, "adam-s", "lower-cased");
r = await call("GET", null, null, { u: "ADAM-S" }); assert.equal(r.code, 200);
assert.equal(r.body.profile.links.linkedin, "", "javascript: link dropped"); assert.equal(r.body.profile.links.github, "https://github.com/x");
assert.equal(r.body.profile.projects[0].link, "", "http (not https) dropped"); assert.equal(r.body.profile.experience[0].desc.length, 600);
assert.equal(r.body.profile.gradYear, 2029); assert.equal(r.body.resume, null, "no resume button without a shared resume");
assert.ok(!("showResume" in r.body.profile)); assert.ok(!JSON.stringify(r.body).includes("pa"), "no user id leaked");
// resume shows only when the QR link is on
await call("POST", "pa", { action: "resume", name: "r.pdf", data: Buffer.from("%PDF-1.4 x").toString("base64") });
assert.equal((await call("GET", null, null, { u: "adam-s" })).body.resume, null, "resume link still private");
await call("POST", "pa", { action: "share", on: true });
assert.match((await call("GET", null, null, { u: "adam-s" })).body.resume, /^\/r\/[A-Za-z0-9_-]+$/);
console.log("✓ public profile: cleaned, https-only links, resume only when shared, nothing private leaked");

// handles are unique
assert.equal((await call("POST", "pb", { action: "profile", profile: { name: "B" }, handle: "adam-s" })).code, 409);
assert.equal((await call("POST", "pb", { action: "profile", profile: { name: "B" }, handle: "bee" })).code, 200);
// turning public off hides it again
await call("POST", "pa", { action: "profile", profile: { name: "Adam S" }, handle: "adam-s", public: false });
assert.equal((await call("GET", null, null, { u: "adam-s" })).code, 404);
console.log("✓ link names unique; turning it off hides the page");

// email reminders: refused without a Resend key; opt-in + unsubscribe link when configured
delete process.env.RESEND_API_KEY;
assert.equal((await call("POST", "pa", { action: "remind", on: true })).code, 400);
process.env.RESEND_API_KEY = "re_test";
r = await call("POST", "pa", { action: "remind", on: true }); assert.equal(r.body.remindEmail, true); assert.equal(r.body.emailReady, true);
const unsub = f.T("user_jobs").find((x) => x.clerk_user_id === "pa").remind_unsub; assert.match(unsub, /^[A-Za-z0-9_-]{20,}$/);
r = await call("GET", null, null, { unsub }); assert.equal(r.code, 200);
assert.equal(f.T("user_jobs").find((x) => x.clerk_user_id === "pa").remind_email, false, "one-click unsubscribe works without sign-in");
console.log("PROFILE TESTS PASSED");
