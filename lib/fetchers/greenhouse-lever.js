// lib/fetchers/greenhouse-lever.js — public JSON boards (for startups, added later).
import { get } from "../http.js";

export async function fetchGreenhouse(cfg) {
  const res = await get(`https://boards-api.greenhouse.io/v1/boards/${cfg.token}/jobs`);
  if (!res.ok) throw new Error(`${cfg.id}: Greenhouse HTTP ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map((j) => ({
    sourceId: String(j.id), title: j.title, location: j.location?.name || "",
    url: j.absolute_url, postedOn: j.updated_at || null,
  }));
}

// Lever returns every posting with its full description: big companies are ~6 MB in one response, which timed out
// (Nov 2026: 28 companies a day). Read it in pages of 200 instead.
const LEVER_PAGE = 200, LEVER_MAX_PAGES = 25;
export async function fetchLever(cfg) {
  const data = [];
  for (let p = 0; p < LEVER_MAX_PAGES; p++) {
    const res = await get(`https://api.lever.co/v0/postings/${cfg.token}?mode=json&limit=${LEVER_PAGE}&skip=${p * LEVER_PAGE}`, { timeoutMs: 15000 });
    if (!res.ok) throw new Error(`${cfg.id}: Lever HTTP ${res.status}`);
    const page = await res.json();
    if (!Array.isArray(page)) break;
    data.push(...page);
    if (page.length < LEVER_PAGE) break;
  }
  return data.map((j) => ({
    sourceId: j.id, title: j.text, location: j.categories?.location || "",
    url: j.hostedUrl, postedOn: j.createdAt ? new Date(j.createdAt).toISOString() : null,
  }));
}
