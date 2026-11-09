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

/** Supabase returns at most 1000 rows per request — page through everything (path must not set limit/offset). */
async function selectAll(path, write, max = 50000) {
  const ordered = /[?&]order=/.test(path) ? path : path + (path.includes("?") ? "&" : "?") + "order=id.asc";
  const out = [];
  for (let off = 0; off < max; off += 1000) {
    const page = await call(`${ordered}&limit=1000&offset=${off}`, { write });
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

/** Row count for a filter, without downloading rows (PostgREST Content-Range). */
async function count(path, write = false) {
  const h = headers(write); h.Prefer = "count=exact";
  const res = await fetch(`${URL_()}/rest/v1/${path}${path.includes("?") ? "&" : "?"}select=id&limit=1`, { headers: h });
  if (res.status === 416) return 0;                                   // empty table + range → "not satisfiable" = zero rows
  if (!res.ok) throw new Error(`DB count ${path.split("?")[0]} → ${res.status}`);
  const n = Number(String(res.headers.get("content-range") || "").split("/")[1]);   // "0-0/123" or "*/0"
  if (!Number.isFinite(n)) throw new Error("DB count unreadable");
  return n;
}

export const db = {
  count: (path) => count(path, false),
  countAsAdmin: (path) => count(path, true),
  select: (path) => call(path),
  selectAsAdmin: (path) => call(path, { write: true }),
  selectAll: (path) => selectAll(path, false),
  selectAllAsAdmin: (path) => selectAll(path, true),
  upsert: (table, rows, onConflict = "id") =>
    rows.length ? call(`${table}?on_conflict=${onConflict}`, { method: "POST", body: rows, write: true, prefer: "resolution=merge-duplicates,return=minimal" }) : null,
  insertIgnore: (table, rows, onConflict = "id") =>
    rows.length ? call(`${table}?on_conflict=${onConflict}`, { method: "POST", body: rows, write: true, prefer: "resolution=ignore-duplicates,return=minimal" }) : null,
  insert: (table, rows) => call(table, { method: "POST", body: rows, write: true, prefer: "return=minimal" }),
  update: (pathWithFilters, patch) => call(pathWithFilters, { method: "PATCH", body: patch, write: true, prefer: "return=minimal" }),
  /** PATCH and return the rows that changed (empty array = the filter matched nothing, e.g. a version check failed). */
  updateReturning: (pathWithFilters, patch) => call(pathWithFilters, { method: "PATCH", body: patch, write: true, prefer: "return=representation" }),
  /** DELETE rows matching the filters (service role). Callers must always pass a filter. */
  deleteRows: (pathWithFilters) => {
    if (!/\?.*=/.test(pathWithFilters)) throw new Error("deleteRows needs a filter");
    return call(pathWithFilters, { method: "DELETE", write: true, prefer: "return=minimal" });
  },
  /** Call a Postgres function (service role). */
  rpc: (fn, args) => call(`rpc/${fn}`, { method: "POST", body: args || {}, write: true }),
};

/** Vercel cron sends `Authorization: Bearer $CRON_SECRET`. Reject anyone else. */
export function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}
