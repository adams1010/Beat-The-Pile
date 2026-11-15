// Nov 15: more kinds of jobs — golf courses & clubs, pools, events, resorts, parks, coaching, childcare, pets (part-time
// & hourly) and a new "Shadowing & volunteer" kind (job shadowing, observerships, volunteer roles; often unpaid).
import assert from "node:assert/strict";
const { kindOf, fieldOf, isShadowRole, isHourlyRole, isKept, EARLY_QUERIES } = await import("../lib/fields.js");
const { inCategory } = await import("../lib/categories.js");

// Part-time & hourly: kept, and filed in the right area
const hourly = {
  "Caddie": "hospitality", "Forecaddie": "hospitality", "Cart Attendant": "hospitality", "Bag Room Attendant": "hospitality",
  "Outside Services Attendant": "hospitality", "Golf Course Maintenance Crew Member": "hospitality", "Golf Shop Associate": "hospitality",
  "Pro Shop Associate": "hospitality", "Starter/Ranger": "hospitality", "Beverage Cart Attendant": "hospitality", "Groundskeeper": "hospitality",
  "Pool Attendant": "hospitality", "Banquet Server": "hospitality", "Event Staff": "hospitality", "Ride Operator": "hospitality",
  "Lift Operator": "hospitality", "Ski Instructor": "hospitality", "Youth Soccer Coach": "hospitality", "Referee": "hospitality",
  "Tour Guide": "hospitality", "Marina Dockhand": "hospitality",
  "Nanny": "education_social", "Child Watch Attendant": "education_social",
  "Kennel Attendant": "science_health", "Dog Bather": "science_health", "Pet Care Associate": "science_health",
  "Mover": "supply_chain", "Brand Ambassador": "marketing",
};
for (const [t, f] of Object.entries(hourly)) { assert.equal(kindOf(t), "hourly", "part-time: " + t); assert.equal(fieldOf(t), f, "area: " + t); }

// Careers at the same places are NOT part-time
for (const t of ["Golf Course Superintendent", "PGA Golf Professional", "Head Golf Professional", "Banquet Manager", "Event Staff Accountant",
  "Landscape Technician", "Assistant Golf Course Superintendent", "Kennel Supervisor"]) assert.notEqual(kindOf(t), "hourly", "not part-time: " + t);

// Shadowing & volunteer
const shadow = ["Job Shadow - Nursing", "Job Shadowing Program", "Physician Shadowing", "Clinical Observership", "Volunteer - Patient Escort",
  "Hospital Volunteer", "Pre-Med Volunteer", "Pre-PA Shadowing", "Summer Volunteer Program", "Career Exploration Program", "Shadow Day"];
for (const t of shadow) { assert.ok(isShadowRole(t), "shadow: " + t); assert.equal(kindOf(t), "shadow", t); assert.ok(isKept(t), t); }
// Staff jobs that run the programs, and internships, are not shadowing
for (const t of ["Volunteer Coordinator", "Volunteer Services Manager", "Director of Volunteer Services", "Volunteer Engagement Specialist",
  "Shadow IT Analyst", "Volunteer Program Lead"]) assert.ok(!isShadowRole(t), "not shadow: " + t);
assert.equal(kindOf("Volunteer Services Intern"), "intern", "internships stay internships");
assert.equal(kindOf("Medical Assistant"), "fulltime", "entry-level stays entry-level");
assert.equal(kindOf("Cashier"), "hourly", "existing part-time stays");

// The readers search for them
for (const q of ["golf", "seasonal", "shadow", "volunteer"]) assert.ok(EARLY_QUERIES.includes(q), "searched: " + q);

// Categories
assert.ok(inCategory("fitness", { title: "Caddie", field: "hospitality" }), "golf jobs in Golf, Sports & Recreation");
assert.ok(inCategory("fitness", { title: "Golf Shop Associate", field: "hospitality" }));
assert.ok(inCategory("pets", { title: "Kennel Attendant", field: "science_health" }), "pet jobs in Pets & Animal Care");
assert.ok(!inCategory("pets", { title: "Software Engineer", field: "software" }));

// The sync keeps them with the right kind (fetchCompany)
const board = { jobs: [
  { id: 1, title: "Caddie", location: { name: "Pinehurst, NC" }, absolute_url: "https://x/1" },
  { id: 2, title: "Job Shadow - Physical Therapy", location: { name: "Richmond, VA" }, absolute_url: "https://x/2" },
  { id: 3, title: "Volunteer Coordinator", location: { name: "Richmond, VA" }, absolute_url: "https://x/3" },
  { id: 4, title: "Software Engineer Intern", location: { name: "Austin, TX" }, absolute_url: "https://x/4" } ] };
globalThis.fetch = async () => ({ ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => board, text: async () => JSON.stringify(board) });
const { fetchCompany } = await import("../lib/fetchers/index.js");
const { listings } = await fetchCompany({ id: "g-test", ats: "greenhouse", token: "test", company: "Test Co" });
const kinds = Object.fromEntries(listings.map((l) => [l.title, l.kind]));
assert.deepEqual(kinds, { "Caddie": "hourly", "Job Shadow - Physical Therapy": "shadow", "Software Engineer Intern": "intern" }, "kept with the right kind; staff jobs dropped");
console.log("✓ more jobs: golf, recreation, childcare, pets (part-time) + Shadowing & volunteer kind, categories, sync keeps them");
