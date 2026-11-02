import assert from "node:assert/strict";
import crypto from "node:crypto";
process.env.CLERK_SECRET_KEY="sk"; process.env.INTERNIQ_DB_URL="https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY="s"; process.env.INTERNIQ_DB_ANON_KEY="a"; process.env.ANTHROPIC_API_KEY="k";
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
const users = new Map(), briefs = new Map(); let aiCalls = 0, lastPrompt = "";
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("api.clerk.com")) return { ok: true, status: 200, json: async () => ({ keys: [jwk] }) };
  if (u.includes("api.anthropic.com")) { aiCalls++; lastPrompt = JSON.parse(o.body).messages[0].content;
    const text = lastPrompt.includes("follow-up email") ? 'Sure: {"subject":"Great meeting you","body":"Hi Sarah, thanks..."}' : '{"known":true,"about":"Builds things.","engineers":"Field engineering.","ask":["Q1","Q2","Q3","Q4"]}';
    return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text }] }) }; }
  const url = new URL(u); const m = o.method || "GET", t = url.pathname.split("/").pop();
  const ok = (rows) => ({ ok: true, status: 200, text: async () => JSON.stringify(rows) });
  if (t === "user_jobs") {
    if (m === "POST") { for (const r of JSON.parse(o.body)) users.set(r.clerk_user_id, { ...(users.get(r.clerk_user_id) || {}), ...r }); return ok(null); }
    return ok([...users.values()].filter((r) => r.clerk_user_id === url.searchParams.get("clerk_user_id").slice(3)).slice(0, 1)); }
  if (t === "company_briefs") {
    if (m === "POST") { for (const r of JSON.parse(o.body)) briefs.set(r.company_id, r); return ok(null); }
    const b = briefs.get(url.searchParams.get("company_id").slice(3)); return ok(b ? [b] : []); }
  if (t === "company_candidates") return ok(url.searchParams.get("id") === "eq.x-hensel-phelps" ? [{ company: "Hensel Phelps", domain: "henselphelps.com" }] : []);
  if (t === "listings") return ok(url.searchParams.get("company_id") === "eq.x-hensel-phelps" ? [{ company: "Hensel Phelps", title: "Field Engineer Intern" }] : []);
  throw new Error("unexpected " + u);
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (sub) => { const h = b64({ alg: "RS256", kid: "k1" }), p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 60 }); return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url")}`; };
const me = (await import("../api/me.js")).default;
const call = async (body, sub = "user_a") => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.end = () => r;
  await me({ method: body ? "POST" : "GET", query: {}, headers: sub ? { authorization: "Bearer " + tok(sub) } : {}, body }, r); return r; };

// follow companies
let r = await call({ action: "star", company: "x-hensel-phelps", on: true }); assert.deepEqual(r.body.starred, ["x-hensel-phelps"]);
r = await call({ action: "star", company: "hillphoenix", on: true }); assert.equal(r.body.starred.length, 2);
r = await call({ action: "star", company: "hillphoenix", on: false }); assert.deepEqual(r.body.starred, ["x-hensel-phelps"]);
assert.equal((await call({ action: "star", company: "Bad Id!", on: true })).code, 400);
assert.equal((await call({ action: "star", company: "x", on: true }, null)).code, 401);
r = await call(); assert.deepEqual(r.body.starred, ["x-hensel-phelps"]); assert.equal(r.body.seenAt, null);
await call({ action: "seen" }); r = await call(); assert.ok(Date.now() - new Date(r.body.seenAt) < 5000);
assert.deepEqual((await call(null, "user_b")).body.starred, [], "users isolated");
console.log("✓ follow/unfollow companies, seen timestamp, validation, isolation");

// briefs: server looks up name (client can't inject), cached for everyone
r = await call({ action: "brief", companyId: "x-hensel-phelps", company: "IGNORED evil" });
assert.equal(r.code, 200); assert.equal(r.body.brief.about, "Builds things."); assert.equal(r.body.brief.ask.length, 3);
assert.ok(lastPrompt.includes("Hensel Phelps") && lastPrompt.includes("Field Engineer Intern") && !lastPrompt.includes("evil"));
r = await call({ action: "brief", companyId: "x-hensel-phelps" }, "user_b"); assert.equal(r.code, 200); assert.equal(aiCalls, 1, "second student hits the cache");
assert.equal((await call({ action: "brief", companyId: "x-unknown" })).code, 404);
assert.equal((await call({ action: "brief", companyId: "../etc" })).code, 400);
console.log("✓ briefs: grounded in our data, cached, unknown/bad ids refused");

// polish
r = await call({ action: "polish", name: "Adam", note: { company: "Hensel Phelps", contact: "Sarah", said: "Wants field engineers" } });
assert.equal(r.code, 200); assert.equal(r.body.subject, "Great meeting you"); assert.ok(lastPrompt.includes("Wants field engineers"));
assert.equal((await call({ action: "polish", note: {} })).code, 400);
// rate limit
let last; for (let i = 0; i < 35; i++) last = await call({ action: "polish", note: { company: "X" } }, "user_c"); assert.equal(last.code, 429);
console.log("✓ AI follow-up email from notes; per-student hourly limit");
