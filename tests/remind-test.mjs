// Follow-up reminder emails: due rule, opt-in only, 3-day gap, unsubscribe link, cron-only, test send
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.CRON_SECRET = "cs"; process.env.RESEND_API_KEY = "re_test";
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, clerkUsers: { u1: "one@school.edu", u2: "two@school.edu", u3: "three@school.edu" } });
const { dueFollowUps } = await import("../lib/followups.js");
const me = (await import("../api/me.js")).default;
const D = 864e5, ago = (d) => new Date(Date.now() - d * D).toISOString();
const call = (method, sub, body, query = {}, headers = {}) => invoke(me, { method, query, body, headers: { ...(sub ? { authorization: "Bearer " + tok(sub) } : {}), ...headers } });
const cron = () => call("GET", null, null, { cron: "remind" }, { authorization: "Bearer cs" });

// the rule
const apps = [{ id: "a:1", company: "Fresh", stage: "applied", appliedAt: ago(2) }, { id: "a:2", company: "Due", stage: "applied", appliedAt: ago(6) },
  { id: "a:3", company: "Done", stage: "applied", appliedAt: ago(9), followedUpAt: ago(1) }, { id: "a:4", company: "Interview", stage: "interview", appliedAt: ago(9) },
  { id: "a:5", company: "Ancient", stage: "applied", appliedAt: ago(60) }];
assert.deepEqual(dueFollowUps(apps).map((a) => a.company), ["Due"]);
console.log("✓ due = applied 5–45 days ago, not followed up, still 'applied'");

f.T("user_jobs").push(
  { clerk_user_id: "u1", apps, remind_email: true, remind_unsub: "U".repeat(24), version: 1 },
  { clerk_user_id: "u2", apps, remind_email: false, remind_unsub: "V".repeat(24), version: 1 },                // not opted in
  { clerk_user_id: "u3", apps: apps.slice(0, 1), remind_email: true, remind_unsub: "W".repeat(24), version: 1 }); // nothing due
assert.equal((await call("GET", null, null, { cron: "remind" })).code, 401, "cron only");
let r = await cron(); assert.equal(r.code, 200); assert.equal(r.body.sent, 1);
const em = f.calls.emails; assert.equal(em.length, 1); assert.deepEqual(em[0].to, ["one@school.edu"]);
assert.match(em[0].subject, /Due/); assert.ok(!/Fresh|Ancient|Done/.test(em[0].html), "only due ones listed");
assert.match(em[0].headers["List-Unsubscribe"], /unsub=U{24}/); assert.match(em[0].html, /unsub=U{24}/);
console.log("✓ only opted-in students with something due get an email, with one-click unsubscribe");
r = await cron(); assert.equal(r.body.sent, 0); assert.equal(r.body.waiting, 1, "no second email within 3 days");
f.T("user_jobs").find((x) => x.clerk_user_id === "u1").remind_last_sent = ago(3.1);
r = await cron(); assert.equal(r.body.sent, 1, "again after 3 days");
assert.ok(f.T("bot_runs").some((x) => x.bot === "remind" && x.ok), "logged on /bots");
console.log("✓ at most one email every 3 days; runs logged");

// marking followed up in My Season stops it
r = await call("POST", "u1", { action: "app", app: { ...apps[1], followedUpAt: new Date().toISOString() } }); assert.equal(r.code, 200);
f.T("user_jobs").find((x) => x.clerk_user_id === "u1").remind_last_sent = ago(10);
r = await cron(); assert.equal(r.body.sent, 0, "followed up → no reminder");
// a later edit without followedUpAt keeps it
r = await call("POST", "u1", { action: "app", app: { id: "a:2", company: "Due", stage: "applied" } });
assert.ok(r.body.apps.find((a) => a.id === "a:2").followedUpAt, "followed-up mark survives other edits");
console.log("✓ 'I followed up' stops reminders and sticks");

// test send + no key = nothing happens
r = await call("POST", "u3", { action: "remind_test" }); assert.equal(r.code, 200); assert.equal(r.body.to, "t…@school.edu");
assert.match(f.calls.emails.at(-1).subject, /^Test:/);
delete process.env.RESEND_API_KEY;
const before = f.calls.emails.length; r = await cron(); assert.equal(f.calls.emails.length, before, "no key → no emails"); assert.equal(r.code, 200);
console.log("REMIND TESTS PASSED");
