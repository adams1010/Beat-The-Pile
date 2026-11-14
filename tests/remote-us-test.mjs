// Nov 14: jobs we used to drop for having no US state: Greenhouse "Hybrid"/"In-Office" (real place from the offices list),
// big cities written without a state ("San Francisco - SF9"), and US-wide remote ("Remote, United States").
import assert from "node:assert/strict";
const jobs = [
  { id: 1, title: "Software Engineer, New Grad", location: { name: "Hybrid" }, absolute_url: "https://x/1" },
  { id: 2, title: "Data Analyst Intern", location: { name: "In-Office" }, absolute_url: "https://x/2" },
  { id: 3, title: "Marketing Intern", location: { name: "San Francisco - SF9" }, absolute_url: "https://x/3" },
  { id: 4, title: "Sales Development Representative", location: { name: "Remote, United States" }, absolute_url: "https://x/4" },
  { id: 5, title: "Finance Intern", location: { name: "Remote, Canada" }, absolute_url: "https://x/5" },
  { id: 6, title: "Product Intern", location: { name: "London" }, absolute_url: "https://x/6" },
  { id: 7, title: "Design Intern", location: { name: "Hybrid" }, absolute_url: "https://x/7" },
];
const OFF = { 1: [{ name: "Austin, TX", location: "Austin, TX, United States" }], 2: [{ name: "New York, NY", location: null }], 7: [{ name: "Lisbon", location: "Lisbon, Portugal" }] };
const content = { jobs: jobs.map((j) => ({ ...j, offices: OFF[j.id] || [] })) };
let officeCalls = 0;
globalThis.fetch = async (u) => {
  const s = String(u);
  const body = s.includes("content=true") ? (officeCalls++, content) : { jobs };
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body), headers: new Map() };
};
const { fetchCompany } = await import("../lib/fetchers/index.js");
const { listings } = await fetchCompany({ id: "x-co", company: "Co", ats: "greenhouse", token: "co" });
const by = Object.fromEntries(listings.map((l) => [l.id.split(":")[1], l]));
assert.equal(officeCalls, 1, "one offices request");
assert.equal(by["1"].state, "TX"); assert.match(by["1"].location, /Hybrid/); assert.match(by["1"].location, /Austin, TX/);
assert.equal(by["2"].state, "NY");
assert.equal(by["3"].state, "CA", "big city without a state");
assert.equal(by["4"].state, "US"); assert.equal(by["4"].geo_kind, "remote", "US-wide remote");
assert.ok(!by["5"] && !by["6"] && !by["7"], "Canada, London and a Lisbon-only office stay out");
console.log("✓ remote/US: Greenhouse offices fill 'Hybrid'/'In-Office', big cities without a state, US-wide remote kept; foreign stays out");
