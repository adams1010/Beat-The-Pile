// 🖼 Logo Finder: where to look, proof that a website is really the company's, icon picking, and the two API actions.
import assert from "node:assert/strict";
const { candidates, proveSite, pickIcon, names, regDomain } = await import("../lib/logos.js");

// ── where to look ──
assert.equal(regDomain("careers.acme.co.uk"), "acme.co.uk");
assert.equal(regDomain("www.Boeing.com"), "boeing.com");
let c = candidates({ company: "Southland Industries, Inc.", domain: null, config: { tenant: "southland" }, urls: ["https://southland.wd1.myworkdayjobs.com/x", "https://jobs.southlandind.com/job/1"] });
assert.deepEqual(c.map((x) => x.domain), ["southlandind.com", "southlandindustries.com", "southland.com"]);
assert.equal(c[0].kind, "board", "a listing on their own domain is the best lead");
assert.ok(!c.some((x) => /myworkday|greenhouse/.test(x.domain)), "job-board hosts are never treated as the company site");
c = candidates({ company: "Boeing", domain: "boeing.com", config: {} });
assert.deepEqual(c[0], { domain: "boeing.com", kind: "known" });
console.log("✓ candidates: known domain → own-domain listings → name guesses; job-board hosts skipped");

// ── names ──
assert.ok(names("Lockheed Martin | Aerospace & Defense", "Lockheed Martin Corporation"));
assert.ok(names("LockheedMartin.com", "Lockheed Martin"));
assert.ok(!names("Martin Marietta", "Lockheed Martin"));
assert.ok(!names("Apex Clean Energy", "Apex Systems"), "all identifying words must appear");
console.log("✓ names: every identifying word (or the joined name) must appear");

// ── proof ──
const page = (title, body = "") => `<html><head><title>${title}</title></head><body>${body}</body></html>`;
const guess = { domain: "acme.com", kind: "guess" };
const P = (o) => proveSite({ ats: null, config: {}, ...o });
assert.equal(P({ html: page("Acme Robotics | Warehouse automation"), finalUrl: "https://www.acmerobotics.com/", cand: { domain: "acmerobotics.com", kind: "guess" }, company: "Acme Robotics" }), "page title names them");
assert.equal(P({ html: page("Acme Robotics"), finalUrl: "https://www.someoneelse.com/", cand: { domain: "acmerobotics.com", kind: "guess" }, company: "Acme Robotics" }), null, "a guess that redirects to another site is rejected");
assert.equal(P({ html: page("Welcome", "Acme Robotics builds robots"), finalUrl: "https://acmerobotics.com/", cand: { domain: "acmerobotics.com", kind: "guess" }, company: "Acme Robotics" }), null, "a guess needs the name in the title, not just the body");
assert.equal(P({ html: page("Welcome", "About Acme Robotics"), finalUrl: "https://acmerobotics.com/", cand: { domain: "acmerobotics.com", kind: "board" }, company: "Acme Robotics" }), "job board is on this site");
assert.equal(P({ html: page("Home", '<a href="https://boards.greenhouse.io/acmebot">Careers</a>'), finalUrl: "https://acme.io/", cand: { domain: "acme.io", kind: "guess" }, company: "Acme Robotics", ats: "greenhouse", config: { token: "acmebot" } }), "links to their job board");
assert.equal(P({ html: page("Acme Robotics jobs"), finalUrl: "https://acme.wd1.myworkdayjobs.com/", cand: { domain: "myworkdayjobs.com", kind: "board" }, company: "Acme Robotics" }), null, "never the job board's own site");
assert.equal(P({ html: page("Apex Clean Energy"), finalUrl: "https://apex.com/", cand: { domain: "apex.com", kind: "guess" }, company: "Apex Systems" }), null, "a different company with the same first word is rejected");
assert.equal(P({ html: page("Wood | Home"), finalUrl: "https://wood.com/", cand: { domain: "wood.com", kind: "guess" }, company: "Wood" }), null, "short one-word guesses need their own job-board link");
assert.equal(P({ html: page("Home", '<a href="https://boards.greenhouse.io/woodco">Jobs</a>'), finalUrl: "https://woodco.com/", cand: { domain: "woodco.com", kind: "guess" }, company: "Wood", ats: "greenhouse", config: { token: "woodco" } }), "links to their job board");
console.log("✓ proof: title / own job-board link / board-on-site; redirects, look-alikes and ATS hosts rejected");

// ── icons ──
const head = `<link rel="icon" href="/favicon.ico"><link rel="icon" sizes="32x32" href="/f32.png"><link rel="icon" sizes="192x192" href="/f192.png"><link rel="apple-touch-icon" href="/apple.png"><link rel="mask-icon" href="/m.svg">`;
assert.equal(pickIcon(head, "https://acme.com/"), "https://acme.com/apple.png", "apple-touch-icon wins");
assert.equal(pickIcon(head.replace(/<link rel="apple[^>]+>/, ""), "https://acme.com/"), "https://acme.com/f192.png", "else the largest ≥64px");
assert.equal(pickIcon('<link rel="icon" sizes="32x32" href="/f32.png">', "https://acme.com/"), null, "tiny icons only → none (Google's 128px icon is used instead)");
assert.equal(pickIcon('<link rel="apple-touch-icon" href="http://acme.com/a.png">', "https://acme.com/"), null, "http icons refused");
console.log("✓ icons: apple-touch-icon → largest ≥64px; https only");

// ── API: robot saves results, public map only shows proven logos ──
process.env.INTERNIQ_DB_URL = "https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "s"; process.env.INTERNIQ_DB_ANON_KEY = "a"; process.env.CRON_SECRET = "cron";
const patches = [];
const rows = [{ id: "x-boeing", domain: "boeing.com", logo: "https://www.boeing.com/apple.png" }, { id: "x-acme", domain: "acme.com", logo: "fav" }];
const ok = (b) => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
globalThis.fetch = async (u, o = {}) => { const x = new URL(String(u)); const t = x.pathname.split("/").pop();
  if (t === "company_candidates" && o.method === "PATCH") { patches.push([x.searchParams.get("id"), JSON.parse(o.body)]); return ok([]); }
  if (t === "company_candidates") { const off = +(x.searchParams.get("offset") || 0); return ok(off ? [] : rows); }
  return ok([]); };
const call = async (h, q, body, auth) => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); r.end = () => r;
  await h({ method: body ? "POST" : "GET", query: q || {}, headers: auth ? { authorization: "Bearer " + auth } : {}, body }, r); return r; };
const disc = (await import("../api/discovery.js")).default, list = (await import("../api/listings.js")).default;
const items = [{ id: "x-boeing", domain: "boeing.com", logo: "https://www.boeing.com/apple.png" }, { id: "x-acme", domain: "acme.com", logo: "fav" },
  { id: "x-none", domain: null, logo: "none" }, { id: "x-bad", domain: "evil.com", logo: "javascript:alert(1)" }, { id: "../etc", domain: "a.com", logo: "fav" }];
assert.equal((await call(disc, {}, { action: "logos", items })).code, 403, "anonymous refused");
assert.equal((await call(disc, { logos: "todo" })).code, 403, "work list is robot only");
let r = await call(disc, {}, { action: "logos", items }, "cron");
assert.equal(r.code, 200); assert.equal(r.body.saved, 4, "bad id skipped");
const byId = Object.fromEntries(patches.map(([id, p]) => [id.replace("eq.", ""), p]));
assert.equal(byId["x-boeing"].logo, "https://www.boeing.com/apple.png");
assert.equal(byId["x-none"].logo, "none"); assert.equal(byId["x-none"].domain, undefined, "no proven site → domain untouched");
assert.equal(byId["x-bad"].logo, "fav", "a non-https logo falls back to the small icon of the proven domain");
r = await call(list, { logos: "1" });
assert.deepEqual(r.body, { "x-boeing": "https://www.boeing.com/apple.png", "x-acme": "fav:acme.com" });
console.log("✓ API: robot-only saves, unsafe logos refused, public map = proven logos only");
console.log("\nLOGO TESTS PASSED");
