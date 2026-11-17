// Nov 17: /api/listings keyset paging (?after=<first_seen>~<id> from meta.next). Deep OFFSETs timed out under load.
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
env(); const f = installFake({});
const L = f.T("listings");
// 25 jobs, many sharing one first_seen (a sync batch) — ties must page by id without skipping or repeating
for (let i = 0; i < 25; i++) L.push({ id: `acme:${String(i).padStart(2, "0")}`, company_id: "acme", company: "Acme", title: "Finance Intern", field: "finance", match: null,
  state: "VA", url: "https://x/" + i, kind: "intern", first_seen: i < 15 ? "2026-11-17T10:00:00.123456+00:00" : `2026-11-1${i % 3}T09:00:00+00:00`, closed_at: null, link_ok: true });
const api = (await import("../api/listings.js")).default;
const get = async (q) => (await invoke(api, { method: "GET", query: { field: "all", ...q } }));
const seen = []; let next = null, pages = 0;
do { const r = await get({ limit: "4", ...(next ? { after: next } : {}) }); assert.equal(r.code, 200, JSON.stringify(r.body)); seen.push(...r.body.listings.map((l) => l.id)); next = r.body.meta.next; pages++; } while (next && pages < 20);
assert.equal(seen.length, 25, "every job once"); assert.equal(new Set(seen).size, 25, "no repeats");
const full = (await get({ limit: "1000" })).body.listings.map((l) => l.id);
assert.deepEqual(seen, full, "same order as one big page");
// bad cursors are refused, not run
for (const after of ["bad", "2026-11-17~x", "2026-11-17T10:00:00Z~acme:1\"),x", "2026-11-17T10:00:00Z"]) assert.equal((await get({ limit: "4", after })).code, 400, after);
assert.equal((await get({ limit: "4", offset: "4", after: "2026-11-17T10:00:00Z~acme:01" })).code, 400, "after + offset");
// the /jobs page pages with the cursor
const page = (await import("node:fs")).readFileSync(new URL("../jobs/index.html", import.meta.url), "utf8");
assert.ok(/&after=\$\{encodeURIComponent\(after\)\}/.test(page) && /next = d\.meta\?\.next/.test(page), "/jobs uses meta.next");
console.log("✓ /api/listings keyset paging: every job once, ties by id, bad cursors refused, /jobs uses it");
