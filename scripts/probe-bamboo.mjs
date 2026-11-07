const { latestCrawls, enumerate, scout } = await import(process.cwd() + "/lib/scout.js");
const { discoverOne } = await import(process.cwd() + "/lib/discover.js");
const { fetchCompany } = await import(process.cwd() + "/lib/fetchers/index.js");
const all = await enumerate(await latestCrawls(2), ["bamboohr"]);
console.log("bamboohr boards", all.size);
const pick = new Map([...all].slice(0, 1200)); const t0 = Date.now();
const { found, checked } = await scout(pick, { concurrency: 14, deadline: t0 + 3.5 * 6e4 });
console.log("probed", checked.length, "found", found.length, Math.round((Date.now() - t0) / 1000) + "s");
for (const f of found.slice(0, 40)) console.log("FOUND", f.company, "|", f.interns, "|", f.sample[0]);
let live = 0;
for (const f of found.slice(0, 8)) {
  const r = await discoverOne({ company: f.company, key: f.company.toLowerCase().replace(/[^a-z0-9]/g, ""), hint: f.hint }, { deadline: Date.now() + 20000 });
  if (r.status === "live") { live++; const { listings } = await fetchCompany({ id: "t", ats: r.ats, ...r.config, company: f.company }); console.log("LIVE", f.company, "|", r.detail, "|", listings.length, "listings |", listings.slice(0, 2).map((l) => `${l.title} @ ${l.location} [${l.field}] ${l.geo_kind}`).join(" ; ")); }
  else console.log("HELD", f.company, r.status, r.detail);
}
console.log("PROBE_RESULT", found.length, live);
