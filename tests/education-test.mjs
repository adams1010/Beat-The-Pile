// Profile education (Nov 9): several schools, graduation term, school id from the IPEDS list; Orbit matches schools by id.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_a: { email: "a@vt.edu", role: "student" }, u_b: { email: "b@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const { sameSchool, buildOrbit } = await import("../lib/orbit.js");
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });

let r = await call("u_a", { action: "profile", handle: "ana", public: true, profile: { name: "Ana", school: "Virginia Tech", schoolId: 233921, major: "Mechanical Engineering",
  gradYear: 2026, gradTerm: "Winter", education: [{ school: "NOVA", degree: "Associate", major: "Engineering", when: "2022 – 2024" }, { degree: "no school" }, ...Array(9).fill({ school: "X" })] } });
assert.equal(r.code, 200);
const p = r.body.profile;
assert.equal(p.gradTerm, "Winter"); assert.equal(p.schoolId, 233921);
assert.equal(p.education.length, 5, "up to 5 extra schools; empty ones dropped");
assert.deepEqual(p.education[0], { school: "NOVA", degree: "Associate", major: "Engineering", when: "2022 – 2024" });
r = await call("u_b", { action: "profile", handle: "ben", public: true, profile: { name: "Ben", school: "Virginia Polytechnic Institute and State University", schoolId: "233921", major: "Mechanical Engineering", gradTerm: "Autumn", schoolIdx: 1 } });
assert.equal(r.body.profile.gradTerm, null, "only Spring / Summer / Fall / Winter"); assert.equal(r.body.profile.schoolId, 233921);
assert.equal((await call("u_b", { action: "profile", handle: "ben", public: true, profile: { name: "Ben", schoolId: 12 } })).body.profile.schoolId, null);
// Orbit: same school by id even when the names differ
assert.ok(sameSchool({ school: "Virginia Tech", schoolId: 233921 }, { school: "Virginia Polytechnic Institute and State University", schoolId: 233921 }));
assert.ok(!sameSchool({ school: "Virginia Tech", schoolId: 233921 }, { school: "Virginia Tech", schoolId: 999999 }), "ids win over names");
assert.ok(sameSchool({ school: "Virginia Tech" }, { school: "VT" }), "no ids → names/aliases as before");
const o = buildOrbit({ uid: "u_a", me: { profile: { school: "Virginia Tech", schoolId: 233921, major: "Mechanical Engineering" } },
  publics: [{ clerk_user_id: "u_b", handle: "ben", profile_public: true, profile: { name: "Ben", school: "Virginia Polytechnic Institute and State University", schoolId: 233921, major: "Mechanical Engineering" } }] });
assert.deepEqual(o.classmates.map((c) => c.handle), ["ben"], "inner orbit by school id + same major");
// the schools data the pickers load
const idx = JSON.parse(readFileSync(new URL("../schools/index.json", import.meta.url)));
const cip = JSON.parse(readFileSync(new URL("../schools/cip.json", import.meta.url)));
const vt = idx.find((x) => x[0] === 233921);
assert.ok(idx.length > 3000 && vt && vt[2].includes("Virginia Tech"));
const vtp = JSON.parse(readFileSync(new URL(`../schools/p/${233921 % 64}.json`, import.meta.url)))[233921].map((c) => cip[c]);
assert.ok(vtp.includes("Mechanical Engineering") && vtp.includes("Psychology"));
console.log(`✓ education: several schools, grad term, school ids; Orbit matches by id; ${idx.length} schools with real program lists`);
