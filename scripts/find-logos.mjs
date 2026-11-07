// scripts/find-logos.mjs — 🖼 Logo Finder (GitHub Actions; the Claude workspace can't reach company sites).
// For each live company without a checked logo: try likely websites (known domain → domain its job board lives on →
// name.com guesses), PROVE the site is theirs (lib/logos.js proveSite), pick its best icon, and send the result back.
// Nothing proven = recorded as "none" (initials stay); re-checked after 30 days.
//   node scripts/find-logos.mjs [--limit=400] [--base=https://intern-iq-psi.vercel.app]
import { candidates, proveSite, pickIcon } from "../lib/logos.js";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=") || d;
const BASE = arg("base", "https://intern-iq-psi.vercel.app"), LIMIT = +arg("limit", 400), SECRET = process.env.CRON_SECRET;
const UA = "Mozilla/5.0 (compatible; BeatThePileBot/1.0; +https://www.beatthepile.com/)";
const auth = { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

async function fetchT(url, ms = 12000, init = {}) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { redirect: "follow", signal: c.signal, ...init, headers: { "User-Agent": UA, Accept: "text/html,*/*", ...(init.headers || {}) } }); }
  finally { clearTimeout(t); }
}
async function iconOk(url) {
  try { const r = await fetchT(url, 8000); const ct = r.headers.get("content-type") || ""; const n = (await r.arrayBuffer()).byteLength;
        return r.ok && /^image\//.test(ct) && n > 300; } catch { return false; }
}

async function one(c) {
  for (const cand of candidates(c)) {
    let r; try { r = await fetchT(`https://${cand.domain}/`); } catch { try { r = await fetchT(`https://www.${cand.domain}/`); } catch { continue; } }
    if (!r || !r.ok) continue;
    const ct = r.headers.get("content-type") || ""; if (!/html/.test(ct)) continue;
    const html = await r.text();
    const why = proveSite({ html, finalUrl: r.url, cand, company: c.company, ats: c.ats, config: c.config || {} });
    if (!why) continue;
    let logo = pickIcon(html, r.url);
    if (logo && !(await iconOk(logo))) logo = null;
    if (!logo) { const a = new URL("/apple-touch-icon.png", r.url).href; if (await iconOk(a)) logo = a; }
    return { id: c.id, domain: cand.domain, logo: logo || "fav", why };
  }
  return { id: c.id, domain: null, logo: "none" };
}

async function mapLimit(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

const t0 = Date.now();
const sw = await fetch(`${BASE}/api/discovery?bots=1`).then((r) => r.json()).catch(() => ({}));
if ((sw.bots || []).find((b) => b.id === "logos")?.enabled === false) { console.log("Logo Finder is switched off on /bots"); process.exit(0); }
const todo = await fetch(`${BASE}/api/discovery?logos=todo&limit=${LIMIT}`, { headers: auth }).then((r) => r.json());
const list = todo.companies || [];
console.log(`checking ${list.length} companies`);
const res = await mapLimit(list, 10, (c) => one(c).catch(() => ({ id: c.id, domain: null, logo: "none" })));
const found = res.filter((r) => r.domain), crisp = found.filter((r) => r.logo !== "fav");
for (let i = 0; i < res.length; i += 200) {
  const r = await fetch(`${BASE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify({ action: "logos", items: res.slice(i, i + 200) }) });
  if (!r.ok) console.log("save failed", r.status, await r.text());
}
const summary = `Checked ${res.length} companies · ${found.length} websites proven (${crisp.length} with a sharp logo) · ${res.length - found.length} kept initials`;
console.log(summary, `${Math.round((Date.now() - t0) / 1000)}s`);
for (const f of found.slice(0, 15)) console.log(" ", f.id, f.domain, f.why, f.logo === "fav" ? "(small icon)" : "");
await fetch(`${BASE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify({ action: "botlog", bot: "logos", ok: true, summary, stats: { checked: res.length, found: found.length, crisp: crisp.length } }) }).catch(() => {});
