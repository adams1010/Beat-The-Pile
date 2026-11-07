const { latestCrawls, enumerate } = await import(process.cwd() + "/lib/scout.js");
import zlib from "node:zlib";
const CC = "https://data.commoncrawl.org/cc-index/collections";
const crawl = (await latestCrawls(1))[0]; const base = `${CC}/${crawl}/indexes/`;
const lines = (await (await fetch(base + "cluster.idx")).text()).split("\n").filter(Boolean); const keyOf = (l) => l.slice(0, l.indexOf(" "));
const p = "com,bamboohr,"; let lo = -1, hi = -1;
for (let i = 0; i < lines.length; i++) { const k = keyOf(lines[i]); if (k < p) lo = i; else if (k.startsWith(p)) hi = i; else if (k > p) break; }
const slugs = new Set(), sample = [];
for (let i = lo; i <= hi; i++) { const [, f, o, l] = lines[i].split("\t"); const g = await fetch(base + f, { headers: { Range: `bytes=${o}-${+o + +l - 1}` } });
  for (const x of zlib.gunzipSync(Buffer.from(await g.arrayBuffer())).toString().split("\n")) { if (!x.startsWith(p)) continue; try { const u = JSON.parse(x.slice(x.indexOf("{"))).url; const m = u.match(/\/\/([a-z0-9-]+)\.bamboohr\.com/i); if (m) { slugs.add(m[1].toLowerCase()); if (sample.length < 15 && /careers|jobs/.test(u)) sample.push(u); } } catch {} } }
console.log("slugs", slugs.size, "| sample urls:", sample.join(" "));
const UA = { "User-Agent": "Mozilla/5.0 (compatible; BeatThePileBot/1.0; +https://www.beatthepile.com/)", Accept: "application/json" };
let n = 0;
for (const s of [...slugs].slice(40, 70)) {
  try { const r = await fetch(`https://${s}.bamboohr.com/careers/list`, { headers: UA }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
    const res = j?.result || [];
    if (n++ < 3 || res.some((x) => /intern|co-?op/i.test(x.jobOpeningName))) console.log("LIST", s, r.status, "| keys:", Object.keys(j || {}).join(","), "| n:", res.length, "| first:", JSON.stringify(res[0] || {}).slice(0, 400));
  } catch (e) { console.log("ERR", s, e.message); }
}
for (const s of [...slugs].slice(40, 44)) { const r = await fetch(`https://${s}.bamboohr.com/careers`, { headers: { ...UA, Accept: "text/html" } }); const h = await r.text();
  console.log("PAGE", s, r.status, "| title:", (h.match(/<title>([^<]*)/) || [])[1], "| company:", (h.match(/"companyName"\s*:\s*"([^"]+)"|name="og:site_name" content="([^"]+)"|"name"\s*:\s*"([^"]{2,80})"/) || []).slice(1).filter(Boolean)[0], "| site:", (h.match(/"(?:companyWebsite|website|websiteUrl)"\s*:\s*"([^"]+)"/i) || [])[1]); }
const r2 = await fetch(`https://${[...slugs][41]}.bamboohr.com/careers/company-info`, { headers: UA }); console.log("INFO", r2.status, (await r2.text()).slice(0, 400));
const one = [...slugs][40]; const l = await (await fetch(`https://${one}.bamboohr.com/careers/list`, { headers: UA })).json().catch(() => ({})); const id = l?.result?.[0]?.id;
if (id) { const d = await fetch(`https://${one}.bamboohr.com/careers/${id}/detail`, { headers: UA }); console.log("DETAIL", d.status, (await d.text()).slice(0, 500)); const pg = await fetch(`https://${one}.bamboohr.com/careers/${id}`, { headers: { "User-Agent": UA["User-Agent"] } }); console.log("JOBPAGE", pg.status); const bad = await fetch(`https://${one}.bamboohr.com/careers/99999999`, { headers: { "User-Agent": UA["User-Agent"] } }); console.log("BADJOB", bad.status); }
console.log("PROBE_RESULT ok");
