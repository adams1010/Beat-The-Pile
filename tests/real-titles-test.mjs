import assert from "node:assert/strict";
const { classify, extractState } = await import("../lib/filter.js");
const { findInternFacets } = await import("../lib/fetchers/workday.js");
// [title, expected]  — all seen live on Oct 31 / Nov 1 2026
const T = [
 ["2027 Future Talent Program – Manufacturing and Reliability Engineering Co-Op","me"],
 ["2027 Future Talent Program - Global Workplace & Enterprise Services - West Point Engineering - Co-op","general"],
 ["2027 Future Talent Program – Vaccine Manufacturing Automation Co-op","me"],
 ["2027 Future Talent Program - Vaccine Manufacturing Co-op","me"],
 ["2027 Future Talent Program - Manufacturing Strategy, Business Development and Alliances (MSBDA) Intern",null],
 ["2027 Future Talent Program – Manufacturing Science and Technology Intern","me"],
 ["Intern - Systems Engineer – New Kensington, PA – Summer 2027","general"],
 ["Co-op – Data Engineer (Biocompatibility) – Murrysville, PA – January to June 2027",null],
 ["Co-op -Embedded Test Engineer - Murrysville, PA-January-June 2027",null],
 ["Co-op-Industrial Engineering-Reedsville, PA-(January to June 2027)","general"],
 ["Manufacturing Electrical Engineering Co-Op (Spring/Summer 2027)","general"],
 ["Industrial Engineering Co-Op (Summer/Fall 2027)","general"],
 ["Mechanical Engineering Intern (Summer 2027)","me"],
 ["Co-op - Manufacturing Engineering - Latham, NY - January-August 2027","me"],
 ["Co-op - Manufacturing Engineering - Murrysville, PA - January-June 2027","me"],
 ["Co-op-Data Engineering-Reedsville, PA-July-December 2027",null],
 ["DePuy Synthes Supply Chain Engineering Co-Op",null],
 ["AI/ML/Data Science Intern",null],
 ["TDS Proteins Cell Line Engineering Co-Op",null],
 ["Software Engineering Intern (Summer 2027)",null],
 ["Mechanical Analysis Intern","me"],
 ["Engineering Intern - Virginia (Summer 2027)","general"],
 ["Welding Engineering Intern - Virginia (Summer 2027)","general"],
 ["Systems Engineering Intern","general"],
 ["Summer Intern - Manufacturing Quality Engineering","me"],
 ["Intern: Manufacturing Engineer Cab Factory (Spring 2027)","me"],
 ["MECHANICAL ENGINEER SKILLBRIDGE INTERN (PLANT OPERATIONS",null],
 ["Boeing Summer 2027 Internship Program (Paid) – Security & Fire Operation (S&FO)",null],
 ["Sustainability Intern – Global Real Estate & Facilities - 12 Month Placement",null],
 ["2027 Intern Product Support – Data Scientist",null],
 ["Mechanical/Electrical/Structural Engineering Intern","me"],
];
let bad = 0;
for (const [t, want] of T) { const got = classify(t); if (got !== want) { bad++; console.log(`✗ got ${got} want ${want}: ${t}`); } }
console.log(bad ? `${bad} mismatches` : `filter: all ${T.length} real titles ✓`);

for (const [loc, st] of [["USA - Pennsylvania - West Point","PA"],["Murrysville, Pennsylvania, United States","PA"],["US-VA-STERLING-291 ~ 22640 Davis Dr ~ DAVIS","VA"],["United States-Virginia-Dulles","VA"],["United States-California-Redondo Beach","CA"],["Spring House, Pennsylvania, United States of America","PA"]])
  assert.equal(extractState(loc) ?? null, st, loc);
console.log("locations ✓");

// Facet shapes seen live (RTX/J&J/Northrop) incl. the two traps
const facets = [
 {facetParameter:"workerSubType", values:[{descriptor:"Intern/Co-op (Fixed Term)",id:"A"},{descriptor:"Regular (Global)",id:"X"},{descriptor:"Fixed Term Employee (Non-Intern) (Fixed Term)",id:"TRAP1"},{descriptor:"Co-Op (Fixed Term)",id:"B"}]},
 {facetParameter:"locationMainGroup", values:[{facetParameter:"locations", values:[{descriptor:"VN-HN-HANOI-NOIBAI AIRPORT ~ Noibai International Airport",id:"TRAP2"}]}]},
 {facetParameter:"jobFamilyGroup", values:[{descriptor:"EA Trainees, Interns and Apprentices",id:"C"}]},
];
assert.deepEqual(findInternFacets(facets), { workerSubType:["A","B"], jobFamilyGroup:["C"] });
console.log("intern facet finder ✓ (skips 'Non-Intern' and 'International Airport')");
