// My Internship (/internship/): cleaning, phases, save/remove, "your people" privacy, AI bullets prompt.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_ana: { email: "ana@vt.edu", role: "student" }, u_ben: { email: "ben@vt.edu", role: "student" },
  u_cal: { email: "cal@vt.edu", role: "student" }, u_dee: { email: "dee@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const { cleanInternship, phaseOf } = await import("../lib/internship.js");
const { FEATURES } = await import("../api/generate.js");
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });

// cleaning
assert.equal(cleanInternship({ role: "x" }), null, "company required");
const c = cleanInternship({ company: "  Boeing ", start: "2027-06-01", end: "nope", companyId: "Bad Id!", checks: { accept: true, "x y": true, terms: "yes" },
  log: [{ id: "w-1", week: "2027-06-06", did: "Built a jig" }, { did: "", learned: "", win: "" }], visible: "true" });
assert.equal(c.company, "Boeing"); assert.equal(c.start, "2027-06-01"); assert.equal(c.end, null); assert.equal(c.companyId, null);
assert.deepEqual(c.checks, { accept: true }); assert.equal(c.log.length, 1); assert.equal(c.visible, false);
console.log("✓ internship cleaning: company required, dates/ids/checks/log validated, visible only when true");

// phases
const D = 864e5, s = Date.parse("2027-06-01");
assert.equal(phaseOf({}), "after-offer");
assert.equal(phaseOf({ start: "2027-06-01" }, s - 30 * D), "after-offer");
assert.equal(phaseOf({ start: "2027-06-01" }, s - 3 * D), "before-start");
assert.equal(phaseOf({ start: "2027-06-01" }, s + 2 * D), "first-week");
assert.equal(phaseOf({ start: "2027-06-01", end: "2027-08-10" }, s + 30 * D), "middle");
assert.equal(phaseOf({ start: "2027-06-01", end: "2027-08-10" }, Date.parse("2027-08-01")), "wrap-up");
console.log("✓ internship phases follow the dates");

// save / view / remove
assert.equal((await call("u_ana", { action: "intern_save", internship: { role: "x" } })).code, 400);
let r = await call("u_ana", { action: "intern_save", internship: { company: "Boeing", role: "ME Intern", start: "2027-06-01", visible: true } });
assert.equal(r.code, 200); assert.equal(r.body.internship.company, "Boeing"); assert.equal(r.body.internship.visible, true);

// your people: public profiles only
for (const [sub, h, pub, extra] of [["u_ben", "ben", true, { experience: [{ title: "Intern", org: "Boeing", when: "Summer 2025" }] }],
  ["u_cal", "cal", true, {}], ["u_dee", "dee", false, { experience: [{ title: "Intern", org: "Boeing" }] }]])
  assert.equal((await call(sub, { action: "profile", handle: h, public: pub, profile: { name: h.toUpperCase(), school: "Virginia Tech", ...extra } })).code, 200);
await call("u_ana", { action: "profile", handle: "ana", public: true, profile: { name: "Ana" } });
await call("u_cal", { action: "intern_save", internship: { company: "The Boeing Company", role: "Intern", visible: true } });
await call("u_dee", { action: "intern_save", internship: { company: "Boeing", visible: true } });
r = await call("u_ana", { action: "intern_peers" });
assert.equal(r.code, 200);
assert.deepEqual(r.body.alumni.map((p) => p.handle), ["ben"], "alumni = public profiles with Boeing experience (dee is private)");
assert.ok(r.body.incoming.every((p) => p.handle !== "dee" && p.handle !== "ana"), "private and self never shown");
assert.ok(!JSON.stringify(r.body).includes("u_"), "no Clerk ids leak");
r = await call("u_cal", { action: "intern_peers" });
assert.ok(r.body.incoming.some((p) => p.handle === "ana"), "ana opted in, so incoming interns see her");
await call("u_ana", { action: "intern_save", internship: { company: "Boeing", visible: false } });
r = await call("u_cal", { action: "intern_peers" });
assert.ok(!r.body.incoming.some((p) => p.handle === "ana"), "switch off hides her");
r = await call("u_ana", { action: "intern_save", internship: null });
assert.equal(r.code, 200); assert.equal(r.body.internship, null);
console.log("✓ intern_save/intern_peers: save, remove, public-only people, opt-in incoming interns, no ids");

// AI bullets: needs real log text; prompt forbids inventing
assert.throws(() => FEATURES.intern_bullets({ entries: [] }));
const p = FEATURES.intern_bullets({ role: "ME Intern", company: "Boeing", entries: [{ did: "Designed a fixture for wing panel drilling", win: "cut setup time" }] });
assert.match(p.prompt, /never invent/); assert.match(p.prompt, /fixture/);
console.log("✓ intern_bullets: needs log entries, copy-only prompt");
