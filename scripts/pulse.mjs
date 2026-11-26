// scripts/pulse.mjs (Nov 26 2026) — the Hiring Pulse bot ("pulse"). Runs daily from GitHub (data-bots.yml).
// Reads every open job from the public /api/listings feed (cursor pages of 1,000) and writes pulse/data.json for the
// /pulse/ page: what our robot first saw this week (by job type, area, state, season, company), new jobs per day over
// the last 30 days (jobs still open today), the remote share, and a daily history of open-job totals (pulse/history.json,
// one row per day, kept 2 years) so the page can show the trend. "New" always means first seen by our robot: a company
// that just went live brings its older postings with it, and the page says so.
// Usage: node scripts/pulse.mjs [--dry]
import fs from "node:fs";
import { seasonOf } from "../lib/filter.js";
import { FIELD_LABELS } from "../lib/fields.js";

const BASE = process.env.BTP_BASE || "https://www.beatthepile.com";
const DRY = process.argv.includes("--dry");
const DAY = 864e5;

async function getJson(url, tries = 4) {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error(`answered ${r.status}`); return await r.json(); }
    catch (e) { if (i >= tries) throw new Error(`${url.split("?")[0]}: ${e.message}`); await new Promise((z) => setTimeout(z, 4000 * i)); }
  }
}
async function report(ok, summary, stats) {
  console.log(`[pulse] ${ok ? "ok" : "FAILED"}: ${summary}`);
  if (DRY || !process.env.CRON_SECRET) return;
  const r = await fetch(`${BASE}/api/discovery`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ action: "botlog", bot: "pulse", ok, summary, stats }) }).catch(() => null);
  console.log(`[pulse] reported (${r?.status})`);
}
async function switchOn() {
  try { const d = await getJson(`${BASE}/api/discovery?bots=1`, 2); return (d.bots || []).find((b) => b.id === "pulse")?.enabled !== false; } catch { return true; }
}

const count = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);
const top = (m, n, map = (k, v) => ({ key: k, n: v })) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => map(k, v));

/** Everything /pulse/ shows, from open listing rows. Pure, so tests can feed it rows. */
export function buildPulse(rows, now = Date.now()) {
  const wk = now - 7 * DAY, prevWk = now - 14 * DAY;
  const kinds = {}, newKinds = {}, prevKinds = {};
  const fieldNew = new Map(), fieldOpen = new Map(), stateNew = new Map(), seasons = new Map(), coNew = new Map(), coOpen = new Map(), coName = new Map();
  const perDay = new Map(); let remote = 0, interns = 0;
  for (const r of rows) {
    const t = Date.parse(r.first_seen) || 0, k = r.kind || "intern";
    kinds[k] = (kinds[k] || 0) + 1;
    if (t >= wk) newKinds[k] = (newKinds[k] || 0) + 1; else if (t >= prevWk) prevKinds[k] = (prevKinds[k] || 0) + 1;
    if (k !== "intern") continue;
    interns++;
    if (r.geo_kind === "remote") remote++;
    const f = r.field || "other"; count(fieldOpen, f);
    const s = seasonOf(r.title); count(seasons, s && /20\d\d/.test(s) ? s : s ? `${s} (no year)` : "Not stated");
    if (r.company_id) { count(coOpen, r.company_id); coName.set(r.company_id, r.company); }
    if (t >= now - 30 * DAY) count(perDay, new Date(t).toISOString().slice(0, 10));
    if (t < wk) continue;
    count(fieldNew, f);
    const st = String(r.state || "").split(",")[0]; if (/^[A-Z]{2}$/.test(st) && st !== "US") count(stateNew, st);
    if (r.company_id) count(coNew, r.company_id);
  }
  const days = [];
  for (let d = 29; d >= 0; d--) { const key = new Date(now - d * DAY).toISOString().slice(0, 10); days.push({ d: key, n: perDay.get(key) || 0 }); }
  return {
    at: new Date(now).toISOString(),
    totals: kinds, newThisWeek: newKinds, newLastWeek: prevKinds,
    companies: new Set(rows.map((r) => r.company_id)).size,
    internRemoteShare: interns ? Math.round(remote / interns * 1000) / 10 : 0,
    fieldsNew: top(fieldNew, 25, (k, v) => ({ key: k, label: FIELD_LABELS[k] || k, n: v, open: fieldOpen.get(k) || 0 })),
    fieldsOpen: top(fieldOpen, 25, (k, v) => ({ key: k, label: FIELD_LABELS[k] || k, n: v })),
    statesNew: top(stateNew, 15, (k, v) => ({ state: k, n: v })),
    seasons: top(seasons, 10, (k, v) => ({ season: k, n: v })),
    companiesNew: top(coNew, 20, (k, v) => ({ id: k, company: coName.get(k), n: v, open: coOpen.get(k) || 0 })),
    perDay: days,
  };
}

/** Add today's totals to the history (one row per day, newest last, ≤ 730 rows). */
export function addHistory(hist, p) {
  const d = p.at.slice(0, 10), row = { d, intern: p.totals.intern || 0, fulltime: p.totals.fulltime || 0, hourly: p.totals.hourly || 0, shadow: p.totals.shadow || 0, companies: p.companies };
  const out = (Array.isArray(hist) ? hist : []).filter((r) => r.d !== d);
  out.push(row); out.sort((a, b) => a.d.localeCompare(b.d));
  return out.slice(-730);
}

async function main() {
  if (!DRY && !(await switchOn())) { console.log("pulse: switched off on /bots"); return; }
  const rows = []; let after = null;
  for (let i = 0; i < 400; i++) {
    const d = await getJson(`${BASE}/api/listings?field=all&kind=all&limit=1000${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    rows.push(...(d.listings || []));
    if (!d.meta?.more || !d.meta?.next) break;
    after = d.meta.next;
    if (i % 20 === 0) console.log(`  ${rows.length} rows`);
  }
  if (rows.length < 1000) { await report(false, `Hiring Pulse read only ${rows.length} jobs, not saving`, null); process.exitCode = 1; return; }
  const p = buildPulse(rows);
  fs.mkdirSync("pulse", { recursive: true });
  let hist = []; try { hist = JSON.parse(fs.readFileSync("pulse/history.json", "utf8")); } catch {}
  hist = addHistory(hist, p);
  fs.writeFileSync("pulse/history.json", JSON.stringify(hist));
  fs.writeFileSync("pulse/data.json", JSON.stringify({ ...p, history: hist }));
  const n = p.newThisWeek;
  await report(true, `${rows.length.toLocaleString("en-US")} open jobs · new this week: ${n.intern || 0} internships, ${n.fulltime || 0} entry-level, ${n.hourly || 0} hourly · ${p.companies} companies`,
    { at: p.at, totals: p.totals, newThisWeek: n });
}

if (String(process.argv[1] || "").split("\\").join("/").endsWith("scripts/pulse.mjs")) {
  main().catch(async (e) => { console.error(e); await report(false, `Hiring Pulse failed: ${String(e.message).slice(0, 200)}`, null); process.exitCode = 1; });
}
