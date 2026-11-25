// Nov 14: profile experience timeline (lib/timeline.js) + the server keeps the new fields
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const T = await import("../lib/timeline.js");
const P = T.parseWhen;
assert.deepEqual(P("Summer 2026"), { start: "2026-05", end: "2026-08" });
assert.deepEqual(P("May 2025 – Aug 2025"), { start: "2025-05", end: "2025-08" });
assert.deepEqual(P("2024 - Present"), { start: "2024-01", end: "present" });
assert.deepEqual(P("05/2024 - 08/2024"), { start: "2024-05", end: "2024-08" });
assert.deepEqual(P(""), { start: "", end: "" });
assert.equal(T.rangeText(T.spanOf({ start: "2025-05", end: "2025-08" })), "May 2025 – Aug 2025 · 4 mos");
assert.equal(T.rangeText(T.spanOf({ start: "2024-09", end: "present" }, "2026-11")), "Sep 2024 – Present · 2 yrs 3 mos");
const ex = [{ title: "ME Intern", org: "Boeing", when: "Summer 2025", type: "internship" }, { title: "Lab Assistant", org: "VT", start: "2024-09", end: "present", type: "research" }, { title: "Intern II", org: "Boeing", start: "2026-05", end: "2026-08" }];
const L = T.careerLine(ex, { now: "2026-11", grad: "2027-05", next: "Summer 2027 internship" });
assert.equal(L.lanes, 2, "overlapping roles stack"); assert.equal(L.bars.length, 3); assert.ok(L.next && L.grad > L.now);
assert.ok(L.bars.every((b) => b.left >= 0 && b.left + b.width <= 100.5), "bars stay on the line");
assert.deepEqual(T.groupByOrg(ex, "2026-11").map((g) => [g.org, g.roles.map((r) => r.title)]), [["VT", ["Lab Assistant"]], ["Boeing", ["Intern II", "ME Intern"]]]);
assert.equal(T.totalMonths(ex, "2026-11"), 27, "overlapping months counted once");
// server keeps start/end/type/location, drops junk
const { cleanProfile } = await import("../api/me.js").catch(() => ({}));
const api = readFileSync(new URL("../api/me.js", import.meta.url), "utf8");
assert.ok(/start: YM\(x\?\.start\)/.test(api) && /EXP_TYPES\.includes/.test(api), "server cleans the new experience fields");
const u = readFileSync(new URL("../u/index.html", import.meta.url), "utf8");
assert.ok(u.includes("/lib/timeline.js") && u.includes("tl-node") && u.includes('data-f="start"') && u.includes("data-now"), "/u/ career line + date editor");
console.log("✓ experience timeline: dates parsed from old text, career line lanes/Now/Grad/Next, grouped by company, total time");
// Nov 24 (owner): when it was, never how long; short labels for the trajectory
{
  const w = (s, e) => T.whenText(T.spanOf({ start: s, end: e }, "2026-11"));
  assert.equal(w("2025-05", "2025-08"), "Summer 2025"); assert.equal(w("2026-06", "2026-07"), "Summer 2026");
  assert.equal(w("2020-05", "2020-11"), "May 2020 – Nov 2020"); assert.equal(w("2024-09", "present"), "Sep 2024 – Present"); assert.equal(w("2025-05", "2025-05"), "May 2025");
  assert.equal(w("2024-05", "2025-08"), "May 2024 – Aug 2025", "two summers is not one summer");
  assert.ok(!/mo|yr/.test(w("2025-01", "2025-11")), "no lengths");
  assert.equal(T.shortName("Lockheed Martin Corporation"), "Lockheed Martin");
  assert.equal(T.shortName("Undergraduate Research Assistant", 24), "Undergrad Research Asst.");
  assert.ok(T.shortName("Johns Hopkins University Applied Physics Laboratory").length <= 22);
  assert.equal(T.shortName("Blue Ridge Labs"), "Blue Ridge Labs", "short names stay as typed");
  const u3 = readFileSync(new URL("../u/index.html", import.meta.url), "utf8");
  assert.ok(!u3.includes("tk-len\">") && !/T\.duration\(/.test(u3), "/u/ shows no durations");
  console.log("✓ when-text (Summer 2025 / May 2020 – Nov 2020) + short names");
}
