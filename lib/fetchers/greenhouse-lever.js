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

export async function fetchLever(cfg) {
  const res = await get(`https://api.lever.co/v0/postings/${cfg.token}?mode=json`);
  if (!res.ok) throw new Error(`${cfg.id}: Lever HTTP ${res.status}`);
  const data = await res.json();
  return (data || []).map((j) => ({
    sourceId: j.id, title: j.text, location: j.categories?.location || "",
    url: j.hostedUrl, postedOn: j.createdAt ? new Date(j.createdAt).toISOString() : null,
  }));
}
