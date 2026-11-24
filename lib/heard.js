// lib/heard.js — "How did you hear about Beat the Pile?" (Nov 23 2026, owner). One dropdown, asked once:
// students on /start/ step 3, businesses on /business/setup/ step 1. Browser module too (no Node imports), so the pages
// and the server use the same lists. Answers are private: never on profiles, Orbit, search or company pages; owners see
// counts on /business/admin/ ("How people found us").
export const STUDENT = [
  ["friend", "A friend or classmate"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
  ["social_other", "Other social media (X, Snapchat, Reddit, YouTube)"],
  ["search", "Google or another search"],
  ["fair", "Career fair"],
  ["career_center", "Career center, professor or advisor"],
  ["club", "Club or student organization"],
  ["email", "Email or newsletter"],
  ["flyer", "Flyer or poster on campus"],
  ["other", "Other"],
];
export const BUSINESS = [
  ["linkedin", "LinkedIn"],
  ["search", "Google or another search"],
  ["student", "A student or intern told us"],
  ["school", "A college career center or career fair"],
  ["colleague", "A colleague or another company"],
  ["profile", "Saw a student's profile on Beat the Pile"],
  ["email", "Email from Beat the Pile"],
  ["event", "Conference or industry event"],
  ["social", "Instagram or other social media"],
  ["other", "Other"],
];
export const listFor = (side) => (side === "business" ? BUSINESS : STUDENT);
export const labelOf = (side, src) => (listFor(side).find(([k]) => k === src) || [null, src])[1];
export const DETAIL_MAX = 60;

/** A clean answer {src, detail, at} or null. Only keys from the list; "Other" may carry a short note (links removed). */
export function cleanHeard(v, side = "student", now = new Date()) {
  if (!v || typeof v !== "object") return null;
  const src = String(v.src || "");
  if (!listFor(side).some(([k]) => k === src)) return null;
  const detail = src === "other"
    ? String(v.detail ?? "").replace(/(https?:\/\/|www\.)\S*/gi, " ").replace(/[<>\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, DETAIL_MAX)
    : "";
  return { src, ...(detail ? { detail } : {}), at: now.toISOString() };
}

/** Options for a <select>: shuffled so the first one isn't picked just for being first; "Other" stays last. */
export function shuffled(side, rnd = Math.random) {
  const list = listFor(side).filter(([k]) => k !== "other");
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return [...list, ...listFor(side).filter(([k]) => k === "other")];
}

/** Owner counts: [{src, label, n7, n30, all}] most first, plus the "Other" notes (no names). */
export function tally(answers, side, now = Date.now()) {
  const rows = new Map(listFor(side).map(([k, l]) => [k, { src: k, label: l, n7: 0, n30: 0, all: 0 }]));
  const notes = [];
  for (const a of answers) {
    const r = a && rows.get(a.src); if (!r) continue;
    const age = now - Date.parse(a.at || 0);
    r.all++; if (age <= 30 * 864e5) r.n30++; if (age <= 7 * 864e5) r.n7++;
    if (a.src === "other" && a.detail) notes.push(a.detail);
  }
  return { total: answers.filter((a) => a && rows.has(a.src)).length, rows: [...rows.values()].sort((a, b) => b.all - a.all), notes: notes.slice(0, 100) };
}
