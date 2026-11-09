// lib/founding.js — Founding members (Nov 9): the first 150 student accounts get "Founding member #N" and keep every Pro
// feature free, for life (no price is ever named). N = your place among student sign-ups, oldest first (Clerk created_at;
// employer accounts don't count). Once someone's number is seen it's saved in Clerk public_metadata.founding (only the
// server can write that), so it never moves later. The public counter only ever shows the real count.
export const FOUNDING_CAP = 150;
const H = () => ({ Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` });
let cache = { at: 0, list: null };

/** Student accounts, oldest first (up to 500 — plenty to find the first 150). Cached 5 minutes per server. */
async function students() {
  if (cache.list && Date.now() - cache.at < 5 * 60e3) return cache.list;
  if (!process.env.CLERK_SECRET_KEY) throw new Error("no clerk");
  const r = await fetch("https://api.clerk.com/v1/users?order_by=%2Bcreated_at&limit=500", { headers: H() });
  if (!r.ok) throw new Error("clerk " + r.status);
  const j = await r.json();
  const all = Array.isArray(j) ? j : j?.data || [];
  const list = all.filter((u) => !["employer", "educator"].includes(u?.unsafe_metadata?.role)).map((u) => ({ id: u.id, saved: +u.public_metadata?.founding || null }));
  cache = { at: Date.now(), list };
  return list;
}

/** { taken, total, left } — real numbers only. */
export async function foundingCount() {
  const list = await students();
  const taken = Math.min(FOUNDING_CAP, list.length);
  return { taken, total: FOUNDING_CAP, left: FOUNDING_CAP - taken };
}

/** This account's founding number, or null. Saves it to Clerk the first time so it never changes. */
export async function foundingFor(uid) {
  if (!uid) return null;
  const list = await students();
  const me = list.find((u) => u.id === uid);
  if (!me) return null;
  if (me.saved) return me.saved <= FOUNDING_CAP ? me.saved : null;
  const taken = new Set(list.map((u) => u.saved).filter(Boolean));
  // your place in line, skipping numbers already saved by others (so two people never share one)
  let n = 0;
  for (const u of list) { if (u.saved) continue; do n++; while (taken.has(n)); if (u.id === uid) break; }
  if (n > FOUNDING_CAP) return null;
  try {
    const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}/metadata`, { method: "PATCH", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify({ public_metadata: { founding: n } }) });
    if (r.ok) { me.saved = n; }
  } catch {}
  return n;
}
export function _resetFoundingCache() { cache = { at: 0, list: null }; }
