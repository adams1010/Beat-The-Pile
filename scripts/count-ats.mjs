// One-off: how many distinct company boards does each job system we DON'T read yet have in the latest Common Crawl?
import zlib from "node:zlib";
const CC = "https://data.commoncrawl.org/cc-index/collections";
const crawl = (await (await fetch("https://index.commoncrawl.org/collinfo.json")).json())[0].id;
const base = `${CC}/${crawl}/indexes/`;
const lines = (await (await fetch(base + "cluster.idx")).text()).split("\n").filter(Boolean);
const keyOf = (l) => l.slice(0, l.indexOf(" "));
const P = {
  workable: ["com,workable,apply)/", /apply\.workable\.com\/(?:j\/)?([a-z0-9-]+)/i],
  bamboohr: ["com,bamboohr,", /\/\/([a-z0-9-]+)\.bamboohr\.com/i],
  jobvite: ["com,jobvite,jobs)/", /jobs\.jobvite\.com\/([a-z0-9-]+)/i],
  recruitee: ["com,recruitee,", /\/\/([a-z0-9-]+)\.recruitee\.com/i],
  breezy: ["hr,breezy,", /\/\/([a-z0-9-]+)\.breezy\.hr/i],
  jazzhr: ["com,applytojob,", /\/\/([a-z0-9-]+)\.applytojob\.com/i],
  rippling: ["com,rippling,ats)/", /ats\.rippling\.com\/([a-z0-9-]+)/i],
  dayforce: ["com,dayforcehcm,jobs)/", /jobs\.dayforcehcm\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([a-z0-9-]+)/i],
  avature: ["net,avature,", /\/\/([a-z0-9-]+)\.avature\.net/i],
  teamtailor: ["com,teamtailor,", /\/\/([a-z0-9-]+)\.teamtailor\.com/i],
  paylocity_now: ["com,paylocity,recruiting)/", /recruiting\.paylocity\.com\/recruiting\/jobs\/All\/([a-z0-9-]+)/i],
  ukg_now: ["com,ultipro,", /ultipro\.com\/([A-Z0-9]+)\/JobBoard/i],
};
const out = {};
for (const [name, [p, re]] of Object.entries(P)) {
  let lo = -1, hi = -1;
  for (let i = 0; i < lines.length; i++) { const k = keyOf(lines[i]); if (k < p) lo = i; else if (k.startsWith(p)) hi = i; else if (k > p) break; }
  const slugs = new Set(); let blocks = 0;
  for (let i = lo; i <= Math.max(lo, hi) && i >= 0; i++) {
    const [, file, off, len] = lines[i].split("\t"); blocks++;
    try { const g = await fetch(base + file, { headers: { Range: `bytes=${off}-${+off + +len - 1}` } }); if (!g.ok) continue;
      const t = zlib.gunzipSync(Buffer.from(await g.arrayBuffer())).toString();
      for (const l of t.split("\n")) { if (!l.startsWith(p)) continue; const j = l.indexOf("{"); if (j < 0) continue; try { const o = JSON.parse(l.slice(j)); const m = String(o.url).match(re); if (m && !/^(www|api|robots|careers|jobs|app|help|support|static|assets)$/i.test(m[1])) slugs.add(m[1].toLowerCase()); } catch {} }
    } catch {}
  }
  out[name] = { boards: slugs.size, blocks };
  console.log(name, slugs.size, "boards", blocks, "blocks");
}
console.log("PROBE_RESULT", crawl, JSON.stringify(out));
