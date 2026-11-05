// lib/dates.js — turn a job board's "posted" text into a real date, honestly.
// Boards say things like "2026-10-30T11:22:31-04:00", "Oct 9, 2026", "Posted 28 Days Ago", "Posted 30+ Days Ago".
//   exact date            → { date, estimate: false }
//   "N days ago"          → { date: seenAt − N days, estimate: true }   (relative to when we read it)
//   "30+ days ago", junk  → null  (unknown — never used in speed stats)
// The same function is copied into jobs/ and season/ pages (search "postedInfo").
export function postedInfo(postedOn, seenAt) {
  const s = String(postedOn || "").trim();
  if (!s) return null;
  if (/\+\s*days?/i.test(s)) return null;
  const base = seenAt ? new Date(seenAt) : null;
  const rel = s.match(/(today|just posted|yesterday|(\d{1,3})\s*days?\s*ago)/i);
  if (rel) {
    if (!base || isNaN(base)) return null;
    const n = /today|just/i.test(rel[1]) ? 0 : /yesterday/i.test(rel[1]) ? 1 : Number(rel[2]);
    return { date: new Date(base.getTime() - n * 864e5).toISOString(), estimate: true };
  }
  if (!/\d{4}/.test(s)) return null;                       // needs a year to be trusted
  const d = new Date(s);
  if (isNaN(d) || d.getFullYear() < 2015 || d.getTime() > Date.now() + 2 * 864e5) return null;
  return { date: d.toISOString(), estimate: false };
}
