// Nov 19: Paylocity boards share one host; Turbo Sync's 24-at-once reads got ~200-350 HTTP 429s a run.
import assert from "node:assert/strict";
let inFlight = 0, maxInFlight = 0, calls = {};
const page = (id) => `<script>window.pageData = ${JSON.stringify({ Jobs: [{ JobId: id, JobTitle: "Mechanical Engineering Intern", JobLocation: { City: "Roanoke", State: "VA", Country: "USA" } }] })};</script>`;
globalThis.fetch = async (u) => {
  u = String(u); const tok = u.split("/").pop(); calls[tok] = (calls[tok] || 0) + 1;
  inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
  await new Promise((r) => setTimeout(r, 5)); inFlight--;
  const status = tok.startsWith("busy") && calls[tok] < 3 ? 429 : tok === "always" ? 429 : 200;
  return { ok: status === 200, status, url: u, headers: { get: () => null }, text: async () => page(tok.length) };
};
const { fetchPaylocity, parsePaylocity } = await import("../lib/fetchers/more-boards.js");
assert.ok(parsePaylocity(page(7)).length === 1, "fixture parses");
const ids = Array.from({ length: 12 }, (_, i) => `t${i}`);
await Promise.all(ids.map((t) => fetchPaylocity({ id: t, token: t }, { waitMs: 1 })));
assert.ok(maxInFlight <= 3, `at most 3 Paylocity requests at once (saw ${maxInFlight})`);
console.log("✓ Paylocity: at most 3 requests in flight");
const got = await fetchPaylocity({ id: "b", token: "busy1" }, { waitMs: 1 });
assert.equal(got.length, 1); assert.equal(calls.busy1, 3);
console.log("✓ Paylocity: 429 waits and retries");
await assert.rejects(fetchPaylocity({ id: "x", token: "always" }, { waitMs: 1 }), /Paylocity HTTP 429/);
assert.equal(calls.always, 3);
console.log("✓ Paylocity: gives up after 3 tries with the real error");
