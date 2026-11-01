// lib/http.js — fetch with a timeout and a real browser-ish User-Agent.
const UA = "Mozilla/5.0 (compatible; InternIQBot/2.0; +https://intern-iq-psi.vercel.app)";

export async function get(url, { timeoutMs = 12000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: { "User-Agent": UA, ...headers }, redirect: "follow", signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

export async function postJson(url, body, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally { clearTimeout(t); }
}

/** Run async fn over items with limited parallelism. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  });
  await Promise.all(workers);
  return out;
}
