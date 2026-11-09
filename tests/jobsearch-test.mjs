// /jobs search (jobs/search.js): every word on its own, cousins, typos, and "similar roles" so a search is never a dead end.
import assert from "node:assert/strict";
await import("../jobs/search.js");
const { rank, parse } = globalThis.btpJobSearch;
let n = 0; const J = (title, company, location = "Richmond, VA", field = "") => ({ id: "j" + ++n, title, company, location, field });
const jobs = [
  J("Sales Intern", "Stryker", "Kalamazoo, MI", "sales"),
  J("Medical Device Sales Internship", "Acme Ortho", "Austin, TX", "sales"),
  J("Business Development Intern - Healthcare", "Cerner Partners", "Kansas City, MO", "sales"),
  J("Sales Intern", "Google", "New York, NY", "sales"),
  J("Clinical Research Intern", "Duke Health", "Durham, NC", "science_health"),
  J("Mechanical Engineering Intern", "Boeing", "Arlington, VA", "mechanical"),
  J("Software Engineer Intern", "Capital One", "McLean, VA", "software"),
  J("Marketing Intern", "Media Co", "Richmond, VA", "marketing"),
];
const t = (r) => r.map((j) => j.company);
let r = rank(jobs, "medical sales", { minExact: 50 });
assert.deepEqual(t(r.exact).sort(), ["Acme Ortho", "Cerner Partners", "Stryker"].sort(), "medical sales: direct, cousin (business development + healthcare), medical company");
assert.ok(t(r.similar).includes("Google") && t(r.similar).includes("Duke Health"), "plain sales + clinical roles come as similar");
assert.ok(!t(r.similar).includes("Boeing"), "unrelated roles never show");
assert.equal(t(r.similar)[0] !== "Media Co", true, "a 'Media' company is not medical");
r = rank(jobs, "mechanical enginering internship");
assert.deepEqual(t(r.exact), ["Boeing"], "typo + stop word");
r = rank(jobs, "software VA");
assert.deepEqual(t(r.exact), ["Capital One"], "place counts");
r = rank(jobs, "mech");
assert.deepEqual(t(r.exact), ["Boeing"], "word start");
r = rank(jobs, "sales", { minExact: 2 });
assert.equal(r.similar.length, 0, "enough exact results → no similar list");
r = rank(jobs, "");
assert.equal(r.exact.length, jobs.length, "empty search = everything, same order");
r = rank(jobs, "internship");
assert.ok(parse("internship"), "a search of only common words still searches them");
// live-data catches (probe Nov 9): "sales" ≠ "Winston Salem"; a cousin can't stand in for another word you typed
const live = [J("Health Care Administration Intern, Winston Salem", "Advocate Health"), J("Research Intern", "Federal Reserve"), J("Biology Research Intern", "Merck"), J("Medical Sales Intern", "Zeta")];
r = rank(live, "medical sales", { minExact: 50 });
assert.deepEqual(t(r.exact), ["Zeta"], "Salem is not sales");
r = rank(live, "biology research", { minExact: 50 });
assert.deepEqual(t(r.exact), ["Merck"]);
r = rank(jobs.concat(live), "medical sales", { minExact: 50 });
assert.deepEqual(t(r.exact).slice(0, 2).sort(), ["Acme Ortho", "Zeta"], "titles that say both words come first");
assert.ok(t(r.exact).indexOf("Stryker") > 1, "then medical companies' sales roles");
assert.ok(rank([J("Behavioral Health Intern", "X")], "psychology").exact.length, "psychology finds behavioral health");
console.log("✓ job search: words, cousins, medical companies, typos, places, similar roles, nothing unrelated");
