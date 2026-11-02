import assert from "node:assert/strict";
const R = {};
globalThis.fetch = async (u) => { u = String(u); for (const [k, v] of Object.entries(R)) if (u.includes(k)) return { ok: true, status: 200, url: u, json: async () => v(u), text: async () => JSON.stringify(v(u)) }; return { ok: false, status: 404, url: u, json: async () => ({}), text: async () => "" }; };
const { fetchCompany } = await import("../lib/fetchers/index.js");
const { discoverOne } = await import("../lib/discover.js");
const t = (l) => l.listings.map((x) => `${x.title}|${x.state}|${x.match}`).sort();

// Ashby
R["api.ashbyhq.com/posting-api/job-board/acmeauto"] = () => ({ jobs: [
  { id: "a1", title: "Mechanical Engineering Intern", location: "Detroit", isListed: true, jobUrl: "https://jobs.ashbyhq.com/acmeauto/a1", address: { postalAddress: { addressRegion: "Michigan", addressCountry: "United States" } } },
  { id: "a2", title: "Software Engineer Intern", location: "Remote", isListed: true },
  { id: "a3", title: "Hardware Engineering Intern", location: "Toronto", isListed: true, address: { postalAddress: { addressRegion: "Ontario", addressCountry: "Canada" } } },
  { id: "a4", title: "Mechanical Design Intern", location: "Pittsburgh, PA", isListed: false } ] });
let out = await fetchCompany({ id: "s-acme", company: "Acme Auto", ats: "ashby", token: "acmeauto" });
assert.deepEqual(t(out), ["Mechanical Engineering Intern|MI|me"]); console.log("✓ Ashby: US ME intern kept; software, Canada, unlisted dropped");

// SmartRecruiters
R["api.smartrecruiters.com/v1/companies/BoschGroup/postings?q=intern"] = () => ({ content: [
  { id: "7400", name: "Mechanical Engineering Intern - Summer 2027", location: { city: "Charleston", region: "SC", country: "us" }, releasedDate: "2026-10-01" },
  { id: "7401", name: "Mechanical Intern", location: { city: "Stuttgart", country: "de" } } ] });
R["api.smartrecruiters.com/v1/companies/BoschGroup/postings?q=co-op"] = () => ({ content: [] });
out = await fetchCompany({ id: "s-bosch", company: "Bosch", ats: "smartrecruiters", token: "BoschGroup" });
assert.deepEqual(t(out), ["Mechanical Engineering Intern - Summer 2027|SC|me"]);
assert.equal(out.listings[0].url, "https://jobs.smartrecruiters.com/BoschGroup/7400"); console.log("✓ SmartRecruiters: US kept, Germany dropped, company's own job link");

// Oracle
R["eeho.fa.us2.oraclecloud.com/hcmRestApi"] = (u) => decodeURIComponent(u).includes('keyword="intern"') ? ({ items: [{ TotalJobsCount: 2, requisitionList: [
  { Id: "98295", Title: "Mechanical Engineering Co-op", PrimaryLocation: "Pittsburgh, PA, United States", PrimaryLocationCountry: "US", PostedDate: "2026-10-20" },
  { Id: "98296", Title: "Finance Intern", PrimaryLocation: "Cleveland, OH, United States", PrimaryLocationCountry: "US" } ] }] }) : ({ items: [{ TotalJobsCount: 0, requisitionList: [] }] });
out = await fetchCompany({ id: "x-howmet", company: "Howmet Aerospace", ats: "oracle", host: "eeho.fa.us2.oraclecloud.com", site: "CX_2001" });
assert.deepEqual(t({ listings: out.listings.filter((l) => l.match) }), ["Mechanical Engineering Co-op|PA|me"]);
assert.equal(out.listings.find((l) => l.title === "Finance Intern").field, "finance", "other majors kept + tagged");
assert.equal(out.listings[0].url, "https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/job/98295"); console.log("✓ Oracle: co-op kept, finance dropped, link to their candidate site");

// Eightfold
R["lockheedmartin.eightfold.ai/api/apply/v2/jobs"] = (u) => u.includes("query=intern") ? ({ positions: [
  { id: 1, name: "Mechanical Engineering Intern", locations: ["Fort Worth, TX, United States", "Orlando, FL, United States"], canonicalPositionUrl: "https://www.lockheedmartinjobs.com/job/1" },
  { id: 2, name: "Systems Engineering Intern", location: "Denver, Colorado, United States" } ] }) : ({ positions: [] });
out = await fetchCompany({ id: "x-lockheed", company: "Lockheed Martin", ats: "eightfold", host: "lockheedmartin.eightfold.ai", domain: "lockheedmartin.com" });
assert.deepEqual(t(out), ["Mechanical Engineering Intern|TX,FL|me", "Systems Engineering Intern|CO|general"]); console.log("✓ Eightfold: multi-state posting + full state names read");

// Discovery proof rules
const html = (b) => () => b;
R["https://www.howmet.com/careers"] = null; // (pages handled below)
globalThis.fetch = (orig => async (u, o) => {
  u = String(u);
  const pages = {
    "https://www.howmet.com/careers": `<a href="https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions">Jobs</a>`,
    "https://www.lockheedmartin.com/careers": `<a href="https://lockheedmartin.eightfold.ai/careers?domain=lockheedmartin.com">Search jobs</a>`,
  };
  if (pages[u]) return { ok: true, status: 200, url: u, text: async () => pages[u] };
  return orig(u, o);
})(globalThis.fetch);
let r = await discoverOne({ company: "Howmet Aerospace", domain: "howmet.com", key: "howmet" });
assert.equal(r.status, "live"); assert.equal(r.ats, "oracle"); console.log("✓ Oracle linked from own site → live:", r.detail);
r = await discoverOne({ company: "Some Co", key: "someco", hint: "https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/job/1" });
assert.notEqual(r.status, "live"); console.log("✓ Oracle from an outside hint → NOT live (address doesn't prove who it belongs to):", r.status);
r = await discoverOne({ company: "Lockheed Martin", domain: "lockheedmartin.com", key: "lockheed" });
assert.equal(r.status, "live"); assert.equal(r.ats, "eightfold"); console.log("✓ Eightfold live:", r.detail);
r = await discoverOne({ company: "Acme Auto", key: "acmeauto", hint: "https://jobs.ashbyhq.com/acmeauto/a1" });
assert.equal(r.status, "live"); console.log("✓ Ashby from hint with matching board name → live");
r = await discoverOne({ company: "Zeta Motors", key: "zetamotors", hint: "https://jobs.ashbyhq.com/acmeauto/a1" });
assert.notEqual(r.status, "live"); console.log("✓ Ashby board named for a different company → held:", r.status);
console.log("MORE-BOARDS TESTS PASSED");
