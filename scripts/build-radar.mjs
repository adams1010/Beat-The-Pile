// scripts/build-radar.mjs — Opening Radar: when does each company start posting summer internships?
//
// Source: the SimplifyJobs public internship list (git history = when each posting first appeared).
//   One-time history:  node scripts/build-radar.mjs --history snap1.json snap2.json …   → radar/history.json
//   Daily refresh:     node scripts/build-radar.mjs current-listings.json               → radar/radar.json
//
// A company's "opening date" for Summer S = the first day any of its Summer-S internships appeared
// (big employers open their intern requisitions in one wave). We only keep companies that hire
// real posting history (all majors since Nov 2026).
import fs from "node:fs";
import { normName } from "../lib/simplify.js";

const ENG = /\b(mechanical|manufactur|hardware|aerospace|aeronaut|structur|thermal|propulsion|process engineer|industrial engineer|civil|construction|field engineer|project engineer|electrical|controls engineer|robotic|mechatronic|systems engineer|test engineer|quality engineer|reliability|materials engineer|product (design|development) engineer|design engineer)/i;
const ME = /\b(mechanical|mechatronic|thermal|propulsion|structur)/i;
const DAY = 864e5;
const ymd = (t) => new Date(t).toISOString().slice(0, 10);

const seasonOf = (terms) => { for (const t of terms || []) { const m = /^Summer (\d{4})$/.exec(t); if (m) return +m[1]; } return null; };
// A posting counts for Summer S only if it appeared May 1 (S-1) – Apr 30 (S): filters relisted/stale rows
const inWindow = (t, S) => t >= Date.UTC(S - 1, 4, 1) && t < Date.UTC(S, 4, 1);
const usOnly = (locs) => !locs?.length || locs.some((l) => /,\s*[A-Z]{2}\b|remote|united states|\busa?\b/i.test(l));

/** Fold postings into { k: { name, seasons: {S: firstMs}, eng, me, roles: {title: n} } } */
function fold(rows, into = {}) {
  for (const x of rows) {
    if (!x.date_posted || !x.company_name) continue;
    const t = x.date_posted * 1000, S = seasonOf(x.terms || (x.season ? [x.season] : []));
    const k = normName(x.company_name); if (!k) continue;
    const c = into[k] || (into[k] = { name: x.company_name, seasons: {}, eng: 0, all: 0, me: 0, roles: {} });
    const title = String(x.title || ""); c.all = (+c.all || 0) + 1;
    if (ENG.test(title)) c.eng = (+c.eng || 0) + 1;
    c.roles[title] = (c.roles[title] || 0) + 1;                       // all majors: remember every role title
    if (!S || !inWindow(t, S) || !usOnly(x.locations)) continue;
    if (!c.seasons[S] || t < c.seasons[S]) c.seasons[S] = t;
    if (ME.test(title)) c.me++;
  }
  return into;
}

// Big engineering employers students ask about — always on the radar even if Beat the Pile doesn't read their board yet
const MAJORS = ["Boeing","Lockheed Martin","Northrop Grumman","RTX","Raytheon","Collins Aerospace","Pratt & Whitney","GE Aerospace","GE Vernova",
  "General Dynamics","Gulfstream","BAE Systems","L3Harris","Textron","Bell","Sikorsky","Huntington Ingalls Industries","Blue Origin","SpaceX",
  "Tesla","General Motors","Ford Motor Company","Ford","Stellantis","Rivian","Lucid Motors","John Deere","Caterpillar","Cummins","Honeywell",
  "Siemens","ABB","Emerson","Eaton","Parker Hannifin","Rockwell Automation","Trane Technologies","Carrier","Whirlpool","GE Appliances",
  "Polaris","Harley-Davidson","Oshkosh","PACCAR","Medtronic","Stryker","Boston Scientific","Johnson & Johnson","3M","Dow","ExxonMobil",
  "Chevron","Procter & Gamble","PepsiCo","Kimberly-Clark","Intel","Texas Instruments","Micron Technology","Applied Materials","Apple",
  "Anduril","Northrop","Leidos","Booz Allen Hamilton","MITRE","Johns Hopkins APL","Rolls-Royce","Pratt and Whitney","Garmin","Shield AI"].map(normName);

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const trackedFile = flag("--tracked");
// Beat the Pile's own company list ([{id, company}]) — these link to Follow on the site
const tracked = new Map();
if (trackedFile) for (const t of JSON.parse(fs.readFileSync(trackedFile, "utf8"))) {
  for (const n of [t.company, String(t.company).replace(/\s*\(.*\)\s*/g, " ")]) { const k = normName(n); if (k && !tracked.has(k)) tracked.set(k, t.id); }
}
if (args[0] === "--history") {
  const h = {};
  for (const f of args.slice(1)) fold(JSON.parse(fs.readFileSync(f, "utf8")), h);
  for (const c of Object.values(h)) { c.roles = Object.entries(c.roles).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t); }
  fs.mkdirSync("radar", { recursive: true });
  fs.writeFileSync("radar/history.json", JSON.stringify(h));
  console.log(`history: ${Object.keys(h).length} companies from ${args.length - 1} snapshots`);
  process.exit(0);
}

const current = args[0];
if (!current) { console.error("usage: build-radar.mjs current.json  |  --history snapshots…"); process.exit(1); }
const base = JSON.parse(fs.readFileSync("radar/history.json", "utf8"));
const merged = fold(JSON.parse(fs.readFileSync(current, "utf8")), Object.fromEntries(Object.entries(base).map(([k, c]) => [k, { ...c, seasons: { ...c.seasons }, roles: Object.fromEntries((c.roles || []).map((r) => [r, 1])) }])));

const now = Date.now(), nowY = new Date(now).getUTCFullYear();
const CUR = new Date(now).getUTCMonth() >= 4 ? nowY + 1 : nowY;        // recruiting May Y → Apr Y+1 is for Summer Y+1
const cycleDay = (t, S) => Math.round((t - Date.UTC(S - 1, 0, 1)) / DAY);
const fromCycle = (d, S) => Date.UTC(S - 1, 0, 1) + d * DAY;
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

const out = [];
for (const [k, c] of Object.entries(merged)) {
  const eng = +c.eng || 0, id = tracked.get(k) || null;
  // Keep: companies on Beat the Pile, big engineering employers, or clearly hardware-focused companies
  // Keep (all majors, Nov 2026): companies on Beat the Pile, big employers students ask about, or any company with a real
  // posting history (5+ internships in the public list). Tiny or one-off posters are left out — their dates mean little.
  if (!id && !MAJORS.includes(k) && (+c.all || 0) < 5) continue;
  const past = Object.keys(c.seasons).map(Number).filter((S) => S < CUR && S >= CUR - 4).sort();
  if (!past.length) continue;
  if (!id && !MAJORS.includes(k) && past.length < 2) continue;         // one season of history is a guess, not a pattern
  const days = past.map((S) => cycleDay(c.seasons[S], S));
  const typ = past.length >= 3 ? median(days) : days[days.length - 1];    // 3+ seasons: median; else most recent
  const opened = c.seasons[CUR];
  const roles = Array.isArray(c.roles) ? c.roles : Object.keys(c.roles);
  out.push({
    k, id, name: c.name,
    history: Object.fromEntries(past.map((S) => [S, ymd(c.seasons[S])])),
    typical: ymd(fromCycle(typ, CUR)),
    typicalNext: ymd(fromCycle(typ, CUR + 1)),
    spread: Math.max(...days) - Math.min(...days),
    seasons: past.length,
    confidence: past.length >= 3 && Math.max(...days) - Math.min(...days) <= 35 ? "high" : past.length >= 2 ? "medium" : "low",
    opened: opened ? ymd(opened) : null,
    diff: opened ? cycleDay(opened, CUR) - typ : null,                    // negative = earlier than usual
    openedNext: c.seasons[CUR + 1] ? ymd(c.seasons[CUR + 1]) : null,
    me: c.me > 0,
    eng: eng > 0,
    roles: roles.slice(0, 3),
  });
}
out.sort((a, b) => a.name.localeCompare(b.name));
// Headline stat: how much earlier companies opened this season vs their own last season
const shifts = out.filter((x) => x.opened && x.history[CUR - 1]).map((x) => cycleDay(Date.parse(x.opened), CUR) - cycleDay(Date.parse(x.history[CUR - 1]), CUR - 1));
const trend = shifts.length ? { companies: shifts.length, medianDays: median(shifts), earlier: shifts.filter((d) => d < -7).length, later: shifts.filter((d) => d > 7).length } : null;
fs.writeFileSync("radar/radar.json", JSON.stringify({ built: new Date(now).toISOString(), season: CUR,
  source: "SimplifyJobs public internship list — dates each posting first appeared", trend, companies: out }));
console.log(`trend: ${JSON.stringify(trend)}`);
console.log(`radar: ${out.length} companies · Summer ${CUR} · ${out.filter((x) => x.opened).length} opened · ${out.filter((x) => x.seasons >= 2).length} with 2+ seasons · ${out.filter((x) => x.seasons >= 3).length} with 3+`);
