// Stacking badges from the student's own Tracker (Nov 15)
import assert from "node:assert/strict";
const { achievementsFrom, countsFrom } = await import("../lib/achievements.js");
const app = (o = {}) => ({ company: "X", stage: "applied", checks: { submitted: true }, ...o });
const apps = [...Array(27)].map(() => app()).concat([app({ followedUpAt: "2026-11-01T00:00:00Z", stage: "interview" }), app({ checks: { submitted: false } }), app({ stage: "offer", checks: { submitted: true, thankyou: true } })]);
const c = countsFrom(apps);
assert.deepEqual(c, { apply: 29, follow: 1, interview: 2, thanks: 1, offer: 1 }, "an un-ticked Applied doesn't count; offers count as interviews");
const pub = achievementsFrom(apps);
assert.deepEqual(pub.map((a) => a.label), ["25+ applications", "First follow-up", "First interview", "First thank-you note", "Got an offer"]);
assert.ok(pub.every((a) => a.count === undefined), "public never gets exact counts");
assert.equal(pub[0].level, 4); assert.equal(pub[0].levels, 8);
const own = achievementsFrom(apps, { owner: true });
assert.equal(own[0].count, 29); assert.equal(own[0].next, 50); assert.equal(own[0].nextLabel, "50+ applications");
assert.deepEqual(achievementsFrom([]), [], "nothing earned → nothing public");
assert.equal(achievementsFrom([], { owner: true }).length, 5, "owner sees every track to aim for");
console.log("✓ achievements: stacking tiers from real Tracker records, tiers only in public");
