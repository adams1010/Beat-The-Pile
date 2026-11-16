// Nov 16: two ways in (personal account / company page); Recruiter + Faculty badges are earned, never self-declared
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const B = await import("../lib/badges.js");
B._setRecruiters(new Map([["u_rec", { org: "Boeing", title: "University Recruiter", kind: "recruiter", page: "/co/boeing" }], ["u_own", { org: "Beat the Pile", title: "Co-Founder", kind: "company", page: "/co/beat-the-pile" }]]));
assert.deepEqual(B.badgesOf("u_rec", {}), [{ kind: "recruiter", label: "Recruiter", org: "Boeing", page: "/co/boeing" }]);
assert.equal(B.badgesOf("u_own", {})[0].label, "Co-Founder");
assert.deepEqual(B.badgesOf("u_x", { staff: "Professor" }), [], "self-declared role = no badge");
assert.deepEqual(B.badgesOf("u_x", { staff: "Professor", staffVerified: { role: "Professor", school: "Virginia Tech" } }), [{ kind: "staff", label: "Professor", org: "Virginia Tech" }]);
assert.deepEqual(B.badgesOf("u_x", { staff: "Academic advisor", staffVerified: { role: "Professor", school: "Virginia Tech" } }), [], "role changed → badge gone");
const nav = readFileSync(new URL("../nav.js", import.meta.url), "utf8");
assert.ok(nav.includes("<b>Personal account</b>") && nav.includes("<b>Set up my company page</b>") && !nav.includes("<b>I'm a recruiter</b>") && !nav.includes("<b>I work at a school</b>"), "two sign-up choices");
const me = readFileSync(new URL("../api/me.js", import.meta.url), "utf8");
assert.ok(me.includes("Add a Recruiter badge from your profile") && me.includes("badges })"), "Find talent opens for verified recruiters; badges on public profiles");
const u = readFileSync(new URL("../u/index.html", import.meta.url), "utf8");
assert.ok(u.includes('id="badges"') && u.includes("recruiterBox()") && u.includes("kind=recruiter&badge=1"), "/u/ Badges card");
assert.ok(readFileSync(new URL("../lib/orbit.js", import.meta.url), "utf8").includes("badges: badgesOf("), "Orbit cards carry badges");
console.log("✓ badges: two sign-up choices; Recruiter (verified work email) + Faculty (school email + directory) badges, earned only");
