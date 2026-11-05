// /api/me — follow companies, seen, AI briefs (grounded, cached), AI follow-up email, shared rate limit, budget.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, anthropic: (b) => ({ text: b.messages[0].content.includes("follow-up email") ? 'Sure: {"subject":"Great meeting you","body":"Hi Sarah, thanks..."}'
  : '{"known":true,"about":"Builds things.","engineers":"Field engineering.","ask":["Q1","Q2","Q3","Q4"]}' }) });
f.T("company_candidates").push({ id: "x-hensel-phelps", company: "Hensel Phelps", domain: "henselphelps.com" });
f.T("listings").push({ id: "x-hensel-phelps:1", company_id: "x-hensel-phelps", company: "Hensel Phelps", title: "Field Engineer Intern" });
const me = (await import("../api/me.js")).default;
const call = (body, sub = "user_a") => invoke(me, { method: body ? "POST" : "GET", body, headers: sub ? { authorization: "Bearer " + tok(sub) } : {} });

let r = await call({ action: "star", company: "x-hensel-phelps", on: true }); assert.deepEqual(r.body.starred, ["x-hensel-phelps"]);
r = await call({ action: "star", company: "hillphoenix", on: true }); assert.equal(r.body.starred.length, 2);
r = await call({ action: "star", company: "hillphoenix", on: false }); assert.deepEqual(r.body.starred, ["x-hensel-phelps"]);
assert.equal((await call({ action: "star", company: "Bad Id!", on: true })).code, 400);
assert.equal((await call({ action: "star", company: "x", on: true }, null)).code, 401);
r = await call(); assert.equal(r.body.seenAt, null);
await call({ action: "seen" }); r = await call(); assert.ok(Date.now() - new Date(r.body.seenAt) < 5000);
assert.deepEqual((await call(null, "user_b")).body.starred, [], "users isolated");
console.log("✓ follow/unfollow companies, seen timestamp, validation, isolation");

r = await call({ action: "brief", companyId: "x-hensel-phelps", company: "IGNORED evil" });
assert.equal(r.code, 200); assert.equal(r.body.brief.about, "Builds things."); assert.equal(r.body.brief.ask.length, 3);
const p = f.calls.prompts.at(-1); assert.ok(p.includes("Hensel Phelps") && p.includes("Field Engineer Intern") && !p.includes("evil"));
r = await call({ action: "brief", companyId: "x-hensel-phelps" }, "user_b"); assert.equal(r.code, 200); assert.equal(f.calls.anthropic, 1, "second student hits the cache");
assert.equal((await call({ action: "brief", companyId: "x-unknown" })).code, 404);
assert.equal((await call({ action: "brief", companyId: "../etc" })).code, 400);
const use = f.T("ai_usage"); assert.equal(use.length, 1); assert.equal(use[0].reserved, false, "reservation settled to real cost"); assert.equal(use[0].feature, "brief");
assert.equal(Number(use[0].cost_usd), 100 / 1e6 + 50 * 5 / 1e6);
console.log("✓ briefs: grounded in our data, cached, every call costed");

r = await call({ action: "polish", name: "Adam", note: { company: "Hensel Phelps", contact: "Sarah", said: "Wants field engineers" } });
assert.equal(r.code, 200); assert.equal(r.body.subject, "Great meeting you"); assert.ok(f.calls.prompts.at(-1).includes("Wants field engineers"));
assert.equal((await call({ action: "polish", note: {} })).code, 400);
let last; for (let i = 0; i < 35; i++) last = await call({ action: "polish", note: { company: "X" } }, "user_c"); assert.equal(last.code, 429);
assert.equal(f.T("rate_hits").filter((x) => x.key === "me-ai:user_c").length, 30, "limit is stored in the database (shared by every server)");
console.log("✓ AI follow-up email; per-student hourly limit is durable");

// budget: cap reached → paused, no AI call; AI switched off → paused
f.T("bot_settings").push({ bot: "ai", enabled: true, cap_usd: 0.0001 });
const before = f.calls.anthropic;
r = await call({ action: "polish", note: { company: "Y" } }, "user_d"); assert.equal(r.code, 503); assert.match(r.body.error, /paused/); assert.equal(f.calls.anthropic, before);
console.log("✓ over the monthly cap → paused before any AI call");
