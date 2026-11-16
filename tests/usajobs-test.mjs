// Nov 16: federal jobs from USAJOBS (lib/fetchers/usajobs.js)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const U = await import("../lib/fetchers/usajobs.js");
const { fetchCompany } = await import("../lib/fetchers/index.js");
const item = (id, title, loc, extra = {}) => ({ MatchedObjectId: id, MatchedObjectDescriptor: { PositionTitle: title, PositionURI: `https://www.usajobs.gov:443/job/${id}`,
  OrganizationName: extra.org || "National Aeronautics and Space Administration", PositionLocation: loc, PublicationStartDate: "2026-11-10T00:00:00.0000",
  ApplicationCloseDate: extra.close || "2027-01-31T23:59:59.9970" } });
const gradeItem = (id, title, sched) => { const x = item(id, title, VA); x.MatchedObjectDescriptor.PositionOfferingType = [{ Name: sched }]; return x; };
const VA = [{ LocationName: "Hampton, Virginia", CityName: "Hampton, Virginia", CountryCode: "United States", CountrySubDivisionCode: "Virginia" }];
const pages = {
  student: [item("1", "Student Trainee (Engineering)", VA), item("2", "Pathways Intern - Accounting", [{ LocationName: "Washington, District of Columbia", CityName: "Washington, District of Columbia", CountryCode: "United States", CountrySubDivisionCode: "District of Columbia" }], { org: "Department of Energy" })],
  graduates: [item("3", "Engineer (Recent Graduate)", VA), item("4", "Biologist", [{ LocationName: "Anywhere in the U.S. (remote job)" }], { org: "US Fish and Wildlife Service" })],
  grade: [item("7", "Park Ranger", VA), item("8", "Supervisory Park Ranger", VA), gradeItem("9", "Biological Science Technician", "Seasonal")],
  intern: [item("1", "Student Trainee (Engineering)", VA), item("5", "Summer Intern", [{ LocationName: "Ramstein AB, Germany", CountryCode: "Germany" }]), item("6", "Old Intern", VA, { close: "2025-01-01" })],
};
let calls = [];
const fakeFetch = async (url, opt) => { calls.push({ url, h: opt.headers }); const q = new URL(url).searchParams;
  const k = q.get("HiringPath") || (q.get("Keyword") === "intern" ? "intern" : "") || (q.get("PayGradeHigh") === "07" ? "grade" : "");
  return { ok: true, status: 200, json: async () => ({ SearchResult: { SearchResultItems: pages[k] || [], UserArea: { NumberOfPages: "1" } } }) }; };
await assert.rejects(U.fetchUsajobs({}, { fetchImpl: fakeFetch, env: {} }), /key not set/);
const raw = await U.fetchUsajobs({}, { fetchImpl: fakeFetch, env: { USAJOBS_KEY: "k", USAJOBS_EMAIL: "me@x.com" } });
assert.equal(calls[0].h["Authorization-Key"], "k"); assert.equal(calls[0].h["User-Agent"], "me@x.com"); assert.equal(calls[0].h.Host, "data.usajobs.gov");
assert.deepEqual(raw.map((j) => j.sourceId).sort(), ["1", "2", "3", "4", "5", "7", "8", "9"], "merged, closed one dropped");
assert.equal(raw.find((j) => j.sourceId === "4").location, "Remote, United States");
assert.equal(raw.find((j) => j.sourceId === "1").url, "https://www.usajobs.gov/job/1", "the :443 USAJOBS adds is dropped");
assert.equal(U.toJob({ MatchedObjectId: "9", MatchedObjectDescriptor: { PositionTitle: "Intern", PositionURI: "https://usajobs.gov.evil.com/x" } }, ""), null, "only real usajobs.gov links");
// through the normal pipeline
process.env.USAJOBS_KEY = "k"; process.env.USAJOBS_EMAIL = "me@x.com";
globalThis.fetch = fakeFetch;
const got = await fetchCompany({ id: "usajobs", company: "US Federal Government", ats: "usajobs" });
const by = Object.fromEntries(got.listings.map((l) => [l.id.split(":")[1], l]));
assert.equal(by["1"].kind, "intern"); assert.equal(by["1"].state, "VA"); assert.equal(by["1"].company, "National Aeronautics and Space Administration", "the agency is the employer");
assert.equal(by["2"].state, "DC"); assert.equal(by["2"].company, "Department of Energy");
assert.equal(by["3"].kind, "fulltime", "Recent Graduates program = entry-level");
assert.equal(by["4"].kind, "fulltime", "Recent Graduates program counts even when the title doesn't say so"); assert.equal(by["4"].state, "US", "remote anywhere in the US");
assert.ok(!by["5"], "overseas posts dropped");
assert.equal(by["7"].kind, "fulltime", "public GS-1–7 posting = entry-level");
assert.ok(!by["8"], "supervisory roles never entry-level");
assert.equal(by["9"].kind, "hourly", "seasonal at an entry grade = part-time & hourly");
const d = readFileSync(new URL("../api/discovery.js", import.meta.url), "utf8");
assert.ok(d.includes('cfg.ats === "usajobs" && typeof l.company === "string"'), "turbo_save keeps the agency name for usajobs only");
assert.ok(readFileSync(new URL("../.github/workflows/turbo-sync.yml", import.meta.url), "utf8").includes("secrets.USAJOBS_KEY"));
console.log("✓ usajobs: Pathways internships + Recent Graduates + intern search, agency as employer, closed/overseas dropped");
