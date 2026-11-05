// /api/me — My Season: jobs-page applies flow in with honest dates, stages, manual adds, goal.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
const f = installFake({ jwk });
f.T("listings").push({ id: "x-hensel-phelps:77", company_id: "x-hensel-phelps", company: "Hensel Phelps", title: "Field Engineer Intern", url: "https://hp.example/77",
  first_seen: "2026-10-30T00:00:00Z", posted_on: "Posted 3 Days Ago" });
f.T("listings").push({ id: "acme:9", company_id: "acme", company: "Acme", title: "ME Intern", url: "https://acme.example/9", first_seen: "2026-10-01T00:00:00Z", posted_on: "Posted 30+ Days Ago" });
const me = (await import("../api/me.js")).default;
const call = (body, sub = "user_a") => invoke(me, { method: body ? "POST" : "GET", body, headers: sub ? { authorization: "Bearer " + tok(sub) } : {} });

let r = await call({ list: "applied", id: "x-hensel-phelps:77", on: true });
r = await call(); assert.equal(r.body.apps.length, 1); const a = r.body.apps[0];
assert.equal(a.company, "Hensel Phelps"); assert.equal(a.stage, "applied"); assert.ok(a.appliedAt);
assert.equal(a.firstSeenAt, "2026-10-30T00:00:00.000Z", "when WE first saw it is kept separately");
assert.equal(a.postedAt, "2026-10-27T00:00:00.000Z"); assert.equal(a.postedEstimate, true, "'Posted 3 Days Ago' → estimated employer date");
await call({ list: "applied", id: "acme:9", on: true }); r = await call();
const acme = r.body.apps.find((x) => x.company === "Acme"); assert.equal(acme.postedAt, null, "'30+ days ago' = unknown, never guessed");
r = await call({ action: "app", app: { ...a, stage: "interview" } }); assert.equal(r.body.apps.find((x) => x.id === a.id).stage, "interview"); assert.equal(r.body.apps.find((x) => x.id === a.id).appliedAt, a.appliedAt);
await call({ list: "applied", id: "x-hensel-phelps:77", on: false }); r = await call(); assert.equal(r.body.apps.length, 2, "un-marking doesn't wipe an interview");
r = await call({ action: "app", app: { company: "Garmin", title: "ME Intern", appliedAt: "2026-10-28T12:00:00Z", url: "javascript:alert(1)" } });
const g = r.body.apps.find((x) => x.company === "Garmin"); assert.match(g.id, /^m:/); assert.equal(g.url, null, "bad links dropped");
assert.equal((await call({ action: "app", app: { title: "x" } })).code, 400);
r = await call({ action: "app_delete", id: g.id }); assert.equal(r.body.apps.length, 2);
assert.equal((await call({ action: "goal", goal: 0 })).code, 400); r = await call({ action: "goal", goal: 5 }); assert.equal(r.body.goal, 5);
assert.deepEqual((await call(null, "user_b")).body.apps, [], "users isolated");
console.log("✓ My Season: applies flow in, employer date vs first-seen kept apart, unknown dates stay unknown, stages, manual adds, goal");
