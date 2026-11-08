// Find talent: only opted-in public profiles, filters work, nothing private leaks; employer-only at the API.
import assert from "node:assert/strict";
const { searchTalent } = await import("../lib/talent.js");
const P = (h, extra = {}, pub = true) => ({ clerk_user_id: "user_" + h, handle: h, profile_public: pub,
  profile: { name: h.toUpperCase(), school: "Virginia Tech", major: "Mechanical Engineering", gradYear: 2027, openToEmployers: true, skills: ["SolidWorks"], ...extra } });
const rows = [
  P("ana", { skills: ["SolidWorks", "FEA"], experience: [{ title: "Intern", org: "Lockheed Martin" }] }),
  P("ben", { major: "Finance", skills: ["Excel", "Financial modeling"] }),
  P("cal", { school: "Virginia Polytechnic Institute and State University", gradYear: 2028 }),
  P("dee", { openToEmployers: false }),          // public, but did NOT opt in → never listed
  P("eve", {}, false),                            // opted in but profile private → never listed
];
let r = searchTalent(rows, {});
assert.deepEqual(r.results.map((c) => c.handle).sort(), ["ana", "ben", "cal"], "only public + opted in");
assert.deepEqual(searchTalent(rows, { major: "mechanical engineering" }).results.map((c) => c.handle).sort(), ["ana", "cal"]);
assert.deepEqual(searchTalent(rows, { q: "financial modeling" }).results.map((c) => c.handle), ["ben"]);
assert.deepEqual(searchTalent(rows, { school: "Virginia Tech", gradYear: 2028 }).results.map((c) => c.handle), ["cal"]);
assert.equal(searchTalent(rows, { q: "lockheed" }).results[0].handle, "ana", "experience org is searchable");
const all = JSON.stringify(r);
assert.ok(!all.includes("user_") && !/dee|DEE|eve|EVE/.test(all), "no ids, no non-consenting students");
assert.ok(!("openToEmployers" in r.results[0]), "cards don't echo settings");

// API: a student account gets 403
process.env.INTERNIQ_DB_URL = "https://fake.supabase.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "svc"; process.env.INTERNIQ_DB_ANON_KEY = "anon"; process.env.CLERK_SECRET_KEY = "sk";
const { roleOf } = await import("../lib/talent.js");
globalThis.fetch = async (u) => ({ ok: true, json: async () => ({ unsafe_metadata: { role: String(u).includes("emp") ? "employer" : "student" } }) });
assert.equal(await roleOf("user_emp1"), "employer"); assert.equal(await roleOf("user_stu1"), "student");
globalThis.fetch = async () => ({ ok: true, json: async () => ({ unsafe_metadata: { role: "admin" } }) });
assert.equal(await roleOf("user_x"), null, "only student/employer are roles");
console.log("✓ talent: opt-in + public only, major/school/year/keyword filters, no ids or settings leak, roles read from Clerk");
