// lib/achievements.js — stacking badges for real effort (Nov 15 2026). Counted only from the student's own Tracker / My Season
// records (user_jobs.apps), never invented. Public profiles show the tier reached ("25+ applications"), never exact counts.
export const TRACKS = [
  { id: "apply", name: "Applications", tiers: [1, 5, 10, 25, 50, 100, 250, 500],
    label: (n) => (n === 1 ? "First application" : `${n}+ applications`) },
  { id: "follow", name: "Follow-ups", tiers: [1, 5, 10, 25, 50],
    label: (n) => (n === 1 ? "First follow-up" : `${n}+ follow-ups`) },
  { id: "interview", name: "Interviews", tiers: [1, 3, 5, 10, 20],
    label: (n) => (n === 1 ? "First interview" : `${n}+ interviews`) },
  { id: "thanks", name: "Thank-you notes", tiers: [1, 5, 10, 25],
    label: (n) => (n === 1 ? "First thank-you note" : `${n}+ thank-you notes`) },
  { id: "offer", name: "Offers", tiers: [1, 2, 3, 5],
    label: (n) => (n === 1 ? "Got an offer" : `${n}+ offers`) },
];

/** Count the things each badge track measures, from the apps list. */
export function countsFrom(apps) {
  const A = Array.isArray(apps) ? apps : [];
  const c = { apply: 0, follow: 0, interview: 0, thanks: 0, offer: 0 };
  for (const a of A) {
    if (!a || a.checks?.submitted === false) continue;            // un-ticked "Applied" = not applied yet
    c.apply++;
    if (a.followedUpAt) c.follow++;
    if (a.stage === "interview" || a.stage === "offer" || a.checks?.interviewed || a.checks?.offered) c.interview++;
    if (a.checks?.thankyou) c.thanks++;
    if (a.stage === "offer" || a.checks?.offered || a.checks?.accepted) c.offer++;
  }
  return c;
}

/** Badges earned. owner=true adds the exact count and the next target (for the student's own view). */
export function achievementsFrom(apps, { owner = false } = {}) {
  const c = countsFrom(apps);
  return TRACKS.map((t) => {
    const n = c[t.id], got = t.tiers.filter((x) => n >= x);
    const top = got[got.length - 1], next = t.tiers.find((x) => n < x) || null;
    if (!top && !owner) return null;
    return { id: t.id, name: t.name, level: got.length, levels: t.tiers.length, label: top ? t.label(top) : null,
      ...(owner ? { count: n, next, nextLabel: next ? t.label(next) : null } : {}) };
  }).filter(Boolean);
}
