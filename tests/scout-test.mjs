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
