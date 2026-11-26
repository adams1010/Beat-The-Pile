// Nov 25 (owner): Workday cool-off. Blocked clusters are not asked at all until PAUSE_UNTIL; other clusters work as before.
import assert from "node:assert/strict";
delete process.env.WD_PAUSE;
const W = await import("../lib/fetchers/workday.js");
const before = Date.parse(W.PAUSE_UNTIL) - 1000, after = Date.parse(W.PAUSE_UNTIL) + 1000;
assert.ok(W.isPaused({ host: "humana.wd5.myworkdayjobs.com" }, before));
assert.ok(W.isPaused({ apiBase: "https://wd12.myworkdaysite.com/wday/cxs/p/S" }, before));
assert.ok(!W.isPaused({ host: "walmart.wd504.myworkdayjobs.com" }, before), "wd504 still works");
assert.ok(!W.isPaused({ host: "humana.wd5.myworkdayjobs.com" }, after), "pause ends by itself");
if (Date.now() < Date.parse(W.PAUSE_UNTIL)) {
  let calls = 0; globalThis.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({}) }; };
  await assert.rejects(W.fetchWorkday({ id: "h", host: "humana.wd5.myworkdayjobs.com", tenant: "humana", site: "S" }), /cool-off/);
  assert.equal(calls, 0, "no request at all to a paused cluster");
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync(new URL("../scripts/turbo-sync.mjs", import.meta.url), "utf8"), /isPaused\(cfg\)\) \{ paused\+\+; return; \}/);
  assert.match(readFileSync(new URL("../lib/discover.js", import.meta.url), "utf8"), /if \(isPaused\(cfg\)\) return \{ ok: false/);
}
console.log("wdpause-test ok");
