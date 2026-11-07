const { latestCrawls, enumerate, scout } = await import(process.cwd() + "/lib/scout.js");
const all = await enumerate(await latestCrawls(2), ["paylocity", "ukg"]);
const pick = new Map([...all].filter(([, b]) => b.ats === "paylocity").slice(1000, 1400).concat([...all].filter(([, b]) => b.ats === "ukg").slice(400, 900)));
const t0 = Date.now();
const { found, checked, busy } = await scout(pick, { concurrency: 14, deadline: t0 + 5.5 * 6e4 });
console.log("probed", checked.length, "busy", busy, "found", found.length, Math.round((Date.now() - t0) / 1000) + "s");
for (const f of found) console.log("FOUND", f.ats, "|", f.company, "|", f.domain, "|", f.interns, "|", f.sample[0]);
console.log("PROBE_RESULT", found.length);
