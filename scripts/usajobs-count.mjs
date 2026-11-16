// node scripts/usajobs-count.mjs → how many USAJOBS postings exist for a few filters (counts only; needs USAJOBS_KEY/EMAIL)
const H = { Host: "data.usajobs.gov", "User-Agent": process.env.USAJOBS_EMAIL, "Authorization-Key": process.env.USAJOBS_KEY };
const count = async (q) => { const r = await fetch("https://data.usajobs.gov/api/search?ResultsPerPage=1&" + new URLSearchParams(q), { headers: H });
  const j = await r.json().catch(() => null); return j?.SearchResult?.SearchResultCountAll ?? `HTTP ${r.status}`; };
const rows = [
  ["every open federal posting", {}],
  ["open to the public (anyone can apply)", { WhoMayApply: "public" }],
  ["public, GS-1 to GS-7 (entry-level grades)", { WhoMayApply: "public", PayGradeLow: "01", PayGradeHigh: "07" }],
  ["public, GS-5 to GS-9 (new-grad grades)", { WhoMayApply: "public", PayGradeLow: "05", PayGradeHigh: "09" }],
  ["students (Pathways internships)", { HiringPath: "student" }],
  ["recent graduates", { HiringPath: "graduates" }],
  ["keyword intern", { Keyword: "intern" }],
  ["part-time, public", { WhoMayApply: "public", PositionScheduleTypeCode: "2" }],
  ["seasonal/temporary, public", { WhoMayApply: "public", PositionOfferingTypeCode: "15318" }],
];
for (const [label, q] of rows) console.log(`[count] ${label}: ${await count(q)}`);
