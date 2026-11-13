// ⚡ Turbo Sync (Nov 13): GitHub reads the boards, /api/discovery turbo_list / turbo_save store them with the same rules as
// /api/sync. Plus the entry-level job rule (medical assistant, bank teller…) and its Postgres twin.
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
env(); process.env.CRON_SECRET = "cron";
const f = installFake();
f.T("company_candidates").push({ id: "b-mercy", company: "Mercy Health", ats: "greenhouse", config: { token: "mercy" }, enabled: true, status: "live" },
  { id: "b-off", company: "Off Co", ats: "greenhouse", config: { token: "off" }, enabled: false, status: "live" });
f.T("listings").push({ id: "b-mercy:old", company_id: "b-mercy", company: "Mercy Health", title: "Medical Assistant", url: "https://x/old", state: "OH", closed_at: null, last_seen: "2026-11-01T00:00:00Z" });
const disc = (await import("../api/discovery.js")).default;
const robot = (body) => invoke(disc, { method: "POST", headers: { authorization: "Bearer cron" }, body });

assert.equal((await invoke(disc, { method: "POST", headers: {}, body: { action: "turbo_list" } })).code, 403, "robot only");
let r = await robot({ action: "turbo_list" });
assert.equal(r.code, 200); const ids = r.body.companies.map((c) => c.id);
assert.ok(ids.includes("b-mercy") && !ids.includes("b-off"), "only enabled companies");
assert.equal(r.body.companies.find((c) => c.id === "b-mercy").token, "mercy", "board config is handed over");

const runStart = new Date().toISOString();
const L = (id, title, extra = {}) => ({ id, company_id: "b-mercy", company: "Fake Name Inc", title, url: "https://x/" + id, location: "Columbus, OH", state: "OH", ...extra });
r = await robot({ action: "turbo_save", runStart, results: [
  { id: "b-mercy", raw: 40, listings: [L("b-mercy:1", "Medical Assistant - Family Medicine"), L("b-mercy:2", "Patient Care Technician"), L("b-off:9", "Sneaky Row")] },
  { id: "b-off", raw: 3, listings: [] },
  { id: "b-nope", raw: 1, listings: [] },
] });
assert.equal(r.code, 200);
const open = f.T("listings").filter((l) => !l.closed_at);
assert.deepEqual(open.map((l) => l.id).sort(), ["b-mercy:1", "b-mercy:2"], "new rows in, the vanished one closed, another company's row refused");
assert.ok(open.every((l) => l.company === "Mercy Health"), "company name always from our config");
assert.equal(r.body.results.find((x) => x.id === "b-off").skipped, "unknown or disabled company");
assert.ok(f.T("feed_runs").some((x) => x.company_id === "b-mercy" && x.ok && x.kept_count === 2), "logged like a normal sync");

// a board that errors closes nothing
r = await robot({ action: "turbo_save", runStart: new Date(Date.now() + 1000).toISOString(), results: [{ id: "b-mercy", error: "timed out after 150s" }] });
assert.equal(f.T("listings").filter((l) => !l.closed_at).length, 2, "a failed read never closes jobs");
assert.equal(r.body.results[0].ok, false);
// an empty board with open jobs is held (broken reader, not a hiring freeze)
await robot({ action: "turbo_save", runStart: new Date(Date.now() + 2000).toISOString(), results: [{ id: "b-mercy", raw: 0, listings: [] }] });
assert.equal(f.T("listings").filter((l) => !l.closed_at).length, 2, "0 jobs back → keep what we had");
assert.equal((await robot({ action: "turbo_save", runStart: "nope", results: [] })).code, 400);

// ── entry-level jobs (any major's first job) ──
const { kindOf, fieldOf, isEntryRole, FULLTIME_PG, INTERN_PG } = await import("../lib/fields.js");
const yes = ["Medical Assistant", "Certified Medical Assistant - Family Medicine", "Patient Care Technician - Med Surg", "Phlebotomist", "Pharmacy Technician",
  "Bank Teller", "Front Desk Receptionist", "Customer Service Representative", "New Grad RN - ICU", "RN Residency Program 2027", "Teacher Assistant",
  "Research Assistant", "Behavior Technician", "Patient Access Representative", "Medical Scribe"];
const no = ["Registered Nurse", "Medical Assistant II", "Lead Medical Assistant", "Senior Customer Service Representative", "Travel CNA", "Graduate Research Assistant",
  "Pharmacy Technician Supervisor", "Medical Resident", "Customer Service Representative - 3+ years"];
for (const t of yes) assert.equal(kindOf(t), "fulltime", "should be an entry-level job: " + t);
for (const t of no) assert.notEqual(kindOf(t), "fulltime", "should NOT be entry-level: " + t);   // retail/warehouse are "hourly" since Nov 13
assert.equal(kindOf("Medical Assistant Intern"), "intern", "internships stay internships");
for (const t of ["Medical Assistant", "Patient Care Technician", "Phlebotomist", "New Grad RN - ICU", "Behavior Technician"]) assert.equal(fieldOf(t), "science_health", t);
assert.equal(fieldOf("Bank Teller"), "finance");
// the Postgres pattern (what /api/listings filters with) agrees with the JS rule
const ft = new RegExp(FULLTIME_PG.replace(/\\y/g, "\\b"), "i"), it = new RegExp(INTERN_PG.replace(/\\y/g, "\\b"), "i");
for (const t of yes) assert.ok(ft.test(t) && !it.test(t), "Postgres side: " + t);
assert.ok(!ft.test("Medical Assistant Intern"));
assert.ok(isEntryRole("Teller") && !isEntryRole("Senior Teller"));
console.log("✓ turbo sync: robot-only list + save, only enabled companies, company name from config, vanished jobs closed, failures/empty boards close nothing; entry-level jobs kept (medical assistant, teller…), retail/senior out, Postgres agrees");

// Nov 13: part-time & hourly — its own kind, never mixed into internships or entry-level
{
  const { kindOf, isHourlyRole } = await import("../lib/fields.js");
  for (const t of ["Cashier", "Part Time Cashier", "Sales Associate", "Barista", "Crew Member", "Warehouse Associate", "Delivery Driver", "Lifeguard", "Overnight Stocker", "Server", "Seasonal Associate"])
    assert.equal(kindOf(t), "hourly", t);
  for (const t of ["Store Manager", "Shift Supervisor", "Senior Sales Associate", "CDL-A Truck Driver", "Assistant Store Manager", "Server Administrator", "SQL Server Developer", "Network Security Officer", "Software Engineer"])
    assert.equal(kindOf(t), null, t);
  assert.equal(kindOf("Medical Assistant"), "fulltime", "entry-level stays entry-level");
  assert.equal(kindOf("Sales Associate Intern"), "intern");
  assert.ok(!isHourlyRole("Pharmacy Technician"));
  const { parse } = await import("../api/listings.js");
  const p = parse({ kind: "hourly", q: "Medical  assistant!! dc" });
  assert.equal(p.errs.length, 0); assert.deepEqual(p.words, ["medical", "assistant", "dc"]);
  assert.ok(parse({ kind: "career" }).errs.length === 0 && parse({ kind: "nope" }).errs.length === 1);
  console.log("✓ part-time & hourly: cashier/barista/warehouse kept as hourly, managers/CDL/IT 'server' out; server-side word search parses safely");
}
