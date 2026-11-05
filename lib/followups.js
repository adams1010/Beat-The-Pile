// lib/followups.js — one rule for "a follow-up is due", used by My Season, the reminder emails and tests.
// Due = still "applied", applied FOLLOW_DAYS+ days ago, not marked followed-up, and not ancient (we stop nagging after STOP_DAYS).
export const FOLLOW_DAYS = 5;
export const STOP_DAYS = 45;
const DAY = 864e5;

export function daysSince(iso, now = Date.now()) {
  const t = Date.parse(iso); return Number.isFinite(t) ? Math.floor((now - t) / DAY) : null;
}

export function dueFollowUps(apps, now = Date.now()) {
  return (Array.isArray(apps) ? apps : []).filter((a) => {
    if (!a || a.stage !== "applied" || a.followedUpAt) return false;
    const d = daysSince(a.appliedAt, now);
    return d != null && d >= FOLLOW_DAYS && d <= STOP_DAYS;
  }).sort((a, b) => Date.parse(a.appliedAt) - Date.parse(b.appliedAt));
}
