// Nov 12: health / education majors — student roles posted without the word "intern" (real titles from 15 hospital
// Workday boards, probed Nov 12 2026), and staff jobs that only mention students stay out.
import assert from "node:assert/strict";
const { isInternship, isStudentRole, fieldOf, kindOf, INTERN_PG } = await import("../lib/fields.js");
const keep = {
  "Radiology Student Tech": "science_health", "Nursing Student PACE Program": "science_health",
  "Physical Therapy Student Knowledge Program": "exercise_sport", "PRN Nurse Extern / PRN Nursing Assistant": "science_health",
  "Student Nurse Tech (Level 3 and Level 4 Nursing Students) | Part-Time": "science_health",
  "Nurse Technician (Level 1 and Level 2 Nursing Students) | Float Pool": "science_health",
  "Laboratory Student- South Laboratory": "science_health", "Student Tech - Respiratory Care - PRN": "science_health",
  "Student Radiology Technologist": "science_health", "Student Diagnostic Technologist": "science_health",
  "Occupational Therapy Fieldwork Level II": "exercise_sport", "DPT Clinical Rotation": "science_health",
  "Student Teacher": "education_social", "Counseling Practicum Student": "education_social",
  "Social Work Students - MSW Field Placement": "education_social",
};
for (const [t, f] of Object.entries(keep)) { assert.ok(isInternship(t), `keep: ${t}`); assert.equal(kindOf(t), "intern"); assert.equal(fieldOf(t), f, t); }
for (const t of ["Radiologic Technologist - This position is for Clinical Instruction for Radiology Students", "Student Services Coordinator",
  "Director of Student Affairs", "Clinical Staff Pharmacist, Day -Evening Rotation", "Lead Teacher", "Hospital Teacher/School Liasion",
  "Nurse Aide Certified - Home Care, Full-Time Days/Evening Rotation", "Medical Student Rotation", "Nursing Instructor - Students", "Student Financial Services Specialist"])
  assert.ok(!isInternship(t), `drop: ${t}`);
assert.ok(isStudentRole("Student Nurse") && !isStudentRole("Registered Nurse"));
// Postgres side (kind=intern on /api/listings) matches every kept title
const pg = new RegExp(INTERN_PG.replace(/\\y/g, "\\b"), "i");
for (const t of Object.keys(keep)) assert.ok(pg.test(t), `INTERN_PG: ${t}`);
// Legal Aid "Reentry Justice Project" is social impact, not a missile reentry vehicle
assert.equal(fieldOf("Reentry Justice Project Intern"), "education_social");
assert.equal(fieldOf("Reentry Vehicle Engineering Intern"), "mechanical");
console.log("✓ student roles (nursing, PT/OT, radiology, teaching, practicum) count; staff jobs about students don't");

// Nov 13: exercise science / kinesiology majors get their own area, with entry-level clinic / gym / sports jobs
{ const X = { "Physical Therapy Aide": "fulltime", "Rehab Tech": "fulltime", "Exercise Physiologist": "fulltime", "Personal Trainer": "fulltime",
    "Strength and Conditioning Intern": "intern", "Sports Performance Intern": "intern", "Kinesiology Intern": "intern", "Athletic Training Student": "intern" };
  for (const [t, k] of Object.entries(X)) { assert.equal(fieldOf(t), "exercise_sport", t); assert.equal(kindOf(t), k, t); }
  assert.equal(fieldOf("Fitness App Software Engineer Intern"), "software"); assert.equal(fieldOf("Registered Nurse New Grad"), "science_health");
  console.log("✓ exercise science: PT/rehab aides, trainers, strength & conditioning, sports performance"); }
