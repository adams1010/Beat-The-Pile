// scripts/insights.mjs — runs the two analyst bots (Gap Finder "gaps", Unlock Finder "unlock") from GitHub (insights.yml)
// and reports each one's numbers to /bots through the private bot log (POST /api/discovery {action:"botlog"}, CRON_SECRET).
// Reads only public things: the map dots in this repo (rebuilt daily by map-dots.yml), Census counties, the college list,
// the public /api/discovery company feed and the public SimplifyJobs internship list. Never touches the database directly.
// Usage: node scripts/insights.mjs [--dry]      (--dry = print the numbers, report nothing)
import fs from "node:fs";
import { KINDS, stateCoverage, jobDeserts, collegeGaps, pipeline, missingBig } from "../lib/insights.js";

const BASE = process.env.BTP_BASE || "https://www.beatthepile.com";
const DRY = process.argv.includes("--dry");
const SIMPLIFY = "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

async function fetchJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error(`answered ${r.status}`); return await r.json(); }
    catch (e) { if (i >= tries) throw new Error(`${url.split("?")[0]}: ${e.message}`); await new Promise((z) => setTimeout(z, 5000 * i)); }
  }
}
async function switches() {
  try { const d = await fetchJson(`${BASE}/api/discovery?bots=1`); return Object.fromEntries((d.bots || []).map((b) => [b.id, b.enabled !== false])); }
  catch { return {}; }                                    // can't read the switch → run (same fail-open rule as every bot)
}
async function report(bot, ok, summary, stats) {
  if (DRY) {                                             // INSIGHTS_OUT=<dir> also saves <bot>.json there (page previews)
    if (process.env.INSIGHTS_OUT) fs.writeFileSync(`${process.env.INSIGHTS_OUT}/${bot}.json`, JSON.stringify({ ok, summary, stats }));
    console.log(`\n[${bot}] ${ok ? "ok" : "FAILED"}: ${summary}\n` + JSON.stringify(stats, null, 1).slice(0, 1500)); return;
  }
  if (!process.env.CRON_SECRET) { console.log(`[${bot}] CRON_SECRET not set, not reporting: ${summary}`); return; }
  const r = await fetch(`${BASE}/api/discovery`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ action: "botlog", bot, ok, summary, stats }) });
  console.log(`[${bot}] reported (${r.status}): ${summary}`);
}

const on = DRY ? {} : await switches();
const counties = readJson("data/us-counties.json").rows;

// ── Gap Finder ──
if (on.gaps !== false) {
  try {
    const dots = Object.fromEntries(KINDS.map((k) => [k, readJson(`map/dots-${k}.json`).dots]));
    const cov = stateCoverage(dots, counties);
    const deserts = jobDeserts(dots.all, counties, { radius: 30, minPop: 100000, top: 15 });
    const internDeserts = jobDeserts(dots.intern, counties, { radius: 50, minPop: 250000, top: 10 });
    const colleges = collegeGaps(dots.intern, readJson("schools/index.json"), readJson("data/us-places.json"), { radius: 50, minGrads: 2000, top: 15 });
    const per = (st) => st[1] ? st[2] / st[1] * 1e4 : 0;
    const low = [...cov.states].filter((s) => s[1] > 300000).sort((a, b) => per(a) - per(b)).slice(0, 3).map((s) => s[0]);
    const nat = cov.national;
    await report("gaps", true,
      `${(nat.all / nat.pop * 1e4).toFixed(0)} jobs per 10k people nationally · fewest: ${low.join(", ")} · ${deserts.length} job deserts · ${colleges.rows.length} colleges short on internships`,
      { at: new Date().toISOString(), totals: { all: nat.all, intern: nat.intern, fulltime: nat.fulltime, hourly: nat.hourly }, national: nat,
        states: cov.states, deserts, internDeserts, colleges: colleges.rows, collegesChecked: colleges.checked });
  } catch (e) { console.error(e); await report("gaps", false, `Gap Finder failed: ${String(e.message).slice(0, 200)}`, null); }
} else console.log("gaps: switched off on /bots");

// ── Unlock Finder ──
if (on.unlock !== false) {
  try {
    const feed = await fetchJson(`${BASE}/api/discovery`);
    const rows = feed.rows || [];
    if (rows.length < 100) throw new Error(`company feed had only ${rows.length} rows`);
    const p = pipeline(rows);
    let simp = null;
    try { simp = missingBig(await fetchJson(SIMPLIFY), rows, { top: 25, handVerified: feed.handVerified || [] }); } catch (e) { console.log("SimplifyJobs list:", e.message); }
    // "biggest fix" = the biggest bucket someone can act on (not the parked local shops)
    const stuck = p.stuck.reduce((t, s) => t + s[2], 0), top = p.stuck.filter((s) => s[4] !== "Nobody" && s[4] !== "Wait").sort((a, b) => b[2] - a[2])[0];
    await report("unlock", true,
      `${(p.counts.live || 0).toLocaleString()} live · ${stuck.toLocaleString()} stuck · biggest fix: ${top ? `${top[1].split(" (")[0]} (${top[2].toLocaleString()})` : "none"}${simp ? ` · ${simp.live} of ${simp.companies} SimplifyJobs employers live` : ""}`,
      { at: new Date().toISOString(), totals: { live: p.counts.live || 0, stuck, live7d: p.live7d }, ...p, simplify: simp });
  } catch (e) { console.error(e); await report("unlock", false, `Unlock Finder failed: ${String(e.message).slice(0, 200)}`, null); }
} else console.log("unlock: switched off on /bots");
