import { parseIcimsPage, icimsLocations } from "../lib/fetchers/icims.js";
import { scanHtml } from "../lib/discover.js";
import { fetchCompany } from "../lib/fetchers/index.js";
import assert from "node:assert";
const card = (id, slug, title, loc) => `<div class="row"><div class="col-xs-12 title"><a href="https://careers-dewberry.icims.com/jobs/${id}/${slug}/job?in_iframe=1" class="iCIMS_Anchor"><span class="sr-only field-label">Job Title (Click to sort)</span><h3 class="">${title}</h3></a></div><div class="col-xs-12 description">Desc</div><div class="col-xs-12 additionalFields"><dl class="iCIMS_JobHeaderGroup"><div class="iCIMS_JobHeaderTag"><dt class="iCIMS_JobHeaderField">Position Level</dt><dd class="iCIMS_JobHeaderData"><span>Internship</span></dd></div><div class="iCIMS_JobHeaderTag"><dt class="iCIMS_JobHeaderField"><span class="glyphicons"></span><span class="sr-only field-label">Job Locations</span></dt><dd class="iCIMS_JobHeaderData"><span>${loc}</span></dd></div></dl></div></div>`;
const html = `<html><title>Job Listings at Dewberry</title>` + card(16556,"cad-designer-intern","CAD Designer Intern","US-FL-Lakeland")
 + card(16445,"mechanical-engineering-intern","Mechanical Engineering Intern","US-VA-Fairfax | US-MD-Bethesda")
 + card(16400,"me-intern-toronto","Mechanical Engineering Intern","CA-ON-Toronto")
 + `<a href="/jobs/search?pr=1&in_iframe=1">2</a><a href="/jobs/search?pr=3&in_iframe=1">Last</a>`;
const { jobs, lastPage } = parseIcimsPage(html, "https://careers-dewberry.icims.com");
assert.equal(jobs.length, 3); assert.equal(lastPage, 3);
assert.equal(jobs[0].title, "CAD Designer Intern");
assert.equal(jobs[0].location, "Lakeland, FL");
assert.equal(jobs[1].location, "Fairfax, VA | Bethesda, MD");
assert.equal(jobs[1].url, "https://careers-dewberry.icims.com/jobs/16445/mechanical-engineering-intern/job");
assert.deepEqual(icimsLocations("US-PA-King of Prussia"), ["King of Prussia, PA"]);
const s = scanHtml('<a href="https://careers-dewberry.icims.com/jobs/intro">Jobs</a> <img src="https://cdn.icims.com/x.png">', "https://www.dewberry.com/careers");
assert.deepEqual(s.boards.map(b=>b.config.base), ["https://careers-dewberry.icims.com"]);
// end-to-end through the fetcher filter with a fake fetch
globalThis.fetch = async (u) => ({ ok: true, status: 200, url: String(u), text: async () => String(u).includes("pr=0") ? html : "<html></html>", json: async () => ({}) , headers: new Map()});
const out = await fetchCompany({ id: "x-dewberry", company: "Dewberry", ats: "icims", base: "https://careers-dewberry.icims.com" });
console.log(out.raw, out.listings.map(l => `${l.title} ${l.state} ${l.match}`));
assert.equal(out.listings.filter((l) => l.match).length, 1); // engineering view unchanged; other majors now kept + tagged
assert.ok(out.listings.every((l) => l.field)); // Toronto dropped, CAD not ME-or-general? see output
console.log("icims ok");
