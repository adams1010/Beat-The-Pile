// Owner-only "why isn't X in my orbit?" (Nov 9): facts, no ids/emails; everyone else gets 403.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_own: { email: "mdxp21@gmail.com", role: "student" }, u_h: { email: "h@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
await call("u_own", { action: "onboard", name: "Maddox", school: "Virginia Tech", major: "Mechanical Engineering", show: true });
await call("u_h", { action: "profile", handle: "howard", public: false, profile: { name: "Howard Cushman", school: "Virginia Polytechnic Institute and State University", major: "ME" } });
assert.equal((await call("u_h", { action: "admin_orbit_why", q: "mad" })).code, 403);
const r = await call("u_own", { action: "admin_orbit_why", q: "howard" });
assert.equal(r.code, 200); const h = r.body.hits[0];
assert.equal(h.isPublic, false); assert.equal(h.sameSchool, true); assert.equal(h.sameMajor, true);
assert.ok(!JSON.stringify(r.body).includes("u_h") && !JSON.stringify(r.body).includes("@"), "no ids or emails");
console.log("✓ orbit why: owners only, shows public/school/major match, no ids");
