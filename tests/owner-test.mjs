// Owner access (Nov 9): the two owners (ADMIN_EMAILS) get a verified business account the moment they open the business
// side — nobody else does.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.CLERK_SECRET_KEY = "sk_test";
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_own: { email: "mdxp21@gmail.com", role: "employer", first_name: "Maddox", last_name: "Potter" },
  u_x: { email: "jane@acme.com", role: "employer" }, u_stu: { email: "s@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
let r = await call("u_own", { action: "biz_get" });
assert.equal(r.code, 200); assert.equal(r.body.status, "verified"); assert.equal(r.body.owner, true);
assert.equal(r.body.profile.company, "Beat the Pile"); assert.equal(r.body.slug, "beat-the-pile");
assert.equal((await call("u_own", { action: "biz_home" })).code, 200);
r = await call("u_own", { action: "biz_save", profile: { company: "Beat the Pile", tagline: "Testing the business side" } });
assert.equal((await call("u_own", { action: "biz_get" })).body.status, "verified", "edits keep owner access");
assert.equal((await call("u_x", { action: "biz_get" })).body.status, "none", "everyone else still goes through setup + review");
console.log("✓ owner access: owners land on a verified business account; others still verify");
