// scripts/cc-careers.mjs — Careers Finder (GitHub Actions, weekly; Nov 21 2026). See lib/ccfind.js.
//   node scripts/cc-careers.mjs [--dry] [--limit=N] [--crawls=2]
// For every company parked as no_board / blocked: look up its careers pages in Common Crawl's public index (raw index
// slices on data.commoncrawl.org, the same files Board Scout reads), read the archived copies, and hand back
//   - job-board links found on their own page  → the finder re-checks that board (proof rules unchanged)
//   - the real careers page address            → the finder visits it live and follows it like any careers page.
import zlib from "node:zlib";
import { get, mapLimit } from "../lib/http.js";
import { latestCrawls } from "../lib/scout.js";
import { surtOf, lineIsDomain, blocksFor, parseIndexLine, pickCaptures, warcHtml, boardLinks } from "../lib/ccfind.js";

const SITE = process.env.SITE || "https://www.beatthepile.com";
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const DRY = process.argv.includes("--dry");
const LIMIT = +arg("limit", 5000), CRAWLS = +arg("crawls", 2), MAX_MIN = +arg("minutes", 150);
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` };
const post = (body) => fetch(`${SITE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new Error(`${body.action} → ${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); });
const t0 = Date.now(), late = () => Date.now() - t0 > MAX_MIN * 60e3;
const CC = "https://data.commoncrawl.org/cc-index/collections";

async function range(url, off, len, tries = 3) {
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise((r) => setTimeout(r, 3000 * i));
    try { const g = await get(url, { timeoutMs: 60000, headers: { Range: `bytes=${off}-${+off + +len - 1}` } }); if (g.ok) return zlib.gunzipSync(Buffer.from(await g.arrayBuffer())).toString("utf8"); } catch { /* retry */ }
  }
  return null;
}

const given = arg("domains", "");     // test runs: --dry --domains=a.com,b.com (no database needed)
const { companies = [] } = given ? { companies: given.split(",").map((d, i) => ({ id: "t" + i, company: d, domain: d })) } : await post({ action: "parked_list" });
const todo = companies.filter((c) => c.domain && surtOf(c.domain)).slice(0, LIMIT);
console.log(`${companies.length} parked companies · ${todo.length} with a website to look up`);
const bySurt = new Map(); for (const c of todo) { const s = surtOf(c.domain); (bySurt.get(s) || bySurt.set(s, []).get(s)).push(c); }

// 1) index lines for each domain, newest crawl first
const lines = new Map();   // surt → [index lines]
for (const crawl of await latestCrawls(CRAWLS)) {
  if (late()) break;
  const base = `${CC}/${crawl}/indexes/`;
  const idx = (await (await get(base + "cluster.idx", { timeoutMs: 180000 })).text()).split("\n").filter(Boolean);
  const keys = idx.map((l) => l.slice(0, l.indexOf(" ")));
  const want = new Map();   // block index → [surts]
  for (const s of bySurt.keys()) { const [lo, hi] = blocksFor(keys, s); for (let i = lo; i <= hi; i++) (want.get(i) || want.set(i, []).get(i)).push(s); }
  let done = 0, failed = 0;
  await mapLimit([...want.entries()], 8, async ([i, surts]) => {
    if (late()) return;
    const [, file, off, len] = idx[i].split("\t");
    const text = await range(base + file, off, len);
    if (text === null) { failed++; return; }
    for (const l of text.split("\n")) for (const s of surts) if (lineIsDomain(l, s)) (lines.get(s) || lines.set(s, []).get(s)).push(l);
    if (++done % 500 === 0) console.log(`  ${crawl}: ${done}/${want.size} index slices`);
  });
  console.log(`${crawl}: read ${done} of ${want.size} index slices (${failed} failed) · ${lines.size} domains seen so far`);
}

// 2) archived careers pages → board links + the real careers address
const results = [];
let pages = 0, withBoards = 0, withCareers = 0;
await mapLimit([...bySurt.entries()], 12, async ([s, cos]) => {
  if (late()) return;
  const rows = (lines.get(s) || []).map(parseIndexLine).filter(Boolean);
  const caps = pickCaptures(rows.map((r) => JSON.stringify(r)).join("\n"), cos[0].domain, 5);
  if (!caps.length) return;
  const boards = new Map(); let careers = null, at = null, page = null;
  for (const c of caps) {
    const rec = await range(`https://data.commoncrawl.org/${c.filename}`, c.offset, c.length, 2);
    if (rec === null) continue;
    pages++;
    const html = warcHtml(rec);
    if (!careers) { careers = c.clean; at = c.timestamp; }
    for (const b of boardLinks(html)) if (!boards.has(b.url)) { boards.set(b.url, b); if (!page) { page = c.url; at = c.timestamp; } }
  }
  if (boards.size) withBoards++; else if (careers) withCareers++;
  for (const co of cos) results.push({ id: co.id, careers, boards: [...boards.values()].slice(0, 4), page, at });
});
console.log(`Read ${pages} archived pages · ${withBoards} companies with a job-board link · ${withCareers} more with only a careers page`);
const sample = results.filter((r) => r.boards.length).slice(0, 15).map((r) => `${r.id}: ${r.boards.map((b) => b.ats).join(",")} (${r.page})`);
console.log(sample.join("\n"));

// 3) hand them to the finder
let queued = 0;
if (!DRY) for (let i = 0; i < results.length; i += 200) { const r = await post({ action: "parked_cc", results: results.slice(i, i + 200) }); queued += r.queued || 0; }
const summary = `Looked up ${todo.length} parked companies in Common Crawl · ${withBoards} had a job-board link · ${withCareers} a careers page · ${queued} sent for a re-check`;
console.log(summary);
if (!DRY) await post({ action: "botlog", bot: "ccfind", ok: true, summary, stats: { looked: todo.length, withBoards, withCareers, queued, pages } }).catch((e) => console.warn(e.message));
