const { latestCrawls, enumerate, probe } = await import(process.cwd() + "/lib/scout.js");
const all = await enumerate(await latestCrawls(1), ["paylocity"]);
const list = [...all.values()].slice(1000, 1300); const c = {};
const { mapLimit } = await import(process.cwd() + "/lib/http.js");
let titles = [];
await mapLimit(list, 10, async (b) => { try { const r = await probe(b); const k = r.interns ? "interns" : "none"; c[k] = (c[k] || 0) + 1; if (r.interns) console.log("HIT", r.company, r.domain, r.sample[0]); } catch (e) { c["err " + e.message.slice(0, 40)] = (c["err " + e.message.slice(0, 40)] || 0) + 1; } });
// raw: how many intern-ish titles exist at all on 100 boards
const { get } = await import(process.cwd() + "/lib/http.js"); const { parsePaylocity } = await import(process.cwd() + "/lib/fetchers/more-boards.js");
let jobs = 0, st = {};
await mapLimit(list.slice(0, 100), 10, async (b) => { const r = await get(`https://recruiting.paylocity.com/recruiting/jobs/All/${b.token}`, { timeoutMs: 12000 }); st[r.status] = (st[r.status] || 0) + 1; if (r.ok) { const j = parsePaylocity(await r.text()); jobs += j.length; titles.push(...j.filter((x) => /intern|co-?op/i.test(x.title)).map((x) => x.title + " @ " + x.location)); } });
console.log("outcomes", JSON.stringify(c), "| http", JSON.stringify(st), "| jobs on 100 boards", jobs, "| intern-ish titles", titles.length, titles.slice(0, 8).join(" ; "));
console.log("PROBE_RESULT ok");
