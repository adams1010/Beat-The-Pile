import assert from "node:assert/strict";
const R = "../";
const { scanHtml, discoverOne } = await import(R + "lib/discover.js");
const { parseJibe, parsePcsx, fetchEightfold, fetchJibe } = await import(R + "lib/fetchers/more-boards.js");
const { boardKey } = await import(R + "lib/companies.js");
// detection
let s = scanHtml(`<html data-jibe-search-version="4.11"><a href="/jobs">Jobs</a></html>`, "https://careers.mcdean.com/jobs");
assert.deepEqual(s.boards, [{ ats: "jibe", config: { base: "https://careers.mcdean.com" } }]);
s = scanHtml(`<a href="https://lockheedmartin.eightfold.ai/careers">Search jobs</a><img src="https://x/eightfold/3.jpg">`, "https://www.lockheedmartin.com/careers");
assert.deepEqual(s.boards, [{ ats: "eightfold", config: { host: "lockheedmartin.eightfold.ai", domain: null } }]);
s = scanHtml(`<a href="https://plexus.eightfold.ai/careers?domain=plexus.com">x</a>`, "https://plexus.com");
assert.equal(s.boards.length, 1, "no duplicate no-domain board"); assert.equal(s.boards[0].config.domain, "plexus.com");
assert.equal(boardKey({ ats: "jibe", base: "https://careers.mcdean.com" }), "jibe:careers.mcdean.com");
console.log("✓ detects Jibe career sites + Eightfold links with/without ?domain=");
// parsers
const jb = parseJibe({ totalCount: 15, jobs: [{ data: { slug: "32543", req_id: "32543", title: "Safety Intern", full_location: "Tysons, VA", posted_date: "2026-08-28T14:27:00+0000", hiring_organization: "M.C. Dean, Inc" } }, { data: { slug: "9", title: "Internal only", internal: true } }] }, { base: "https://careers.mcdean.com" });
assert.equal(jb.total, 15); assert.deepEqual(jb.jobs.map((j) => [j.sourceId, j.url, j.location]), [["32543", "https://careers.mcdean.com/jobs/32543", "Tysons, VA"]]);
const pc = parsePcsx({ data: { count: 37, positions: [{ id: 996477505085, name: "Mechanical Design Intern", locations: ["Grand Prairie, TX"], standardizedLocations: ["Grand Prairie, TX, US"], postedTs: 1792702183, positionUrl: "/careers/job/996477505085" }] } }, { host: "lockheedmartin.eightfold.ai" });
assert.equal(pc.total, 37); assert.equal(pc.jobs[0].url, "https://lockheedmartin.eightfold.ai/careers/job/996477505085"); assert.equal(pc.jobs[0].location, "Grand Prairie, TX, US");
console.log("✓ parses both feeds (internal-only Jibe jobs dropped)");
// fake internet
const J = (b, st = 200) => ({ ok: st < 400, status: st, url: "", text: async () => JSON.stringify(b), json: async () => b, headers: new Map() });
const H = (h, url) => ({ ok: true, status: 200, url, text: async () => h, json: async () => ({}), headers: new Map() });
const jibeJobs = (n, org = "M.C. Dean, Inc", title = "Mechanical Intern") => ({ totalCount: n, jobs: Array.from({ length: Math.min(n, 10) }, (_, i) => ({ data: { slug: "s" + i, req_id: "r" + i, title: title + " " + i, full_location: "Tysons, VA", hiring_organization: org } })) });
const pcsx = (n, start) => ({ data: { count: n, positions: Array.from({ length: Math.max(0, Math.min(10, n - start)) }, (_, i) => ({ id: 1000 + start + i, name: "Mechanical Intern " + (start + i), standardizedLocations: ["Fort Worth, TX, US"], positionUrl: "/careers/job/" + (1000 + start + i) })) } });
globalThis.fetch = async (u) => { u = String(u);
  if (u.startsWith("https://careers-mcdean.icims.com/jobs/search")) return H(` <script type="text/javascript"> window.top.location.href = 'https:\\/\\/careers.mcdean.com\\/jobs'; </script> `, u);
  if (u.startsWith("https://careers.mcdean.com/api/jobs")) { const p = +new URL(u).searchParams.get("page"); const all = jibeJobs(15); return J({ totalCount: 15, jobs: p === 1 ? all.jobs : all.jobs.slice(0, 5).map((x) => ({ data: { ...x.data, req_id: x.data.req_id + "b", slug: x.data.slug + "b" } })) }); }
  if (u.startsWith("https://evil.example/api/jobs")) return J(jibeJobs(5, "Someone Else LLC"));
  if (u.includes("lockheedmartin.eightfold.ai/api/pcsx/search")) { const st = +new URL(u).searchParams.get("start"); return J(pcsx(37, st)); }
  if (u.includes("plexus.eightfold.ai/api/pcsx")) return J({}, 403);
  if (u.includes("plexus.eightfold.ai/api/apply/v2")) return J({ positions: [{ id: 5, name: "Engineering Intern", locations: ["Neenah, WI"] }] });
  if (u === "https://www.lockheedmartin.com/careers") return H(`<a href="https://lockheedmartin.eightfold.ai/careers">Search jobs</a>`, u);
  return { ok: false, status: 404, url: u, text: async () => "nf", json: async () => ({}), headers: new Map() };
};
// M.C. Dean: hint is the old iCIMS portal → follows the redirect to the new career site → live
let r = await discoverOne({ id: "x-m-c-dean", company: "M.C. Dean", domain: "mcdean.com", key: "mcdean", hint: "https://careers-mcdean.icims.com/" });
assert.equal(r.status, "live", JSON.stringify(r)); assert.equal(r.ats, "jibe"); assert.deepEqual(r.config, { base: "https://careers.mcdean.com" }); assert.match(r.detail, /own careers site/);
console.log("✓ M.C. Dean: old iCIMS portal → follows redirect → new career site proven (own domain) → LIVE");
// Lockheed: eightfold link w/o domain on its own site → newer feed → live with domain filled in
r = await discoverOne({ id: "x-lockheed-martin", company: "Lockheed Martin", domain: "lockheedmartin.com", key: "lockheed" });
assert.equal(r.status, "live", JSON.stringify(r)); assert.equal(r.ats, "eightfold"); assert.equal(r.config.domain, "lockheedmartin.com");
console.log("✓ Lockheed Martin: Eightfold (newer feed) → LIVE, domain filled in:", r.detail);
// readers page through
const lm = await fetchEightfold({ id: "x-lockheed-martin", host: "lockheedmartin.eightfold.ai", domain: "lockheedmartin.com" }); assert.equal(lm.length, 37, "all 4 pages of 10");
const pl = await fetchEightfold({ id: "x-plexus", host: "plexus.eightfold.ai", domain: "plexus.com" }); assert.equal(pl.length, 1, "falls back to old feed on 403");
const mc = await fetchJibe({ id: "x-m-c-dean", base: "https://careers.mcdean.com" }); assert.equal(mc.length, 15, "2 pages");
console.log("✓ readers page through (Lockheed 37) and Eightfold falls back to the old feed when the new one is locked");
// a Jibe site on someone else's domain that names a different employer → not proven
r = await discoverOne({ id: "x-acme", company: "Acme Robotics", domain: "acme.com", key: "acmerobotics", hint: "https://evil.example/jobs" });
assert.notEqual(r.status, "live");
console.log("\nJIBE + EIGHTFOLD TESTS PASSED");
