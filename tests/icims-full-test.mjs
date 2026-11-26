// Nov 26: iCIMS — (1) newer card layouts ("Location", "Location : Location", separate City/State/Country fields) were
// read with no location, so every job was dropped as non-US (Dayton Freight 0 → 338); (2) Turbo reads whole boards
// up to FULL_MAX and filters by our rules, like Workday/Taleo (40 live boards: 748 → 1,321 kept).
import assert from "node:assert/strict";
process.env.BTP_TURBO = "1";
const { parseIcimsPage, cityStateFields, fetchIcims } = await import("../lib/fetchers/icims.js");
const base = "https://careers-x.icims.com";

const card = (id, title, head, fields = "") => `<li class="iCIMS_JobCardItem"><div class="row">${head}<div class="col-xs-12 title">
  <a href="${base}/jobs/${id}/t/job?in_iframe=1" class="iCIMS_Anchor"><span class="sr-only field-label">Title</span><h3 > ${title}</h3></a></div>
  <div class="col-xs-12 additionalFields"><dl class="iCIMS_JobHeaderGroup">${fields}</dl></div></div></li>`;
const head = (label, v) => `<div class="col-xs-6 header left"><span class="sr-only field-label">${label}</span> <span > ${v}</span></div>`;
const fld = (label, v) => `<div class="iCIMS_JobHeaderTag"><dt class="iCIMS_JobHeaderField"><span class="glyphicons" aria-hidden="true"></span> <span class="sr-only field-label">${label}</span></dt><dd class="iCIMS_JobHeaderData"><span > ${v}</span></dd></div>`;

// Canon: "Location"; Dayton Freight: "Location : Location"
let p = parseIcimsPage(card(1, "Sales Trainee", head("Location", "US-PA-Philadelphia")) + card(2, "Dock Worker", head("Location : Location", "US-IL-Des Plaines")), base);
assert.deepEqual(p.jobs.map((j) => j.location), ["Philadelphia, PA", "Des Plaines, IL"]);
// SAS: separate fields; a foreign country stays out; "Location : " prefixed labels too
p = parseIcimsPage(
  card(3, "Analyst", "", fld("Country (Full Name)", "United States") + fld("City", "Cary") + fld("State/Province (Full Name)", "North Carolina")) +
  card(4, "Analyst", "", fld("Country (Full Name)", "Brazil") + fld("City", "S&atilde;o Paulo")) +
  card(5, "Clerk", "", fld("Location : City", "Joliet") + fld("Location : State/Province (Full Name)", "Illinois")), base);
assert.deepEqual(p.jobs.map((j) => j.location), ["Cary, NC", "", "Joliet, IL"]);
assert.equal(cityStateFields(fld("City", "Toronto") + fld("State/Province (Full Name)", "Ontario")), null, "not a US state");
// the old "Job Locations" layout still works
p = parseIcimsPage(`<li class="iCIMS_JobCardItem"><span>Job Locations</span> <span>US-VA-Richmond</span><a href="${base}/jobs/9/x/job"><h3>Intern</h3></a></li>`, base);
assert.equal(p.jobs[0].location, "Richmond, VA");

// Whole-board read: 3 pages, no keyword searches, only titles that fit our rules
const titles = ["Patient Transporter", "Registered Nurse ICU", "Summer Intern", "Senior Director", "Cashier"];
const pageHtml = (pr, last) => Array.from({ length: 20 }, (_, i) => card(pr * 20 + i + 100, titles[(pr * 20 + i) % 5], head("Location", "US-OH-Dayton"))).join("") +
  Array.from({ length: last + 1 }, (_, i) => `<a href="?pr=${i}">${i}</a>`).join("");
const calls = { keyword: 0, empty: 0 };
globalThis.fetch = async (u) => {
  const url = new URL(u); const q = url.searchParams.get("searchKeyword"), pr = +url.searchParams.get("pr");
  if (q) { calls.keyword++; return { ok: true, status: 200, text: async () => "" }; }
  calls.empty++; return { ok: true, status: 200, text: async () => pageHtml(pr, 2) };
};
let jobs = await fetchIcims({ id: "x", base });
assert.equal(calls.keyword, 0, "small board: no keyword searches");
assert.equal(calls.empty, 3);
assert.equal(jobs.length, 36, "3 of every 5 titles fit (transporter, intern, cashier)");
assert.ok(!jobs.some((j) => /Nurse|Director/.test(j.title)));

// A failed page → fall back to the keyword searches (never a partial whole-board read)
calls.keyword = calls.empty = 0;
globalThis.fetch = async (u) => {
  const url = new URL(u); const q = url.searchParams.get("searchKeyword"), pr = +url.searchParams.get("pr");
  if (q) { calls.keyword++; return { ok: true, status: 200, text: async () => (q === "intern" ? card(7, "Summer Intern", head("Location", "US-OH-Dayton")) : "") }; }
  if (pr === 2) return { ok: false, status: 503, text: async () => "" };
  return { ok: true, status: 200, text: async () => pageHtml(pr, 2) };
};
jobs = await fetchIcims({ id: "x", base });
assert.ok(calls.keyword > 0, "fell back to keyword searches");
assert.deepEqual(jobs.map((j) => j.title), ["Summer Intern"]);

// Board bigger than FULL_MAX → keyword searches
calls.keyword = calls.empty = 0;
globalThis.fetch = async (u) => {
  const q = new URL(u).searchParams.get("searchKeyword");
  if (q) { calls.keyword++; return { ok: true, status: 200, text: async () => "" }; }
  calls.empty++; return { ok: true, status: 200, text: async () => pageHtml(0, 150) };
};
await fetchIcims({ id: "x", base });
assert.ok(calls.keyword > 0 && calls.empty <= 21, "big board keeps the keyword searches (+ the old 20-page browse fallback), never all 151 pages");
console.log("icims-full ok");
