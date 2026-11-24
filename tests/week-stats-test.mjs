// Nov 24: /bots "This week" (api/discovery.js ?bots=1&week=1 → rpc bot_week_stats, supabase/week_stats.sql).
// Owners only, a plain "run the SQL" message before the function exists, cached 10 min, and the SQL stays read-only.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
process.env.CLERK_SECRET_KEY = "sk"; process.env.INTERNIQ_DB_URL = "https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "s"; process.env.INTERNIQ_DB_ANON_KEY = "a"; process.env.CRON_SECRET = "cron"; process.env.ADMIN_EMAILS = "owner@example.com";
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
const SAMPLE = { at: new Date().toISOString(), kinds: [["fulltime", 60720, 19748, 15000, 11360], ["intern", 20124, 2281, 1900, 1421]],
  stale: [["workday", 36000]], fields: [["exercise_sport", 40]], states: [["WY", 120]], fails: [["no_board", "", "No job board found", 3000]] };
let exists = false, rpcCalls = 0;
const ok = (b, s = 200) => ({ ok: s < 400, status: s, text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
globalThis.fetch = async (u) => { u = String(u);
  if (u.includes("api.clerk.com/v1/jwks")) return ok({ keys: [jwk] });
  if (u.includes("api.clerk.com/v1/users/")) return ok({ email_addresses: [{ email_address: u.includes("owner") ? "owner@example.com" : "rando@x.com", verification: { status: "verified" } }] });
  if (u.includes("/rpc/bot_week_stats")) { rpcCalls++; return exists ? ok(SAMPLE) : ok({ code: "PGRST202", message: "Could not find the function public.bot_week_stats without parameters" }, 404); }
  return ok([]);
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (sub) => { const h = b64({ alg: "RS256", kid: "k1" }), p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 60 }); return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url")}`; };
const h = (await import("../api/discovery.js")).default;
const call = async (auth) => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); r.end = () => r;
  await h({ method: "GET", query: { bots: "1", week: "1" }, headers: auth ? { authorization: "Bearer " + auth } : {} }, r); return r; };

let r = await call(); assert.equal(r.body.public, true, "signed out: switches only"); assert.ok(!r.body.kinds);
r = await call(tok("user_rando")); assert.equal(r.body.public, true, "non-owner: switches only"); assert.equal(rpcCalls, 0);
r = await call(tok("user_owner")); assert.equal(r.code, 503); assert.match(r.body.error, /week_stats\.sql/, "before the SQL runs: says what to do");
exists = true;
r = await call(tok("user_owner")); assert.equal(r.code, 200); assert.deepEqual(r.body.kinds[0], ["fulltime", 60720, 19748, 15000, 11360]);
const n = rpcCalls; await call("cron"); assert.equal(rpcCalls, n, "cached 10 min: refreshing /bots doesn't recount");
console.log("✓ week stats: owners only, run-the-SQL message, cached");

const sql = fs.readFileSync(new URL("../supabase/week_stats.sql", import.meta.url), "utf8");
const body = sql.slice(sql.indexOf("as $$"), sql.lastIndexOf("$$"));
assert.ok(!/\b(insert|update|delete|drop|alter|truncate)\b/i.test(body), "function only reads");
assert.ok(/stable/.test(sql) && /revoke all on function public\.bot_week_stats\(\) from public, anon, authenticated/.test(sql), "not callable by the public");
assert.ok(!/user_jobs|employers|clerk/i.test(body), "no user data");
const page = fs.readFileSync(new URL("../bots/index.html", import.meta.url), "utf8");
assert.ok(page.includes("bots=1&week=1") && page.includes("weekHtml()"), "/bots shows it");
console.log("✓ week stats SQL: read-only, owners only, no user data; /bots renders it");
