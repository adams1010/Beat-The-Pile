// Backlog refill must not skip a company just because a DIFFERENT company's name starts the same way
// (Nov 7 2026: 271 backlog companies were stuck this way — Amazon behind "Amazon (Project Leo)", Squarespace behind "Square").
import assert from "node:assert/strict";
process.env.INTERNIQ_DB_URL = "https://fake.supabase.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "svc"; process.env.INTERNIQ_DB_ANON_KEY = "anon"; process.env.CRON_SECRET = "s";
const T = new Map();
for (const [id, company] of [["b-leo", "Amazon (Project Leo)"], ["b-sq", "Square"], ["b-sony", "Sony Interactive Entertainment"], ["s-meta-x", "Meta"]])
  T.set(id, { id, company, status: "live", enabled: true });
const mk = (s, b) => ({ ok: s < 400, status: s, url: "", headers: new Headers(), text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
globalThis.fetch = async (url, o = {}) => {
  const u = String(url);
  if (!u.includes("/rest/v1/company_candidates")) return mk(200, []);
  if ((o.method || "GET") === "POST") { for (const r of JSON.parse(o.body)) if (!T.has(r.id)) T.set(r.id, r); return mk(201); }
  const x = new URL(u);
  if (x.searchParams.get("status") === "eq.pending") return mk(200, [...T.values()].filter((r) => r.status === "pending"));
  return mk(200, +x.searchParams.get("offset") > 0 ? [] : [...T.values()]);
};
const { refillFromBacklog } = await import("../api/discover.js");
const added = (await refillFromBacklog()).map((x) => x.company);
assert.ok(added.includes("Amazon"), "Amazon is queued even though \"Amazon (Project Leo)\" exists");
assert.ok(!added.includes("Meta"), "an exact name already in the queue is still skipped");
assert.equal(added.length, 60, "a full batch of 60 is pulled");
console.log("✓ backlog refill: exact-name check only (Amazon queued, Meta skipped)");
