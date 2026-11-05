// Every major the homepage quiz offers maps to real internship fields (or null = all majors, only for "Other").
import assert from "node:assert/strict";
import fs from "node:fs";
const { fieldsForMajor } = await import("../lib/geo.js");
const { FIELDS } = await import("../lib/fields.js");
const keys = new Set([...FIELDS.map(([k]) => k), "other"]);
const src = fs.readFileSync(new URL("../src/home.jsx", import.meta.url), "utf8");
const majors = JSON.parse(src.match(/const MAJORS=(\[[^\]]+\])/)[1]);
const none = [];
for (const m of majors) { const f = fieldsForMajor(m); if (!f) { none.push(m); continue; } for (const k of f) assert.ok(keys.has(k), `${m} → unknown field ${k}`); }
assert.deepEqual(none, ["Other"], "only 'Other' falls back to every major");
const has = (m, k) => fieldsForMajor(m).includes(k);
assert.ok(has("Mechanical Engineering", "mechanical") && has("Mechanical Engineering", "engineering"));
assert.ok(has("Finance", "finance") && has("Accounting", "finance") && has("Economics", "finance"));
assert.ok(has("Marketing", "marketing") && has("Journalism", "marketing") && has("Business Administration", "consulting"));
assert.ok(has("Computer Science", "software") && has("Data Science", "data") && has("Cybersecurity", "cyber_it"));
assert.ok(has("Nursing", "science_health") && has("Biology", "science_health") && has("Psychology", "people_hr"));
assert.ok(has("Political Science", "legal_policy") && has("Education", "education_social") && has("Graphic Design", "product_design"));
assert.ok(!has("Finance", "mechanical") && !has("Nursing", "software") && !has("Marketing", "civil"), "no cross-wiring");
console.log(`✓ all ${majors.length} quiz majors map to real internship fields`);
