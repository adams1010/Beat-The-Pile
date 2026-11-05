// /api/listings?summary=1 → live counts the homepage shows: per-major counts + who's hiring most (closed jobs don't count)
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
env();
const f = installFake({});
const L = f.T("listings"), now = new Date().toISOString();
const row = (id, co, field, closed = null) => L.push({ id, company_id: co.toLowerCase(), company: co, title: "Intern", field, state: "VA", url: "https://x.wd1.myworkdayjobs.com/" + id, first_seen: now, closed_at: closed, link_ok: null, match: null });
row("a1", "Acme", "finance"); row("a2", "Acme", "finance"); row("a3", "Acme", "software"); row("b1", "Beta", "marketing");
row("c1", "Gone", "finance", now);
const listings = (await import("../api/listings.js")).default;
const r = await invoke(listings, { method: "GET", query: { summary: "1" } });
assert.equal(r.code, 200);
assert.equal(r.body.hiringNow, 2, "closed company not counted");
assert.deepEqual(r.body.top.map((c) => [c.company, c.n]), [["Acme", 3], ["Beta", 1]]);
assert.deepEqual(r.body.byField, { finance: 2, software: 1, marketing: 1 });
console.log("✓ summary: hiringNow, top companies and per-major counts from live jobs only");
