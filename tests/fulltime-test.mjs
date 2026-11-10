// Full-time (early-career) roles: kept by the readers, told apart from internships by title, internships stay the default.
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
const { isEarlyCareer, kindOf, INTERN_PG } = await import("../lib/fields.js");

const yes = ["Software Engineer, New Grad 2027", "Entry Level Mechanical Engineer", "Associate Engineer", "Mechanical Engineer I", "Analyst I - Finance",
  "Engineering Development Program (EDP)", "Graduate Engineer Trainee", "Early Career Data Scientist", "Junior Accountant", "University Graduate - Hardware Engineer"];
const no = ["Senior Mechanical Engineer", "Mechanical Engineer II", "Engineering Manager", "Associate Director, Marketing", "Mechanical Engineering Intern",
  "Principal Analyst", "Graduate Research Assistant", "Staff Engineer", "Software Engineer", "Associate", "Engineer III", "New Grad 2024 Software Engineer", "Lead Technician",
  "Auto Repair Specialist I", "Automotive Technician (Entry Level)", "Automotive Repair Specialist I, $5,000 Sign-on Bonus", "RIA Associate Regional Consultant - US Wealth, AVP"];   // live CarMax / State Street catches, Nov 8
for (const t of yes) assert.ok(isEarlyCareer(t), "should be early-career: " + t);
for (const t of no) assert.ok(!isEarlyCareer(t), "should NOT be early-career: " + t);
assert.equal(kindOf("Finance Intern"), "intern"); assert.equal(kindOf("Associate Engineer"), "fulltime"); assert.equal(kindOf("Senior Engineer"), null);
// The Postgres pattern agrees with the JS rule on real titles (International / Internal are not internships)
const pg = new RegExp(INTERN_PG, "i");
for (const t of ["Mechanical Engineering Intern", "Co-op Engineer", "Summer Analyst 2027", "Internship - Finance", "Construction Internships 2027"]) assert.ok(pg.test(t), t);
for (const t of ["International Trade Analyst I", "Internal Audit Associate Analyst", "Associate Engineer"]) assert.ok(!pg.test(t), t);

// The readers keep early-career titles (Greenhouse returns every job; the shared filter decides)
globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => ({ jobs: [
  { id: 1, title: "Mechanical Engineering Intern", location: { name: "Blacksburg, VA" }, absolute_url: "https://boards.greenhouse.io/acme/jobs/1", updated_at: "2026-11-01" },
  { id: 2, title: "Associate Mechanical Engineer", location: { name: "Richmond, VA" }, absolute_url: "https://boards.greenhouse.io/acme/jobs/2", updated_at: "2026-11-01" },
  { id: 3, title: "Senior Mechanical Engineer", location: { name: "Richmond, VA" }, absolute_url: "https://boards.greenhouse.io/acme/jobs/3", updated_at: "2026-11-01" },
] }) });
const { fetchCompany } = await import("../lib/fetchers/index.js");
const { listings } = await fetchCompany({ id: "acme", company: "Acme", ats: "greenhouse", token: "acme" });
assert.deepEqual(listings.map((l) => l.title), ["Mechanical Engineering Intern", "Associate Mechanical Engineer"], "intern + early-career kept, senior dropped");
assert.equal(listings[1].match, "me", "full-time engineering roles get the same engineering tag");

// API: kind=intern is the default, kind=fulltime / all work, every row says its kind, summary counts full-time separately
env(); const f = installFake({});
const L = f.T("listings"), now = new Date().toISOString();
const row = (id, title) => L.push({ id, company_id: "acme", company: "Acme", title, field: "mechanical", match: "me", state: "VA", url: "https://x/" + id, first_seen: now, closed_at: null, link_ok: true });
row("a1", "Mechanical Engineering Intern"); row("a2", "Associate Mechanical Engineer"); row("a3", "Manufacturing Co-op"); row("a4", "International Engineer I");
row("a5", "Commercial Construction Internships 2027"); row("a6", "Volunteer/Student Positions");   // plural title; a board-flagged internship
const api = (await import("../api/listings.js")).default;
const get = async (q) => (await invoke(api, { method: "GET", query: q })).body;
assert.deepEqual((await get({})).listings.map((l) => l.id).sort(), ["a1", "a3", "a5", "a6"], "default = internships (incl. board-flagged ones and plural titles)");
assert.deepEqual((await get({ kind: "fulltime" })).listings.map((l) => [l.id, l.kind]).sort(), [["a2", "fulltime"], ["a4", "fulltime"]]);
assert.equal((await get({ kind: "all" })).listings.length, 6);
assert.equal((await invoke(api, { method: "GET", query: { kind: "senior" } })).code, 400);
const sum = await get({ summary: "1" });
assert.equal(sum.allMajors, 4, "headline numbers stay internships"); assert.equal(sum.fulltime, 2);
console.log("✓ full-time: early-career rules, Postgres pattern = JS rule, readers keep them, kind=intern default / fulltime / all, summary split");

// Nov 10: more real first-job titles count as full-time; senior/trade/retail versions still don't
{
  const { isEarlyCareer: ec, kindOf: k2, FULLTIME_PG } = await import("../lib/fields.js");
  for (const t of ["Staff Accountant", "Staff Auditor - Assurance", "Sales Development Representative", "Business Development Rep", "SDR - East",
    "Management Trainee", "Marketing Coordinator", "Recruiting Coordinator", "Research Coordinator", "Assistant Buyer", "Assistant Media Planner",
    "Account Coordinator", "Analyst Program 2027", "Leadership Development Program - Finance", "Post-Graduate Fellowship", "Software Engineer Level 1"])
    assert.ok(ec(t), "should count: " + t);
  for (const t of ["Senior Staff Accountant", "Staff Engineer", "Staff Software Engineer", "Senior Marketing Coordinator", "Project Coordinator III",
    "Truck Driver Trainee", "Retail Sales Coordinator", "Store Coordinator", "Marketing Coordinator Intern", "Sales Development Manager", "Lead Recruiting Coordinator"])
    assert.ok(!ec(t), "should NOT count: " + t);
  assert.equal(k2("Recruiting Coordinator Intern"), "intern");
  assert.doesNotThrow(() => new RegExp(FULLTIME_PG.replace(/\\y/g, "\\b"), "i"));
  console.log("✓ full-time (Nov 10): staff accountant, SDR/BDR, trainees, coordinators, programs count; senior/trade/retail don't");
}
