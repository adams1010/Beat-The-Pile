// lib/timeline.js — the profile's experience timeline (Nov 14 2026). Shared by /u/ (browser module → window.btpTL) and tests.
// Dates are "YYYY-MM" strings; an experience is { title, org, type, location, start, end ("YYYY-MM" | "present" | ""), when, desc }.
// Old profiles only have free text `when` ("Summer 2026", "May 2025 – Aug 2025", "2024 - Present"): parseWhen reads those.

export const TYPES = { internship: "Internship", job: "Job", parttime: "Part-time", research: "Research", leadership: "Leadership", volunteer: "Volunteer", project: "Project" };
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const SEASON = { spring: [1, 5], summer: [5, 8], fall: [8, 12], autumn: [8, 12], winter: [12, 2] };
const ym = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
export const toMonths = (s) => { const m = /^(\d{4})-(\d{2})$/.exec(s || ""); return m ? +m[1] * 12 + (+m[2] - 1) : null; };
export const fromMonths = (n) => ym(Math.floor(n / 12), (n % 12) + 1);
export const nowYM = (d = new Date()) => ym(d.getFullYear(), d.getMonth() + 1);

/** One end of a range: "May 2025", "05/2025", "2025", "Summer 2025" (start or end of the season), "Present". */
function point(t, isEnd) {
  t = String(t || "").trim().toLowerCase();
  if (!t) return null;
  if (/^(present|now|current|today|ongoing)$/.test(t)) return "present";
  let m = /^([a-z]{3,9})\.?\s+'?(\d{2}|\d{4})$/.exec(t);
  if (m) { const y = m[2].length === 2 ? 2000 + +m[2] : +m[2];
    if (MON[m[1].slice(0, 4)] || MON[m[1].slice(0, 3)]) return ym(y, MON[m[1].slice(0, 4)] || MON[m[1].slice(0, 3)]);
    if (SEASON[m[1]]) { const [a, b] = SEASON[m[1]]; return isEnd ? ym(m[1] === "winter" ? y + 1 : y, b) : ym(y, a); } }
  m = /^(\d{1,2})\/(\d{4})$/.exec(t); if (m && +m[1] >= 1 && +m[1] <= 12) return ym(+m[2], +m[1]);
  m = /^(\d{4})-(\d{2})$/.exec(t); if (m) return t;
  m = /^(\d{4})$/.exec(t); if (m) return ym(+m[1], isEnd ? 12 : 1);
  return null;
}
/** Free text → { start, end }: "Summer 2026" = 2026-05 → 2026-08; "May 2025 – Aug 2025"; "2024 - Present". */
export function parseWhen(when = "") {
  const t = String(when).replace(/[–—]/g, "-").trim();
  if (!t) return { start: "", end: "" };
  const parts = t.split(/\s+(?:-|to|until)\s+|\s*-\s*(?=[a-z]|\d{4}|present|now)/i).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) { const a = point(parts[0], false), b = point(parts[1], true); return { start: a && a !== "present" ? a : "", end: b || "" }; }
  const one = /^(spring|summer|fall|autumn|winter)\s+(\d{4})$/i.exec(t);
  if (one) return { start: point(t, false), end: point(t, true) };
  const s = point(t, false); return { start: s && s !== "present" ? s : "", end: "" };
}
/** The dates an experience really covers (structured fields win over the free text). */
export function spanOf(x, now = nowYM()) {
  let start = /^\d{4}-\d{2}$/.test(x?.start || "") ? x.start : "", end = x?.end === "present" || /^\d{4}-\d{2}$/.test(x?.end || "") ? x.end : "";
  if (!start) { const p = parseWhen(x?.when); start = p.start; if (!end) end = p.end; }
  if (!start) return null;
  const a = toMonths(start), b = end === "present" ? toMonths(now) : toMonths(end) ?? a;
  return { start, end: end || start, current: end === "present", a, b: Math.max(a, b) };
}
const MONAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtYM = (s) => { const n = toMonths(s); return n == null ? "" : `${MONAME[n % 12]} ${Math.floor(n / 12)}`; };
/** "4 mos", "1 yr 3 mos" (both ends count, like LinkedIn: May → Aug = 4 mos) */
export function duration(a, b) {
  const n = b - a + 1, y = Math.floor(n / 12), m = n % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ") || "1 mo";
}
export function rangeText(sp) { return sp ? `${fmtYM(sp.start)} – ${sp.current ? "Present" : fmtYM(sp.end)} · ${duration(sp.a, sp.b)}` : ""; }

/** Career line layout: bars in lanes (overlapping roles stack), from the first start to max(now, graduation) + a little room. */
export function careerLine(exps, { now = nowYM(), grad = null, next = "" } = {}) {
  const items = exps.map((x, i) => ({ i, x, sp: spanOf(x, now) })).filter((e) => e.sp).sort((p, q) => p.sp.a - q.sp.a);
  if (!items.length) return null;
  const nowN = toMonths(now), gradN = toMonths(grad);
  const from = Math.min(...items.map((e) => e.sp.a)) - 1;
  const to = Math.max(nowN + (next ? 6 : 1), ...items.map((e) => e.sp.b + 1), gradN != null ? gradN + 1 : -Infinity);
  const lanes = [];
  for (const e of items) { let l = lanes.findIndex((end) => end < e.sp.a); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = e.sp.b; e.lane = l; }
  const pct = (n) => Math.round(((n - from) / (to - from)) * 1000) / 10;
  const years = []; for (let y = Math.ceil(from / 12); y * 12 <= to; y++) years.push({ y, at: pct(y * 12) });
  return { from, to, lanes: lanes.length, years, now: pct(nowN), grad: gradN != null ? pct(gradN) : null,
    next: next ? { left: pct(nowN), width: Math.max(4, pct(nowN + 6) - pct(nowN)), label: next } : null,
    bars: items.map((e) => ({ i: e.i, lane: e.lane, left: pct(e.sp.a), width: Math.max(1.5, pct(e.sp.b + 1) - pct(e.sp.a)), type: e.x.type || "", title: e.x.title, org: e.x.org, current: e.sp.current })) };
}
/** Roles at the same company together (LinkedIn style), newest company first, newest role first inside it. */
export function groupByOrg(exps, now = nowYM()) {
  const key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const groups = new Map();
  exps.forEach((x, i) => { const k = key(x.org) || "#" + i; const sp = spanOf(x, now);
    if (!groups.has(k)) groups.set(k, { org: x.org, roles: [] }); groups.get(k).roles.push({ ...x, i, sp }); });
  const last = (g) => Math.max(...g.roles.map((r) => r.sp ? r.sp.b : -1));
  for (const g of groups.values()) { g.roles.sort((p, q) => (q.sp ? q.sp.b : -1) - (p.sp ? p.sp.b : -1));
    const sps = g.roles.map((r) => r.sp).filter(Boolean); g.span = sps.length ? { a: Math.min(...sps.map((s) => s.a)), b: Math.max(...sps.map((s) => s.b)) } : null; }
  return [...groups.values()].sort((p, q) => last(q) - last(p));
}
/** "2 yrs 1 mo of experience" (overlapping months counted once) */
export function totalMonths(exps, now = nowYM()) {
  const seen = new Set(); for (const x of exps) { const sp = spanOf(x, now); if (sp) for (let n = sp.a; n <= sp.b; n++) seen.add(n); }
  return seen.size;
}
