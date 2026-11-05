// /c/<id> company pages + /sitemap.xml (server-rendered HTML; live data only; honest 404/503)
import assert from "node:assert/strict";
import { installFake, invoke, env } from "./fakedb.mjs";
env();
const f = installFake({});
const L = f.T("listings"), now = new Date().toISOString();
const row = (id, title, field, state, closed = null) => L.push({ id: "x-lockheed-martin:" + id, company_id: "x-lockheed-martin", company: "Lockheed Martin", title, field, state,
  location: state === "PA" ? "King of Prussia, PA" : "Orlando, FL", url: "https://lmco.wd1.myworkdayjobs.com/en-US/x/" + id, first_seen: now, closed_at: closed, link_ok: null, match: null });
row(1, "Software Engineer Intern", "software", "PA"); row(2, "Software Engineer Intern", "software", "FL"); row(3, "Finance Intern <script>", "finance", "PA");
row(4, "Old Closed Intern", "finance", "PA", now);
const listings = (await import("../api/listings.js")).default;

let r = await invoke(listings, { method: "GET", query: { page: "x-lockheed-martin" } });
assert.equal(r.code, 200);
const h = String(r.body);
assert.ok(/<title>Lockheed Martin internships — 3 open now/.test(h), "title says how many are open");
assert.ok(h.includes('rel="canonical" href="https://www.beatthepile.com/c/x-lockheed-martin"'));
assert.ok(h.includes("2 states") && h.includes("lmco.wd1.myworkdayjobs.com"), "states + their own board");
assert.ok(!h.includes("Old Closed Intern"), "closed jobs never shown");
assert.ok(!h.includes("<script>\"") && h.includes("Finance Intern &lt;script&gt;"), "titles are escaped");
assert.ok(h.includes("Summer '26") && h.includes("usually opens (estimate)"), "Radar history from radar.json, labeled as estimate");
assert.ok(/Student reviews[\s\S]*never made up/.test(h), "no fake reviews");
console.log("✓ company page: live roles only, escaped, history + estimate labeled, canonical URL");

r = await invoke(listings, { method: "GET", query: { page: "no-such-company-zz" } });
assert.equal(r.code, 404); assert.ok(String(r.body).includes("noindex"));
r = await invoke(listings, { method: "GET", query: { page: "../../etc" } }); assert.equal(r.code, 404);
f.failNext = (url) => url.pathname.includes("listings");
r = await invoke(listings, { method: "GET", query: { page: "x-lockheed-martin" } }); assert.equal(r.code, 503, "database trouble is not 'no jobs'");
console.log("✓ company page: unknown → 404 (noindex), bad id → 404, DB down → 503");

r = await invoke(listings, { method: "GET", query: { sitemap: "1" } });
assert.equal(r.code, 200); assert.ok(String(r.body).includes("<loc>https://www.beatthepile.com/c/x-lockheed-martin</loc>") && String(r.body).includes("<loc>https://www.beatthepile.com/jobs/</loc>"));
console.log("✓ sitemap: main pages + every company hiring now");
