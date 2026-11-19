// Nov 19: company job posts (lib/employer.js cleanPosts / openPosts / biz_posts). Offline.
import assert from "node:assert/strict";
process.env.BTP_OFFLINE_TEST = "1";
const { cleanPosts, openPosts, cleanBizProfile, POSTS_MAX } = await import("../lib/employer.js");
const a = cleanPosts([
  { title: "  Mechanical Engineering Intern  ", type: "intern", location: "Blacksburg, VA", workplace: "hybrid", majors: ["ME", "ME", "AE"], pay: "$24/hr", deadline: "2099-01-31", apply: "https://jobs.example.com/1", about: "Build things.", fairs: ["vt-connection-s27", "BAD ID!"], status: "open" },
  { title: "", type: "intern" },                                               // no title → dropped
  { title: "Sales Associate", type: "weird", workplace: "moon", apply: "javascript:alert(1)", deadline: "soon", status: "nah" },
  { title: "Analyst", apply: "Recruiting@Example.com", status: "closed" },
  { title: "Old one", deadline: "2001-01-01" },
  { title: "Paused", status: "paused" },
]);
assert.equal(a.length, 5);
assert.equal(a[0].title, "Mechanical Engineering Intern");
assert.deepEqual(a[0].majors, ["ME", "AE"]);
assert.deepEqual(a[0].fairs, ["vt-connection-s27"]);
assert.ok(/^[a-z0-9]{10}$/.test(a[0].id));
assert.equal(a[1].type, "intern"); assert.equal(a[1].workplace, "onsite"); assert.equal(a[1].apply, ""); assert.equal(a[1].deadline, ""); assert.equal(a[1].status, "open");
assert.equal(a[2].apply, "recruiting@example.com");
const open = openPosts(a, "2026-11-19").map((j) => j.title).sort();
assert.deepEqual(open, ["Mechanical Engineering Intern", "Sales Associate"], "closed, paused and past-deadline posts never show");
assert.equal(cleanPosts(Array.from({ length: 60 }, (_, i) => ({ title: "Job " + i }))).length, POSTS_MAX);
assert.equal(cleanBizProfile({ company: "X", posts: [{ title: "T" }] }).posts.length, 1);
const me = (await import("node:fs")).readFileSync(new URL("../api/me.js", import.meta.url), "utf8");
assert.ok(/fair_counts\|home\|posts\|/.test(me), "biz_posts is routed");
console.log("✓ posts: clean, open-only for students, max " + POSTS_MAX + ", biz_posts routed");
