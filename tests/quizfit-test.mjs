// Match quiz fit score (Nov 15): real signals only, same answer every time
import assert from "node:assert/strict";
const { majorWords, fitOf, classYearAt } = await import("../lib/quizfit.js");
const now = Date.parse("2026-11-15T12:00:00Z");
const ctx = (major, extra = {}) => ({ words: majorWords(major), majorLabel: major, fields: ["mechanical", "engineering"], skills: [], year: 3, term: "Summer 2027", now, ...extra });
const L = (title, extra = {}) => ({ title, field: "mechanical", mi: 20, first_seen: "2026-11-12T00:00:00Z", ...extra });

const me = ctx("Mechanical Engineering");
const a = fitOf(L("Mechanical Engineering Intern - Summer 2027"), me), b = fitOf(L("Software Engineering Intern"), me);
assert.ok(a.fit > b.fit, "title that names the major ranks higher");
assert.ok(a.why.includes("Title fits Mechanical Engineering") && a.why.includes("For Summer 2027") && a.why.includes("20 mi away") && a.why.includes("New this week"), a.why.join(" | "));
assert.deepEqual(fitOf(L("Mechanical Intern"), me), fitOf(L("Mechanical Intern"), me), "deterministic: no randomness");
assert.ok(fitOf(L("Mechanical Intern", { mi: 5 }), me).fit > fitOf(L("Mechanical Intern", { mi: 80 }), me).fit, "closer ranks higher");
assert.ok(fitOf(L("Freshman Engineering Intern"), me).fit < fitOf(L("Engineering Intern"), me).fit, "asks for a different class year → lower");
assert.ok(fitOf(L("Rising Junior Mechanical Intern"), me).why.includes("Open to your class year"));
assert.ok(fitOf(L("SolidWorks Design Intern"), ctx("Mechanical Engineering", { skills: ["SolidWorks"] })).why.some((w) => /SolidWorks/.test(w)));
const kin = ctx("Exercise Science / Kinesiology", { fields: ["exercise_sport", "science_health"] });
assert.ok(fitOf(L("Strength & Conditioning Intern", { field: "exercise_sport" }), kin).fit > fitOf(L("Pharmacy Intern", { field: "science_health" }), kin).fit, "kinesiology: strength coach beats pharmacy");
assert.ok(!fitOf(L("Italian Translation Intern"), ctx("Computer Science")).why.some((w) => /Title fits/.test(w)), "short words (it) must stand alone");
assert.equal(classYearAt("May 2028", "Summer 2027"), 4, "rising senior"); assert.equal(classYearAt("May 2029", "Summer 2027"), 3, "rising junior"); assert.equal(classYearAt("Graduate Student", "Summer 2027"), 5);
assert.equal(classYearAt("May 2030", "Summer 2027"), 2, "rising sophomore");
console.log("✓ quiz fit: title vs major, skills, class year, term, distance, freshness; deterministic");
const { FEATURES } = await import("../api/generate.js");
assert.throws(() => FEATURES.fit_grade({ resume: "short", jobs: [{ role: "x", name: "y" }] }));
const fg = FEATURES.fit_grade({ resume: "x".repeat(200), major: "ME", jobs: [{ role: "Mechanical Intern", name: "Boeing" }] });
assert.ok(/Never invent/.test(fg.prompt) && /1\. Mechanical Intern at Boeing/.test(fg.prompt) && fg.temperature === 0);
console.log("✓ fit_grade: needs a resume, copy-only, deterministic");
