// Nov 14: program names students say (lib/majornames.js) + bachelor's-only lists in the school build
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { cleanMajorName } = await import("../lib/majornames.js");
const cases = [
  ["Biology / Biological Sciences", "26.0101", "Biology"], ["Registered Nursing / Registered Nurse", "51.3801", "Nursing (RN)"],
  ["Pharmacy", "51.2001", "Pharmacy"], ["Respiratory Care Therapy / Therapist", "", "Respiratory Care Therapy"],
  ["Cell / Cellular Biology and Anatomical Sciences, Other", "", "Other Cellular Biology and Anatomical Sciences"],
  ["Theatre / Theatre Arts Management", "", "Theatre Arts Management"], ["Psychology, Other", "", "Other Psychology"],
  ["Prosthodontics / Prosthodontology", "", "Prosthodontics"], ["Mechanical Engineering", "14.1901", "Mechanical Engineering"],
  ["Accounting and Finance", "", "Accounting and Finance"],
];
for (const [t, c, want] of cases) assert.equal(cleanMajorName(t, c), want, t);
for (const [t, c, want] of cases) assert.equal(cleanMajorName(cleanMajorName(t, c), c), want, "same answer twice: " + t);
const cip = JSON.parse(readFileSync(new URL("../schools/cip.json", import.meta.url)));
assert.equal(cip["26.0101"], "Biology"); assert.ok(!Object.values(cip).some((n) => /, General$/.test(n)));
const build = readFileSync(new URL("../scripts/build-schools.mjs", import.meta.url), "utf8");
assert.ok(build.includes("cleanMajorName") && /L\[5\]\.size \? L\[5\]/.test(build), "school build: clean names + bachelor's-only lists");
console.log("✓ major names: " + cases.length + " cases, schools/cip.json cleaned, school build keeps bachelor's majors only");
