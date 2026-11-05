// Homepage backends: /api/usersync (merge, no wipes, mirrors into My Season), /api/results (real listings only),
// /api/listings (validation, summary, ids history, error ≠ empty), lib/dates + lib/geo.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
const f = installFake({ jwk });
const { postedInfo } = await import("../lib/dates.js");
const { zipToState, fieldsForMajor } = await import("../lib/geo.js");

// dates
assert.deepEqual(postedInfo("Posted 3 Days Ago", "2026-11-04T00:00:00Z"), { date: "2026-11-01T00:00:00.000Z", estimate: true });
assert.equal(postedInfo("Posted 30+ Days Ago", "2026-11-04T00:00:00Z"), null);
assert.equal(postedInfo("Posted Today", null), null, "relative date with no reference = unknown");
assert.equal(postedInfo("2026-10-30T11:22:31-04:00").estimate, false);
assert.equal(postedInfo("Oct 9, 2026").date.slice(0, 10), "2026-10-09");
assert.equal(postedInfo("garbage"), null); assert.equal(postedInfo(null), null); assert.equal(postedInfo("2099-01-01"), null, "future dates rejected");
// geo
assert.equal(zipToState("24060"), "VA"); assert.equal(zipToState("19103"), "PA"); assert.equal(zipToState("94105"), "CA"); assert.equal(zipToState("abc"), null);
assert.ok(fieldsForMajor("Mechanical Engineering").includes("mechanical")); assert.ok(fieldsForMajor("Finance").includes("finance"));
console.log("✓ dates (exact / estimated / unknown) and ZIP → state");

// ── usersync ──
const us = (await import("../api/usersync.js")).default;
const sync = (body, sub = "u1") => invoke(us, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
assert.equal((await invoke(us, { method: "POST", body: { action: "get_all" } })).code, 401);
let r = await sync({ action: "migrate", profile: { fullName: "Adam" }, tracker: [{ company: "Boeing", role: "ME Intern", status: "Applied", appliedAt: 1 }], resumes: { list: [{ id: 1, name: "A" }] } });
assert.equal(r.code, 200);
// second device signs in with different local data → merged, nothing wiped
r = await sync({ action: "migrate", profile: { fullName: "Other", school: "VT" }, tracker: [{ company: "Garmin", role: "Intern", status: "Interview", appliedAt: 2 }], resumes: { list: [{ id: 2, name: "B" }] } });
assert.deepEqual(r.body.data.tracker.map((t) => t.company).sort(), ["Boeing", "Garmin"]);
assert.equal(r.body.data.profile.fullName, "Adam", "saved account profile wins"); assert.equal(r.body.data.profile.school, "VT", "but new fields are kept");
assert.equal(r.body.data.resumes.list.length, 2);
// tracker shows up in My Season (one list across the site)
let apps = f.T("user_jobs").find((x) => x.clerk_user_id === "u1").apps;
assert.deepEqual(apps.map((a) => [a.company, a.stage]).sort(), [["Boeing", "applied"], ["Garmin", "interview"]]); assert.ok(apps.every((a) => a.id.startsWith("h:")));
await sync({ action: "set", kind: "tracker", data: [{ company: "Garmin", role: "Intern", status: "Offer" }, { company: "Lockheed", role: "Intern", status: "Saved" }] });
apps = f.T("user_jobs").find((x) => x.clerk_user_id === "u1").apps;
assert.deepEqual(apps.map((a) => [a.company, a.stage]), [["Garmin", "offer"]], "removed + 'Saved' entries don't become applications");
assert.equal((await sync({ action: "get_all" }, "u2")).body.data.tracker, null, "users isolated");
assert.equal((await sync({ action: "set", kind: "admin", data: 1 })).code, 400);
console.log("✓ usersync: merges devices, never wipes, mirrors tracker into My Season, isolated");

// ── results: real listings only, honest widening ──
const L = (id, company, state, field = "mechanical", extra = {}) => ({ id, company_id: id.split(":")[0], company, title: "ME Intern", location: `X, ${state}`, state, url: `https://${id}`, field, match: "me", first_seen: "2026-11-01", ...extra });
f.T("listings").push(L("a:1", "Alpha", "VA"), L("b:1", "Beta", "NC"), L("c:1", "Gamma", "TX"), L("d:1", "Delta", "VA", "finance", { match: null }),
  L("e:1", "Closed Co", "VA", "mechanical", { closed_at: "2026-11-02" }), L("r:1", "RemoteCo", "CA", "mechanical", { location: "Remote (US)" }));
const res = (await import("../api/results.js")).default;
r = await invoke(res, { method: "POST", body: { zip: "24060", major: "Mechanical Engineering" } });
assert.equal(r.code, 200); assert.equal(r.body.meta.aiUsed, false);
assert.ok(r.body.results.every((c) => c.source === "db" && c.verified && /^https:/.test(c.applyUrl)), "every card is a real listing with its apply link");
assert.ok(!r.body.results.some((c) => c.name === "Closed Co" || c.name === "Delta"), "no closed jobs, no other majors");
assert.equal(r.body.meta.expansionLabel, "all of the US", "too few nearby → widened, and says so");
r = await invoke(res, { method: "POST", body: { zip: "24060", major: "Finance" } }); assert.deepEqual(r.body.results.map((c) => c.name), ["Delta"]);
r = await invoke(res, { method: "POST", body: { major: "Mechanical Engineering", type: "Remote" } }); assert.deepEqual(r.body.results.map((c) => c.name), ["RemoteCo"]);
assert.equal((await invoke(res, { method: "POST", body: { zip: "1", major: "x" } })).code, 400);
f.failNext = () => true; r = await invoke(res, { method: "POST", body: { zip: "24060", major: "Mechanical Engineering" } }); assert.equal(r.code, 503, "DB down = error, not 'no results'");
console.log("✓ results: real listings only, widening labeled, remote, error ≠ empty");

// ── listings API ──
const li = (await import("../api/listings.js")).default;
const get = (query) => invoke(li, { method: "GET", query });
assert.equal((await get({ state: "Virginia" })).code, 400); assert.equal((await get({ field: "astrology" })).code, 400); assert.equal((await get({ limit: "5000" })).code, 400);
assert.match((await get({ state: "XX" })).body.error, /state/);
r = await get({ state: "VA" }); assert.deepEqual(r.body.listings.map((l) => l.company), ["Alpha"]);
r = await get({ limit: "2", offset: "0" }); assert.equal(r.body.listings.length, 2); assert.equal(r.body.meta.more, true);
r = await get({ ids: "e:1,a:1" }); assert.equal(r.body.listings.length, 2); assert.equal(r.body.listings.find((l) => l.id === "e:1").open, false, "closed jobs kept in your history, marked closed");
r = await get({ summary: "1" }); assert.equal(r.code, 200); assert.equal(typeof r.body.engineering, "number"); assert.ok(r.body.companies > 0);
// names=1: every company hiring now, any major, once each (Radar)
r = await get({ names: "1" }); assert.equal(r.code, 200);
const nm = r.body.companies.map((c) => c.company); assert.ok(nm.includes("Delta"), "non-engineering companies included"); assert.equal(new Set(nm).size, nm.length, "each company once");
assert.ok(r.body.companies.every((c) => c.id && c.company), "id + name only"); assert.ok(!("listings" in r.body));
// field=all paging returns every major; default stays the engineering view
r = await get({ field: "all", limit: "2", offset: "0" }); assert.equal(r.body.listings.length, 2); assert.equal(r.body.meta.more, true);
const engOnly = (await get({})).body.listings; assert.ok(engOnly.every((l) => l.match), "default = engineering view");
assert.ok((await get({ field: "all" })).body.listings.some((l) => !l.match), "field=all includes other majors");
f.failNext = () => true; r = await get({}); assert.equal(r.code, 503); assert.ok(!/DB|rest|boom/.test(r.body.error), "no raw backend errors");
console.log("✓ listings API: validation, paging, history incl. closed, summary, error ≠ empty");
console.log("HOME TESTS PASSED");
