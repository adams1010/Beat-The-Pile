// lib/fetchers/usajobs.js — federal jobs from USAJOBS (Nov 16), the US government's official job site (run by OPM).
// It is every federal agency's own job board, so the agency named on each posting IS the employer (proof by source).
// Reads three searches and merges them:
//   HiringPath=student   → Pathways internships (kind intern: the board itself says it's for students)
//   HiringPath=graduates → Recent Graduates program (kind fulltime: early career)
//   Keyword=intern       → anything else titled as an internship
// Needs USAJOBS_KEY + USAJOBS_EMAIL (GitHub secrets for Turbo Sync). The API asks for: Host data.usajobs.gov,
// User-Agent = the email the key was requested with, Authorization-Key = the key.
const API = "https://data.usajobs.gov/api/search";
const SEARCHES = [{ HiringPath: "student", tag: "intern" }, { HiringPath: "graduates", tag: "early" }, { Keyword: "intern", tag: "" }];
const MAX_PAGES = 10, PER_PAGE = 500;

/** "Anywhere in the U.S. (remote job)" → "Remote, United States"; "Washington, District of Columbia" stays. */
export function placeOf(locs = []) {
  const out = [];
  for (const l of Array.isArray(locs) ? locs : []) {
    const name = String(l?.LocationName || "").trim();
    if (!name) continue;
    if (/anywhere in the u\.?s\.?|remote job|telework/i.test(name) || (/^remote$/i.test(name))) { out.push("Remote, United States"); continue; }
    if (l.CountryCode && !/^(US|United States)$/i.test(String(l.CountryCode))) { out.push(name); continue; }   // overseas posts stay foreign → dropped
    const city = String(l.CityName || "").split(",")[0].trim(), st = String(l.CountrySubDivisionCode || "").trim();
    out.push(city && st ? `${city}, ${st}` : name);
  }
  return [...new Set(out)].slice(0, 12).join(" | ");
}

/** one USAJOBS item → our raw job shape; null when it's closed or unusable */
export function toJob(item, tag, now = Date.now()) {
  const d = item?.MatchedObjectDescriptor || {};
  const id = String(item?.MatchedObjectId || d.PositionID || "").trim();
  const title = String(d.PositionTitle || "").trim();
  // PositionURI looks like https://www.usajobs.gov:443/job/123 → keep only real usajobs.gov https links, without the port
  let url = ""; try { const u = new URL(String(d.PositionURI || "").trim()); if (u.protocol === "https:" && /(^|\.)usajobs\.gov$/i.test(u.hostname)) { u.port = ""; url = u.toString(); } } catch {}
  if (!id || !title || !url) return null;
  const close = Date.parse(d.ApplicationCloseDate || "");
  if (Number.isFinite(close) && close < now - 864e5) return null;          // past its closing date
  const agency = String(d.OrganizationName || d.DepartmentName || "").trim().slice(0, 120);
  return {
    sourceId: id, title, url, location: placeOf(d.PositionLocation),
    postedOn: d.PublicationStartDate ? String(d.PublicationStartDate).slice(0, 10) : null,
    agency: agency || null,
    isIntern: tag === "intern" || undefined,          // Pathways internship program (the board's own label)
    isEarly: tag === "early" || undefined,            // Recent Graduates program
  };
}

export async function fetchUsajobs(cfg, { fetchImpl = fetch, env = process.env } = {}) {
  const key = env.USAJOBS_KEY, email = env.USAJOBS_EMAIL;
  if (!key || !email) throw new Error("USAJOBS key not set (USAJOBS_KEY / USAJOBS_EMAIL)");
  const headers = { Host: "data.usajobs.gov", "User-Agent": email, "Authorization-Key": key, Accept: "application/json" };
  const byId = new Map();
  let failed = 0;
  for (const s of SEARCHES) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const q = new URLSearchParams({ ResultsPerPage: String(PER_PAGE), Page: String(page), WhoMayApply: "public" });
      if (s.HiringPath) { q.set("HiringPath", s.HiringPath); q.delete("WhoMayApply"); }
      if (s.Keyword) q.set("Keyword", s.Keyword);
      let r;
      try { r = await fetchImpl(`${API}?${q}`, { headers, signal: AbortSignal.timeout(30000) }); } catch { failed++; break; }
      if (r.status === 401 || r.status === 403) throw new Error(`USAJOBS answered ${r.status} (check the key and email)`);
      if (!r.ok) { if (env.USAJOBS_DEBUG) console.log(`[usajobs] ${JSON.stringify(s)}: HTTP ${r.status}`); failed++; break; }
      const j = await r.json().catch(() => null);
      const items = j?.SearchResult?.SearchResultItems || [];
      if (env.USAJOBS_DEBUG) console.log(`[usajobs] ${JSON.stringify(s)} page ${page}: HTTP ${r.status}, ${items.length} items of ${j?.SearchResult?.SearchResultCountAll ?? "?"}${j ? "" : " (not JSON)"}`);
      for (const it of items) {
        const job = toJob(it, s.tag); if (!job) continue;
        const had = byId.get(job.sourceId);
        byId.set(job.sourceId, had ? { ...had, isIntern: had.isIntern || job.isIntern, isEarly: had.isEarly || job.isEarly } : job);
      }
      const pages = +j?.SearchResult?.UserArea?.NumberOfPages || 1;
      if (page >= pages || items.length < PER_PAGE) break;
    }
  }
  const out = [...byId.values()];
  if (failed) out.partial = true;            // a search failed → close nothing this run
  return out;
}
