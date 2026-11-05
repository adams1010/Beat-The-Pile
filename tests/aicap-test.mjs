// lib/aiusage.js — atomic budget reservations, real cost settled after, fails closed, $0 = off.
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
env();
let usage = { input_tokens: 2000, output_tokens: 1000 }, fail = false;
const f = installFake({ anthropic: () => fail ? { status: 529 } : { text: "hi", usage } });
const ai = await import("../lib/aiusage.js");
assert.equal(ai.costOf(ai.MODEL, { input_tokens: 1e6, output_tokens: 1e6 }), 6, "$1 in + $5 out per million");
const g = (await import("../api/generate.js")).default;
let n = 0;
const call = () => invoke(g, { method: "POST", headers: { host: "a.app", origin: "https://a.app", "x-forwarded-for": "9.9.9." + (++n) }, body: { feature: "intel", input: { name: "Acme" } } });

let r = await call(); assert.equal(r.code, 200);
let row = f.T("ai_usage")[0]; assert.equal(row.feature, "home_intel"); assert.equal(row.reserved, false); assert.equal(Number(row.cost_usd), 0.007, "settled to the real cost");
// cap: spent near the cap → the worst-case reservation doesn't fit → paused, no AI call
f.T("ai_usage").push({ id: 99, at: new Date().toISOString(), feature: "x", cost_usd: 9.999 });
const before = f.calls.anthropic; r = await call(); assert.equal(r.code, 503); assert.match(r.body.error, /paused/); assert.equal(f.calls.anthropic, before, "no AI call when over budget");
f.T("bot_settings").push({ bot: "ai", enabled: true, cap_usd: 25 }); r = await call(); assert.equal(r.code, 200, "raised cap → works again");
f.T("bot_settings")[0].enabled = false; r = await call(); assert.equal(r.code, 503, "AI switched off");
f.T("bot_settings")[0].enabled = true;
console.log("✓ budget: reserve before calling, settle after, cap pauses, $0/off = off");

// many simultaneous calls can't overspend: every one reserves first, inside one lock
f.tables.set("ai_usage", []); f.T("bot_settings")[0].cap_usd = 0.02;           // each call reserves ~$0.0013 worst case
usage = { input_tokens: 150, output_tokens: 250 };                                  // a real reply can't exceed its max_tokens
const res = await Promise.all(Array.from({ length: 40 }, () => call()));
const spent = f.T("ai_usage").reduce((x, r) => x + Number(r.cost_usd), 0);
assert.ok(spent <= 0.02 + 1e-9, "never over the cap: $" + spent.toFixed(4)); assert.ok(res.some((x) => x.code === 503), "some refused once the cap is reached");
console.log("✓ 40 simultaneous calls stay under the cap ($" + spent.toFixed(4) + " of $0.02)");

// failed AI call costs $0, reservation released
f.tables.set("ai_usage", []); f.T("bot_settings")[0].cap_usd = 10; fail = true;
r = await call(); assert.equal(r.code, 502); fail = false;
assert.equal(Number(f.T("ai_usage")[0].cost_usd), 0); assert.equal(f.T("ai_usage")[0].reserved, false);
// budget table unreachable → fail closed
f.failNext = (url) => url.pathname.includes("ai_reserve"); r = await call(); assert.equal(r.code, 503);
assert.equal(await (async () => { f.failNext = () => true; return ai.aiAllowed(); })(), false, "pre-check fails closed too");
f.failNext = null;
const sum = await ai.aiSummary(); assert.equal(sum.cap, 10);
console.log("✓ failed call = $0; budget store down = no AI (fails closed)");
