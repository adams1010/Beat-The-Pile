// Founding members: first 150 student accounts get #N (employers don't count), it's saved once and never moves; the
// public counter is the real count.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.CLERK_SECRET_KEY = "sk_test";
const { jwk, tok } = makeKeys();
const users = { u_a: { email: "a@vt.edu", role: "student" }, u_emp: { email: "j@boeing.com", role: "employer" }, u_b: { email: "b@vt.edu" }, u_c: { email: "c@vt.edu", role: "student" } };
installFake({ jwk, clerkUsers: users });
const me = (await import("../api/me.js")).default;
const F = await import("../lib/founding.js");
const get = (sub, query = {}) => invoke(me, { method: "GET", query, headers: sub ? { authorization: "Bearer " + tok(sub) } : {} });

let r = await get(null, { founding: "1" });
assert.equal(r.code, 200); assert.deepEqual(r.body, { taken: 3, total: 150, left: 147 }, "employers don't take a spot");
assert.equal((await get("u_b")).body.founding, 2, "second student account");
assert.equal(users.u_b.public.founding, 2, "saved to Clerk so it never moves");
assert.equal((await get("u_emp")).body.founding, null, "employers have no number");
// u_a's account goes away; u_c keeps a fair number and u_b keeps #2
delete users.u_a; F._resetFoundingCache();
assert.equal((await get("u_b")).body.founding, 2, "a saved number never changes");
assert.equal((await get("u_c")).body.founding, 1, "next free number, never a duplicate of a saved one");
F._resetFoundingCache();
assert.equal((await get("u_c")).body.founding, 1);
// over the cap → no number
const many = {}; for (let i = 0; i < 152; i++) many["s" + i] = { email: `s${i}@x.edu`, role: "student" };
Object.assign(users, many); F._resetFoundingCache();
assert.equal((await get("s150")).body.founding, null, "#151+ is not a founding member");
assert.deepEqual((await get(null, { founding: "1" })).body, { taken: 150, total: 150, left: 0 });
console.log("✓ founding members: real count, students only, saved once, no duplicates, 150 cap");
