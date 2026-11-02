import assert from "node:assert/strict";
const P = `<script>window.pageData = {"Jobs":[{"JobId":11,"JobTitle":"Mechanical Engineering Intern","LocationName":"Euclid","IsInternal":false,"PublishedDate":"2026-10-30","JobLocation":{"City":"Euclid","State":"OH","Country":"USA"}},{"JobId":12,"JobTitle":"Engineering Intern (internal)","IsInternal":true,"JobLocation":{"City":"Euclid","State":"OH"}},{"JobId":13,"JobTitle":"Accounting Intern","IsInternal":false,"JobLocation":{"City":"Euclid","State":"OH"}}]};
</script>`;
const A = { jobRequisitions: [
  { itemID: "9_1", requisitionTitle: "Mechanical Engineering Intern - Summer 2027", requisitionLocations: [{ nameCode: { shortName: " Fairfax, VA, US" } }], customFieldGroup: { indicatorFields: [] } },
  { itemID: "9_2", requisitionTitle: "Engineering Intern", requisitionLocations: [{ nameCode: { shortName: " Raleigh, NC, US" } }], customFieldGroup: { indicatorFields: [{ nameCode: { codeValue: "InternalPostingFlag" }, indicatorValue: true }] } } ] };
const pages = { "https://www.mda.com/careers": `<a href="https://recruiting.paylocity.com/recruiting/jobs/All/5e1630b0-547b-4cbf-9aa6-33241cc0475d/MDA">Jobs</a>`,
                "https://www.bala.com/careers": `<a href="https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=58c87a5d-2e40-4861-b65d-307ba797793e&amp;ccId=19000101_000001">Jobs</a>` };
globalThis.fetch = async (u) => { u = String(u);
  if (pages[u]) return { ok: true, status: 200, url: u, text: async () => pages[u] };
  if (u.includes("recruiting.paylocity.com/recruiting/jobs/All/")) return { ok: true, status: 200, url: u, text: async () => P };
  if (u.includes("job-requisitions")) return { ok: true, status: 200, url: u, json: async () => A, text: async () => JSON.stringify(A) };
  return { ok: false, status: 404, url: u, text: async () => "", json: async () => ({}) }; };
const { fetchCompany } = await import("../lib/fetchers/index.js");
const { discoverOne } = await import("../lib/discover.js");
let o = await fetchCompany({ id: "x-mda", company: "MDA", ats: "paylocity", token: "5e1630b0-547b-4cbf-9aa6-33241cc0475d" });
assert.deepEqual(o.listings.filter((l) => l.match).map((l) => `${l.title}|${l.state}|${l.url}`), ["Mechanical Engineering Intern|OH|https://recruiting.paylocity.com/Recruiting/Jobs/Details/11"]);
assert.equal(o.listings.find((l) => /Accounting/.test(l.title))?.field, "finance", "accounting intern kept for business majors");
console.log("✓ Paylocity: public ME intern kept; internal + accounting dropped");
o = await fetchCompany({ id: "x-bala", company: "Bala", ats: "adp", token: "58c87a5d-2e40-4861-b65d-307ba797793e" });
assert.deepEqual(o.listings.map((l) => `${l.title}|${l.state}`), ["Mechanical Engineering Intern - Summer 2027|VA"]);
console.log("✓ ADP: VA intern kept; internal posting dropped");
let r = await discoverOne({ company: "Mechanical Dynamics & Analysis", domain: "mda.com", key: "mechanicaldynamics" }); assert.equal(r.status, "live"); assert.equal(r.ats, "paylocity");
r = await discoverOne({ company: "Bala Consulting Engineers", domain: "bala.com", key: "bala" }); assert.equal(r.status, "live"); assert.equal(r.ats, "adp");
r = await discoverOne({ company: "Somebody Else", key: "somebody", hint: "https://recruiting.paylocity.com/recruiting/jobs/All/5e1630b0-547b-4cbf-9aa6-33241cc0475d" }); assert.notEqual(r.status, "live");
console.log("✓ live only when linked from the company's own site; outside link held:", r.status);
console.log("PAYLOCITY/ADP TESTS PASSED");
