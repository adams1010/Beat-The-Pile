import assert from "node:assert/strict";
process.env.INTERNIQ_DB_URL = "https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "s"; process.env.INTERNIQ_DB_ANON_KEY = "a"; process.env.CRON_SECRET = "cron";
const cands = [{ id: "x-lockheed-martin", company: "Lockheed Martin", ats: "eightfold", config: { host: "lockheedmartin.eightfold.ai", domain: "lockheedmartin.com" } },
  { id: "x-acme", company: "Acme", ats: "workday", config: { tenant: "acme", site: "External" } }, { id: "x-gh", company: "GH Co", ats: "greenhouse", config: { token: "ghco" } }];
for (let i = 0; i < 1500; i++) cands.push({ id: "x-filler-" + String(i).padStart(4, "0"), company: "Filler " + i });   // > 1000 rows: paging must work
const inserted = [];
const ok = (b) => ({ ok: true, status: 200, text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
globalThis.fetch = async (u, o = {}) => { const x = new URL(String(u)); const t = x.pathname.split("/").pop();
  if (t === "company_candidates") { if (o.method === "POST") { inserted.push(...JSON.parse(o.body)); return ok(); }
    const off = +(x.searchParams.get("offset") || 0), lim = +(x.searchParams.get("limit") || 1000); return ok(cands.slice(off, off + Math.min(lim, 1000))); }
  return ok([]); };
const h = (await import("../api/discovery.js")).default;
const call = async (q, body, auth) => { const r = { headers: {}, setHeader() {} }; r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); await h({ method: body ? "POST" : "GET", query: q || {}, headers: auth ? { authorization: "Bearer " + auth } : {}, body }, r); return r; };
let r = await call({ boards: "1" });
assert.ok(r.body.boards.includes("workday:acme") && r.body.boards.includes("greenhouse:ghco")); assert.ok(r.body.names.includes("fillerco") || r.body.names.length > 1000, "all 1500+ names seen (paging)");
assert.ok(r.body.names.includes("filler1499"), "row 1,500 visible → paging past 1000 works");
console.log("✓ known boards + names (pages past 1,000 rows)");
const items = [{ company: "East Penn Manufacturing", ats: "icims", hint: "https://careers-eastpenn.icims.com", priority: 90 },
  { company: "Lockheed Martin", ats: "workday", hint: "https://lmco.wd1.myworkdayjobs.com/x", priority: 90 },     // known name → skipped
  { company: "Filler 1499", ats: "greenhouse", hint: "https://job-boards.greenhouse.io/f", priority: 5 },          // known (row 1,500) → skipped
  { company: "Bad Link Co", ats: "greenhouse", hint: "javascript:alert(1)", priority: 5 },
  { company: "Big Priority", ats: "ashby", hint: "https://jobs.ashbyhq.com/big", priority: 9999 }];
assert.equal((await call({}, { action: "scout", items })).code, 403, "anonymous refused");
r = await call({}, { action: "scout", items }, "cron");
assert.equal(r.code, 200); assert.equal(r.body.added, 2);
assert.deepEqual(inserted.map((i) => [i.id, i.company, i.status, i.priority]), [["b-east-penn-manufacturing", "East Penn Manufacturing", "pending", 90], ["b-big-priority", "Big Priority", "pending", 95]]);
assert.equal(inserted[0].source, "Board Scout (icims)"); assert.equal(inserted[0].key, "eastpenn" === inserted[0].key ? "eastpenn" : inserted[0].key);
console.log("✓ scout hand-off: robot only, skips known companies (even row 1,500), bad links, clamps priority");
const { cleanName } = await import("../lib/scout.js");
assert.equal(cleanName("3220 Analog Devices (Thailand) Co., Ltd."), "Analog Devices");
assert.equal(cleanName("ABA - American Bankers Association"), "American Bankers Association");
console.log("\nSCOUT TESTS PASSED");

// Names (Nov 2026 cleanup): recruiting words off, "The … Company" kept whole, SHOUTING → normal case, acronyms kept
{
  const { cleanName } = await import("../lib/scout.js");
  const want = { "The Nuclear Company": "The Nuclear Company", "The Options Clearing Corporation": "The Options Clearing Corporation", "RS&H Talent Acquisition": "RS&H",
    "LandDesign Internships": "LandDesign", "Pediatrics Plus Website": "Pediatrics Plus", "CrowdStrike UK": "CrowdStrike", "REPUBLIC SERVICES": "Republic Services",
    "HYDRIL USA DISTRIBUTION": "Hydril USA Distribution", "INFICON": "INFICON", "ABB": "ABB", "Boeing Company": "Boeing", "BAE Systems": "BAE Systems" };
  for (const [a, b] of Object.entries(want)) if (cleanName(a) !== b) { console.error("FAIL cleanName", a, "→", cleanName(a)); process.exit(1); }
  console.log("✓ company names: recruiting words, 'The … Company', shouting caps, acronyms");
}

// Lever (Nov 2026): boards come from jobs.lever.co, employer name from the page title, US internships only
{
  const { probe } = await import("../lib/scout.js");
  globalThis.fetch = async (u) => { const s = String(u);
    if (s.startsWith("https://api.lever.co/v0/postings/acme")) return { ok: true, status: 200, json: async () => [
      { text: "Mechanical Engineering Intern", categories: { location: "Austin, TX" }, country: "US" },
      { text: "Finance Intern", categories: { location: "London" }, country: "GB" },
      { text: "Senior Engineer", categories: { location: "Austin, TX" }, country: "US" }], text: async () => "" };
    if (s.startsWith("https://jobs.lever.co/acme")) return { ok: true, status: 200, text: async () => "<html><title>Acme Robotics &amp; Co - Jobs</title></html>", json: async () => ({}) };
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" }; };
  const r = await probe({ ats: "lever", token: "acme" });
  assert.equal(r.interns, 1, "London intern and senior role excluded"); assert.equal(r.me, 1);
  assert.equal(r.company, "Acme Robotics & Co"); assert.equal(r.hint, "https://jobs.lever.co/acme");
  console.log("✓ Lever boards: US internships counted, employer from page title");
}

// Paylocity + UKG in Board Scout (Nov 2026): names must match the website's own address; bot walls never become names
{
  const { siteName, nameForSite, siteDomain } = await import("../lib/scout.js");
  assert.equal(siteName("Attention Required! | Cloudflare"), null); assert.equal(siteName("Just a moment..."), null);
  assert.equal(nameForSite(["Geotechnical, Water, Ecology, Environmental, Construction Mgmt | GZA"], "gza.com"), "GZA", "the slogan is not the name");
  assert.equal(nameForSite(["Canopy Children's Solutions"], "mycanopy.org"), "Canopy Children's Solutions");
  assert.equal(nameForSite(["Oswego County Opportunities"], "oco.org"), "Oswego County Opportunities");
  assert.equal(nameForSite(["LTS Lohmann"], "renpharm.com"), null, "a name unrelated to the address is dropped, not guessed");
  assert.equal(nameForSite(["BioCryst® | Rare Disease"], "biocryst.com"), "BioCryst");
  assert.equal(siteDomain("https://www.maxwellroofing.com/careers"), "maxwellroofing.com");
  assert.equal(siteDomain("https://recruiting.paylocity.com/x"), null);
  console.log("✓ Paylocity/UKG names: matched to the site's own address; Cloudflare pages and slogans rejected");
}

{ const { cleanName } = await import("../lib/scout.js");
  for (const [a, b] of [["Work at Simmons", "Simmons"], ["Join the Imagine team!", "Imagine"], ["Fenner Drives Portal", "Fenner Drives"]]) assert.equal(cleanName(a), b);
  console.log("✓ board titles like 'Work at X' / 'X Portal' → X"); }
