// Sign-up step 3 (Nov 9): school + major + graduation, "show me to students at my school" — new VT students land in each
// other's inner orbit right away, however they typed the school.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_a: { email: "a@vt.edu", role: "student" }, u_b: { email: "b@vt.edu", role: "student" }, u_c: { email: "c@vt.edu", role: "student" }, u_p: { email: "p@vt.edu", role: "educator" } } });
const me = (await import("../api/me.js")).default;
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
assert.equal((await call("u_a", { action: "onboard", name: "Ana Lopez" })).code, 400, "needs a school");
let r = await call("u_a", { action: "onboard", name: "Ana Lopez", school: "Virginia Polytechnic Institute and State University", schoolId: 233921, major: "Mechanical Engineering", gradTerm: "Winter", gradYear: 2027, show: true });
assert.equal(r.code, 200); assert.equal(r.body.handle, "ana-lopez"); assert.equal(r.body.profilePublic, true);
assert.equal(r.body.profile.gradTerm, "Winter");
r = await call("u_b", { action: "onboard", name: "Ana Lopez", school: "Virginia Tech", major: "ME", show: true });   // typed, short major
assert.equal(r.body.handle, "ana-lopez-2", "unique link name"); assert.equal(r.body.profile.schoolId, 233921, "typed alias resolves to the school id");
await call("u_c", { action: "onboard", name: "Cal", school: "VT", major: "Mechanical Engineering", show: false });
r = await call("u_a", { action: "orbit" });
assert.deepEqual(r.body.classmates.map((x) => x.handle), ["ana-lopez-2"], "same school + same major → inner orbit; Cal chose not to be shown");
// a later onboard keeps what's already on the profile
await call("u_a", { action: "profile", handle: "ana-lopez", public: true, profile: { name: "Ana Lopez", school: "Virginia Tech", schoolId: 233921, major: "Mechanical Engineering", skills: ["CAD"] } });
r = await call("u_a", { action: "onboard", name: "Ana Lopez", school: "Virginia Tech", schoolId: 233921, major: "Mechanical Engineering" });
assert.deepEqual(r.body.profile.skills, ["CAD"]); assert.equal(r.body.profilePublic, true, "no show flag → keeps current visibility");
// school staff (Nov 9): a professor gets a role tag, no graduation, and shows up on campus — never as a classmate's grad year
r = await call("u_p", { action: "onboard", name: "Dr. Kim", school: "Virginia Tech", major: "Mechanical Engineering", staff: "Professor", gradYear: 2027, show: true });
assert.equal(r.body.profile.staff, "Professor"); assert.equal(r.body.profile.gradYear, null); assert.equal(r.body.handle, "dr-kim");
assert.equal((await call("u_p", { action: "onboard", name: "Dr. Kim", school: "VT", staff: "Wizard" })).body.profile.staff, null, "only listed roles");
console.log("✓ onboarding: school/major/graduation, unique link name, aliases resolve, classmates see each other, opt-out respected");
