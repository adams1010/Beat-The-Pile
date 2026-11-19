// Adzuna + Jooble as company finders (Nov 18): employer names only, US only, never agencies, never companies we know.
import assert from "node:assert/strict";
const { parseAdzuna, parseJooble, pickAggCompanies } = await import("../lib/aggfinder.js");
const adz = parseAdzuna({ results: [
  { title: "Mechanical Engineering Intern", company: { display_name: "Acme Robotics" }, location: { area: ["US", "Pennsylvania", "Pittsburgh"], display_name: "Pittsburgh, PA" } },
  { title: "Software Engineering Intern", company: { display_name: "Acme Robotics" }, location: { area: ["US", "Texas"] } },
  { title: "Data Intern", company: { display_name: "London Co" }, location: { area: ["UK", "London"] } },
  { title: "Engineering Intern", company: { display_name: "Insight Global" }, location: { area: ["US", "Georgia"] } },
  { title: "Senior Engineer", company: { display_name: "Big Senior Co" }, location: { area: ["US", "Ohio"] } },
] });
assert.equal(adz.length, 4, "non-US dropped at parse");
const joo = parseJooble({ jobs: [
  { title: "New Grad Analyst", company: "Riverbend Health", location: "Richmond, VA" },
  { title: "Marketing Intern", company: "Toronto Co", location: "Toronto, ON, Canada" },
  { title: "Summer Intern", company: "Known Corp", location: "Austin, TX" },
  { title: "Finance Intern", company: "Confidential", location: "Remote, United States" },
] });
assert.deepEqual(joo.map((j) => j.company), ["Riverbend Health", "Known Corp", "Confidential"], "Canada dropped");
const known = new Set(["known corp"]);
const a = pickAggCompanies(adz, known, "Adzuna (company name only)");
assert.deepEqual(a.map((x) => x.company), ["Acme Robotics"], "agency + senior-only + non-US skipped");
assert.equal(a[0].status, "pending"); assert.equal(a[0].domain, null); assert.equal(a[0].hint, null, "no aggregator link is ever kept");
assert.equal(a[0].id, "a-acme-robotics"); assert.ok(a[0].priority >= 15 && a[0].priority <= 35, "below backlog/wanted priority");
const j = pickAggCompanies(joo, known, "Jooble (company name only)");
assert.deepEqual(j.map((x) => x.company), ["Riverbend Health"], "known company + confidential poster skipped");
console.log("✓ Adzuna/Jooble: US employer names only, agencies + known companies skipped, no aggregator links kept");
