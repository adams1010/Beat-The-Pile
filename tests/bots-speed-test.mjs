// Nov 2026 bot fixes: Workday 429 retry + per-cluster limit, Lever paging, hot companies first in the sync queue
import assert from "node:assert/strict";
const { fetchWorkday, _wdTest } = await import("../lib/fetchers/workday.js");
const { fetchLever } = await import("../lib/fetchers/greenhouse-lever.js");
const { syncKey, HOT_BOOST_MS } = await import("../api/sync.js");

// ── Workday: a 429 is retried, and no more than 3 requests run at once on one cluster ──
assert.equal(_wdTest.clusterOf({ host: "acme.wd5.myworkdayjobs.com" }), "wd5");
assert.equal(_wdTest.clusterOf({ apiBase: "https://wd1.myworkdaysite.com/wday/cxs/x/y" }), "wd1");
let calls = 0, inFlight = 0, peak = 0, first429 = true;
globalThis.fetch = async (u, o = {}) => {
  calls++; inFlight++; peak = Math.max(peak, inFlight);
  await new Promise((r) => setTimeout(r, 15));
  inFlight--;
  if (String(u).includes("/jobs") && first429 && String(u).includes("t0.")) { first429 = false; return { ok: false, status: 429, headers: { get: () => "0" }, json: async () => ({}) }; }
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ total: 1, facets: [], jobPostings: [{ externalPath: "/job/Austin-TX/Mechanical-Engineering-Intern_R1", title: "Mechanical Engineering Intern", locationsText: "Austin, TX" }] }) };
};
const cfgs = Array.from({ length: 14 }, (_, i) => ({ id: "w" + i, host: `t${i}.wd5.myworkdayjobs.com`, tenant: "t" + i, site: "Ext" }));
const results = await Promise.all(cfgs.map((c) => fetchWorkday(c)));
assert.ok(results.every((r) => r.length === 1), "every company returned its job, including the one that got a 429 first");
assert.ok(peak <= _wdTest.PER_CLUSTER, `at most ${_wdTest.PER_CLUSTER} at once on wd5 (saw ${peak})`);
console.log("✓ Workday: 429 waits and retries; capped requests per cluster");

// a 429 that never clears still fails the company (after 2 retries), so the sync logs it
globalThis.fetch = async () => ({ ok: false, status: 429, headers: { get: () => "0" }, json: async () => ({}) });
await assert.rejects(fetchWorkday({ id: "busy", host: "busy.wd1.myworkdayjobs.com", tenant: "busy", site: "x" }), /Workday HTTP 429/);
console.log("✓ Workday: a lasting 429 still reports an error");

// ── Lever: paged, all postings collected ──
const urls = [];
globalThis.fetch = async (u) => { urls.push(String(u)); const skip = +new URL(String(u)).searchParams.get("skip");
  const n = skip === 0 ? 200 : skip === 200 ? 37 : 0;
  return { ok: true, status: 200, json: async () => Array.from({ length: n }, (_, i) => ({ id: `p${skip + i}`, text: "Intern " + (skip + i), categories: { location: "Austin, TX" }, hostedUrl: "https://jobs.lever.co/x/" + (skip + i), createdAt: 1730000000000 })) }; };
const lev = await fetchLever({ id: "lv", token: "acme" });
assert.equal(lev.length, 237); assert.equal(urls.length, 2, "stops when a page comes back short");
assert.match(urls[0], /limit=200&skip=0/);
console.log("✓ Lever: read in pages of 200 (no 6 MB single download)");

// ── Sync queue: never-synced first, then oldest, with companies posting now pulled forward 3 hours ──
const now = Date.parse("2026-11-06T20:00:00Z"), h = 3600e3;
const last = { a: new Date(now - 4 * h).toISOString(), b: new Date(now - 2 * h).toISOString(), c: new Date(now - 5 * h).toISOString() };
const order = ["a", "b", "c", "new"].sort((x, y) => syncKey(x, last, new Set(["b"])) - syncKey(y, last, new Set(["b"])));
assert.deepEqual(order, ["new", "b", "c", "a"], "b (hot, 2h ago) counts as 5h ago → ahead of a (4h)");
assert.equal(HOT_BOOST_MS, 3 * h);
console.log("✓ sync queue: hot companies re-read about twice as often");
console.log("BOTS SPEED TESTS PASSED");

// ── Gone boards: empty or 404 on every read for 24h+ → listings close (link-confirmed ones stay) ──
{
  const { goneSince, GONE_AFTER_MS } = await import("../api/sync.js");
  const t = Date.parse("2026-11-06T20:00:00Z"), hr = 3600e3, at = (hAgo) => new Date(t - hAgo * hr).toISOString();
  const empty = (hAgo) => ({ ran_at: at(hAgo), ok: false, raw_count: 0, error: "Board returned 0 jobs; kept existing listings. Check the fetcher." });
  assert.ok(goneSince([empty(0), empty(8), empty(16), empty(25)], t), "empty for 25h → gone");
  assert.equal(goneSince([empty(0), empty(8), empty(16)], t), null, "only 16h → wait");
  assert.equal(goneSince([empty(0), { ran_at: at(6), ok: true, raw_count: 40 }, empty(30)], t), null, "saw jobs 6h ago → streak broken");
  assert.equal(goneSince([empty(0), { ran_at: at(10), ok: false, raw_count: 0, error: "timed out after 19s" }, empty(30)], t), null, "a timeout breaks the streak (unknown, not empty)");
  assert.ok(goneSince([{ ran_at: at(0), ok: false, raw_count: 0, error: "x: Greenhouse HTTP 404" }, { ran_at: at(26), ok: false, raw_count: 0, error: "x: Greenhouse HTTP 404" }], t), "404 for 26h → gone");
  assert.equal(GONE_AFTER_MS, 24 * hr);
  console.log("✓ gone boards: 24h of empty/404 closes listings; timeouts and real jobs reset it");
}
