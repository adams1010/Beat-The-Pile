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
  if (t === "listings") return ok(url.searchParams.get("company_id") === "eq.x-hensel-phelps" || url.searchParams.get("id") === "eq.x-hensel-phelps:77" ? [{ company: "Hensel Phelps", title: "Field Engineer Intern", url: "https://hp.example/77", first_seen: "2026-10-30T00:00:00Z" }] : []);
  throw new Error("unexpected " + u);
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (sub) => { const h = b64({ alg: "RS256", kid: "k1" }), p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 60 }); return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url")}`; };
const me = (await import("../api/me.js")).default;
const call = async (body, sub = "user_a") => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.end = () => r;
  await me({ method: body ? "POST" : "GET", query: {}, headers: sub ? { authorization: "Bearer " + tok(sub) } : {}, body }, r); return r; };

// Mark applied on the jobs page → shows up on My Season with company, title, posted date
let r = await call({ list: "applied", id: "x-hensel-phelps:77", on: true });
r = await call(); assert.equal(r.body.apps.length, 1); const a = r.body.apps[0];
assert.equal(a.company, "Hensel Phelps"); assert.equal(a.stage, "applied"); assert.equal(a.postedAt, "2026-10-30T00:00:00.000Z"); assert.ok(a.appliedAt);
// move it along the pipeline (keeps the original applied date)
r = await call({ action: "app", app: { ...a, stage: "interview" } }); assert.equal(r.body.apps[0].stage, "interview"); assert.equal(r.body.apps[0].appliedAt, a.appliedAt);
// un-marking on the jobs page doesn't wipe an interview
await call({ list: "applied", id: "x-hensel-phelps:77", on: false }); r = await call(); assert.equal(r.body.apps.length, 1);
// add one by hand (applied somewhere else)
r = await call({ action: "app", app: { company: "Garmin", title: "ME Intern", appliedAt: "2026-10-28T12:00:00Z", url: "javascript:alert(1)" } });
const g = r.body.apps.find((x) => x.company === "Garmin"); assert.match(g.id, /^m:/); assert.equal(g.url, null, "bad links dropped"); assert.equal(g.stage, "applied");
assert.equal((await call({ action: "app", app: { title: "x" } })).code, 400);
r = await call({ action: "app_delete", id: g.id }); assert.equal(r.body.apps.length, 1);
// weekly goal
assert.equal((await call({ action: "goal", goal: 0 })).code, 400); r = await call({ action: "goal", goal: 5 }); assert.equal(r.body.goal, 5);
assert.deepEqual((await call(null, "user_b")).body.apps, [], "users isolated");
console.log("✓ My Season: jobs-page applies flow in, stages move, manual adds, goal, isolation");
