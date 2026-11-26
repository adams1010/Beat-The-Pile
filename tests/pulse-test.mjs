// Hiring Pulse (Nov 26): this week's counts from open listings + a daily history.
import assert from "node:assert/strict";
const { buildPulse, addHistory } = await import("../scripts/pulse.mjs");

const now = Date.parse("2026-11-26T12:00:00Z"), d = (days) => new Date(now - days * 864e5).toISOString();
const rows = [
  { id: "a:1", company_id: "a", company: "Acme", title: "Software Intern Summer 2027", kind: "intern", field: "software", state: "CA", first_seen: d(1), geo_kind: "place" },
  { id: "a:2", company_id: "a", company: "Acme", title: "Data Intern", kind: "intern", field: "data", state: "CA,NY", first_seen: d(2), geo_kind: "remote" },
  { id: "b:1", company_id: "b", company: "Bolt", title: "Marketing Intern Fall 2027", kind: "intern", field: "marketing", state: "VA", first_seen: d(10), geo_kind: "place" },
  { id: "b:2", company_id: "b", company: "Bolt", title: "Analyst I", kind: "fulltime", field: "finance", state: "VA", first_seen: d(3) },
  { id: "c:1", company_id: "c", company: "Cove", title: "Cashier", kind: "hourly", field: "retail", state: "US", first_seen: d(40) },
];
const p = buildPulse(rows, now);
assert.deepEqual(p.totals, { intern: 3, fulltime: 1, hourly: 1 });
assert.deepEqual(p.newThisWeek, { intern: 2, fulltime: 1 });
assert.deepEqual(p.newLastWeek, { intern: 1 });
assert.equal(p.companies, 3);
assert.equal(p.internRemoteShare, 33.3);
assert.deepEqual(p.statesNew, [{ state: "CA", n: 2 }], "first state of a multi-state job; US-wide remote isn't a state");
assert.deepEqual(p.companiesNew, [{ id: "a", company: "Acme", n: 2, open: 2 }]);
assert.ok(p.seasons.some((s) => s.season === "Summer 2027") && p.seasons.some((s) => s.season === "Not stated"));
assert.equal(p.perDay.length, 30);
assert.equal(p.perDay.at(-1).d, "2026-11-26");
assert.equal(p.perDay.reduce((a, x) => a + x.n, 0), 3, "internships first seen in the last 30 days");
assert.equal(p.fieldsNew.find((f) => f.key === "software").label, "Software & Computer Science");

let h = addHistory([], p);
assert.deepEqual(h, [{ d: "2026-11-26", intern: 3, fulltime: 1, hourly: 1, shadow: 0, companies: 3 }]);
h = addHistory(h, { ...p, totals: { intern: 5 } });
assert.equal(h.length, 1, "same day replaces");
assert.equal(h[0].intern, 5);
h = addHistory([{ d: "2026-11-27", intern: 1 }, ...h], p);
assert.deepEqual(h.map((r) => r.d), ["2026-11-26", "2026-11-27"], "sorted oldest first");
assert.equal(addHistory(Array.from({ length: 800 }, (_, i) => ({ d: `2020-${String(i).padStart(5, "0")}` })), p).length, 730);
console.log("✓ pulse: new this week by type/area/state/company, per-day bars, remote share, daily history");
