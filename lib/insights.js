// lib/insights.js — the math behind two analyst bots on /bots (Nov 25, owner: "where is the US lacking jobs, where can we improve").
//   Gap Finder  (bot "gaps"):   jobs per person by state, the biggest places with few jobs nearby, big colleges with few internships nearby.
//   Unlock Finder (bot "unlock"): why companies aren't live and what would unlock the most, which company sources pay off,
//                                 and the big internship employers (SimplifyJobs list) that aren't live on Beat the Pile.
// Pure functions only (no network, no database) so tests/insights-test.mjs can check them offline.
// Inputs: map dots [x, y, jobs, lat, lng] (map/dots-<kind>.json), data/us-counties.json rows [geoid, name, st, pop, lat, lng],
// schools/index.json rows [unitid, name, nick, city, st, degreesLastYear], data/us-places.json {ST: {city: [lat, lng]}},
// the public /api/discovery feed rows, the SimplifyJobs listings.json.

const EARTH_MI = 3958.8;
export function miles(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(a)));
}

// 1-degree buckets so "everything within N miles" doesn't compare every pair
function grid(points) {               // points: [{lat, lng, ...}]
  const g = new Map();
  for (const p of points) { const k = Math.floor(p.lat) + "," + Math.floor(p.lng); (g.get(k) || g.set(k, []).get(k)).push(p); }
  return {
    near(lat, lng, mi) {
      const dLat = Math.ceil(mi / 69) , dLng = Math.ceil(mi / Math.max(10, 69 * Math.cos(lat * Math.PI / 180)));
      const out = [], la = Math.floor(lat), lo = Math.floor(lng);
      for (let i = la - dLat; i <= la + dLat; i++) for (let j = lo - dLng; j <= lo + dLng; j++)
        for (const p of g.get(i + "," + j) || []) { const d = miles(lat, lng, p.lat, p.lng); if (d <= mi) out.push([p, d]); }
      return out;
    },
  };
}
const countyPts = (counties) => counties.map(([geoid, name, st, pop, lat, lng]) => ({ geoid, name, st, pop, lat, lng }));
const dotPts = (dots) => (dots || []).filter((d) => Number.isFinite(d[3]) && Number.isFinite(d[4])).map((d) => ({ lat: d[3], lng: d[4], n: d[2] || 0 }));

/** Jobs per state, by kind. A dot goes to the state of the nearest county point (≤ 80 mi; farther = offshore/foreign, skipped).
 *  Map dots are already clustered a little, so a dot right on a state line can land next door: fine for a ranking. */
export const KINDS = ["all", "intern", "fulltime", "hourly"];
export function stateCoverage(dotsByKind, counties) {
  const cs = countyPts(counties), G = grid(cs);
  const S = {};
  for (const c of cs) (S[c.st] ||= { pop: 0, all: 0, intern: 0, fulltime: 0, hourly: 0 }).pop += c.pop;
  const nat = { pop: cs.reduce((t, c) => t + c.pop, 0), all: 0, intern: 0, fulltime: 0, hourly: 0 };
  let unplaced = 0;
  for (const k of KINDS) for (const p of dotPts(dotsByKind[k])) {
    let best = null; for (const [c, d] of G.near(p.lat, p.lng, 80)) if (!best || d < best[1]) best = [c, d];
    if (!best) { if (k === "all") unplaced += p.n; continue; }
    S[best[0].st][k] += p.n; nat[k] += p.n;
  }
  const states = Object.entries(S).map(([st, v]) => [st, v.pop, v.all, v.intern, v.fulltime, v.hourly]).sort((a, b) => a[0].localeCompare(b[0]));
  return { states, national: nat, unplaced };
}

/** Biggest places with the fewest jobs nearby: for each county of ≥ minPop people, jobs within `radius` miles per 10,000 people
 *  living within the same radius. Lowest first; a county within `radius` of one already listed is skipped (one row per metro). */
export function jobDeserts(dots, counties, { radius = 30, minPop = 100000, top = 15 } = {}) {
  const cs = countyPts(counties), CG = grid(cs), DG = grid(dotPts(dots));
  const rows = [];
  for (const c of cs) {
    if (c.pop < minPop) continue;
    const people = CG.near(c.lat, c.lng, radius).reduce((t, [x]) => t + x.pop, 0);
    const near = DG.near(c.lat, c.lng, radius + 15);
    const jobs = near.filter(([, d]) => d <= radius).reduce((t, [x]) => t + x.n, 0);
    const jobsWider = near.reduce((t, [x]) => t + x.n, 0);
    // A big job center just past the line (The Woodlands → Houston at ~31 mi) means it isn't really a desert
    if (jobsWider > Math.max(50, jobs * 3)) continue;
    rows.push({ c, people, jobs, per10k: people ? jobs / people * 1e4 : 0 });
  }
  rows.sort((a, b) => a.per10k - b.per10k || b.people - a.people);
  const out = [];
  for (const r of rows) {
    if (out.some((o) => miles(o.c.lat, o.c.lng, r.c.lat, r.c.lng) < radius)) continue;
    out.push(r); if (out.length >= top) break;
  }
  return out.map((r) => [r.c.name, r.c.st, r.c.pop, r.jobs, r.people, +r.per10k.toFixed(1)]);
}

// Mostly-online schools: their graduates live everywhere, so "internships near their headquarters" means nothing
export const ONLINE = /western governors|southern new hampshire|university of phoenix|grand canyon|liberty university|purdue university global|capella|walden|american public university|excelsior|colorado technical|arizona global|strayer|national university$|university of maryland global|chamberlain|ivy tech|full sail|post university|aspen university|american intercontinental|independence university|ultimate medical/i;

/** Big colleges with the fewest internships within `radius` miles. Size = degrees awarded last year (IPEDS completions),
 *  the only size number we keep for every school. Lowest internships per 1,000 graduates first. */
export function collegeGaps(dotsIntern, schools, places, { radius = 50, minGrads = 2000, top = 15 } = {}) {
  const DG = grid(dotPts(dotsIntern));
  const rows = [];
  let skipped = 0;
  for (const [id, name, , city, st, grads] of schools) {
    if ((grads || 0) < minGrads || ONLINE.test(name)) continue;
    const pt = places?.[st]?.[String(city || "").toLowerCase().trim()];
    if (!pt) { skipped++; continue; }
    const interns = DG.near(pt[0], pt[1], radius).reduce((t, [x]) => t + x.n, 0);
    rows.push([name, city, st, grads, interns, +(interns / grads * 1000).toFixed(1), id]);
  }
  rows.sort((a, b) => a[5] - b[5] || b[3] - a[3]);
  return { rows: rows.slice(0, top), checked: rows.length, skipped };
}

// ── Unlock Finder ────────────────────────────────────────────────────────────────────────────────────────────────
const SYSTEMS = /(paylocity|ultipro|workday|icims|greenhouse|lever|ashby|smartrecruiters|bamboohr|taleo|oracle|adp|successfactors|workable|jobvite|avature|eightfold)/i;
const SYS_NAME = { ultipro: "UKG", icims: "iCIMS", smartrecruiters: "SmartRecruiters", bamboohr: "BambooHR", adp: "ADP", successfactors: "SuccessFactors" };
const sysOf = (r) => { const m = SYSTEMS.exec(`${r.hint || ""} ${r.ats || ""}`); if (!m) return null; const k = m[1].toLowerCase(); return SYS_NAME[k] || k[0].toUpperCase() + k.slice(1); };
export const sourceOf = (s) => String(s || "Unknown").replace(/\s*\(.*$/, "").replace(/\s+(Spring|Fall|Summer|Winter)?\s*20\d\d.*$/i, "").trim() || "Unknown";

// Every stuck company lands in exactly one bucket: plain words for what's wrong, what would fix it, and whose job that is.
export const BUCKETS = [
  ["payroll", "Board found, owner not proven (Paylocity / UKG payroll boards)", "Decide whether a paid payroll board's own name counts as proof", "Owners"],
  ["unproven", "Board found, but it doesn't name them or their site doesn't link to it", "A second proof (board links their website, or most postings name them)", "Claude"],
  ["dead", "Board link is dead or moved", "Start over from their website (the finder retries these)", "Claude"],
  ["busy", "Job site busy or refusing robots (mostly Workday)", "Retries on its own; Workday blocks GitHub's computers", "Wait"],
  ["empty", "Board works but has no jobs right now", "Re-checked automatically in 2 weeks (1 week in hiring season)", "Wait"],
  ["reader", "Uses a job system we can't read yet", "Build a reader for that system (see the list)", "Claude"],
  ["noboard", "Real employer, no job board we recognize on their site", "Paste their careers link on /discovery", "You"],
  ["blocked", "Their website blocks robots", "Paste their careers link on /discovery", "You"],
  ["nosite", "Name only (Adzuna / Jooble), no website found", "Low value: paste a website only for ones you know", "You"],
  ["local", "Local shops from the old OpenStreetMap import, most have no job board", "Leave parked", "Nobody"],
];
export function bucketOf(r) {
  const st = r.status, d = String(r.detail || ""), local = /^v1/i.test(r.source || "");
  if (st === "identity_failed") return /paylocity|ultipro/i.test(r.hint || "") ? "payroll" : "unproven";
  if (st === "board_error") return /answered (404|410|422)|not found/i.test(d) ? "dead" : /answered (429|5\d\d)|busy|maintenance|timed? ?out|aborted/i.test(d) ? "busy" : /no (jobs|postings)/i.test(d) ? "empty" : "busy";
  if (st === "unsupported") return "reader";
  if (st === "no_domain") return "nosite";
  if (st === "blocked") return local ? "local" : "blocked";
  if (st === "no_board") return local ? "local" : "noboard";
  return null;
}
export function pipeline(rows, now = Date.now()) {
  const counts = {}, buckets = {}, bySource = {}, readers = {}, unprovenBy = {};
  let live7d = 0;
  for (const r of rows) {
    if (r.status === "duplicate") continue;
    counts[r.status] = (counts[r.status] || 0) + 1;
    const src = sourceOf(r.source); const s = (bySource[src] ||= [0, 0]); s[0]++; if (r.status === "live") s[1]++;
    if (r.status === "live" && r.verified_at && now - Date.parse(r.verified_at) < 7 * 864e5) live7d++;
    const b = bucketOf(r); if (!b) continue;
    buckets[b] = (buckets[b] || 0) + 1;
    if (b === "reader") { const m = /Uses (.+?)(?:,|\s[—–-]|\s�)\s*needs/.exec(r.detail || ""); const k = (m ? m[1] : "Other").replace(/\s*\(native\)/, ""); readers[k] = (readers[k] || 0) + 1; }
    if (b === "payroll" || b === "unproven") { const k = sysOf(r) || "Other"; unprovenBy[k] = (unprovenBy[k] || 0) + 1; }
  }
  const sorted = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  return {
    counts, live7d,
    stuck: BUCKETS.filter(([k]) => buckets[k]).map(([k, label, fix, who]) => [k, label, buckets[k], fix, who]),
    readers: sorted(readers).slice(0, 12),
    unprovenBy: sorted(unprovenBy).slice(0, 10),
    sources: Object.entries(bySource).map(([src, [n, live]]) => [src, n, live]).filter(([, n]) => n >= 10).sort((a, b) => b[1] - a[1]).slice(0, 14),
  };
}

export const normName = (s) => String(s || "").toLowerCase().replace(/&/g, "and")      // same as lib/simplify.js normName
  .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the|group|plc|holdings|incorporated)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

/** Big internship employers we're missing: companies with open postings on the public SimplifyJobs list that aren't live here.
 *  Their postings are never shown from that list; this only tells us whose own board to go after. */
// `handVerified` = the feed's hand-checked company names (L3Harris, Boeing…), which are live but not rows.
// Names match exactly, or when one starts with the other and the shorter is ≥ 6 letters ("l3harris" ~ "l3harristechnologies",
// "navyfederal" ~ "navyfederalcreditunion"; "meta" never matches "metabolic").
export function missingBig(simplify, rows, { top = 25, handVerified = [] } = {}) {
  const exact = new Map();
  const put = (name, status) => { const n = normName(name); if (n.length < 3) return; const prev = exact.get(n); if (!prev || status === "live") exact.set(n, status); };
  for (const r of rows) if (r.status !== "duplicate") put(r.company, r.status);
  for (const h of handVerified) for (const part of String(h).split(/\s*[(/]\s*|\)\s*/)) put(part, "live");
  const keys = [...exact.keys()].filter((k) => k.length >= 6);
  const ours = { get(n) {
    if (exact.has(n)) return exact.get(n);
    if (n.length < 6) return undefined;
    let best;
    for (const k of keys) if (k.startsWith(n) || n.startsWith(k)) { const s = exact.get(k); if (s === "live") return s; best ??= s; }
    return best;
  } };
  const by = new Map();
  for (const j of simplify || []) {
    if (!j || j.active === false || j.is_visible === false) continue;
    const n = normName(j.company_name); if (n.length < 3) continue;
    const e = by.get(n) || by.set(n, { name: j.company_name, n: 0 }).get(n); e.n++;
  }
  let live = 0, livePostings = 0, postings = 0;
  const missing = [];
  for (const [n, e] of by) {
    postings += e.n;
    const st = ours.get(n);
    if (st === "live") { live++; livePostings += e.n; } else missing.push([e.name, e.n, st || null]);
  }
  missing.sort((a, b) => b[1] - a[1]);
  return { companies: by.size, live, postings, livePostings, missing: missing.slice(0, top) };
}
