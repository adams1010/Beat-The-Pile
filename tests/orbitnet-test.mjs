// Orbit part 2: Connect (two-way), messages (who may write whom), same fair, no ids leak, delete-all cleans up.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, clerkUsers: {
  u_emp: { email: "jane@boeing.com", role: "employer", first_name: "Jane", last_name: "Recruiter" },
  u_ana: { email: "ana@vt.edu", role: "student" }, u_ben: { email: "ben@vt.edu", role: "student" },
  u_cal: { email: "cal@vt.edu", role: "student" }, u_dee: { email: "dee@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const { canMessage, linkState, cleanBody, peerKey } = await import("../lib/orbitnet.js");
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });

// pure rules
assert.equal(linkState(null, "a"), "none");
assert.equal(linkState({ status: "pending", requested_by: "a" }, "a"), "requested");
assert.equal(linkState({ status: "pending", requested_by: "b" }, "a"), "incoming");
assert.equal(linkState({ status: "accepted", requested_by: "b" }, "a"), "connected");
assert.ok(canMessage({ link: { status: "accepted" } }).ok);
assert.ok(!canMessage({ link: { status: "pending" } }).ok, "pending isn't enough");
assert.ok(canMessage({ fromRole: "employer", toRow: { profile_public: true, profile: { openToEmployers: true } } }).ok);
assert.ok(!canMessage({ fromRole: "employer", toRow: { profile_public: true, profile: {} } }).ok, "employers need the student's opt-in");
assert.ok(!canMessage({ fromRole: "employer", toRow: { profile_public: false, profile: { openToEmployers: true } } }).ok);
assert.ok(canMessage({ fromRole: "student", toRole: "employer", theyWroteMe: true }).ok, "students can reply to an employer");
assert.ok(!canMessage({ fromRole: "student", toRole: "employer", theyWroteMe: false }).ok, "but can't cold-message one");
assert.equal(cleanBody("  hi\u0000 there \n\n\n\n\nbye "), "hi there \n\n\nbye");
assert.equal(cleanBody("x".repeat(3000)).length, 2000);
assert.match(peerKey("u_ana"), /^p_[A-Za-z0-9_-]{18}$/); assert.notEqual(peerKey("u_ana"), peerKey("u_ben"));

// profiles: ana, ben, cal public (VT ME); dee private; cal lets employers find her
const prof = (sub, handle, pub, extra = {}) => call(sub, { action: "profile", handle, public: pub,
  profile: { name: handle.toUpperCase(), school: "Virginia Tech", major: "Mechanical Engineering", gradYear: 2027, ...extra } });
for (const [s, h, p, x] of [["u_ana", "ana", true], ["u_ben", "ben", true], ["u_cal", "cal", true, { openToEmployers: true }], ["u_dee", "dee", false]])
  assert.equal((await prof(s, h, p, x)).code, 200);

// connect → pending both ways → accept
assert.equal((await call("u_ana", { action: "orbit_connect", to: "dee" })).code, 404, "can't request a private profile");
assert.equal((await call("u_ana", { action: "orbit_connect", to: "ana" })).code, 404, "can't connect to yourself");
let r = await call("u_ana", { action: "orbit_connect", to: "ben" }); assert.deepEqual(r.body, { link: "requested" });
r = await call("u_ana", { action: "orbit_connect", to: "ben" }); assert.deepEqual(r.body, { link: "requested" }, "twice is a no-op");
assert.equal(f.T("orbit_links").length, 1);
assert.equal((await call("u_ana", { action: "orbit_send", to: "ben", body: "hey" })).code, 403, "no messages before accept");
assert.deepEqual((await call("u_ben", { action: "orbit_count" })).body, { n: 1 }, "badge counts the request");
assert.deepEqual((await call("u_ana", { action: "orbit_count" })).body, { n: 0 }, "your own request isn't a notification");
r = await call("u_ben", { action: "orbit" });
assert.equal(r.body.requests.length, 1); assert.equal(r.body.requests[0].handle, "ana");
assert.equal(r.body.classmates.find((c) => c.handle === "ana").link, "incoming");
assert.ok(!JSON.stringify(r.body).includes("u_ana"), "no Clerk ids in Orbit");
r = await call("u_ben", { action: "orbit_accept", to: r.body.requests[0].key }); assert.deepEqual(r.body, { link: "connected" }, "accept by peer key");
r = await call("u_ana", { action: "orbit" });
assert.equal(r.body.connections[0].handle, "ben"); assert.equal(r.body.classmates.find((c) => c.handle === "ben").link, "connected");
console.log("✓ orbit connect: public profiles only, request → accept, idempotent, no ids");

// messages between connected students
assert.equal((await call("u_ana", { action: "orbit_send", to: "ben", body: "   " })).code, 400);
assert.equal((await call("u_ana", { action: "orbit_send", to: "ben", body: "Going to the CAMEO fair?" })).code, 200);
assert.equal((await call("u_ben", { action: "orbit" })).body.unread, 1);
assert.deepEqual((await call("u_ben", { action: "orbit_count" })).body, { n: 1 }, "badge = unread message (request already accepted)");
r = await call("u_ben", { action: "orbit_inbox" });
assert.equal(r.body.threads.length, 1); assert.equal(r.body.threads[0].unread, 1); assert.equal(r.body.threads[0].handle, "ana");
r = await call("u_ben", { action: "orbit_thread", to: r.body.threads[0].key });
assert.equal(r.body.canSend, true); assert.equal(r.body.messages[0].body, "Going to the CAMEO fair?"); assert.equal(r.body.messages[0].mine, false);
assert.equal((await call("u_ben", { action: "orbit" })).body.unread, 0, "opening the thread marks it read");
await call("u_ben", { action: "orbit_send", to: "ana", body: "Yes!" });
r = await call("u_ana", { action: "orbit_thread", to: "ben" });
assert.deepEqual(r.body.messages.map((m) => [m.mine, m.body]), [[true, "Going to the CAMEO fair?"], [false, "Yes!"]]);
assert.equal((await call("u_cal", { action: "orbit_send", to: "ana", body: "hi" })).code, 403, "strangers can't message");
assert.equal((await call("u_cal", { action: "orbit_thread", to: peerKey("u_ana") })).code, 404, "peer keys only work for people you know");
console.log("✓ orbit messages: connected only, inbox + unread, thread order, strangers blocked");

// employers: only to opted-in students; students reply, can't cold-message employers
f.T("employers").push({ clerk_user_id: "u_emp", status: "verified", profile: { company: "Boeing", name: "Jane Recruiter", title: "University Recruiting" }, fairs: [] });
assert.equal((await call("u_emp", { action: "orbit_send", to: "ana", body: "Hi Ana" })).code, 403, "ana didn't opt in");
assert.equal((await call("u_emp", { action: "orbit_send", to: "cal", body: "Hi Cal, we're hiring interns" })).code, 200);
r = await call("u_cal", { action: "orbit_inbox" });
assert.equal(r.body.threads[0].name, "Jane Recruiter"); assert.match(r.body.threads[0].headline, /University Recruiting at Boeing/);
assert.ok(!JSON.stringify(r.body).includes("jane@"), "employer email address never shown");
assert.equal((await call("u_cal", { action: "orbit_send", to: r.body.threads[0].key, body: "Thanks!" })).code, 200, "student replies");
r = await call("u_emp", { action: "orbit_thread", to: "cal" }); assert.equal(r.body.messages.length, 2);
console.log("✓ orbit employers: opt-in students only, replies work, email hidden");

// same fair: only people who opted in to the same fair see each other
assert.equal((await call("u_ana", { action: "orbit_fair", fair: "bad id!", on: true })).code, 400);
await call("u_ana", { action: "orbit_fair", fair: "vt-cameo-s27", on: true });
await call("u_ben", { action: "orbit_fair", fair: "vt-cameo-s27", on: false });
await call("u_cal", { action: "orbit_fair", fair: "vt-cameo-s27", on: true });
r = await call("u_ana", { action: "orbit" });
assert.deepEqual(r.body.fair.people.map((p) => p.handle), ["cal"], "ben picked it but didn't opt in");
assert.equal(r.body.fair.on, true);
assert.deepEqual((await call("u_ben", { action: "orbit" })).body.fair.people, [], "not opted in → sees nobody");
console.log("✓ orbit same fair: opt-in both ways");

// withdraw / disconnect, then delete-all wipes links + messages
await call("u_cal", { action: "orbit_connect", to: "ana" });
assert.equal((await call("u_cal", { action: "orbit_remove", to: "ana" })).body.link, "none");
assert.equal(f.T("orbit_links").length, 1, "withdrawn request is gone");
assert.equal((await call("u_ana", { action: "delete_all", confirm: "DELETE" })).code, 200);
assert.equal(f.T("orbit_links").length, 0);
assert.ok(!f.T("orbit_messages").some((m) => m.sender === "u_ana" || m.recipient === "u_ana"));
assert.equal(f.T("orbit_messages").length, 2, "other people's conversations stay");
console.log("✓ orbit cleanup: withdraw works, delete-all removes your links and messages");
