// scripts/pay-finder.mjs (Nov 26 2026) — the Pay Finder bot ("pay"). Runs daily from GitHub (pay-finder.yml).
// Reads the pay EMPLOYERS POSTED on the public job feeds we already read (Greenhouse job text, Lever salaryRange,
// Ashby compensation), keeps it only for jobs that are open on Beat the Pile right now (checked with /api/listings?ids=),
// and writes two static files the pages load:
//   pay/jobs.json   { at, j: { <companyId>: { <sourceId>: [lo, hi, unit] } } }    → pay on /jobs cards
//   pay/stats.json  medians by job type, internship area and state, top-paying internships and companies → /pay/
// Never estimates: a job with no posted pay has no entry. Units h/y/m/w (lib/pay.js). Reads only public data.
// Usage: node scripts/pay-finder.mjs [--dry] [--limit=N]
import fs from "node:fs";
import { parsePay, fromStructured, toHourly, pct } from "../lib/pay.js";
import { isKept } from "../lib/fields.js";
import { FIELD_LABELS } from "../lib/fields.js";

const BASE = process.env.BTP_BASE || "https://www.beatthepile.com";
const DRY = process.argv.includes("--dry");
const LIMIT = +(process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0;
const AT_ONCE = 12;
const started = Date.now();

async function getJson(url, { tries = 2, timeout = 30000 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { "User-Agent": "BeatThePile-PayFinder/1.0 (+https://www.beatthepile.com/bots/)" } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`answered ${r.status}`);
      return await r.json();
    } catch (e) { if (i >= tries) throw e; await new Promise((z) => setTimeout(z, 2000 * i)); }
  }
}
async function switchOn() {
  try { const d = await getJson(`${BASE}/api/discovery?bots=1`); return (d.bots || []).find((b) => b.id === "pay")?.enabled !== false; }
  catch { return true; }
}
async function report(ok, summary, stats) {
  console.log(`[pay] ${ok ? "ok" : "FAILED"}: ${summary}`);
  if (DRY || !process.env.CRON_SECRET) return;
  const r = await fetch(`${BASE}/api/discovery`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ action: "botlog", bot: "pay", ok, summary, stats }) }).catch(() => null);
  console.log(`[pay] reported (${r?.status})`);
}

/** The board token from a live company row: detail says `greenhouse "stripe"`, else the hint link. */
export function tokenOf(row) {
  const m = String(row.detail || "").match(new RegExp(`${row.ats}\\s+"([^"]+)"`));
  if (m) return m[1];
  const h = String(row.hint || "");
  const re = { greenhouse: /greenhouse\.io\/(?:embed\/job_board\?for=)?([A-Za-z0-9_-]+)/, lever: /jobs\.lever\.co\/([A-Za-z0-9_.-]+)/, ashby: /jobs\.ashbyhq\.com\/([^/?#]+)/ }[row.ats];
  const k = re && h.match(re);
  return k ? decodeURIComponent(k[1]) : null;
}

async function readBoard(row) {
  const t = encodeURIComponent(row.token), out = [];
  if (row.ats === "greenhouse") {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`, { timeout: 60000 });
    for (const j of d?.jobs || []) if (isKept(j.title)) { const p = parsePay(j.content || ""); if (p) out.push([String(j.id), p, j.title]); }
  } else if (row.ats === "lever") {
    for (let skip = 0; skip < 2000; skip += 500) {
      const page = await getJson(`https://api.lever.co/v0/postings/${t}?mode=json&limit=500&skip=${skip}`);
      if (!Array.isArray(page)) break;
      for (const j of page) {
        if (!isKept(j.text)) continue;
        const s = j.salaryRange;
        const p = (s && fromStructured(s.min, s.max, s.interval, s.currency)) || parsePay([j.salaryDescriptionPlain, j.additionalPlain, j.descriptionPlain].filter(Boolean).join(" "));
        if (p) out.push([String(j.id), p, j.text]);
      }
      if (page.length < 500) break;
    }
  } else if (row.ats === "ashby") {
    const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${t}?includeCompensation=true`);
    for (const j of d?.jobs || []) {
      if (!isKept(j.title)) continue;
      const comps = (j.compensation?.summaryComponents || []).filter((c) => /salary|hourly|wage|base/i.test(c.compensationType || ""));
      let p = null;
      for (const c of comps) { p = fromStructured(c.minValue, c.maxValue, c.interval, c.currencyCode); if (p) break; }
      if (!p) p = parsePay(j.compensation?.scrapeableCompensationSalarySummary ? `Salary ${j.compensation.scrapeableCompensationSalarySummary}` : (j.descriptionPlain || ""));
      if (p) out.push([String(j.id), p, j.title]);
    }
  }
  return out;
}

async function pool(items, n, fn) {
  let i = 0; const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } };
  await Promise.all(Array.from({ length: n }, run));
}

const r2 = (v) => Math.round(v * 100) / 100;
/** Medians etc. from hourly-equivalent pay values. */
export function summarize(vals) { const s = [...vals].sort((a, b) => a - b); return { n: s.length, p25: pct(s, 0.25), med: pct(s, 0.5), p75: pct(s, 0.75) }; }
/** Everything the /pay page shows, from verified open rows [{ id, company_id, company, title, field, kind, state, url, pay:{lo,hi,u} }]. */
export function buildStats(rows, at = new Date().toISOString()) {
  const mid = (p) => toHourly((p.lo + p.hi) / 2, p.u);
  const group = (key, filter = () => true) => {
    const m = new Map();
    for (const r of rows) if (filter(r)) { const k = key(r); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(mid(r.pay)); }
    return m;
  };
  const byKind = {}; for (const [k, v] of group((r) => r.kind)) byKind[k] = summarize(v);
  const byField = [...group((r) => r.field || "other", (r) => r.kind === "intern")].filter(([, v]) => v.length >= 5)
    .map(([k, v]) => ({ key: k, label: FIELD_LABELS[k] || k, ...summarize(v) })).sort((a, b) => b.med - a.med);
  const byState = [...group((r) => { const s = String(r.state || "").split(",")[0]; return /^[A-Z]{2}$/.test(s) ? s : null; }, (r) => r.kind === "intern")]
    .filter(([, v]) => v.length >= 5).map(([k, v]) => ({ state: k, ...summarize(v) })).sort((a, b) => b.med - a.med);
  const coName = new Map(rows.map((r) => [r.company_id, r.company]));
  const topCompanies = [...group((r) => r.company_id, (r) => r.kind === "intern")].filter(([, v]) => v.length >= 2)
    .map(([k, v]) => ({ id: k, company: coName.get(k), ...summarize(v) })).filter((c) => c.med <= 100).sort((a, b) => b.med - a.med).slice(0, 30);   // same $100/hr sanity line as topInterns
  const job = (r) => ({ id: r.id, title: r.title, company: r.company, company_id: r.company_id, state: r.state, url: r.url, pay: [r.pay.lo, r.pay.hi, r.pay.u], hr: r2(mid(r.pay)) });
  const interns = rows.filter((r) => r.kind === "intern").sort((a, b) => mid(b.pay) - mid(a.pay));
  const seen = new Set(), topInterns = [];
  for (const r of interns) {
    if (mid(r.pay) > 100) continue;                       // an "intern" over $100/hr is almost always a misfiled senior role
    const k =r.company_id + "|" + r.title.toLowerCase(); if (seen.has(k)) continue; seen.add(k); topInterns.push(job(r)); if (topInterns.length >= 25) break; }
  // pay bands for a histogram of internship pay ($/hr)
  const bands = [[0, 15], [15, 20], [20, 25], [25, 30], [30, 35], [35, 40], [40, 50], [50, 999]].map(([a, b]) => ({ from: a, to: b, n: interns.filter((r) => { const h = mid(r.pay); return h >= a && h < b; }).length }));
  return { at, total: rows.length, byKind, byField, byState, topCompanies, topInterns, bands,
           companies: new Set(rows.map((r) => r.company_id)).size };
}

async function main() {
  if (!DRY && !(await switchOn())) { console.log("pay: switched off on /bots"); return; }
  const feed = await getJson(`${BASE}/api/discovery`, { timeout: 90000, tries: 3 });
  let boards = (feed.rows || []).filter((r) => r.status === "live" && ["greenhouse", "lever", "ashby"].includes(r.ats))
    .map((r) => ({ ...r, token: tokenOf(r) })).filter((r) => r.token);
  if (LIMIT) boards = boards.slice(0, LIMIT);
  console.log(`[pay] reading ${boards.length} boards`);
  const found = [], fails = { n: 0 }, sys = {};
  await pool(boards, AT_ONCE, async (b, k) => {
    try {
      const jobs = await readBoard(b);
      sys[b.ats] = sys[b.ats] || { boards: 0, withPay: 0, jobs: 0 }; sys[b.ats].boards++;
      if (jobs.length) sys[b.ats].withPay++;
      sys[b.ats].jobs += jobs.length;
      for (const [sid, pay] of jobs) found.push({ id: `${b.id}:${sid}`, pay });
    } catch { fails.n++; }
    if (k % 200 === 0) console.log(`  ${k}/${boards.length} · ${found.length} with pay · ${Math.round((Date.now() - started) / 1000)}s`);
  });
  // keep only what's open on Beat the Pile right now (and take our own type/area/state for each)
  const byId = new Map(found.map((f) => [f.id, f.pay])), ids = [...byId.keys()], open = [];
  const chunks = []; for (let i = 0; i < ids.length; i += 150) chunks.push(ids.slice(i, i + 150));
  await pool(chunks, 4, async (c) => {
    try {
      const d = await getJson(`${BASE}/api/listings?ids=${encodeURIComponent(c.join(","))}`, { tries: 3 });
      for (const l of d?.listings || []) if (l.open) open.push({ ...l, pay: byId.get(l.id) });
    } catch (e) { fails.n++; console.warn("ids check:", e.message); }
  });
  if (!open.length) { await report(false, `Pay Finder found no open jobs with posted pay (${found.length} before the open check, ${fails.n} errors)`, null); process.exitCode = 1; return; }
  const j = {};
  for (const r of open.sort((a, b) => a.id.localeCompare(b.id))) {
    const i = r.id.indexOf(":"), co = r.id.slice(0, i), sid = r.id.slice(i + 1);
    (j[co] = j[co] || {})[sid] = [r.pay.lo, r.pay.hi, r.pay.u];
  }
  const at = new Date().toISOString();
  const stats = { ...buildStats(open, at), systems: sys };
  fs.mkdirSync("pay", { recursive: true });
  fs.writeFileSync("pay/jobs.json", JSON.stringify({ at, n: open.length, j }));
  fs.writeFileSync("pay/stats.json", JSON.stringify(stats));
  const iMed = stats.byKind.intern?.med;
  await report(true, `${open.length} open jobs with posted pay at ${stats.companies} companies · internship median $${iMed ?? "?"}/hr · ${fails.n} errors · ${Math.round((Date.now() - started) / 60000)} min`,
    { at, total: open.length, companies: stats.companies, byKind: stats.byKind, systems: sys, errors: fails.n });
}

if (String(process.argv[1] || "").split("\\").join("/").endsWith("scripts/pay-finder.mjs")) {
  main().catch(async (e) => { console.error(e); await report(false, `Pay Finder failed: ${String(e.message).slice(0, 200)}`, null); process.exitCode = 1; });
}
