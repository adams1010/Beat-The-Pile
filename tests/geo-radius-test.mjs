// "Within N miles": location text → real Census places (never guessed), distances, the backfill, and /api/listings?near=
import assert from "node:assert/strict";
const g = await import("../lib/geocode.js");
const near = (a, b, mi = 3) => assert.ok(a && g.miles(a, b) <= mi, `${JSON.stringify(a)} should be within ${mi} mi of ${b}`);

// ── real formats seen on company boards (Nov 2026 sample of 13,942 listings) ──
const cases = {
  "Blacksburg, VA": [37.23, -80.42], "St. Louis, MO": [38.63, -90.24], "New York, NY": [40.70, -73.94], "New York City, New York, United States": [40.70, -73.94],
  "Washington D.C.": [38.90, -77.02], "US-TX-HOUSTON-11150 EQUITY DRIVE": [29.78, -95.39], "United States, Wisconsin, Milwaukee": [43.06, -87.97],
  "CT - Hartford": [41.77, -72.68], "King of Prussia, Pennsylvania": [40.10, -75.38], "Winston-Salem, NC": [36.10, -80.26], "Horsham, PA": [40.18, -75.14],
  "Kansas City MO": [39.12, -94.55], "Plano TX": [33.05, -96.75], "US SC Anderson": [34.52, -82.64], "Madison Wisconsin": [43.09, -89.43],
  "Kokomo Technical Center - Indiana - USA": [40.46, -86.13], "MO | US | St. Louis - 6 South Old Orchard": [38.63, -90.24],
  "Irvine, California, California, United States": [33.68, -117.77], "Pittsburgh PA, 15222, PAP, Penn Avenue Place": [40.44, -79.98],
  "Boise, ID - Main Site": [43.60, -116.23], "Braintree, MA": [42.20, -71.00],
  "Lake Saint Louis, MO": [38.79, -90.78], "San Francisco, CA": [37.76, -122.44], "Honolulu, HI": [21.32, -157.85],
};
for (const [q, want] of Object.entries(cases)) near(g.geocode(q).pts[0], want, 6);
console.log(`✓ ${Object.keys(cases).length} real location formats land on the right city`);

// ── never guess: wrong-but-plausible matches we caught in the audit stay unplaced ──
for (const q of ["San Francisco Bay Area, California, United States", "Ohio", "Georgia", "Hamilton, NJ", "Monroe Township, NJ", "Salt, UT", "Washington, Washington"])
  assert.equal(g.geocode(q).pts.length, 0, `${q} must not get a point (region, state, two same-name towns, or truncated)`);
// "Lewis Center, OH" is not the town of Lewis; known work sites that aren't Census places use their own ZIP area
near(g.geocode("Lewis Center, Ohio").pts[0], [40.18, -82.99], 4); near(g.geocode("Hunt Valley, MD").pts[0], [39.49, -76.65], 5);
near(g.geocode("Cranberry Township, Pennsylvania").pts[0], [40.69, -80.11], 4);
near(g.geocode("Wyoming, Michigan").pts[0], [42.89, -85.71]);   // another state's name can be a city
assert.deepEqual(g.geocode("Remote, OR").pts, [], "the town of Remote, OR is not a job location");
assert.equal(g.geocode("Remote - US").remote, true);
assert.equal(g.geocode("4 Locations").multi, true);
assert.equal(g.geocode("Austin, Texas, United States; Santa Clara, California, United States").pts.length, 2, "multi-site → every site");
assert.equal(g.geocode("Berlin, Germany").pts.length, 0);
console.log("✓ neighborhoods, regions, states, remote and \"4 Locations\" are never placed by guessing");

// ── data sanity: San Francisco's Census point is offshore; ours must be on land in the city ──
near(g.lookupPlace("San Francisco, CA"), [37.7749, -122.4194], 5);
near(g.lookupPlace("24060"), [37.25, -80.42], 5);
assert.equal(g.lookupPlace("00000"), null);
assert.ok(Math.abs(g.miles([40.7128, -74.006], [34.0522, -118.2437]) - 2445) < 5, "New York → Los Angeles ≈ 2,445 mi (great circle)");
console.log("✓ ZIP lookup, offshore Census points fixed, distance math");

// ── stored columns ──
let f = g.geoFields("Richmond, VA", ["VA"]);
assert.equal(f.geo_kind, "place"); assert.equal(f.geo_n, 1); near([f.geo_lat, f.geo_lng], [37.53, -77.48]);
assert.equal(g.geoFields("Remote", []).geo_kind, "remote");
assert.equal(g.geoFields("Maryland", ["MD"]).geo_kind, "state");
assert.equal(g.geoFields("Boston", ["MA"]).geo_kind, "place", "a bare city uses the listing's one state");
console.log("✓ geoFields: place / remote / state");

// ── API ──
const { installFake, env } = await import("./fakedb.mjs");
env(); process.env.CRON_SECRET = "cron";
const fk = installFake();
const now = Date.now();
const L = (id, location, state, field = "mechanical") => ({ id, company_id: id.split(":")[0], company: id.split(":")[0], title: "Mechanical Engineering Intern", location, state, url: "https://x.wd1.myworkdayjobs.com/" + id, ats: "workday",
  match: "me", field, posted_on: null, first_seen: new Date(now).toISOString(), closed_at: null, link_ok: null, ...g.geoFields(location, [state]) });
fk.T("listings").push(L("a:1", "Roanoke, VA", "VA"), L("b:1", "Richmond, VA", "VA"), L("c:1", "Beckley, WV", "WV"), L("d:1", "Austin, TX", "TX"),
  L("e:1", "Austin, Texas; Christiansburg, Virginia", "TX,VA"), L("f:1", "Remote", "VA"), L("g:1", "Maryland", "MD"), L("h:1", "4 Locations", "VA"),
  L("i:1", "Salem, VA", "VA", "finance"));
const h = (await import("../api/listings.js")).default;
const call = async (query) => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); await h({ method: "GET", query, headers: {} }, r); return r; };
let r = await call({ near: "24060", mi: "50", field: "mechanical" });
assert.equal(r.code, 200);
assert.deepEqual(r.body.listings.map((l) => l.id), ["e:1", "a:1"], "Christiansburg site (~8 mi) and Roanoke (~25 mi) — nearest first; Beckley WV (54 mi) and Richmond (162 mi) out");
assert.ok(r.body.listings[0].mi <= 10 && r.body.listings[1].mi >= 22 && r.body.listings[1].mi <= 28);
assert.ok(!("geo_pts" in r.body.listings[0]), "points stay server-side");
assert.equal(r.body.meta.near.state, "VA"); assert.equal(r.body.meta.remote, 1); assert.equal(r.body.meta.unplacedInState, 1, "the '4 Locations' VA posting is counted, not hidden");
r = await call({ near: "24060", mi: "100", field: "mechanical" });
assert.deepEqual(r.body.listings.map((l) => l.id), ["e:1", "a:1", "c:1"], "100 mi adds Beckley, WV (radius crosses state lines)");
r = await call({ near: "Blacksburg, VA", mi: "50", field: "all" });
assert.deepEqual(r.body.listings.map((l) => l.id).sort(), ["a:1", "e:1", "i:1"], "city input works; field=all adds the finance one in Salem");
r = await call({ near: "24060", mi: "50", field: "mechanical", limit: "1", offset: "0" });
assert.equal(r.body.listings.length, 1); assert.equal(r.body.meta.more, true); assert.equal(r.body.meta.count, 2);
assert.equal((await call({ near: "99999", field: "all" })).code, 400, "unknown ZIP → plain 400");
assert.equal((await call({ near: "24060", mi: "2" })).code, 400);
assert.equal((await call({ near: "<script>" })).code, 400);
r = await call({ dots: "1", field: "all" });
assert.equal(r.code, 200); assert.equal(r.body.w, 975);
const nDots = r.body.dots.reduce((n, d) => n + d[2], 0);
assert.equal(nDots, r.body.placed, "every placed listing is in exactly one dot");
assert.ok(r.body.placed < r.body.total, "remote / '4 Locations' / state-only listings are counted in total but never drawn");
assert.ok(r.body.dots.every(([x, y]) => x > 0 && x < 975 && y > 0 && y < 610));
r = await call({ near: "24060", mi: "50", field: "mechanical" }); assert.ok(r.body.meta.near.xy[0] > 700 && r.body.meta.near.xy[0] < 820, "Blacksburg sits in Virginia on the map");
console.log("✓ /api/listings?dots=1: homepage map = only real placed listings, nothing guessed");
console.log("✓ /api/listings?near=: radius, nearest first, crosses state lines, paging, honest counts of what isn't on the map");

// ── backfill: old listings without points get them, one update per distinct location ──
fk.T("listings").push({ id: "z:1", company_id: "z", location: "Plano TX", state: "TX", closed_at: null, geo_kind: null }, { id: "z:2", company_id: "z", location: "Plano TX", state: "TX", closed_at: null, geo_kind: null });
const { fillGeo } = await import("../api/sync.js");
const n = await fillGeo(5000);
assert.equal(n, 1, "one PATCH for both Plano rows");
const z = fk.T("listings").filter((x) => x.company_id === "z");
assert.ok(z.every((x) => x.geo_kind === "place" && x.geo_n === 1)); near([z[0].geo_lat, z[0].geo_lng], [33.05, -96.75]);
console.log("✓ backfill fills old listings, grouped by location text");
console.log("\nGEO RADIUS TESTS PASSED");
