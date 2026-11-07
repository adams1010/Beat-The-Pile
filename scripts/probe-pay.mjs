import zlib from "node:zlib";
const CC = "https://data.commoncrawl.org/cc-index/collections";
const crawl = (await (await fetch("https://index.commoncrawl.org/collinfo.json")).json())[0].id;
const base = `${CC}/${crawl}/indexes/`;
const lines = (await (await fetch(base + "cluster.idx")).text()).split("\n").filter(Boolean);
const keyOf = (l) => l.slice(0, l.indexOf(" "));
async function urls(p) {
  let lo = -1, hi = -1;
  for (let i = 0; i < lines.length; i++) { const k = keyOf(lines[i]); if (k < p) lo = i; else if (k.startsWith(p)) hi = i; else if (k > p) break; }
  const out = [];
  for (let i = lo; i <= Math.max(lo, hi); i++) { const [, file, off, len] = lines[i].split("\t");
    const g = await fetch(base + file, { headers: { Range: `bytes=${off}-${+off + +len - 1}` } }); if (!g.ok) continue;
    for (const l of zlib.gunzipSync(Buffer.from(await g.arrayBuffer())).toString().split("\n")) { if (!l.startsWith(p)) continue; const j = l.indexOf("{"); try { out.push(JSON.parse(l.slice(j)).url); } catch {} } }
  return out;
}
const UA = { "User-Agent": "Mozilla/5.0 (compatible; BeatThePileBot/1.0; +https://www.beatthepile.com/)" };
const pay = [...new Set((await urls("com,paylocity,recruiting)/")).map((u) => (u.match(/jobs\/(?:All|List)\/([0-9a-f-]{36})/i) || [])[1]).filter(Boolean).map((x) => x.toLowerCase()))];
console.log("paylocity guids", pay.length);
for (const g of pay.slice(0, 6)) {
  try { const h = await (await fetch(`https://recruiting.paylocity.com/recruiting/jobs/All/${g}`, { headers: UA })).text();
    const m = h.match(/window\.pageData\s*=\s*(\{.*?\});\s*(?:\n|<\/script>)/s); const d = m ? JSON.parse(m[1]) : {};
    const j0 = (d.Jobs || [])[0] || {};
    console.log("PAY", g, "| title:", (h.match(/<title>([^<]*)/) || [])[1], "| keys:", Object.keys(d).join(","), "| job keys:", Object.keys(j0).join(","), "| sample:", JSON.stringify({ c: d.CompanyName, w: d.CompanyWebsite, l: d.LogoUrl, jt: j0.JobTitle, loc: j0.JobLocation }).slice(0, 300));
    const site = (h.match(/href="(https?:\/\/(?![^"]*paylocity)[^"]+)"/gi) || []).slice(0, 5); console.log("   links:", site.join(" "));
  } catch (e) { console.log("PAY", g, "ERR", e.message); }
}
const ukg = [...new Set((await urls("com,ultipro,")).map((u) => (u.match(/(recruiting2?\.ultipro\.com\/[A-Z0-9]+\/JobBoard\/[0-9a-f-]{36})/i) || [])[1]).filter(Boolean))];
console.log("ukg boards", ukg.length);
for (const b of ukg.slice(0, 6)) {
  try { const h = await (await fetch(`https://${b}/`, { headers: UA })).text();
    console.log("UKG", b, "| title:", (h.match(/<title>([^<]*)/) || [])[1]?.trim(), "| company?", (h.match(/"CompanyName"\s*:\s*"([^"]+)"|companyName\s*[:=]\s*["']([^"']+)/i) || []).slice(1).join(""), "| links:", (h.match(/href="(https?:\/\/(?![^"]*(ultipro|ukg))[^"]+)"/gi) || []).slice(0, 4).join(" "));
  } catch (e) { console.log("UKG", b, "ERR", e.message); }
}
console.log("PROBE_RESULT done");
