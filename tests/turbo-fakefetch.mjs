// (not a test: no -test suffix) Preload for tests/turbo-retry-test.mjs: fakes /api/discovery and a Workday cluster that answers 429 at first
const hits = {}; let saved = [];
globalThis.fetch = async (u, o = {}) => {
  u = String(u);
  const json = (b, status = 200) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => b, text: async () => JSON.stringify(b) });
  if (u.includes("/api/discovery?bots=1")) return json({ bots: [{ id: "turbo", enabled: true }] });
  if (u.includes("/api/discovery")) {
    const b = JSON.parse(o.body);
    if (b.action === "turbo_list") return json({ runStart: "t", companies: ["a", "b", "c"].map((x) => ({ id: "wd-" + x, company: x, ats: "workday", host: `${x}.wd5.myworkdayjobs.com`, tenant: x, site: "S" })) });
    if (b.action === "turbo_save") { saved.push(...b.results); process.env.__SAVED = JSON.stringify(saved); return json({ results: b.results.map((r) => ({ id: r.id, ok: !r.error, busy: !!r.busy, kept: (r.listings || []).length })) }); }
    if (b.action === "botlog") { console.log("BOTLOG " + JSON.stringify(b)); return json({ ok: true }); }
  }
  if (u.includes("myworkdayjobs.com")) {
    const n = (hits.wd = (hits.wd || 0) + 1);
    if (n <= 9) return json({}, 429);                           // the cluster is busy for the first requests
    return json({ total: 2, facets: [], jobPostings: [{ title: "Patient Transporter", externalPath: "/job/Salt-Lake-City-UT/x_" + n, locationsText: "Salt Lake City, UT" }] });
  }
  return json({}, 404);
};
process.on("exit", () => console.log("SAVED " + JSON.stringify(saved.map((r) => ({ id: r.id, busy: !!r.busy, n: (r.listings || []).length })))));
