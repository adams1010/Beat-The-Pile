import assert from "node:assert/strict";
process.env.INTERNIQ_DB_URL = "https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "s"; process.env.INTERNIQ_DB_ANON_KEY = "a"; process.env.ANTHROPIC_API_KEY = "k";
let spent = [], cap = null, aiCalls = 0; const logged = [];
const ok = (b) => ({ ok: true, status: 200, text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("anthropic.com")) { aiCalls++; return ok({ content: [{ type: "text", text: "hi" }], usage: { input_tokens: 2000, output_tokens: 1000 } }); }
  const t = new URL(u).pathname.split("/").pop();
  if (t === "ai_usage") { if (o.method === "POST") { logged.push(...JSON.parse(o.body)); return ok(); } return ok(spent); }
  if (t === "bot_settings") return ok(cap == null ? [] : [{ cap_usd: cap, enabled: cap > 0 }]);
  return ok([]);
};
const ai = await import("../lib/aiusage.js");
assert.equal(ai.costOf(ai.MODEL, { input_tokens: 1e6, output_tokens: 1e6 }), 6, "$1 in + $5 out per million");
const g = (await import("../api/generate.js")).default;
const call = async () => { const r = {}; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.setHeader = () => {}; await g({ method: "POST", headers: { host: "a.app", origin: "https://a.app", "x-forwarded-for": "9.9.9." + Math.random() }, body: { prompt: "x" } }, r); return r; };
let r = await call(); assert.equal(r.code, 200); assert.equal(logged.length, 1); assert.equal(logged[0].feature, "homepage"); assert.equal(Number(logged[0].cost_usd), 0.007);
spent = [{ cost_usd: 9.99 }]; r = await call(); assert.equal(r.code, 200, "under $10 default cap");
spent = [{ cost_usd: 10.01 }]; r = await call(); assert.equal(r.code, 503, "over cap → paused"); assert.equal(aiCalls, 2, "no AI call made when paused");
cap = 25; r = await call(); assert.equal(r.code, 200, "raised cap → works again");
cap = 0; spent = []; r = await call(); assert.equal(r.code, 503, "cap $0 = AI off");
const sum = await ai.aiSummary(); assert.equal(sum.cap, 0);
console.log("✓ AI cost tracking ($1/$5 per M tokens), $10 default cap pauses AI, raising cap resumes, $0 = off");
