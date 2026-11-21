// Grad school paths (/grad/, lib/gradpaths.js, Nov 20): every number sourced, path job lists, timeline, hours, save.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
installFake({ jwk, clerkUsers: { u_ana: { email: "ana@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const G = await import("../lib/gradpaths.js");
const C = await import("../lib/categories.js");
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });

// sources: every target, fact and dated step points at a real https source (or says it's advice / the goal)
for (const s of Object.values(G.SRC)) assert.ok(/^https:\/\//.test(s.url) && s.label, s.label);
for (const p of G.PATHS) {
  assert.ok(C.CAT[p.jobs], `${p.key} has a job list`);
  for (const t of p.targets) assert.ok(t.src === null || G.SRC[t.src], `${p.key} target source`);
  for (const f of p.facts) assert.ok(G.SRC[f.src], `${p.key} fact source`);
  const steps = G.timeline(p.key, 2028, true);
  assert.ok(steps.length >= 4, p.key);
  for (const s of steps) assert.ok(s.src ? G.SRC[s.src] : ["advice", "goal"].includes(s.kind), `${p.key}: ${s.title} needs a source or the Our advice label`);
  assert.ok(steps.every((s, i) => !i || steps[i - 1].y * 12 + steps[i - 1].m <= s.y * 12 + s.m), "in date order");
}
console.log("✓ grad paths: every number and date has a source, or is labeled advice");

// timeline math: a 2028 grad with a gap year applies May 2028 and starts med school Aug 2029; no gap = cycle opens senior spring
let t = G.timeline("premed", 2028, true);
assert.ok(t.some((s) => s.title === "AMCAS opens" && s.y === 2028 && s.m === 5)); assert.equal(t.at(-1).y, 2029);
t = G.timeline("premed", 2028, false);
assert.ok(t.some((s) => s.title === "AMCAS opens" && s.y === 2027)); assert.equal(t.at(-1).y, 2028);
t = G.timeline("prelaw", 2027, false); assert.ok(t.some((s) => /LSAT/.test(s.title) && s.y === 2026));
assert.deepEqual(G.timeline("nope", 2028), []); assert.deepEqual(G.timeline("premed", 1999), []);
console.log("✓ timeline: cycle opens the year before you start, gap year shifts everything a year");

// path job lists: the right jobs in, look-alikes out
const inn = (k, title, field) => C.inCategory(k, { title, field });
assert.ok(inn("path_premed", "Medical Scribe - Emergency Department")); assert.ok(inn("path_premed", "Scribe Trainee"));
assert.ok(inn("path_premed", "EMT-Basic")); assert.ok(inn("path_premed", "Clinical Research Coordinator"));
assert.ok(!inn("path_premed", "Subscriber Services Representative")); assert.ok(!inn("path_premed", "Chemtech Operator"));
assert.ok(inn("path_prepa", "Patient Care Technician")); assert.ok(!inn("path_prepa", "Clinical Research Assistant"));
assert.ok(inn("path_predental", "Dental Assistant")); assert.ok(inn("path_prept", "Physical Therapy Aide"));
assert.ok(inn("path_prelaw", "Paralegal")); assert.ok(inn("path_prelaw", "Court Clerk")); assert.ok(!inn("path_prelaw", "Courtyard Host"));
assert.ok(inn("path_prelaw", "Policy Analyst", "legal_policy"));
assert.ok(inn("path_research", "Research Technician I")); assert.ok(!inn("path_research", "Scientist II"));
assert.ok(C.categoryGroup("path_prelaw").includes("title.ilike.*court%20*"), "the space after court reaches the server");
assert.ok(!C.CATEGORIES.some((c) => c.key.startsWith("path_")), "path lists stay out of the category dropdown");
assert.equal(C.categoryForQuery("paralegal")?.cat?.startsWith("path_") || false, false, "smart search never jumps to a path");
console.log("✓ path job lists: scribe/EMT/paralegal in, Subscriber/Chemtech/Courtyard out, hidden from the dropdown");

// hours: totals, progress vs targets, export, cleaning
const log = [{ type: "shadowing", hours: 30 }, { type: "clinical_vol", hours: 120 }, { type: "clinical", hours: 400 }];
const pr = G.progress("premed", log);
assert.equal(pr.find((x) => x.label === "Shadowing").pct, 60); assert.equal(pr.find((x) => x.label === "Clinical volunteering").pct, 100);
assert.equal(G.progress("prepa", log)[0].have, 520, "PA patient care counts paid + volunteer clinical");
const rows = G.exportRows([{ type: "shadowing", org: "Carilion", role: "Shadow", hours: 12, start: "2026-05", end: "present" }]);
assert.equal(rows[0][0], "Experience type"); assert.equal(rows[1][0], "Physician Shadowing/Clinical Observation"); assert.equal(rows[1][5], "12");
const c = G.cleanGrad({ path: "premed", gradYear: 2028, lsat: 200, gpa: 3.5, hours: [{ org: "X", hours: "12.25", type: "bad", start: "2026-13" }, { org: "", role: "", hours: 0 }] });
assert.equal(c.lsat, null); assert.equal(c.gpa, 3.5); assert.equal(c.hours.length, 1); assert.equal(c.hours[0].type, "clinical"); assert.equal(c.hours[0].start, ""); assert.equal(c.hours[0].hours, 12.3);
assert.equal(G.cleanGrad({ path: "hack" }).path, null); assert.equal(G.cleanGrad(null), null);
assert.equal(G.cleanGrad({ hours: Array.from({ length: 99 }, (_, i) => ({ org: "o" + i, hours: 1 })) }).hours.length, 60);
console.log("✓ hours: progress vs cited goals, application export, cleaning");

// save + read back through the API
let r = await call("u_ana", { action: "grad_save", grad: { path: "prept", gradYear: 2029, hours: [{ org: "Rehab Co", type: "shadowing", hours: 20 }] } });
assert.equal(r.code, 200); assert.equal(r.body.grad.path, "prept"); assert.equal(r.body.grad.hours[0].hours, 20);
r = await invoke(me, { method: "GET", headers: { authorization: "Bearer " + tok("u_ana") } });
assert.equal(r.body.grad.gradYear, 2029);
assert.equal((await call("u_ana", { action: "grad_save", grad: "x" })).code, 400);
console.log("✓ grad_save: saves to the account, reads back on GET");

// the page loads the shared module, never invents numbers, and is reachable from Tools
const page = readFileSync(new URL("../grad/index.html", import.meta.url), "utf8");
assert.ok(page.includes('from "/lib/gradpaths.js"')); assert.ok(!/—/.test(page), "no em dashes");
assert.ok(readFileSync(new URL("../nav.js", import.meta.url), "utf8").includes('"/grad/"'));
console.log("✓ /grad/ page wired");
