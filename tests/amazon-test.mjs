// Amazon reader (Nov 26): amazon.jobs public search feed. Places, ids, links, paging stop, no duplicates, the hand-verified entry.
import assert from "node:assert/strict";
const { fetchAmazon, toJob, placeOf, SEARCHES } = await import("../lib/fetchers/amazon.js");
const { COMPANIES, boardKey } = await import("../lib/companies.js");

const loc = (city, st, type = "ONSITE") => JSON.stringify({ city, type, countryIso2a: "US", locationNonStemming: `United States, ${st}, ${city}`, normalizedLocation: `${city}, ${st}` });
assert.equal(placeOf({ locations: [loc("Loveland", "CO"), loc("Aurora", "CO"), loc("Loveland", "CO")] }), "Loveland, CO | Aurora, CO", "every US place, once");
assert.equal(placeOf({ location: "US, TX, Austin", locations: [] }), "Austin, TX", "falls back to the short location");
assert.equal(placeOf({ locations: [JSON.stringify({ type: "REMOTE", countryIso2a: "US", city: "Virtual" })] }), "Remote, United States");
assert.equal(placeOf({ location: "IN, KA, Bangalore" }), "IN, KA, Bangalore", "foreign places stay foreign (the usual filter drops them)");

const job = toJob({ id_icims: "10614085", title: "Area Manager Intern - Summer 2027", job_path: "/en/jobs/10614085/area-manager-intern?x=1", business_category: "studentprograms", posted_date: "November 25, 2026", location: "US, CO, Loveland" });
assert.deepEqual(job, { sourceId: "10614085", title: "Area Manager Intern - Summer 2027", location: "Loveland, CO", url: "https://www.amazon.jobs/en/jobs/10614085/area-manager-intern", postedOn: "November 25, 2026", isIntern: true });
assert.equal(toJob({ id_icims: "1", title: "X", job_path: "https://evil.example/jobs/1" }), null, "only amazon.jobs paths");
assert.equal(toJob({ id_icims: "2", title: "Data Center Technician", job_path: "/en/jobs/2/x", business_category: "aws" }).isIntern, undefined);

// paging: stops at a short page, merges searches without duplicates
const calls = [];
const fake = async (url) => {
  calls.push(url); const u = new URL(url), off = +u.searchParams.get("offset"), q = u.searchParams.get("base_query") || u.searchParams.get("business_category[]") || "all";
  const n = q === "all" ? (off < 200 ? 100 : 7) : off === 0 ? 3 : 0;
  const jobs = Array.from({ length: n }, (_, i) => ({ id_icims: q === "all" ? String(off + i) : String(i), title: `Job ${off + i}`, job_path: `/en/jobs/${off + i}/job`, location: "US, VA, Arlington" }));
  return { ok: true, status: 200, json: async () => ({ hits: q === "all" ? 207 : 3, jobs }) };
};
const got = await fetchAmazon({ id: "amazon" }, { fetchImpl: fake, retryMs: 0 });
assert.equal(got.length, 207, "207 unique jobs (the focused searches repeat ids 0-2)");
assert.equal(calls.filter((u) => !new URL(u).searchParams.get("base_query") && !new URL(u).searchParams.get("business_category[]")).length, 3, "all-jobs search stopped after the short page");
assert.ok(calls.every((u) => u.startsWith("https://www.amazon.jobs/en/search.json?") && u.includes("country=USA")));
await assert.rejects(fetchAmazon({ id: "amazon" }, { fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }), maxPages: 1, retryMs: 0 }), /didn't answer/);
assert.ok(SEARCHES.some((s) => s.params["business_category[]"] === "studentprograms"));

const amz = COMPANIES.find((c) => c.id === "amazon");
assert.ok(amz && amz.enabled && amz.ats === "amazon" && amz.company === "Amazon");
assert.equal(boardKey(amz), "amazon:amazon");
console.log("✓ amazon: places, links, student programs = intern, paging + merge, hand-verified entry");
