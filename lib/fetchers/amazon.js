// lib/fetchers/amazon.js (Nov 26 2026) — Amazon's own job site, amazon.jobs (public search feed /en/search.json; robots.txt
// only disallows /internal). It IS Amazon's board, so the company is proven by source (hand-verified entry in lib/companies.js).
// Amazon's hourly warehouse site (hiring.amazon.com) blocks automated visits, so it is not read.
// A search returns at most 10,000 hits, so we read: every US job newest first (up to the cap), plus focused searches that
// reach past it (student programs, "intern", technician, associate…). Our usual rules (lib/fields.js) then decide what's kept.
const API = "https://www.amazon.jobs/en/search.json";
const PER = 100;
export const SEARCHES = [
  { label: "all", params: { sort: "recent" }, pages: 100 },
  { label: "student programs", params: { "business_category[]": "studentprograms" }, pages: 20 },
  ...["intern", "co-op", "university", "graduate", "entry level", "associate", "technician", "apprentice", "part time", "seasonal", "customer service", "coordinator", "assistant"]
    .map((q) => ({ label: q, params: { base_query: q }, pages: 15 })),
];

/** "US, CO, Loveland" / locations JSON → "Loveland, CO | Memphis, TN" (US places only; others kept as-is so the usual filter drops them) */
export function placeOf(j) {
  const out = [];
  for (const raw of Array.isArray(j?.locations) ? j.locations : []) {
    try {
      const l = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (l?.type === "REMOTE" || /virtual|remote/i.test(String(l?.city || ""))) { out.push(l?.countryIso2a === "US" ? "Remote, United States" : String(l?.normalizedLocation || "")); continue; }
      const st = String(l?.locationNonStemming || "").match(/^United States, ([A-Z]{2}), (.+)$/);
      if (st) out.push(`${st[2]}, ${st[1]}`); else if (l?.normalizedLocation) out.push(String(l.normalizedLocation));
    } catch {}
  }
  if (!out.length) { const m = String(j?.location || "").match(/^US, ([A-Z]{2}), (.+)$/); if (m) out.push(`${m[2]}, ${m[1]}`); else if (j?.location) out.push(String(j.location)); }
  return [...new Set(out.filter(Boolean))].slice(0, 12).join(" | ");
}

/** one amazon.jobs item → our raw job shape (null when unusable) */
export function toJob(j) {
  const id = String(j?.id_icims || j?.id || "").trim(), title = String(j?.title || "").trim(), path = String(j?.job_path || "");
  if (!id || !title || !/^\/[a-z-]+\/jobs\//.test(path)) return null;
  return { sourceId: id, title, location: placeOf(j), url: "https://www.amazon.jobs" + path.split("?")[0], postedOn: j.posted_date || null,
           isIntern: j.business_category === "studentprograms" && /\b(intern|internship|co-?op)\b/i.test(title) ? true : undefined };
}

export async function fetchAmazon(cfg, { fetchImpl = fetch, maxPages = null, retryMs = 1500 } = {}) {
  const seen = new Map();
  let ok = 0, failed = 0;
  for (const s of SEARCHES) {
    const pages = Math.min(s.pages, maxPages ?? s.pages);
    for (let p = 0; p < pages; p++) {
      const q = new URLSearchParams({ country: "USA", result_limit: String(PER), offset: String(p * PER), ...s.params });
      let d = null;
      for (let t = 0; t < 3 && !d; t++) {
        try {
          const r = await fetchImpl(`${API}?${q}`, { headers: { Accept: "application/json", "User-Agent": "BeatThePile/1.0 (+https://www.beatthepile.com/bots/)" }, signal: AbortSignal.timeout(30000) });
          if (r.ok) d = await r.json(); else if (r.status === 404) break;
        } catch {}
        if (!d && retryMs) await new Promise((z) => setTimeout(z, retryMs * (t + 1)));
      }
      if (!d) { failed++; break; }
      ok++;
      const jobs = Array.isArray(d.jobs) ? d.jobs : [];
      for (const j of jobs) { const x = toJob(j); if (x && !seen.has(x.sourceId)) seen.set(x.sourceId, x); }
      if (jobs.length < PER || (p + 1) * PER >= Math.min(10000, Number(d.hits) || 0)) break;
    }
  }
  if (!ok) throw new Error(`${cfg.id}: Amazon Jobs didn't answer (${failed} failed searches)`);
  return [...seen.values()];
}
