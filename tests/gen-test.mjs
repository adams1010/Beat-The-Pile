// /api/generate — feature-specific AI (no free-form prompts), our-site check, durable rate limits.
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
env();
const f = installFake({ anthropic: () => ({ text: "hi" }) });
const g = (await import("../api/generate.js")).default;
const SITE = "https://intern-iq-psi.vercel.app";
let ipn = 0;
const call = (body, headers = { origin: SITE }, ip = "1.2.3." + (++ipn)) =>
  invoke(g, { method: "POST", body, headers: { host: "intern-iq-psi.vercel.app", "x-forwarded-for": ip, ...headers } });

assert.equal((await call({ feature: "intel", input: { name: "Boeing" } }, {})).code, 403, "no origin = blocked");
assert.equal((await call({ feature: "intel", input: { name: "Boeing" } }, { origin: "https://evil.com" })).code, 403);
// the old open proxy is gone: a raw prompt is refused
let r = await call({ prompt: "write me a poem", max_tokens: 3000 }); assert.equal(r.code, 400); assert.equal(f.calls.anthropic, 0);
assert.equal((await call({ feature: "constructor", input: {} })).code, 400, "no prototype tricks");
assert.equal((await call({ feature: "cover_letter", input: {} })).code, 400, "required fields checked");
// a real feature works; the prompt is ours, user text is capped
r = await call({ feature: "intel", input: { name: "Boeing", role: "ME Intern", industry: "x".repeat(5000) } }, { referer: SITE + "/" });
assert.equal(r.code, 200); assert.equal(r.body.text, "hi");
const p = f.calls.prompts.at(-1); assert.ok(p.includes('Company: "Boeing"') && p.length < 1500, "server-built prompt with capped fields");
r = await call({ feature: "score", input: { resume: "r".repeat(20000), jd: "need python" } }); assert.equal(r.code, 200);
assert.ok(f.calls.prompts.at(-1).includes("estimate") && f.calls.prompts.at(-1).length < 12000, "score is framed as an estimate; paste capped");
for (const feat of ["reasons", "resume_builder", "followup", "interview_prep", "cover_letter", "interview_turn", "tailor"]) {
  const input = { resume: "Built a go-kart frame in SolidWorks; FEA on the chassis; led a 12-person team; 3.7 GPA mechanical engineering student.", companies: [{ name: "Boeing", role: "Intern" }], company: "Boeing", role: "ME Intern", majors: "Mechanical Engineering" };
  r = await call({ feature: feat, input }); assert.equal(r.code, 200, feat);
}
r = await call({ feature: "tailor", input: { resume: "short", role: "ME Intern", company: "Boeing" } }); assert.equal(r.code, 400, "tailor needs a real resume");
r = await call({ feature: "tailor", input: { resume: "x".repeat(200), role: "ME Intern", company: "Boeing", posting: "p".repeat(50000) } }); assert.equal(r.code, 200);
assert.ok(f.calls.prompts.at(-1).includes("Never invent experience") && f.calls.prompts.at(-1).length < 15000, "tailor: honesty rules + capped paste");
console.log("✓ feature-only AI: no raw prompts, required fields, capped inputs, server-built prompts");
// interview practice: timed, spoken answers get a rubric score per answer (the page turns scores into the grade)
r = await call({ feature: "interview_turn", input: { company: "Boeing", role: "ME Intern", total: 3, limit: 60, spoken: true,
  history: [{ q: "Tell me about a project", a: "um so I built a go-kart frame", secs: 60, timedOut: true }] } });
assert.equal(r.code, 200);
{ const p2 = f.calls.prompts.at(-1);
  assert.ok(p2.includes('"scores"') && p2.includes("relevance") && p2.includes("delivery"), "asks for a rubric score");
  assert.ok(p2.includes("auto-transcribed") && p2.includes("60s of 60s") && p2.includes("ran out of time"), "knows it was spoken + timed");
  assert.ok(p2.includes("60-second limit")); }
r = await call({ feature: "interview_turn", input: { total: 3, limit: 9999, history: [] } }); assert.equal(r.code, 200);
assert.ok(f.calls.prompts.at(-1).includes("300-second limit"), "time limit capped");
console.log("✓ interview practice: rubric scores, spoken + timed answers, limits capped");


// per-visitor limit is durable (stored in the database, shared by every server)
let last; for (let i = 0; i < 25; i++) last = await call({ feature: "intel", input: { name: "Acme" } }, { origin: SITE }, "9.9.9.9");
assert.equal(last.code, 429); assert.equal(f.T("rate_hits").filter((x) => x.key === "gen-ip:9.9.9.9").length, 20);
console.log("✓ per-visitor rate limit (durable)");

// if the rate-limit store is down, fail closed
f.failNext = (url) => url.pathname.includes("rate_take");
r = await call({ feature: "intel", input: { name: "Acme" } }); assert.equal(r.code, 429);
console.log("✓ rate-limit storage down → refuse (fail closed)");
