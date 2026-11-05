// Location cleanup + non-intern filter
import assert from "node:assert/strict";
const { cleanLocation, extractStates } = await import("../lib/filter.js");
const { isInternship } = await import("../lib/fields.js");
assert.equal(cleanLocation("Chicago, IL, US, 60601 +1 more&hellip;"), "Chicago, IL, US, 60601 +1 more");
assert.equal(cleanLocation("AT&amp;T Plaza, Dallas, TX"), "AT&T Plaza, Dallas, TX");
assert.equal(cleanLocation("Berlin, Berlin, Germany | New York, New York, United States"), "New York, New York, United States | Berlin, Berlin, Germany", "US site first");
assert.equal(cleanLocation(null), "");
assert.deepEqual(extractStates("Krakow, MA, PL, 30-701"), [], "Poland is not Massachusetts");
assert.deepEqual(extractStates("Pune, MH, IN, 411001"), [], "India is not Indiana");
assert.deepEqual(extractStates("Indianapolis, IN, US"), ["IN"]);
assert.deepEqual(extractStates("Crane, IN, Indiana, United States"), ["IN"]);
for (const t of ["Apprentice Piercer", "Driver Apprentice-City", "Apprentice General Manager", "Apprentice Electrician"]) assert.equal(isInternship(t), false, t);
for (const t of ["Pharmacy Intern", "Construction Project Manager Intern (Summer 2027)", "Summer Analyst 2027", "Mechanical Co-op"]) assert.equal(isInternship(t), true, t);
console.log("✓ locations cleaned, foreign codes dropped, trade apprenticeships filtered");
