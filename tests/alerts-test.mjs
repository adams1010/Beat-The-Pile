// Weekly job-alert emails: opt-in, matching (major + states + followed companies), weekly gap, nothing-new = no email, unsubscribe
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.CRON_SECRET = "cs"; process.env.RESEND_API_KEY = "re_test";
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, clerkUsers: { u1: "one@school.edu", u2: "two@school.edu", u3: "three@school.edu" } });
const { matchesFor, cleanMajor, cleanStates } = await import("../lib/alerts.js");
const me = (await import("../api/me.js")).default;
const D = 864e5, ago = (d) => new Date(Date.now() - d * D).toISOString();
const call = (method, sub, body, query = {}, headers = {}) => invoke(me, { method, query, body, headers: { ...(sub ? { authorization: "Bearer " + tok(sub) } : {}), ...headers } });
const cron = () => call("GET", null, null, { cron: "remind" }, { authorization: "Bearer cs" });

assert.equal(cleanMajor("mechanical"), "mechanical"); assert.equal(cleanMajor("eng"), "eng"); assert.equal(cleanMajor("bogus"), "all"); assert.equal(cleanMajor("<x>"), "all");
assert.equal(cleanStates("va, pa,XX1,va"), "VA,PA"); assert.equal(cleanStates(["ny"]), "NY");
console.log("✓ major/state inputs cleaned");

const L = (id, o) => ({ id, company_id: "co-" + id, company: "Co " + id, title: "Intern " + id, location: "Somewhere", url: "https://x.example/" + id, state: "VA", field: "mechanical", match: "me", first_seen: ago(1), closed_at: null, link_ok: true, ...o });
f.T("listings").push(L("a"), L("b", { state: "PA,VA" }), L("c", { state: "CA" }), L("d", { field: "finance", match: null }),
  L("e", { first_seen: ago(20) }), L("f", { closed_at: ago(0.5) }), L("g", { link_ok: false }), L("h", { field: "finance", match: null, state: "TX", company_id: "followed" }));

const row = { alert_major: "mechanical", alert_states: "VA", starred: ["followed"] };
const fresh = f.T("listings").filter((l) => !l.closed_at && l.link_ok !== false);
assert.deepEqual(matchesFor(row, fresh).map((l) => l.id).sort(), ["a", "b", "h"]);
assert.deepEqual(matchesFor({ alert_major: "all" }, fresh).map((l) => l.id).sort(), ["a", "b", "c", "d", "h"]);
assert.deepEqual(matchesFor({ alert_major: "eng", alert_states: "CA" }, fresh).map((l) => l.id), ["c"]);
assert.deepEqual(matchesFor({ ...row, alert_last_sent: ago(0.5) }, fresh), [], "only things newer than the last email");
console.log("✓ matches = new in last week, right major + state, plus followed companies; closed/old excluded");

f.T("user_jobs").push({ clerk_user_id: "u3", version: 1, starred: [] });
let r = await call("POST", "u1", { action: "alerts", on: true, major: "mechanical", states: "VA" }); assert.equal(r.code, 200);
assert.deepEqual(r.body.alerts, { major: "mechanical", states: "VA" });
r = await call("POST", "u2", { action: "alerts", on: true, major: "finance", states: "AK" }); assert.equal(r.code, 200);   // nothing new for them
assert.equal((await call("GET", null, null, { cron: "remind" })).code, 401, "cron only");
r = await cron(); assert.equal(r.code, 200); assert.equal(r.body.alerts.sent, 1); assert.equal(r.body.alerts.empty, 1);
const em = f.calls.emails.at(-1); assert.deepEqual(em.to, ["one@school.edu"]);
assert.match(em.subject, /^2 new Mechanical/); assert.match(em.html, /Intern a/); assert.ok(!/Intern c|Intern e|Intern f/.test(em.html));
assert.match(em.headers["List-Unsubscribe"], /k=alerts/); assert.match(em.text, /https:\/\/x\.example\/a/);
console.log("✓ opted-in students get one email; nothing new = no email; unsubscribe link in every email");

const before = f.calls.emails.length; r = await cron(); assert.equal(f.calls.emails.length, before, "no second email within a week");
f.T("user_jobs").find((x) => x.clerk_user_id === "u1").alert_last_sent = ago(7.1);
f.T("listings").push(L("z", { first_seen: ago(0.2) }));
r = await cron(); assert.equal(r.body.alerts.sent, 1); assert.match(f.calls.emails.at(-1).subject, /^3 new/); assert.match(f.calls.emails.at(-1).html, /Intern z/);
console.log("✓ weekly at most, and only listings since the last email");

const tokn = f.T("user_jobs").find((x) => x.clerk_user_id === "u1").remind_unsub;
f.T("user_jobs").find((x) => x.clerk_user_id === "u1").remind_email = true;
r = await call("GET", null, null, { unsub: tokn, k: "alerts" }); assert.equal(r.code, 200); assert.match(String(r.body), /weekly job alert/);
const u1 = f.T("user_jobs").find((x) => x.clerk_user_id === "u1"); assert.equal(u1.alert_on, false); assert.equal(u1.remind_email, true, "alert unsub leaves reminders alone");
console.log("✓ alert unsubscribe turns off alerts only");

r = await call("POST", "u3", { action: "alerts_test" }); assert.equal(r.code, 400, "test needs alerts on");
r = await call("POST", "u2", { action: "alerts_test" }); assert.equal(r.code, 200); assert.equal(r.body.none, true);
delete process.env.RESEND_API_KEY;
r = await call("POST", "u3", { action: "alerts", on: true }); assert.equal(r.code, 400, "can't turn on without email set up");
console.log("ALERTS TESTS PASSED");
