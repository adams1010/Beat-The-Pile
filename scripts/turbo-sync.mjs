// ⚡ Turbo Sync (Nov 13 2026) — reads every verified company's job board from GitHub's servers, where there's no
// 60-second limit and we can read 24 boards at once. Vercel only stores the results (/api/discovery "turbo_save",
// which uses the same saveResult() as /api/sync: upsert, close jobs that vanished, the empty-board guard, feed_runs).
// Runs from .github/workflows/turbo-sync.yml. Switch: "turbo" on /bots.
//   node scripts/turbo-sync.mjs [--limit=N] [--minutes=M] [--dry]
import { fetchCompany } from "../lib/fetchers/index.js";
import { mapLimit } from "../lib/http.js";

const SITE = process.env.SITE || "https://www.beatthepile.com";
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.split("=")[1] : d; };
const DRY = process.argv.includes("--dry");
const LIMIT = arg("limit", 100000), MINUTES = arg("minutes", 95), AT_ONCE = arg("at", 24), PER_BOARD_S = arg("board", 150);
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` };
const post = async (body) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`${SITE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return j;
      if (r.status < 500) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), { fatal: true });
    } catch (e) { if (e.fatal) throw e; }
    await new Promise((ok) => setTimeout(ok, 3000 * (i + 1)));
  }
  throw new Error("couldn't reach /api/discovery");
};
const botlog = (ok, summary, stats) => DRY ? null : post({ action: "botlog", bot: "turbo", ok, summary, stats }).catch(() => null);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${Math.round(ms / 1000)}s`)), ms))]);

const t0 = Date.now();
const sw = await fetch(`${SITE}/api/discovery?bots=1`).then((r) => r.json()).catch(() => null);
if (sw?.bots?.find((b) => b.id === "turbo")?.enabled === false && !process.argv.includes("--force")) { console.log("Turbo Sync is switched OFF on /bots — skipping"); process.exit(0); }
if (!process.env.CRON_SECRET) { console.log("Add the CRON_SECRET repo secret first"); process.exit(1); }

const { runStart, companies } = await post({ action: "turbo_list" });
const todo = companies.slice(0, LIMIT);
console.log(`${todo.length} companies to read (of ${companies.length}), ${AT_ONCE} at a time, ${MINUTES} min budget`);

// Results go back in small batches (Vercel takes ≤4.5 MB per request; one big hospital board is ~1 MB).
let batch = [], batchBytes = 0, stored = 0, kept = 0, failed = 0, read = 0, busy = 0;
let flushing = Promise.resolve();
const flush = () => {
  if (!batch.length) return flushing;
  const results = batch; batch = []; batchBytes = 0;
  flushing = flushing.then(async () => {
    if (DRY) { stored += results.length; return; }
    try {
      const r = await post({ action: "turbo_save", runStart, results });
      for (const x of r.results || []) { stored++; kept += x.kept || 0; if (!x.ok && !x.busy) failed++; if (x.busy) busy++; }
    } catch (e) { console.warn("save failed:", e.message); failed += results.length; }
  });
  return flushing;
};

await mapLimit(todo, AT_ONCE, async (cfg) => {
  if ((Date.now() - t0) / 6e4 > MINUTES) return;            // out of time: the rest go first next run (oldest first)
  let res;
  try {
    const { raw, listings, partial } = await withTimeout(fetchCompany(cfg), PER_BOARD_S * 1000);
    res = { id: cfg.id, raw, listings, ...(partial ? { partial: true } : {}) };
  } catch (e) { res = { id: cfg.id, error: String(e?.message || e).slice(0, 400), busy: !!e?.busy }; }
  read++;
  const size = JSON.stringify(res).length;
  if (batchBytes + size > 2_500_000 || batch.length >= 40) await flush();
  batch.push(res); batchBytes += size;
  if (read % 200 === 0) console.log(`… ${read} read, ${Math.round((Date.now() - t0) / 6e4)} min`);
});
await flush();

const min = Math.round((Date.now() - t0) / 6e4);
const summary = `Read ${read} job boards in ${min} min · ${kept.toLocaleString("en-US")} jobs kept${failed ? ` · ${failed} boards didn't answer` : ""}`;
console.log(summary);
await botlog(read > 0 && failed < read, summary, { read, stored, kept, failed, busy, minutes: min, of: companies.length });
