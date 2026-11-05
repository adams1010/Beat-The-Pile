import assert from "node:assert/strict";
const R = "../";
process.env.INTERNIQ_DB_URL = "https://fake.supabase.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "svc"; process.env.INTERNIQ_DB_ANON_KEY = "anon"; process.env.CRON_SECRET = "s";
const T = new Map();
const mk = (s, b) => ({ ok: s < 400, status: s, url: "", text: async () => (b === undefined ? "" : JSON.stringify(b)), json: async () => b });
// Fake websites: only 3 candidates have reachable boards; one duplicates hand-verified Merck
const web = {
  "https://www.corning.com/careers": { h: `<a href="https://corning.wd1.myworkdayjobs.com/External">jobs</a>` },
  "https://www.merck-dup.com/careers": { h: `<a href="https://msd.wd5.myworkdayjobs.com/SearchJobs">jobs</a>` },
  "https://www.trex.com/careers": { h: `<a href="https://careers-trex.icims.com/">jobs</a>` },
};
globalThis.fetch = async (url, o = {}) => {
  const u = String(url);
  if (u.includes("/rest/v1/")) {
    const x = new URL(u); const table = x.pathname.split("/").pop(); const m = o.method || "GET";
    if (table !== "company_candidates") return mk(200, []);
    if (m === "POST") { for (const r of JSON.parse(o.body)) T.set(r.id, { status: "pending", attempts: 0, enabled: false, checked_at: null, ...(T.get(r.id) || {}), ...r }); return mk(201); }
    if (m === "PATCH") { const id = decodeURIComponent(x.searchParams.get("id").slice(3)); Object.assign(T.get(id), JSON.parse(o.body)); return mk(204); }
    if (x.searchParams.get("enabled") === "eq.true") return mk(200, [...T.values()].filter((r) => r.enabled));
    return mk(200, [...T.values()].filter((r) => r.status === "pending").slice(0, 16));
  }
  if (web[u]) return { ok: true, status: 200, url: u, text: async () => web[u].h };
  if (/wday\/cxs\/(corning|msd)\/\w+\/jobs$/.test(u)) return mk(200, { total: 10, jobPostings: [{ title: "Intern", externalPath: "/job/z_1" }], facets: [] });
  return { ok: false, status: 404, url: u, text: async () => "nf", json: async () => ({}) };
};
const cand = await import(R + "lib/candidates.js");
cand.CANDIDATES.length = 0;
cand.CANDIDATES.push(
  { id: "x-corning", company: "Corning", domain: "corning.com", key: "corning" },
  { id: "x-merck-dup", company: "Merck again", domain: "merck-dup.com", key: "merck" },
  { id: "x-trex", company: "Trex", domain: "trex.com", key: "trex" },
  { id: "x-ghost", company: "Ghost", domain: "ghost.com", key: "ghost" },
);
const handler = (await import(R + "api/discover.js")).default;
const res = () => { const o = {}; o.status = (s) => (o.code = s, o); o.json = (b) => (o.body = b, o); return o; };
let r = res(); await handler({ headers: {} }, r); assert.equal(r.code, 401);
r = res(); await handler({ headers: { authorization: "Bearer s" } }, r);
const st = Object.fromEntries([...T.values()].map((x) => [x.id, x.status + (x.enabled ? "+ON" : "")]));
console.log(st);
const core = Object.fromEntries(Object.entries(st).filter(([k]) => k.startsWith("x-")));
assert.deepEqual(core, { "x-corning": "live+ON", "x-merck-dup": "duplicate", "x-trex": "board_error", "x-ghost": "no_board" });
assert.match(T.get("x-trex").detail, /iCIMS .* answered 404/, "real reason recorded, not \"needs a new scraper\"");
const fromBacklog = [...T.values()].filter((x) => x.source === "Backlog (SimplifyJobs history)");
assert.equal(fromBacklog.length, 60, "queue low → 60 pulled from backlog"); assert.equal(r.body.addedFromBacklog, 60);
assert.ok(fromBacklog.every((x) => x.hint || x.domain), "each has a board link or a domain to start from");
assert.ok(!fromBacklog.some((x) => /^(corning|trex)$/i.test(x.company)), "never re-adds a known company");
console.log("✓ backlog refill: 60 added, all with a starting point");
assert.equal(T.get("x-corning").config.tenant, "corning"); assert.equal(T.get("x-corning").attempts, 1);
console.log("went live:", r.body.wentLive);
const { loadCompanies } = await import(R + "lib/companies.js");
const all = await loadCompanies();
assert.ok(all.find((c) => c.id === "x-corning" && c.host === "corning.wd1.myworkdayjobs.com"));
assert.equal(all.filter((c) => /merck/i.test(c.company)).length, 1);
console.log("loadCompanies ✓ hand-verified", all.length - 1, "+ discovered 1 (no Merck duplicate)");
console.log("\nROBOT RUN LOOP ✓");
