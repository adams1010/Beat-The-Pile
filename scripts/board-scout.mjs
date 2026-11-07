// scripts/board-scout.mjs — the Board Scout bot (GitHub Actions, weekly). See lib/scout.js for how it works.
//   node scripts/board-scout.mjs [--dry] [--limit=N] [--crawls=4] [--force]
// State (which boards were already probed, and when) lives in data/scout-state.json; boards are re-probed after
// RECHECK_DAYS because internships are seasonal (a board with none in November may have ten in August).
import fs from "node:fs";
import { latestCrawls, enumerate, scout } from "../lib/scout.js";

const SITE = process.env.SITE || "https://intern-iq-psi.vercel.app";
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const DRY = process.argv.includes("--dry");
const LIMIT = +arg("limit", 20000);
const CRAWLS = +arg("crawls", 4);   // Nov 6 2026: 4 crawls found 4,008 boards 2 crawls missed
const RECHECK_DAYS = 30;
const STATE = "data/scout-state.json";
const MAX_MINUTES = +arg("minutes", 50);
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` };
const botlog = (ok, summary, stats) => DRY ? null : fetch(`${SITE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify({ action: "botlog", bot: "scout", ok, summary, stats }) }).catch(() => null);

const t0 = Date.now();
const sw = await fetch(`${SITE}/api/discovery?bots=1`).then((r) => r.json()).catch(() => null);
if (sw?.bots?.find((b) => b.id === "scout")?.enabled === false && !process.argv.includes("--force")) { console.log("Board Scout is switched OFF on /bots — skipping"); process.exit(0); }

let state = { checked: {} };
try { state = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { /* first run */ }
const known = await fetch(`${SITE}/api/discovery?boards=1`).then((r) => r.json());
const knownBoards = new Set(known.boards || []);

const crawls = await latestCrawls(CRAWLS);
const all = await enumerate(crawls);
const cutoff = Date.now() - RECHECK_DAYS * 864e5;
const todo = new Map();
for (const [k, b] of all) {
  if (knownBoards.has(k)) continue;                                        // already tracked
  const last = state.checked[k]; if (last && Date.parse(last) > cutoff) continue;   // probed recently
  todo.set(k, b);
  if (todo.size >= LIMIT) break;
}
console.log(`Crawls ${crawls.join(", ")}: ${all.size} boards · ${knownBoards.size} already tracked · probing ${todo.size}`);

const { found, checked, busy } = await scout(todo, { concurrency: 14, deadline: t0 + MAX_MINUTES * 6e4, onProgress: (n, f) => console.log(`  …${n} probed, ${f} with internships`) });
const today = new Date().toISOString().slice(0, 10);
for (const k of checked) state.checked[k] = today;
if (busy) console.log(`${busy} boards were rate-limited (Paylocity) — left for the next run`);
console.log(`Probed ${checked.length} boards in ${Math.round((Date.now() - t0) / 1000)}s → ${found.length} with US internships`);
for (const f of found.slice(0, 25)) console.log(`  p${f.priority} ${f.company} (${f.ats}) · ${f.interns} interns, ${f.me} ME · e.g. ${f.sample[0]}`);

let added = 0;
if (!DRY) {
  for (let i = 0; i < found.length; i += 200) {
    const r = await fetch(`${SITE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify({ action: "scout", items: found.slice(i, i + 200) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) console.log(`  ! hand-off failed ${r.status}: ${JSON.stringify(j).slice(0, 200)}`); else added += j.added || 0;
  }
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify({ updated: today, checked: state.checked }));
}
const me = found.filter((f) => f.me).length;
const summary = `Scanned ${all.size.toLocaleString()} job boards · probed ${checked.length.toLocaleString()} new · ${found.length} hiring interns (${me} with ME roles) · ${added} new companies queued`;
console.log(summary);
await botlog(true, summary, { boards: all.size, probed: checked.length, found: found.length, me, added });
