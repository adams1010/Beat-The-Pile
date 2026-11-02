import assert from "node:assert/strict";
import crypto from "node:crypto";
process.env.CLERK_SECRET_KEY="sk"; process.env.INTERNIQ_DB_URL="https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY="s"; process.env.INTERNIQ_DB_ANON_KEY="a";
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
const store = new Map(), files = new Map();
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("api.clerk.com")) return { ok: true, status: 200, json: async () => ({ keys: [jwk] }) };
  const url = new URL(u); const m = o.method || "GET";
  if (url.pathname.startsWith("/storage/v1/object/sign/")) { const p = url.pathname.replace("/storage/v1/object/sign/", ""); assert.ok(files.has(p), "signing a missing file");
    return { ok: true, status: 200, json: async () => ({ signedURL: `/object/sign/${p}?token=SIGNED` }) }; }
  if (url.pathname.startsWith("/storage/v1/object/")) { assert.equal(o.headers["x-upsert"], "true"); files.set(url.pathname.replace("/storage/v1/object/", ""), o.body); return { ok: true, status: 200, text: async () => "" }; }
  if (m === "POST") { for (const r of JSON.parse(o.body)) store.set(r.clerk_user_id, { saved: [], applied: [], fair_notes: [], resume_share: true, ...(store.get(r.clerk_user_id) || {}), ...r }); return { ok: true, status: 201, text: async () => "" }; }
  let rows = [...store.values()];
  if (url.searchParams.get("clerk_user_id")) rows = rows.filter((r) => r.clerk_user_id === decodeURIComponent(url.searchParams.get("clerk_user_id").slice(3)));
  if (url.searchParams.get("resume_token")) rows = rows.filter((r) => r.resume_token === decodeURIComponent(url.searchParams.get("resume_token").slice(3)));
  return { ok: true, status: 200, text: async () => JSON.stringify(rows.slice(0, 1)) };
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (sub) => { const h = b64({ alg: "RS256", kid: "k1" }), p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 60 }); return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url")}`; };
const me = (await import("../api/me.js")).default;
const call = async (method, auth, body, query = {}) => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); r.end = () => r;
  await me({ method, query, headers: auth ? { authorization: "Bearer " + auth } : {}, body }, r); return r; };

// sign-in required
assert.equal((await call("GET")).code, 401);
assert.equal((await call("GET", "fake.token.here")).code, 401);
// saved / applied still work
let r = await call("POST", tok("user_a"), { list: "saved", id: "merck:JR123", on: true }); assert.deepEqual(r.body, { saved: ["merck:JR123"], applied: [] });
r = await call("POST", tok("user_a"), { list: "applied", id: "x-abbott:31415", on: true }); assert.deepEqual(r.body.applied, ["x-abbott:31415"]);
r = await call("GET", tok("user_b")); assert.deepEqual(r.body, { saved: [], applied: [], resume: null, notes: [], starred: [], seenAt: null, apps: [], goal: null });
assert.equal((await call("POST", tok("user_a"), { list: "admin", id: "x:1", on: true })).code, 400);
console.log("✓ saved/applied unchanged; users isolated");

// resume upload
const pdf = Buffer.from("%PDF-1.4 fake resume").toString("base64");
assert.equal((await call("POST", tok("user_a"), { action: "resume", name: "a.pdf", data: Buffer.from("hello").toString("base64") })).code, 400, "non-PDF refused");
assert.equal((await call("POST", tok("user_a"), { action: "resume", name: "a.pdf", data: Buffer.alloc(3.2 * 1024 * 1024, 37).toString("base64") })).code, 400, "too big refused");
r = await call("POST", tok("user_a"), { action: "resume", name: "Adam Shiloni Resume.pdf", data: pdf });
assert.equal(r.code, 200); const t = r.body.resume.token; assert.match(t, /^[A-Za-z0-9_-]{20,}$/); assert.equal(r.body.resume.share, true);
assert.ok(files.has("resumes/user_a/resume.pdf"));
assert.deepEqual(r.body.saved, ["merck:JR123"], "upload keeps saved list");
r = await call("POST", tok("user_a"), { action: "resume", name: "v2.pdf", data: pdf }); assert.equal(r.body.resume.token, t, "replacing keeps the same QR");
console.log("✓ resume: PDF-only, 3MB cap, private path per user, QR token stable on replace");

// QR target
r = await call("GET", null, null, { r: t }); assert.equal(r.code, 302); assert.match(r.headers.Location, /^https:\/\/f\.co\/storage\/v1\/object\/sign\/resumes\/user_a\/resume\.pdf\?token=SIGNED$/);
assert.equal((await call("GET", null, null, { r: "nope" })).code, 404);
assert.equal((await call("GET", null, null, { r: "A".repeat(24) })).code, 404, "unknown token");
r = await call("POST", tok("user_a"), { action: "share", on: false }); assert.equal(r.body.resume.share, false);
assert.equal((await call("GET", null, null, { r: t })).code, 404, "sharing off blocks the QR");
await call("POST", tok("user_a"), { action: "share", on: true });
assert.equal((await call("GET", null, null, { r: t })).code, 302);
assert.equal((await call("POST", tok("user_b"), { action: "share", on: true })).code, 400, "no resume yet");
console.log("✓ QR: scan → 10-min signed link; off → 'not shared'; bad tokens refused");

// notes
assert.equal((await call("POST", tok("user_a"), { action: "note", note: { said: "x" } })).code, 400);
r = await call("POST", tok("user_a"), { action: "note", note: { company: "Hensel Phelps", companyId: "x-hensel-phelps", fair: "Construction Industry Career Fair", contact: "Sarah Lee", said: "Wants field engineers", feel: "great", followUpAt: new Date(Date.now() + 864e5).toISOString() } });
assert.equal(r.body.notes.length, 1); const n = r.body.notes[0]; assert.equal(n.feel, "great"); assert.ok(n.id && n.talkedAt);
r = await call("POST", tok("user_a"), { action: "note", note: { ...n, done: true, feel: "<script>" } });
assert.equal(r.body.notes.length, 1); assert.equal(r.body.notes[0].done, true); assert.equal(r.body.notes[0].feel, "good", "bad values cleaned");
r = await call("GET", tok("user_b")); assert.equal(r.body.notes.length, 0, "notes private");
r = await call("POST", tok("user_a"), { action: "note_delete", id: n.id }); assert.equal(r.body.notes.length, 0);
console.log("✓ notes: add, update in place, cleaned, private, delete");
console.log("ME TESTS PASSED");
