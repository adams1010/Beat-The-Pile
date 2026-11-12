// Workable reader (Nov 9): parse the public widget feed, detect boards on careers pages, keep US internships + new-grad roles.
import assert from "node:assert/strict";
const { parseWorkable } = await import("../lib/fetchers/more-boards.js");
const { scanHtml } = await import("../lib/discover.js");
const feed = { name: "Acme Robotics", jobs: [
  { title: "Mechanical Engineering Intern", shortcode: "AB12", employment_type: "Full-time", locations: [{ city: "Pittsburgh", region: "Pennsylvania", country: "United States", countryCode: "US" }], published_on: "2026-11-01" },
  { title: "Summer Associate", shortcode: "CD34", employment_type: "Internship", city: "Austin", state: "Texas", country: "United States", published_on: "2026-11-02" },
  { title: "Software Engineer I", shortcode: "EF56", employment_type: "Full-time", locations: [{ city: "Boston", region: "Massachusetts", country: "United States" }] },
  { title: "Data Intern", shortcode: "GH78", locations: [{ city: "London", region: "England", country: "United Kingdom" }] },
  { title: "Senior Engineer", shortcode: "IJ90", locations: [{ city: "Denver", region: "Colorado", country: "United States" }] },
  { title: "Mechanical Engineering Intern", shortcode: "AB12", locations: [{ city: "Erie", region: "Pennsylvania", country: "United States" }] },   // same posting listed twice (live feeds do this)
] };
const jobs = parseWorkable(feed, "acmerobotics");
assert.equal(jobs.length, 6);
assert.equal(jobs[0].url, "https://apply.workable.com/acmerobotics/j/AB12/");
assert.equal(jobs[0].location, "Pittsburgh, Pennsylvania, United States");
assert.equal(jobs[1].isIntern, true, "the board's own 'Internship' type counts");
assert.equal(jobs[1].location, "Austin, Texas, United States", "old single-location shape");
const b = scanHtml('<a href="https://apply.workable.com/acmerobotics/">Jobs</a> <a href="https://apply.workable.com/j/AB12">one job</a> https://www.workable.com/pricing', null).boards;
assert.deepEqual(b.map((x) => x.config.token), ["acmerobotics"], "board found; job links, www and marketing pages ignored");
globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => feed, text: async () => JSON.stringify(feed), headers: new Map() });
const { fetchCompany } = await import("../lib/fetchers/index.js");
const out = await fetchCompany({ id: "acme-robotics", company: "Acme Robotics", ats: "workable", token: "acmerobotics" });
assert.deepEqual(out.listings.map((l) => l.title).sort(), ["Mechanical Engineering Intern", "Software Engineer I", "Summer Associate"], "US internships + early-career; UK and senior roles dropped");
console.log("✓ Workable: feed parsed, boards detected, US internships + new-grad kept");
