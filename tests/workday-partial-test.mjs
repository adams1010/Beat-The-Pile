// Nov 14: when some Workday searches fail for a passing reason (maintenance, busy, 5xx), the read is partial and
// sync must close nothing (Tapestry flapped 362 → 20 → 362 open jobs on Saturday maintenance).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
let failEarly = true;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (/\/wday\/cxs\/acme\/Careers\/jobs$/.test(u)) {
    const body = JSON.parse(opts.body || "{}");
    if (body.searchText && !["intern", "co-op"].includes(body.searchText) && failEarly) return { ok: false, status: 503, url: u, headers: new Map(), text: async () => "down", json: async () => ({}) };
    const posts = body.searchText !== "intern" ? [] : [{ title: "Mechanical Engineering Intern", externalPath: "/job/Austin-TX/ME-Intern_R1", locationsText: "Austin, TX" }];
    const out = JSON.stringify({ total: posts.length, jobPostings: posts, facets: [] });
    return { ok: true, status: 200, url: u, headers: new Map(), text: async () => out, json: async () => JSON.parse(out) };
  }
  return { ok: false, status: 404, url: u, headers: new Map(), text: async () => "nf", json: async () => ({}) };
};
const { fetchCompany } = await import("../lib/fetchers/index.js");
const cfg = { id: "x-acme", company: "Acme", ats: "workday", host: "acme.wd1.myworkdayjobs.com", tenant: "acme", site: "Careers" };
const a = await fetchCompany(cfg);
assert.equal(a.partial, true, "failed searches mark the read partial");
failEarly = false;
const b = await fetchCompany(cfg);
assert.ok(!b.partial, "a clean read is not partial");
const sync = readFileSync(new URL("../api/sync.js", import.meta.url), "utf8");
assert.ok(/else if \(partial\)/.test(sync), "saveResult closes nothing on a partial read");
const disc = readFileSync(new URL("../api/discovery.js", import.meta.url), "utf8");
assert.ok(/partial: r\.partial === true/.test(disc), "turbo_save passes partial through");
console.log("✓ partial Workday reads (failed searches) close nothing");
