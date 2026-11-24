// Nov 23: Turbo Sync reads whole Workday boards up to FULL_MAX jobs; bigger boards keep the keyword searches.
import assert from "node:assert/strict";
process.env.BTP_TURBO = "1";
const { fetchWorkday, FULL_MAX } = await import("../lib/fetchers/workday.js");
const { kindOf } = await import("../lib/fields.js");
assert.equal(FULL_MAX, 2000);

const titles = ["Registered Nurse ICU", "Patient Transporter", "EVS Tech I", "Patient Safety Attendant", "Food and Nutrition Services Associate", "Physician", "EVS Supervisor"];
function board(total) {
  const all = Array.from({ length: total }, (_, i) => ({ title: titles[i % titles.length], externalPath: `/job/Salt-Lake-City-UT/x_${i}`, locationsText: "Salt Lake City, UT" }));
  const calls = { empty: 0, keyword: 0 };
  globalThis.fetch = async (u, o = {}) => {
    const b = JSON.parse(o.body || "{}");
    if (b.searchText) calls.keyword++; else calls.empty++;
    const rows = b.searchText ? [] : all.slice(b.offset, b.offset + b.limit);
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ total, jobPostings: rows, facets: [] }) };
  };
  return calls;
}
let calls = board(140);
let jobs = await fetchWorkday({ id: "imh", host: "imh.wd108.myworkdayjobs.com", tenant: "imh", site: "Careers" });
assert.ok(calls.keyword <= 3, "small board: only the intern fallback searches, no early-career ones");
assert.equal(jobs.length, 80, "4 of every 7 titles fit");
assert.ok(jobs.every((j) => kindOf(j.title)));
assert.ok(!jobs.some((j) => /Nurse|Physician|Supervisor/.test(j.title)));

calls = board(2500);
jobs = await fetchWorkday({ id: "big", host: "big.wd5.myworkdayjobs.com", tenant: "big", site: "Careers" });
assert.ok(calls.keyword > 10, "big board keeps the keyword searches");
assert.equal(calls.empty, 1, "big board: only the first count request");

// New hospital support roles
for (const t of ["Patient Transporter", "Environmental Services Technician", "Patient Sitter PRN", "Laundry Attendant", "Floor Care Specialist"]) assert.equal(kindOf(t), "fulltime", t);
for (const t of ["EVS Supervisor I", "Senior Environmental Services Technician", "Nutrition Services Manager", "Transportation Manager"]) assert.equal(kindOf(t), null, t);
console.log("wdfull-test ok");
