// 🛡 Watchdog + database retries (Nov 12: one Supabase connect timeout used to crash a whole bot run)
import assert from "node:assert/strict";
const { botHealth, STALE_MIN, RESTART } = await import("../lib/bots.js");
const now = Date.parse("2026-11-12T16:00:00Z"), m = (min) => new Date(now - min * 6e4).toISOString();
assert.equal(botHealth("finder", [{ ran_at: m(30), ok: true }], now).healthy, true);
assert.equal(botHealth("finder", [{ ran_at: m(200), ok: true }], now).stale, true, "finder quiet > 3 h = stalled");
assert.equal(botHealth("finder", [{ ran_at: m(5), ok: false }, { ran_at: m(20), ok: false }, { ran_at: m(40), ok: false }], now).failing, true);
assert.equal(botHealth("finder", [{ ran_at: m(5), ok: false }, { ran_at: m(20), ok: true }], now).healthy, true, "one failure isn't an alert");
assert.equal(botHealth("radar", [{ ran_at: m(27 * 60), ok: true }], now).healthy, true, "GitHub's late daily schedules are tolerated");
assert.equal(botHealth("logos", [], now).stale, true, "never ran = stalled");
assert.equal(RESTART.remind, null, "Follow-up Emails are never restarted by a robot (no double emails)");
assert.ok(Object.keys(STALE_MIN).length >= 10);
console.log("✓ bot health: stalled / failing / tolerant of late GitHub schedules");

const { check } = await import("../scripts/watchdog.mjs");
const run = async (bots, issues = []) => {
  const calls = { restart: [], open: [], comment: [], close: [], log: null };
  await check({ fetchHealth: async () => ({ bots }), restart: async (w) => calls.restart.push(w), openIssues: async () => issues,
    openIssue: async (t) => calls.open.push(t), comment: async (n) => calls.comment.push(n), close: async (n) => calls.close.push(n),
    log: async (ok, s) => { calls.log = { ok, s }; } });
  return calls;
};
const finder = { name: "Company Finder", healthy: false, stale: true, quietMin: 300, staleMin: 180, fails: 0, restart: "discover.yml" };
let c = await run([finder, { name: "Internship Sync", healthy: true }]);
assert.deepEqual(c.restart, ["discover.yml"]); assert.equal(c.open.length, 0, "first time: restart, no alert yet"); assert.match(c.log.s, /Company Finder: no run for 5 h/);
c = await run([{ ...finder, seenSickBefore: true }]);
assert.deepEqual(c.open, ["Bot alert: Company Finder"], "still broken an hour later → alert issue"); assert.equal(c.log.ok, false);
c = await run([{ ...finder, seenSickBefore: true }], [{ number: 7, title: "Bot alert: Company Finder" }]);
assert.deepEqual(c.comment, [7]); assert.equal(c.open.length, 0, "no duplicate issues");
c = await run([{ name: "Company Finder", healthy: true }], [{ number: 7, title: "Bot alert: Company Finder" }]);
assert.deepEqual(c.close, [7]); assert.match(c.log.s, /All 1 bots healthy/);
c = await run([{ name: "Follow-up Emails", healthy: false, stale: true, quietMin: 3000, staleMin: 1800, restart: null }]);
assert.equal(c.restart.length, 0); assert.deepEqual(c.open, ["Bot alert: Follow-up Emails"], "can't restart → alert right away");
console.log("✓ watchdog: restart first, alert if still broken next hour, one issue per bot, closes when healthy");

// db.js retries a connection that never opened (reads AND writes), and busy-gateway 503s on reads only
const { db, fetchRetry } = await import("../lib/db.js");
process.env.INTERNIQ_DB_URL = "https://x.supabase.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "k"; process.env.INTERNIQ_DB_ANON_KEY = "a";
let n = 0;
globalThis.fetch = async () => { if (n++ < 2) { const e = new TypeError("fetch failed"); e.cause = { code: "UND_ERR_CONNECT_TIMEOUT" }; throw e; } return { ok: true, status: 200, text: async () => "[]" }; };
await db.insert("bot_runs", [{ bot: "x" }]); assert.equal(n, 3, "write retried after 2 connect timeouts");
n = 0; globalThis.fetch = async () => (n++ < 1 ? { ok: false, status: 503, text: async () => "busy" } : { ok: true, status: 200, text: async () => "[]" });
await db.selectAsAdmin("listings?select=id"); assert.equal(n, 2, "read retried after a 503");
n = 0; globalThis.fetch = async () => { n++; return { ok: false, status: 503, text: async () => "busy" }; };
await assert.rejects(db.insert("bot_runs", [{ bot: "x" }])); assert.equal(n, 1, "a write that reached the server is NOT repeated");
n = 0; globalThis.fetch = async () => { n++; throw new Error("bad json"); };
await assert.rejects(fetchRetry("https://x")); assert.equal(n, 1, "other errors aren't retried");
console.log("✓ db: connect timeouts retried (safe), busy reads retried, writes never sent twice");
console.log("\nWATCHDOG TESTS PASSED");
