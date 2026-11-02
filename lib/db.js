// lib/db.js — tiny Supabase REST client (no npm dependency, so nothing can fail to import).
const URL_ = () => process.env.INTERNIQ_DB_URL;

function headers(write) {
  const key = write ? process.env.INTERNIQ_DB_SERVICE_KEY : process.env.INTERNIQ_DB_ANON_KEY;
  if (!URL_() || !key) throw new Error(`Missing INTERNIQ_DB_URL or ${write ? "INTERNIQ_DB_SERVICE_KEY" : "INTERNIQ_DB_ANON_KEY"}`);
  const h = { apikey: key, "Content-Type": "application/json" };
  // Legacy keys are JWTs and also go in Authorization; new sb_publishable_/sb_secret_ keys must not.
  if (!key.startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  return h;
}

async function call(path, { method = "GET", body, write = false, prefer } = {}) {
  const h = headers(write);
  if (prefer) h.Prefer = prefer;
  const res = await fetch(`${URL_()}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`DB ${method} ${path.split("?")[0]} → ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const db = {
  select: (path) => call(path),
  selectAsAdmin: (path) => call(path, { write: true }),
  upsert: (table, rows, onConflict = "id") =>
    rows.length ? call(`${table}?on_conflict=${onConflict}`, { method: "POST", body: rows, write: true, prefer: "resolution=merge-duplicates,return=minimal" }) : null,
  insertIgnore: (table, rows, onConflict = "id") =>
    rows.length ? call(`${table}?on_conflict=${onConflict}`, { method: "POST", body: rows, write: true, prefer: "resolution=ignore-duplicates,return=minimal" }) : null,
  insert: (table, rows) => call(table, { method: "POST", body: rows, write: true, prefer: "return=minimal" }),
  update: (pathWithFilters, patch) => call(pathWithFilters, { method: "PATCH", body: patch, write: true, prefer: "return=minimal" }),
};

/** Vercel cron sends `Authorization: Bearer $CRON_SECRET`. Reject anyone else. */
export function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}
