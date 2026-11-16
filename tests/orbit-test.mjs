// Orbit part 1: who shows up where, and nothing private leaks.
import assert from "node:assert/strict";
const { buildOrbit, schoolKey, sameMajor, sameCompany } = await import("../lib/orbit.js");

assert.equal(schoolKey("Virginia Tech"), schoolKey("Virginia Polytechnic Institute and State University"), "VT's long name = VT");
assert.equal(schoolKey("The Ohio State University"), schoolKey("Ohio State University"));
assert.ok(sameMajor("Mechanical Engineering", "B.S. in Mechanical Engineering"));
assert.ok(!sameMajor("Mechanical Engineering", "Electrical Engineering"));
assert.ok(!sameMajor("", "Finance"));

const P = (h, school, major, extra = {}) => ({ clerk_user_id: "user_" + h, handle: h, profile_public: true,
  profile: { name: h.toUpperCase(), school, major, gradYear: 2027, ...extra } });
const me = { handle: "me", profile_public: false, profile: { name: "Me", school: "Virginia Tech", major: "Mechanical Engineering", gradYear: 2027 } };
const publics = [
  P("ana", "Virginia Polytechnic Institute and State University", "Mechanical Engineering"),
  P("ben", "Virginia Tech", "Finance"),
  P("cal", "James Madison University", "Mechanical Engineering", { experience: [{ title: "Intern", org: "Lockheed Martin", when: "Summer 2026" }] }),
  { ...P("dee", "Virginia Tech", "Mechanical Engineering"), profile_public: false },        // private → never shown
  { ...P("me", "Virginia Tech", "Mechanical Engineering"), clerk_user_id: "user_me" },      // yourself → never shown
];
const o = buildOrbit({ uid: "user_me", me, publics, followed: [{ id: "x-lm", company: "Lockheed Martin Corporation" }],
  fresh: [{ id: 1, company_id: "x-lm", company: "Lockheed Martin", title: "ME Intern", first_seen: "2026-11-07T00:00:00Z", url: "https://x" }],
  posts: [{ id: 9, content: "Tip", display_name: "Sam", created_at: "2026-11-06T00:00:00Z" }] });

assert.deepEqual(o.classmates.map((c) => c.handle), ["ana"], "same school (long name) + same major");
assert.deepEqual(o.schoolmates.map((c) => c.handle), ["ana", "ben"], "Campus = the whole school, your major first");
assert.deepEqual(o.everyone.map((c) => c.handle), ["cal"], "outer ring = everyone else public (other school), not already in an inner ring");
assert.deepEqual(o.feed.map((f) => f.kind), ["job", "post"], "newest first");
const all = JSON.stringify(o);
assert.ok(!all.includes("dee") && !all.includes("DEE"), "private profiles never appear");
assert.ok(!all.includes("user_"), "no account ids in the response");
assert.equal(o.me.isPublic, false); assert.equal(o.me.following, 1);

const empty = buildOrbit({ uid: "u", me: null, publics, followed: [], fresh: [], posts: [] });
assert.deepEqual([empty.classmates.length, empty.schoolmates.length], [0, 0], "no school on file → no classmate guesses");
assert.deepEqual(empty.everyone.map((c) => c.handle).sort(), ["ana", "ben", "cal", "me"], "no school on file → every public profile is in the outer ring (still never private ones)");
// Insiders (Nov 15 pm): people who interned or work at a company you want (followed, Tracker, or typed)
assert.deepEqual(o.insiders.map((c) => [c.handle, c.at, c.type]), [["cal", "Lockheed Martin", "internship"]], "followed Lockheed → Cal interned there");
assert.ok(sameCompany("Northrop Grumman Mission Systems", "Northrop Grumman"));
assert.ok(sameCompany("Northrop Grumman Corporation", "Northrop"), "a one-word name that starts the company");
assert.ok(sameCompany("Raytheon", "RTX"), "aliases from data/company-aliases.json");
assert.ok(!sameCompany("Boeing", "Northrop Grumman"));
assert.ok(!sameCompany("GE Aerospace", "GE"), "too short to guess");
const pubs2 = [...publics, P("eve", "Penn State", "Finance", { experience: [{ title: "Financial Analyst", org: "Northrop Grumman", end: "present", type: "job" }] })];
const o2 = buildOrbit({ uid: "user_me", me, publics: pubs2, followed: [], fresh: [], posts: [], targets: ["Northrop"] });
assert.deepEqual(o2.insiders.map((c) => [c.handle, c.role, c.now, c.type]), [["eve", "Financial Analyst", true, "job"]], "typed target, current job");
assert.deepEqual(o2.targets, ["Northrop"]);
assert.equal(buildOrbit({ uid: "user_me", me, publics: pubs2, followed: [], fresh: [], posts: [] }).insiders.length, 0, "no companies wanted → no insiders");
console.log("✓ orbit insiders: followed + typed companies, aliases, current role");
console.log("✓ orbit: classmates by school+major, everyone else in the outer ring, feed, private profiles + ids never leak");
