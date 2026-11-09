// Orbit "Find people" (orbit_search): public profiles only, name/@handle/school/major/company, never yourself, no ids;
// employer accounts see nothing until verified (and then only students open to employers).
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_a: { email: "a@vt.edu", role: "student" }, u_b: { email: "b@vt.edu", role: "student" }, u_c: { email: "c@vt.edu", role: "student" },
  u_e: { email: "j@boeing.com", role: "employer" } } });
const me = (await import("../api/me.js")).default;
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
for (const [s, h, pub, p] of [["u_a", "ana", true, { name: "Ana Lopez", school: "Virginia Tech", major: "Mechanical Engineering" }],
  ["u_b", "ben", true, { name: "Ben Ortiz", school: "James Madison University", major: "Psychology", experience: [{ title: "Intern", org: "Boeing" }] }],
  ["u_c", "cal", false, { name: "Cal Ng", school: "Virginia Tech", major: "Mechanical Engineering" }]])
  assert.equal((await call(s, { action: "profile", handle: h, public: pub, profile: p })).code, 200);
const names = (r) => (r.body.people || []).map((p) => p.handle);
let r = await call("u_b", { action: "orbit_search", q: "virginia tech" });
assert.equal(r.code, 200); assert.deepEqual(names(r), ["ana"], "private profiles never show");
assert.deepEqual(names(await call("u_a", { action: "orbit_search", q: "ana" })), [], "never yourself");
assert.deepEqual(names(await call("u_a", { action: "orbit_search", q: "@ben" })), ["ben"], "@handle");
assert.deepEqual(names(await call("u_a", { action: "orbit_search", q: "boeing" })), ["ben"], "company in experience");
assert.deepEqual(names(await call("u_a", { action: "orbit_search", q: "ben psychology" })), ["ben"], "every word must fit");
assert.deepEqual(names(await call("u_a", { action: "orbit_search", q: "ben virginia" })), []);
assert.equal((await call("u_a", { action: "orbit_search", q: "b" })).body.people.length, 0, "one letter = no search");
r = await call("u_a", { action: "orbit_search", q: "ben" });
assert.equal(r.body.people[0].link, "none"); assert.ok(!JSON.stringify(r.body).includes("u_"), "no Clerk ids");
r = await call("u_e", { action: "orbit_search", q: "ana" });
assert.equal(r.body.employerPending, true); assert.equal(r.body.people.length, 0, "unverified employers see no one");
console.log("✓ Find people: public only, name/@handle/school/company, never you, no ids, employers gated");
