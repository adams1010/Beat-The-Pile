// Taleo + UKG readers — fixtures copied from real responses (D.R. Horton, Textron on Taleo; Trex, Hanwha Philly Shipyard on UKG, Nov 2026)
import assert from "node:assert/strict";
const { taleoLocation, parseTaleo, parseUkg, fetchTaleo, fetchUkg } = await import("../lib/fetchers/taleo-ukg.js");
const { scanHtml } = await import("../lib/discover.js");
const { boardKey } = await import("../lib/companies.js");
const { fetchCompany } = await import("../lib/fetchers/index.js");

// Taleo locations: every shape seen in the wild
assert.equal(taleoLocation("AL-Montgomery"), "Montgomery, AL");
assert.equal(taleoLocation("Florida-Panama City"), "Panama City, FL");
assert.equal(taleoLocation("North Carolina-High Point"), "High Point, NC");
assert.equal(taleoLocation("US-Massachusetts-Wilmington"), "Wilmington, MA");
assert.equal(taleoLocation("US-ME-Waterboro"), "Waterboro, ME");
assert.equal(taleoLocation("CA-Quebec-Mirabel"), "Mirabel, Quebec, Canada", "3 parts = country first: Canada, not California");
assert.equal(taleoLocation("CA-Los Angeles"), "Los Angeles, CA", "2 parts = state first: California");
assert.equal(taleoLocation("IN-Fort Wayne"), "Fort Wayne, IN");
assert.equal(taleoLocation("Texas-Fort Worth-Downtown"), "Fort Worth-Downtown, TX");
console.log("✓ Taleo locations: state codes, state names, US- prefix, foreign country first");

const T = { host: "drhorton.taleo.net", section: "2" };
const taleoResp = { requisitionList: [
  { jobId: "270710", contestNo: "2605638", column: ["Summer 2027 Construction Intern", "[\"AL-Montgomery\"]", "Nov 4, 2026"], linkedColumn: 0, locationsColumns: [1] },
  { jobId: "1", contestNo: "345773", column: ["2027 winter Internship - accounting (Mirabel, QC)", "[\"CA-Quebec-Mirabel\"]", "10/22/2026"], linkedColumn: 0, locationsColumns: [1] },
  { jobId: "2", contestNo: "346007", column: ["2027 Intern - Program Master Scheduler", "[\"US-Massachusetts-Wilmington\",\"US-Texas-Fort Worth\"]", "11/02/2026"], linkedColumn: 0, locationsColumns: [1] }],
  pagingData: { currentPageNo: 1, pageSize: 25, totalCount: 3 } };
const tj = parseTaleo(taleoResp, T);
assert.deepEqual(tj[0], { sourceId: "2605638", title: "Summer 2027 Construction Intern", location: "Montgomery, AL", url: "https://drhorton.taleo.net/careersection/2/jobdetail.ftl?job=2605638&lang=en", postedOn: "Nov 4, 2026" });
assert.equal(tj[2].location, "Wilmington, MA | Fort Worth, TX");
console.log("✓ Taleo parse: title, locations, date, working job link (contestNo)");

const U = { base: "https://recruiting.ultipro.com/TRE1006TRCI/JobBoard/699366e7-23c6-46d9-ae0d-4f649323dabf" };
const ukgResp = { totalCount: 3, opportunities: [
  { Id: "d520c1f5-2dce-4b53-9064-7cbc18b74740", Title: "Summer 2027 Business Internship Opportunities", PostedDate: "2026-11-04T16:42:38.573Z",
    Locations: [{ Address: { City: "Winchester", State: { Code: "VA", Name: "Virginia" }, Country: { Code: "USA" } } }] },
  { Id: "a1", Title: "Welder B", PostedDate: "2026-11-01T00:00:00Z", Locations: [{ Address: { City: "Philadelphia", State: { Code: "PA" }, Country: { Code: "USA" } } }] },
  { Id: "a2", Title: "Engineering Intern", PostedDate: null, Locations: [{ Address: { City: "Toronto", State: { Code: "ON" }, Country: { Code: "CAN", Name: "Canada" } } }] }] };
const uj = parseUkg(ukgResp, U);
assert.deepEqual(uj[0], { sourceId: "d520c1f5-2dce-4b53-9064-7cbc18b74740", title: "Summer 2027 Business Internship Opportunities", location: "Winchester, VA",
  url: U.base + "/OpportunityDetail?opportunityId=d520c1f5-2dce-4b53-9064-7cbc18b74740", postedOn: "2026-11-04T16:42:38.573Z" });
assert.equal(uj[2].location, "Toronto, ON, Canada");
console.log("✓ UKG parse: title, city/state, foreign kept foreign, job link");

// Detection on a company's careers page (real links from drhorton.com / trex.com / helixelectric.com)
const html = `<a href="https://drhorton.taleo.net/careersection/2/jobsearch.ftl?lang=en">Jobs</a>
  <a href="https://recruiting.ultipro.com/TRE1006TRCI/JobBoard/699366e7-23c6-46d9-ae0d-4f649323dabf/?q=&#038;o=postedDateDesc">Careers</a>
  <a href="https://chp.tbe.taleo.net/chp02/ats/external/SubmitReferral.jsp?org=HELIX">Refer</a>
  <a href="https://acme.taleo.net/careersection/internal_employees/jobsearch.ftl">Employees</a>`;
const found = scanHtml(html, "https://www.example.com/careers").boards;
assert.deepEqual(found.filter((b) => b.ats === "taleo").map((b) => b.config), [{ host: "drhorton.taleo.net", section: "2" }], "Taleo Business Edition + internal sections skipped");
assert.deepEqual(found.filter((b) => b.ats === "ukg").map((b) => b.config), [{ base: U.base }]);
assert.equal(boardKey({ ats: "taleo", host: "drhorton.taleo.net", section: "2" }), "taleo:drhorton.taleo.net/2");
assert.equal(boardKey({ ats: "ukg", base: U.base }), "ukg:tre1006trci/699366e7-23c6-46d9-ae0d-4f649323dabf");
console.log("✓ detection: Taleo + UKG boards found on a careers page; board keys stable");

// End to end through fetchCompany with a fake network: paging, intern filter, US only
const calls = [];
globalThis.fetch = async (u, o = {}) => { u = String(u); calls.push(u);
  const ok = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => (typeof b === "string" ? b : JSON.stringify(b)) });
  if (u.includes("jobsearch.ftl")) return ok(`<script>var x="/careersection/rest/jobboard/searchjobs?lang=en&portal=101430233"</script>`);
  if (u.includes("searchjobs")) { const b = JSON.parse(o.body); return ok(b.fieldData.fields.KEYWORD === "intern" ? taleoResp : { requisitionList: [], pagingData: { totalCount: 0 } }); }
  if (u.includes("LoadSearchResults")) { const b = JSON.parse(o.body); return ok(b.opportunitySearch.Skip === 0 ? ukgResp : { opportunities: [], totalCount: 3 }); }
  return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
};
let r = await fetchCompany({ id: "s-dr-horton", company: "D.R. Horton", ats: "taleo", ...T });
assert.deepEqual(r.listings.map((l) => [l.title, l.state]), [["Summer 2027 Construction Intern", "AL"], ["2027 Intern - Program Master Scheduler", "MA,TX"]], "Canadian internship dropped");
assert.ok(calls.some((u) => u.includes("portal=101430233")), "portal id read from the search page");
r = await fetchCompany({ id: "s-trex", company: "Trex", ats: "ukg", ...U });
assert.deepEqual(r.listings.map((l) => [l.title, l.state, l.field]), [["Summer 2027 Business Internship Opportunities", "VA", "other"]], "welder + Canada dropped");
assert.equal(r.raw, 3);
// saved portal that went stale → looked up again
calls.length = 0; let first = true;
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { if (String(u).includes("portal=999") && first) { first = false; return { ok: false, status: 500, json: async () => ({}) }; } return realFetch(u, o); };
r = await fetchCompany({ id: "s-dr-horton", company: "D.R. Horton", ats: "taleo", ...T, portal: "999" });
assert.equal(r.listings.length, 2, "stale portal id recovered");
console.log("TALEO/UKG TESTS PASSED");
