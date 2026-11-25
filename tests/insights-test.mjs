// Nov 25: the analyst bots (lib/insights.js → scripts/insights.mjs → /bots Insights). Offline: small made-up maps and feeds.
import assert from "node:assert/strict";
import fs from "node:fs";
import { miles, stateCoverage, jobDeserts, collegeGaps, pipeline, bucketOf, missingBig, sourceOf, ONLINE, BUCKETS } from "../lib/insights.js";
import { BOTS, STALE_MIN, RESTART } from "../lib/bots.js";

// distance sanity: Blacksburg → Roanoke ≈ 28 mi
assert.ok(Math.abs(miles(37.2296, -80.4139, 37.271, -79.9414) - 26) < 4);

// ── state coverage: each dot goes to its nearest county's state; foreign/offshore dots are skipped ──
const counties = [
  ["1", "Big County", "AA", 1_000_000, 40, -100],
  ["2", "Small County", "AA", 100_000, 40, -99],
  ["3", "Next County", "BB", 500_000, 40, -97],
  ["4", "Lonely County", "CC", 300_000, 30, -90],      // far from every job
];
const dot = (lat, lng, n) => [0, 0, n, lat, lng];
const dots = {
  all: [dot(40.01, -100.01, 100), dot(40, -97.1, 50), dot(10, 10, 999)],   // the last one is nowhere near the US
  intern: [dot(40.01, -100.01, 10)], fulltime: [dot(40, -97.1, 30)], hourly: [],
};
const cov = stateCoverage(dots, counties);
const S = Object.fromEntries(cov.states.map((s) => [s[0], s]));
assert.deepEqual(S.AA, ["AA", 1_100_000, 100, 10, 0, 0]);
assert.deepEqual(S.BB, ["BB", 500_000, 50, 0, 30, 0]);
assert.equal(S.CC[2], 0);
assert.equal(cov.unplaced, 999);
assert.equal(cov.national.all, 150);

// ── job deserts: lowest jobs-per-person first, one row per area, a big job center just past the line doesn't count ──
const d = jobDeserts(dots.all, counties, { radius: 30, minPop: 100000, top: 5 });
assert.equal(d[0][0], "Lonely County");                  // 0 jobs near 300k people
assert.equal(d[0][3], 0);
const twins = jobDeserts([], [["5", "Twin A", "FF", 400_000, 35, -85], ["6", "Twin B", "FF", 300_000, 35, -85.1]], { radius: 30, minPop: 100000 });
assert.deepEqual(twins.map((r) => r[0]), ["Twin A"], "two counties 6 mi apart = one row (the bigger one)");
assert.ok(miles(40, -100, 40, -99.4) > 30 && miles(40, -100, 40, -99.4) < 45);
const edge = jobDeserts([dot(40, -99.4, 5000)], [["9", "Suburb", "DD", 200_000, 40, -100], ["8", "Far Town", "EE", 150_000, 35, -80]], { radius: 30, minPop: 100000 });
assert.ok(!edge.some((r) => r[0] === "Suburb"), "5,000 jobs ~32 mi away, just past the circle → Suburb isn't a desert");
assert.equal(edge[0][0], "Far Town");

// ── colleges: located by city, mostly-online schools left out, fewest internships per graduate first ──
const places = { AA: { bigtown: [40, -100] }, CC: { quiet: [30, -90] } };
const schools = [
  [1, "Big State University", "", "Bigtown", "AA", 10000],
  [2, "Quiet College", "", "Quiet", "CC", 3000],
  [3, "Western Governors University", "", "Bigtown", "AA", 50000],
  [4, "Tiny College", "", "Quiet", "CC", 100],          // under minGrads
  [5, "Nowhere Tech", "", "Atlantis", "ZZ", 5000],       // city not found
];
const cg = collegeGaps(dots.intern, schools, places, { radius: 50, minGrads: 2000 });
assert.deepEqual(cg.rows.map((r) => r[0]), ["Quiet College", "Big State University"]);
assert.equal(cg.rows[1][4], 10);
assert.equal(cg.skipped, 1);
assert.ok(ONLINE.test("Southern New Hampshire University") && !ONLINE.test("University of New Hampshire-Main Campus"));

// ── Unlock Finder: every stuck company in exactly one bucket ──
const feed = [
  { company: "Acme", status: "live", source: "Board Scout (workday)", verified_at: new Date().toISOString() },
  { company: "Old Live", status: "live", source: "Backlog", verified_at: "2026-01-01T00:00:00Z" },
  { company: "Pay Co", status: "identity_failed", hint: "https://recruiting.paylocity.com/recruiting/jobs/All/11111111-2222-3333-4444-555555555555", source: "Board Scout (paylocity)" },
  { company: "Ukg Co", status: "identity_failed", hint: "https://recruiting2.ultipro.com/ABC/JobBoard/11111111-2222-3333-4444-555555555555", source: "Board Scout (ukg)" },
  { company: "Gh Co", status: "identity_failed", hint: "https://boards.greenhouse.io/ghco", source: "Backlog" },
  { company: "Dead Co", status: "board_error", detail: "Ashby board \"dead\" answered 404", source: "Backlog" },
  { company: "Busy Co", status: "board_error", detail: "Workday x/y answered 429", source: "Wanted list" },
  { company: "Empty Co", status: "board_error", detail: "Greenhouse board looks like Empty Co but returned no jobs", source: "Backlog" },
  { company: "Paycom Co", status: "unsupported", detail: "Uses Paycom, needs a new scraper", source: "Wanted list" },
  { company: "Sf Co", status: "unsupported", detail: "Uses SuccessFactors (native) — needs a new scraper", source: "Wanted list" },
  { company: "Shop", status: "no_board", detail: "Couldn't reach a careers page", source: "v1 salvage (OpenStreetMap)" },
  { company: "Real Co", status: "no_board", detail: "Careers pages load but link to no job system we recognize", source: "VT Expo 2026" },
  { company: "Wall Co", status: "blocked", source: "Wanted list" },
  { company: "Name Only", status: "no_domain", source: "Adzuna" },
  { company: "Dup", status: "duplicate", source: "Backlog" },
];
const want = { "Pay Co": "payroll", "Ukg Co": "payroll", "Gh Co": "unproven", "Dead Co": "dead", "Busy Co": "busy", "Empty Co": "empty", "Paycom Co": "reader",
  "Sf Co": "reader", Shop: "local", "Real Co": "noboard", "Wall Co": "blocked", "Name Only": "nosite", Acme: null, Dup: null };
for (const r of feed) if (r.company in want) assert.equal(bucketOf(r), want[r.company], r.company);
const p = pipeline(feed);
assert.equal(p.counts.live, 2);
assert.equal(p.live7d, 1);
assert.equal(p.counts.duplicate, undefined, "duplicates aren't counted");
assert.deepEqual(Object.fromEntries(p.stuck.map((s) => [s[0], s[2]])), { payroll: 2, unproven: 1, dead: 1, busy: 1, empty: 1, reader: 2, noboard: 1, blocked: 1, nosite: 1, local: 1 });
assert.deepEqual(p.readers.sort(), [["Paycom", 1], ["SuccessFactors", 1]]);
assert.deepEqual(Object.fromEntries(p.unprovenBy), { Paylocity: 1, UKG: 1, Greenhouse: 1 });
assert.ok(BUCKETS.every((b) => b.length === 4 && b[1] && b[2] && b[3]), "every bucket says what's wrong, the fix and who");
assert.equal(sourceOf("VT Construction Fair Spring 2026"), "VT Construction Fair");
assert.equal(sourceOf("Board Scout (paylocity)"), "Board Scout");

// ── Missing big employers: exact, prefix (≥ 6 letters) and hand-verified names count as ours ──
const simplify = [
  ...Array(5).fill({ company_name: "Meta", active: true }), ...Array(3).fill({ company_name: "L3Harris Technologies", active: true }),
  ...Array(2).fill({ company_name: "Acme Inc.", active: true }), { company_name: "Navy Federal", active: true }, { company_name: "Closed Co", active: false },
  ...Array(4).fill({ company_name: "Real Co", active: true }),
];
const rows2 = [...feed, { company: "Navy Federal Credit Union", status: "live" }, { company: "Metabolic Labs", status: "live" }];
const mb = missingBig(simplify, rows2, { handVerified: ["L3Harris", "RTX (Raytheon / Collins / Pratt)"] });
assert.equal(mb.companies, 5);                            // the inactive one isn't counted
assert.deepEqual(mb.missing, [["Meta", 5, null], ["Real Co", 4, "no_board"]], "Meta ≠ Metabolic (too short to prefix-match)");
assert.equal(mb.live, 3);                                 // L3Harris (hand-verified prefix), Acme, Navy Federal (prefix)

// ── the bots are registered, watched and restartable ──
for (const id of ["gaps", "unlock"]) {
  assert.ok(BOTS.some((b) => b.id === id), id);
  assert.ok(STALE_MIN[id] >= 24 * 60, id);
  assert.equal(RESTART[id], "insights.yml");
}
const page = fs.readFileSync(new URL("../bots/index.html", import.meta.url), "utf8");
assert.ok(/gaps: 30 \* 60, unlock: 30 \* 60/.test(page) && /insightsHtml\(d\)/.test(page), "/bots shows them");
const wf = fs.readFileSync(new URL("../.github/workflows/insights.yml", import.meta.url), "utf8");
assert.ok(/scripts\/insights\.mjs/.test(wf) && /contents: read/.test(wf), "workflow runs the script and can't write to the repo");
const api = fs.readFileSync(new URL("../api/discovery.js", import.meta.url), "utf8");
assert.ok(/BIG_STATS = new Set\(\["gaps", "unlock"\]\)/.test(api), "older reports trimmed so /bots stays light");
const cty = JSON.parse(fs.readFileSync(new URL("../data/us-counties.json", import.meta.url), "utf8"));
assert.ok(cty.rows.length > 3000 && new Set(cty.rows.map((r) => r[2])).size === 51, "50 states + DC");

console.log("insights tests passed");
