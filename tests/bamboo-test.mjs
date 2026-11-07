// BambooHR reader (Nov 2026): parse, "Internship" employment type counts, detection on a careers page, proof = board's own name
import assert from "node:assert/strict";
const { parseBamboo } = await import("../lib/fetchers/more-boards.js");
const list = { meta: {}, result: [
  { id: "39", jobOpeningName: "2027 Spring Legal Externship", employmentStatusLabel: "Internship", location: { city: "Atlanta", state: "Georgia" }, atsLocation: {}, locationType: "2" },
  { id: "40", jobOpeningName: "Staff Attorney", employmentStatusLabel: "Full-Time", location: { city: "Atlanta", state: "Georgia" }, atsLocation: {} },
  { id: "41", jobOpeningName: "Policy Intern", employmentStatusLabel: "Part-Time", location: {}, atsLocation: {}, isRemote: true },
  { id: "42", jobOpeningName: "Marketing Intern", employmentStatusLabel: "Internship", location: { city: "Toronto", state: "Ontario" }, atsLocation: { country: "Canada" } } ] };
const jobs = parseBamboo(list, "acluga");
assert.equal(jobs.length, 4); assert.equal(jobs[0].url, "https://acluga.bamboohr.com/careers/39"); assert.equal(jobs[0].location, "Atlanta, Georgia");
assert.equal(jobs[0].isIntern, true); assert.equal(jobs[1].isIntern, false); assert.equal(jobs[2].location, "Remote, United States");
assert.equal(jobs[3].location, "Toronto, Ontario, Canada");
console.log("✓ BambooHR list parsed (locations, remote, employment type)");

// fetchCompany keeps the "Externship" because the board itself calls it an Internship; drops Canada and full-time
globalThis.fetch = async (u) => ({ ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => list, text: async () => JSON.stringify(list) });
const { fetchCompany } = await import("../lib/fetchers/index.js");
const { listings } = await fetchCompany({ id: "b-aclu-ga", ats: "bamboohr", token: "acluga", company: "ACLU of Georgia" });
assert.deepEqual(listings.map((l) => l.title), ["2027 Spring Legal Externship"], "remote with no US state is dropped, same as every other board system");
assert.ok(listings.every((l) => l.company === "ACLU of Georgia"));
console.log("✓ fetchCompany: board's Internship type counts; non-US, stateless remote and full-time dropped");

// detection on a company's careers page + proof by the board's own registered name
const { scanHtml, discoverOne } = await import("../lib/discover.js");
const found = scanHtml('<a href="https://acluga.bamboohr.com/careers">Open roles</a>', "https://acluga.org/careers").boards;
assert.deepEqual(found.map((b) => [b.ats, b.config.token]), [["bamboohr", "acluga"]]);
const web = { "https://acluga.bamboohr.com/careers/list": list, "https://acluga.bamboohr.com/careers/company-info": { result: { name: "ACLU of Georgia" } },
  "https://othr.bamboohr.com/careers/list": list, "https://othr.bamboohr.com/careers/company-info": { result: { name: "Someone Else Inc" } } };
globalThis.fetch = async (u) => { u = String(u); const b = web[u]; return b ? { ok: true, status: 200, url: u, headers: { get: () => "application/json" }, json: async () => b, text: async () => JSON.stringify(b) } : { ok: false, status: 404, url: u, headers: { get: () => null }, text: async () => "", json: async () => ({}) }; };
let r = await discoverOne({ company: "ACLU of Georgia", key: "aclugeorgia", hint: "https://acluga.bamboohr.com/careers" });
assert.equal(r.status, "live", r.detail); assert.match(r.detail, /own name is "ACLU of Georgia"/);
r = await discoverOne({ company: "ACLU of Georgia", key: "aclugeorgia", hint: "https://othr.bamboohr.com/careers" });
assert.equal(r.status, "identity_failed", "someone else's BambooHR board is never accepted");
console.log("✓ BambooHR found on careers pages; proven only by the board's own company name (or a link from their site)");
console.log("\nBAMBOO TESTS PASSED");
