// Nov 9 bug: Clerk ids with capitals ("user_2Xb…" vs "user_2ab…") — the database orders text ignoring case, JS doesn't,
// so joining some people's orbit failed with "Couldn't update your account".
import assert from "node:assert/strict";
import { installFake as inst, makeKeys as mk, invoke as inv, env as en } from "./fakedb.mjs";

  
  en(); const k = mk();
  inst({ jwk: k.jwk, clerkUsers: { user_2Xbig: { email: "x@vt.edu", role: "student" }, user_2abc: { email: "a@vt.edu", role: "student" } } });
  const me2 = (await import("../api/me.js")).default;
  const c2 = (sub, body) => inv(me2, { method: "POST", body, headers: { authorization: "Bearer " + k.tok(sub) } });
  for (const [s, h] of [["user_2Xbig", "xavier"], ["user_2abc", "abby"]]) assert.equal((await c2(s, { action: "profile", handle: h, public: true, profile: { name: h } })).code, 200);
  let r = await c2("user_2abc", { action: "orbit_connect", to: "xavier" });
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.link, "requested");
  r = await c2("user_2Xbig", { action: "orbit_state", to: "abby" }); assert.equal(r.body.link, "incoming");
  r = await c2("user_2Xbig", { action: "orbit_accept", to: "abby" }); assert.equal(r.body.link, "connected");
  r = await c2("user_2abc", { action: "orbit_send", to: "xavier", body: "hey" }); assert.equal(r.code, 200, JSON.stringify(r.body));
  r = await c2("user_2abc", { action: "orbit_remove", to: "xavier" }); assert.equal(r.body.link, "none");
  r = await c2("user_2Xbig", { action: "orbit_state", to: "abby" }); assert.equal(r.body.link, "none");
  console.log("✓ orbit requests work whatever the letter case of the two account ids (the 'couldn't update' bug)");
