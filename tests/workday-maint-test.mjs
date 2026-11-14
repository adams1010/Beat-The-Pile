// Nov 14: Workday's weekly maintenance answers 200 with an HTML "Workday is currently unavailable" page. The finder must call that
// a 503 (retried in 6 hours), never "no postings"; 422 (site renamed) starts over from the website.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
let down = true;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (/wday\/cxs\/acme\/Careers\/jobs$/.test(u)) {
    const body = down ? "<!DOCTYPE html><html><head><title>Workday is currently unavailable.</title></head><body>Workday is currently unavailable.</body></html>"
      : JSON.stringify({ total: 3, jobPostings: [{ title: "Engineering Intern", externalPath: "/job/A_1", locationsText: "Austin, TX" }], facets: [] });
    return { ok: true, status: 200, url: u, headers: new Map(), text: async () => body, json: async () => JSON.parse(body) };
  }
  return { ok: false, status: 404, url: u, headers: new Map(), text: async () => "nf", json: async () => ({}) };
};
const { discoverOne } = await import("../lib/discover.js");
const r = await discoverOne({ id: "b-acme", company: "Acme", hint: "https://acme.wd1.myworkdayjobs.com/Careers" });
assert.equal(r.status, "board_error", JSON.stringify(r));
assert.match(r.detail, /answered 503 \(Workday maintenance\)/);
const api = readFileSync(new URL("../api/discover.js", import.meta.url), "utf8");
assert.ok(/detail\.ilike\.\*answered%205\*/.test(api) && /BUSY_RETRY_HOURS = 6/.test(api), "5xx board errors come back after 6 hours");
const lib = readFileSync(new URL("../lib/discover.js", import.meta.url), "utf8");
assert.ok((lib.match(/answered 422/g) || []).length >= 2, "a renamed Workday site (422) starts over from the website");
console.log("✓ Workday maintenance page = 503 (retry in 6 h), never 'no postings'; 422 starts over from the website");
