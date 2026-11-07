import assert from "node:assert/strict";
import crypto from "node:crypto";
process.env.CLERK_SECRET_KEY = "sk"; process.env.INTERNIQ_DB_URL = "https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "s"; process.env.INTERNIQ_DB_ANON_KEY = "a"; process.env.CRON_SECRET = "cron";
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
const settings = new Map(), runs = [];
const cands = [{ id: "x-a", company: "A", status: "live", verified_at: new Date().toISOString(), checked_at: new Date().toISOString() }, { id: "x-b", company: "B", status: "no_board" }, { id: "s-p", company: "P", status: "pending" }];
const ok = (b, s = 200) => ({ ok: s < 400, status: s, text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("api.clerk.com/v1/jwks")) return ok({ keys: [jwk] });
  if (u.includes("api.clerk.com/v1/users/")) return ok({ email_addresses: [{ email_address: u.includes("owner") ? "shiloniadam10@gmail.com" : "rando@x.com", verification: { status: "verified" } }] });
  const x = new URL(u), t = x.pathname.split("/").pop(), m = o.method || "GET";
  if (t === "bot_settings") { if (m === "POST") { for (const r of JSON.parse(o.body)) settings.set(r.bot, r); return ok(); }
    const b = x.searchParams.get("bot"); return ok(b ? [settings.get(b.slice(3))].filter(Boolean) : [...settings.values()]); }
  if (t === "bot_runs") { if (m === "POST") { runs.push(...JSON.parse(o.body).map((r) => ({ ...r, ran_at: new Date().toISOString() }))); return ok(); } return ok([...runs].reverse()); }
  if (t === "company_candidates") return ok(cands);
  return ok([]);
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (sub) => { const h = b64({ alg: "RS256", kid: "k1" }), p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 60 }); return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url")}`; };
const call = async (mod, { method = "GET", auth, body, query = {} } = {}) => { const h = (await import(`../api/${mod}.js`)).default;
  const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); r.end = () => r;
  await h({ method, query, headers: auth ? { authorization: "Bearer " + auth } : {}, body }, r); return r; };

// Public callers only get the switches (no users, AI spend, emails, run logs)
let r = await call("discovery", { query: { bots: "1" } });
assert.equal(r.code, 200); assert.equal(r.body.public, true); assert.equal(r.body.bots.length, 9);
assert.ok(!r.body.system && !r.body.ai && !r.body.finder && !r.body.bots[0].runs && !("changedBy" in r.body.bots[0]), "private numbers hidden");
assert.ok(r.body.bots.every((b) => b.enabled === true));
r = await call("discovery", { query: { bots: "1" }, auth: tok("user_rando") }); assert.equal(r.body.public, true, "signed-in non-owner: still public view");
// Owner (or the robot) gets the full control room
r = await call("discovery", { query: { bots: "1" }, auth: tok("user_owner") });
assert.equal(r.code, 200); assert.equal(r.body.bots.length, 8); assert.equal(r.body.bots[0].id, "finder"); assert.ok(r.body.bots[0].main);
assert.ok(r.body.bots.every((b) => b.enabled), "default ON"); assert.equal(r.body.finder.counts.live, 1); assert.ok(r.body.finder.backlogLeft > 500);
console.log("✓ control room data: 6 bots, all on by default, finder pipeline + backlog", r.body.finder.backlogLeft);

// Switches: owner only
assert.equal((await call("discovery", { method: "POST", body: { action: "bot", bot: "sync", on: false } })).code, 403, "anon refused");
assert.equal((await call("discovery", { method: "POST", auth: tok("user_rando"), body: { action: "bot", bot: "sync", on: false } })).code, 403, "non-owner refused");
assert.equal((await call("discovery", { method: "POST", auth: "cron", body: { action: "bot", bot: "sync", on: false } })).code, 400, "robot can't flip switches");
assert.equal((await call("discovery", { method: "POST", auth: tok("user_owner"), body: { action: "bot", bot: "nope", on: false } })).code, 400);
r = await call("discovery", { method: "POST", auth: tok("user_owner"), body: { action: "bot", bot: "sync", on: false } });
assert.equal(r.code, 200); assert.equal(settings.get("sync").enabled, false); assert.equal(settings.get("sync").updated_by, "shiloniadam10@gmail.com");
console.log("✓ switches: owner only (anon, other users, robot refused)");

// Switched-off bots really stop
r = await call("sync", { auth: "cron" }); assert.deepEqual(r.body, { off: true, bot: "sync" });
await call("discovery", { method: "POST", auth: tok("user_owner"), body: { action: "bot", bot: "links", on: false } });
r = await call("check-links", { auth: "cron" }); assert.deepEqual(r.body, { off: true, bot: "links" });
await call("discovery", { method: "POST", auth: tok("user_owner"), body: { action: "bot", bot: "finder", on: false } });
r = await call("discover", { auth: "cron" }); assert.deepEqual(r.body, { off: true, bot: "finder" });
console.log("✓ off = the bot skips its run (sync, link checker, company finder)");

// GitHub bots report in (robot only)
assert.equal((await call("discovery", { method: "POST", auth: tok("user_owner"), body: { action: "botlog", bot: "radar", summary: "x" } })).code, 403);
r = await call("discovery", { method: "POST", auth: "cron", body: { action: "botlog", bot: "radar", ok: true, summary: "322 companies tracked" } });
assert.equal(r.code, 200); assert.equal(runs.at(-1).bot, "radar"); assert.equal(runs.at(-1).summary, "322 companies tracked");
r = await call("discovery", { query: { bots: "1" }, auth: "cron" });
assert.equal(r.body.bots.find((b) => b.id === "radar").runs[0].summary, "322 companies tracked");
assert.equal(r.body.bots.find((b) => b.id === "finder").enabled, false);
console.log("✓ run log: GitHub bots report in; shows on the control room");

// Turn finder back on → it runs and logs
await call("discovery", { method: "POST", auth: tok("user_owner"), body: { action: "bot", bot: "finder", on: true } });
r = await call("discover", { auth: "cron" });
assert.ok(!r.body.off); assert.ok(runs.some((x) => x.bot === "finder"), "finder logged its run");
console.log("✓ finder back on → runs and logs:", runs.filter((x) => x.bot === "finder").at(-1).summary);
console.log("\nBOT CONTROL TESTS PASSED");
