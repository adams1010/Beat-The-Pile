// /api/me — saved/applied, resume QR (private by default, rotate, delete), notes, concurrent saves.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
const f = installFake({ jwk });
const me = (await import("../api/me.js")).default;
const call = (method, sub, body, query = {}) => invoke(me, { method, query, body, headers: sub ? { authorization: "Bearer " + (sub.includes(".") ? sub : tok(sub)) } : {} });

// sign-in required
assert.equal((await call("GET")).code, 401);
assert.equal((await call("GET", "fake.token.here")).code, 401);
// saved / applied
let r = await call("POST", "user_a", { list: "saved", id: "merck:JR123", on: true }); assert.deepEqual(r.body, { saved: ["merck:JR123"], applied: [] });
r = await call("POST", "user_a", { list: "applied", id: "x-abbott:31415", on: true }); assert.deepEqual(r.body.applied, ["x-abbott:31415"]); assert.deepEqual(r.body.saved, ["merck:JR123"]);
r = await call("GET", "user_b"); assert.deepEqual(r.body, { saved: [], applied: [], resume: null, notes: [], starred: [], seenAt: null, apps: [], goal: null });
assert.equal((await call("POST", "user_a", { list: "admin", id: "x:1", on: true })).code, 400);
console.log("✓ saved/applied; users isolated");

// resume upload — starts PRIVATE
const pdf = Buffer.from("%PDF-1.4 fake resume").toString("base64");
assert.equal((await call("POST", "user_a", { action: "resume", name: "a.pdf", data: Buffer.from("hello").toString("base64") })).code, 400, "non-PDF refused");
assert.equal((await call("POST", "user_a", { action: "resume", name: "a.pdf", data: Buffer.alloc(3.2 * 1024 * 1024, 37).toString("base64") })).code, 400, "too big refused");
r = await call("POST", "user_a", { action: "resume", name: "Adam Resume.pdf", data: pdf });
assert.equal(r.code, 200); const t = r.body.resume.token; assert.match(t, /^[A-Za-z0-9_-]{20,}$/);
assert.equal(r.body.resume.share, false, "new uploads start with sharing OFF");
assert.ok(f.files.has("resumes/user_a/resume.pdf")); assert.deepEqual(r.body.saved, ["merck:JR123"], "upload keeps saved list");
assert.equal((await call("GET", null, null, { r: t })).code, 404, "private by default: QR shows 'not shared'");
r = await call("POST", "user_a", { action: "share", on: true }); assert.equal(r.body.resume.share, true);
r = await call("POST", "user_a", { action: "resume", name: "v2.pdf", data: pdf }); assert.equal(r.body.resume.token, t, "replacing keeps the same QR"); assert.equal(r.body.resume.share, true, "replacing keeps the student's sharing choice");
console.log("✓ resume: PDF-only, 3MB cap, private by default, replace keeps QR + choice");

// QR target: short-lived signed link, no referrer
r = await call("GET", null, null, { r: t }); assert.equal(r.code, 302);
assert.match(r.headers.Location, /\/object\/sign\/resumes\/user_a\/resume\.pdf\?token=SIGNED&exp=120$/, "2-minute signed link"); assert.equal(r.headers["Referrer-Policy"], "no-referrer");
assert.equal((await call("GET", null, null, { r: "nope" })).code, 404);
assert.equal((await call("GET", null, null, { r: "A".repeat(24) })).code, 404, "unknown token");
r = await call("POST", "user_a", { action: "share", on: false }); assert.equal(r.body.resume.share, false);
assert.equal((await call("GET", null, null, { r: t })).code, 404, "sharing off blocks the QR");
await call("POST", "user_a", { action: "share", on: true });
// rotate: old QR dies, new one works
r = await call("POST", "user_a", { action: "rotate" }); const t2 = r.body.resume.token; assert.notEqual(t2, t);
assert.equal((await call("GET", null, null, { r: t })).code, 404, "old QR stops working after a new link");
assert.equal((await call("GET", null, null, { r: t2 })).code, 302);
assert.equal((await call("POST", "user_b", { action: "share", on: true })).code, 400, "no resume yet");
assert.equal((await call("POST", "user_b", { action: "rotate" })).code, 400);
// delete: file gone, link gone
r = await call("POST", "user_a", { action: "resume_delete" }); assert.equal(r.body.resume, null); assert.ok(!f.files.has("resumes/user_a/resume.pdf"));
assert.equal((await call("GET", null, null, { r: t2 })).code, 404);
console.log("✓ QR: 2-min signed link; off/rotate/delete all revoke; bad tokens refused");

// notes
assert.equal((await call("POST", "user_a", { action: "note", note: { said: "x" } })).code, 400);
r = await call("POST", "user_a", { action: "note", note: { company: "Hensel Phelps", companyId: "x-hensel-phelps", contact: "Sarah Lee", said: "Wants field engineers", feel: "great" } });
assert.equal(r.body.notes.length, 1); const n = r.body.notes[0]; assert.equal(n.feel, "great"); assert.ok(n.id && n.talkedAt);
r = await call("POST", "user_a", { action: "note", note: { ...n, done: true, feel: "<script>" } });
assert.equal(r.body.notes.length, 1); assert.equal(r.body.notes[0].done, true); assert.equal(r.body.notes[0].feel, "good", "bad values cleaned");
assert.equal((await call("GET", "user_b")).body.notes.length, 0, "notes private");
r = await call("POST", "user_a", { action: "note_delete", id: n.id }); assert.equal(r.body.notes.length, 0);
console.log("✓ notes: add, update in place, cleaned, private, delete");

// CONCURRENT SAVES: two tabs at once must not erase each other
f.slowPatch = () => new Promise((res) => setTimeout(res, 5));
await Promise.all([
  call("POST", "user_c", { list: "saved", id: "a:1", on: true }),
  call("POST", "user_c", { list: "saved", id: "b:2", on: true }),
  call("POST", "user_c", { list: "applied", id: "c:3", on: true }),
  call("POST", "user_c", { action: "note", note: { company: "Tab One" } }),
  call("POST", "user_c", { action: "note", note: { company: "Tab Two" } }),
  call("POST", "user_c", { action: "star", company: "boeing", on: true }),
]);
f.slowPatch = null;
r = await call("GET", "user_c");
assert.deepEqual([...r.body.saved].sort(), ["a:1", "b:2"], "both saves kept");
assert.deepEqual(r.body.applied, ["c:3"]);
assert.deepEqual(r.body.notes.map((x) => x.company).sort(), ["Tab One", "Tab Two"], "both notes kept");
assert.deepEqual(r.body.starred, ["boeing"]);
assert.ok(f.T("user_jobs").find((x) => x.clerk_user_id === "user_c").version >= 6, "every write bumped the version");
console.log("✓ concurrent saves from several tabs: nothing lost");

// a database failure is a clear error, never a fake success
f.failNext = (url, m) => m === "PATCH";
r = await call("POST", "user_a", { list: "saved", id: "z:9", on: true }); assert.equal(r.code, 500); assert.ok(!("detail" in r.body), "no raw backend errors");
console.log("ME TESTS PASSED");

// delete everything: needs explicit confirm, removes file + rows, other users untouched
await call("POST", "user_e", { action: "resume", name: "e.pdf", data: pdf }); await call("POST", "user_e", { list: "saved", id: "q:1", on: true });
f.T("user_home").push({ clerk_user_id: "user_e", tracker: [{ company: "X" }] });
assert.equal((await call("POST", "user_e", { action: "delete_all" })).code, 400, "needs confirm");
r = await call("POST", "user_e", { action: "delete_all", confirm: "DELETE" }); assert.equal(r.code, 200);
assert.ok(!f.files.has("resumes/user_e/resume.pdf")); assert.ok(!f.T("user_jobs").some((x) => x.clerk_user_id === "user_e")); assert.ok(!f.T("user_home").some((x) => x.clerk_user_id === "user_e"));
assert.ok(f.T("user_jobs").some((x) => x.clerk_user_id === "user_a"), "other students untouched");
console.log("✓ delete all my data: confirm required; file + rows gone; nobody else touched");
