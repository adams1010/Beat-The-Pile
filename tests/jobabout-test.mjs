// Back of the swipe card (Nov 26): the job's own description from the employer's board + facts pulled from it.
import assert from "node:assert/strict";
const { summarize, requirementBullets, descriptionHtml, aboutJob } = await import("../lib/jobabout.js");

// facts: only what the ad says, tidy and deduped
const html = `<p>Full-time role, weekends and weekend shifts as needed. We offer medical, dental, and vision, Dental, PTO, paid time off, 401(k) match.</p>
  <p>Pay range: $22.00 - $26.00 per hour.</p><h3>Requirements</h3><ul><li>High school diploma or GED</li><li>Ability to lift 50 lbs</li><li>x</li></ul>
  <p>Currently pursuing a bachelor's degree. Graduating Summer 2028.</p>`;
const s = summarize(html);
assert.deepEqual(s.facts.pay, { lo: 22, hi: 26, u: "h" });
assert.deepEqual(s.facts.schedule, ["Full-time", "Weekend"], "deduped; no 'Summer 2028' (a graduation date, not a schedule)");
assert.deepEqual(s.facts.perks, ["Medical, dental, and vision", "Paid time off", "401(k) match"], "PTO = paid time off; dental/vision folded into the combined perk");
assert.ok(s.facts.asks.includes("High school diploma or GED") && s.facts.asks.includes("Ability to lift 50 lbs"));
assert.ok(s.facts.asks.some((x) => /^Currently pursuing a bachelor's degree$/i.test(x)), "the whole phrase");
assert.ok(!summarize("<p>Pursuing a dream of great coffee.</p>").facts.asks.length, "never a half phrase like 'Pursuing a'");
assert.deepEqual(s.bullets, ["High school diploma or GED", "Ability to lift 50 lbs"], "requirement bullets after the heading, junk dropped");
assert.deepEqual(requirementBullets("<ul><li>Free snacks every day</li></ul><h4>Qualifications</h4><ul><li>Valid driver's license</li></ul>"), ["Valid driver's license"]);
const long = summarize("<p>" + "This is a sentence about the job. ".repeat(200) + "</p>");
assert.ok(long.text.length <= 2405 && long.text.endsWith(" …") && long.full > 2400, "long posts are cut at a sentence");

// sources: each board's own API, else the page's JobPosting JSON-LD
const calls = [];
const fake = (map) => async (url) => { calls.push(url); const v = map(url); return v == null ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => v, text: async () => v }; };
assert.match(await descriptionHtml({ ats: "greenhouse", token: "acme", sourceId: "123" }, fake((u) => u === "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123" ? { content: "&lt;p&gt;Hello&lt;/p&gt;" } : null)), /<p>Hello<\/p>/);
assert.match(await descriptionHtml({ ats: "lever", token: "acme", sourceId: "ab-1" }, fake(() => ({ description: "<p>Lever job</p>", lists: [{ text: "Requirements", content: "<li>Python</li>" }] }))), /Lever job[\s\S]*<li>Python<\/li>/);
assert.match(await descriptionHtml({ ats: "ashby", token: "acme", sourceId: "9" }, fake(() => ({ jobs: [{ id: "8", descriptionHtml: "no" }, { id: "9", descriptionHtml: "<p>Ashby nine</p>" }] }))), /Ashby nine/);
const page = `<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":"JobPosting","description":"&lt;p&gt;From JSON-LD&lt;/p&gt;"}]}</script></html>`;
assert.match(await descriptionHtml({ ats: "icims", url: "https://careers.example.com/jobs/1" }, fake(() => page)), /From JSON-LD/);
assert.match(await descriptionHtml({ ats: "amazon", sourceId: "77" }, fake((u) => u.includes("amazon.jobs/en/search.json?base_query=77") ? { jobs: [{ id_icims: "77", description: "Build things.", basic_qualifications: "- Python<br/>- Linux" }] } : null)), /Build things[\s\S]*<li>Python<\/li><li>Linux<\/li>/, "Amazon: full text from its search feed");
await assert.rejects(descriptionHtml({ ats: "workday", url: "http://insecure.example.com" }, fake(() => page)), /no page/, "https only");
const ok = await aboutJob({ listing: { id: "b-acme:123", url: "https://x" }, cfg: { ats: "greenhouse", token: "acme" } }, fake(() => ({ content: "&lt;p&gt;" + "A real description of this job. ".repeat(3) + "&lt;/p&gt;" })));
assert.equal(ok.ok, true); assert.equal(ok.source, "greenhouse");
const bad = await aboutJob({ listing: { id: "b-acme:1", url: "https://x" }, cfg: { ats: "greenhouse", token: "acme" } }, fake(() => null));
assert.deepEqual(bad, { ok: false, reason: "We couldn't read the description from the employer's site right now." }, "a failed read never throws or invents text");

// API: /api/listings?about= validates the id before touching anything
process.env.INTERNIQ_DB_URL = "https://fake.supabase.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "svc"; process.env.INTERNIQ_DB_ANON_KEY = "anon";
globalThis.fetch = async () => { throw new Error("no network in tests"); };
const handler = (await import("../api/listings.js")).default;
const res = () => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); return r; };
let r = res(); await handler({ method: "GET", query: { about: "not an id" }, headers: {} }, r);
assert.equal(r.code, 400);
r = res(); await handler({ method: "GET", query: { about: "b-acme:123" }, headers: {} }, r);
assert.equal(r.code, 429, "database down → the rate check fails closed (never a crash, never an unchecked read of an employer site)");
console.log("✓ jobabout: facts (pay, schedule, asks, perks), requirement bullets, board APIs + JSON-LD, safe failures, API id check");
