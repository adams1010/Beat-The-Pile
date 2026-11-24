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

// Taleo: whole-board read in Turbo (portal id given), filtered by our rules
{
  const { fetchTaleo } = await import("../lib/fetchers/taleo-ukg.js");
  const t2 = ["Pharmacy Tech I", "Registered Nurse", "Patient Transporter", "Physician"];
  const all = Array.from({ length: 60 }, (_, i) => ({ contestNo: String(1000 + i), linkedColumn: 0, column: [t2[i % 4], '["Texas-Dallas"]', "Nov 20, 2026"] }));
  const kws = [];
  globalThis.fetch = async (u, o = {}) => {
    const b = JSON.parse(o.body || "{}"); kws.push(b.fieldData.fields.KEYWORD);
    const rows = b.fieldData.fields.KEYWORD ? [] : all.slice((b.pageNo - 1) * 25, b.pageNo * 25);
    return { ok: true, status: 200, json: async () => ({ requisitionList: rows, pagingData: { totalCount: 60, pageSize: 25 } }) };
  };
  const jobs = await fetchTaleo({ id: "bsw", host: "bswhealth.taleo.net", section: "ex", portal: "101430233" });
  assert.equal(jobs.length, 30, "Pharmacy Tech + Transporter = half of 60");
  assert.ok(kws.filter((k) => k).length <= 1, "only the 'intern' portal check, no keyword sweep");
}
// Finder: Taleo apply links carry the portal; jibeapply.com boards are found from the company's page
{
  const { scanHtml } = await import("../lib/discover.js");
  const b = scanHtml(`"applyUrl":"https://bswhealth.taleo.net/careersection/ex/jobapply.ftl?job=1&lang=en&csNo=2&portal=101430233" <a href="https://mdanderson.taleo.net/careersection/MDA_ex/mysubmissions.ftl">x</a> <a href="https://nortonhealthcare.jibeapply.com/careers-home/">y</a> <a href="https://texashealth.taleo.net/careersection/iam/accessmanagement/login.jsf">z</a>`, "https://jobs.bswhealth.com/us/en").boards;
  assert.deepEqual(b.find((x) => x.config.host === "bswhealth.taleo.net").config, { host: "bswhealth.taleo.net", section: "ex", portal: "101430233" });
  assert.ok(b.some((x) => x.config.section === "MDA_ex"));
  assert.ok(b.some((x) => x.ats === "jibe" && x.config.base === "https://nortonhealthcare.jibeapply.com"));
  assert.ok(!b.some((x) => x.config.section === "iam"));
}
console.log("wdfull-test (taleo/jibe) ok");
// Workday 429 = "slow down": the proof asks twice more, and the finder re-checks after RATE_RETRY_HOURS (not 2 days)
{
  const { readFileSync } = await import("node:fs");
  const api = readFileSync(new URL("../api/discover.js", import.meta.url), "utf8"), lib = readFileSync(new URL("../lib/discover.js", import.meta.url), "utf8");
  assert.match(api, /RATE_RETRY_HOURS = 3/); assert.match(api, /answered%20429\*,checked_at\.lt\.\$\{cutoff429\}/);
  assert.match(lib, /r\.status === 429 && i < 2/);
  console.log("wdfull-test (429 retries) ok");
}
