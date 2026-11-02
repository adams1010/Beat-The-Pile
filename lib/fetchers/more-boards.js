// lib/fetchers/more-boards.js — four more job systems, all read through their public JSON feeds
// (the same feeds each company's own careers page uses):
//   Ashby            api.ashbyhq.com/posting-api/job-board/{token}
//   SmartRecruiters  api.smartrecruiters.com/v1/companies/{token}/postings
//   Oracle Cloud HCM {host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions  (site = "CX_…")
//   Eightfold        {host}/api/apply/v2/jobs?domain={domain}
// Every fetcher returns [{ sourceId, title, location, url, postedOn }] like the others; the shared
// filter in fetchers/index.js then keeps US engineering internships only.
import { get } from "../http.js";

const QUERIES = ["intern", "co-op"];
const json = async (url, label) => {
  const r = await get(url, { timeoutMs: 12000, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${label} HTTP ${r.status}`);
  return r.json();
};
const join = (...parts) => parts.flat().filter(Boolean).map(String).map((s) => s.trim()).filter(Boolean).join(", ");

// ── Ashby (one call returns the whole board) ──
export async function fetchAshby(cfg) {
  const d = await json(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(cfg.token)}?includeCompensation=false`, `${cfg.id}: Ashby`);
  return (d.jobs || []).filter((j) => j.isListed !== false).map((j) => {
    const a = j.address?.postalAddress || {};
    const main = join(j.location, a.addressRegion, a.addressCountry);
    const extra = (j.secondaryLocations || []).map((s) => join(s.location, s.address?.postalAddress?.addressRegion, s.address?.postalAddress?.addressCountry));
    return { sourceId: String(j.id), title: j.title, location: [main, ...extra].filter(Boolean).join(" | "),
             url: j.jobUrl || `https://jobs.ashbyhq.com/${cfg.token}/${j.id}`, postedOn: j.publishedAt || null };
  });
}

// ── SmartRecruiters (keyword search, 100 per page) ──
export async function fetchSmartRecruiters(cfg) {
  const all = new Map();
  for (const q of QUERIES) {
    for (let off = 0; off < 1000; off += 100) {
      const d = await json(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(cfg.token)}/postings?q=${encodeURIComponent(q)}&limit=100&offset=${off}`, `${cfg.id}: SmartRecruiters`);
      for (const j of d.content || []) {
        const l = j.location || {};
        all.set(String(j.id), { sourceId: String(j.id), title: j.name,
          location: j.location?.fullLocation || join(l.city, l.regionCode || l.region, l.country === "us" ? "US" : l.country),
          url: `https://jobs.smartrecruiters.com/${cfg.token}/${j.id}`, postedOn: j.releasedDate || null });
      }
      if (!d.content || d.content.length < 100) break;
    }
  }
  return [...all.values()];
}

// ── Oracle Cloud HCM "Candidate Experience" (keyword search, 100 per page) ──
export const oracleJobUrl = (cfg, id) => `https://${cfg.host}/hcmUI/CandidateExperience/en/sites/${cfg.site}/job/${id}`;
export function oracleSearchUrl(cfg, q, offset = 0) {
  const finder = `findReqs;siteNumber=${cfg.site},facetsList=NONE,keyword="${q}",limit=100,offset=${offset},sortBy=POSTING_DATES_DESC`;
  return `https://${cfg.host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${encodeURIComponent(finder)}`;
}
export function parseOracle(d, cfg) {
  const item = (d.items || [])[0] || {};
  const jobs = (item.requisitionList || []).map((j) => ({
    sourceId: String(j.Id), title: j.Title,
    location: [join(j.PrimaryLocation, j.PrimaryLocationCountry), ...(j.secondaryLocations || []).map((s) => join(s.Name, s.CountryCode))].filter(Boolean).join(" | "),
    url: oracleJobUrl(cfg, j.Id), postedOn: j.PostedDate || null,
  }));
  return { jobs, total: item.TotalJobsCount ?? jobs.length };
}
export async function fetchOracle(cfg) {
  const all = new Map();
  for (const q of QUERIES) {
    for (let off = 0; off < 1000; off += 100) {
      const { jobs, total } = parseOracle(await json(oracleSearchUrl(cfg, q, off), `${cfg.id}: Oracle`), cfg);
      jobs.forEach((j) => all.set(j.sourceId, j));
      if (jobs.length < 100 || off + 100 >= total) break;
    }
  }
  return [...all.values()];
}

// ── Eightfold (keyword search, 100 per page; "domain" picks the company on shared hosts) ──
export async function fetchEightfold(cfg) {
  const all = new Map();
  for (const q of QUERIES) {
    for (let start = 0; start < 1000; start += 100) {
      const d = await json(`https://${cfg.host}/api/apply/v2/jobs?domain=${encodeURIComponent(cfg.domain)}&query=${encodeURIComponent(q)}&start=${start}&num=100`, `${cfg.id}: Eightfold`);
      for (const j of d.positions || []) {
        all.set(String(j.id), { sourceId: String(j.id), title: j.name,
          location: (j.locations && j.locations.length ? j.locations : [j.location]).filter(Boolean).join(" | "),
          url: j.canonicalPositionUrl || `https://${cfg.host}/careers?pid=${j.id}&domain=${cfg.domain}`,
          postedOn: j.t_create ? new Date(j.t_create * 1000).toISOString() : null });
      }
      if (!d.positions || d.positions.length < 100) break;
    }
  }
  return [...all.values()];
}

// ── Paylocity (whole board is embedded in the page as window.pageData) ──
export function parsePaylocity(html) {
  const m = String(html).match(/window\.pageData\s*=\s*(\{.*?\});\s*(?:\n|<\/script>)/s);
  if (!m) return [];
  const d = JSON.parse(m[1]);
  return (d.Jobs || []).filter((j) => !j.IsInternal).map((j) => {
    const L = j.JobLocation || {};
    return { sourceId: String(j.JobId), title: j.JobTitle,
             location: L.City && L.State ? join(L.City, L.State, L.Country) : (j.LocationName || ""),
             url: `https://recruiting.paylocity.com/Recruiting/Jobs/Details/${j.JobId}`, postedOn: j.PublishedDate || null };
  });
}
export async function fetchPaylocity(cfg) {
  const r = await get(`https://recruiting.paylocity.com/recruiting/jobs/All/${cfg.token}`, { timeoutMs: 12000 });
  if (!r.ok) throw new Error(`${cfg.id}: Paylocity HTTP ${r.status}`);
  return parsePaylocity(await r.text());
}

// ── ADP Workforce Now career center (JSON, 100 per page) ──
export const adpApi = (cid, skip = 0) => `https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions?cid=${cid}&timeStamp=1&lang=en_US&ccId=19000101_000001&locale=en_US&$top=100&$skip=${skip}`;
export function parseAdp(d, cid) {
  return (d.jobRequisitions || [])
    .filter((j) => !(j.customFieldGroup?.indicatorFields || []).some((f) => f.nameCode?.codeValue === "InternalPostingFlag" && f.indicatorValue))
    .map((j) => ({
      sourceId: String(j.itemID), title: j.requisitionTitle,
      location: (j.requisitionLocations || []).map((l) => (l.nameCode?.shortName || join(l.address?.cityName, l.address?.countrySubdivisionLevel1?.codeValue)).trim()).filter(Boolean).join(" | "),
      url: `https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=${cid}&ccId=19000101_000001&jobId=${encodeURIComponent(j.itemID)}&lang=en_US`,
      postedOn: j.postDate || null,
    }));
}
export async function fetchAdp(cfg) {
  const all = [];
  for (let skip = 0; skip < 2000; skip += 100) {
    const d = await json(adpApi(cfg.token, skip), `${cfg.id}: ADP`);
    const page = parseAdp(d, cfg.token);
    all.push(...page);
    if ((d.jobRequisitions || []).length < 100) break;
  }
  return all;
}
