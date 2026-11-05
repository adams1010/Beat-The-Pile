// Company pages (/c/<company_id>) — Glassdoor-style, rendered on the server so search engines can read them.
// Every number is live data (open listings) or labeled history/estimates (Opening Radar). No reviews until real ones exist.
import fs from "node:fs";
import path from "node:path";
import { FIELD_LABELS } from "./fields.js";

export const normName = (s) => String(s || "").toLowerCase().replace(/&/g, "and")
  .replace(/\b(inc|llc|ltd|corp|corporation|company|co|the|group|plc|holdings|incorporated)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

let RADAR = null, RADAR_AT = 0;
/** Opening Radar history (radar/radar.json, rebuilt daily by the Radar bot). Cached per server instance for 10 min. */
const HERE = path.dirname(new URL(import.meta.url).pathname);
const RADAR_FILES = [path.join(process.cwd(), "radar", "radar.json"), path.join(HERE, "..", "radar", "radar.json")];   // Vercel (includeFiles) · local/tests
export function radarFor(id, name, file = RADAR_FILES.find((f) => fs.existsSync(f)) || RADAR_FILES[0]) {
  try {
    if (!RADAR || Date.now() - RADAR_AT > 600000) {
      const d = JSON.parse(fs.readFileSync(file, "utf8"));
      const byId = new Map(), byK = new Map();
      for (const c of d.companies || []) { if (c.id) byId.set(c.id, c); if (c.k) byK.set(c.k, c); }
      RADAR = { byId, byK, season: d.season }; RADAR_AT = Date.now();
    }
    const c = RADAR.byId.get(id) || RADAR.byK.get(normName(name));
    return c ? { ...c, season: RADAR.season } : null;
  } catch { return null; }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (n) => { const w = String(n || "").replace(/[^A-Za-z0-9& ]/g, " ").split(/\s+/).filter((x) => x && !/^(and|of|the|&|inc|llc|corp|co)$/i.test(x)); if (!w.length) return "·"; return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase(); };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const fmtDate = (iso) => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };
const fmtMonthDay = (iso) => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); };
const ago = (t) => { const d = Math.floor((Date.now() - new Date(t)) / 864e5); return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : `${Math.round(d / 30)} mo ago`; };
const firstLoc = (l) => String(l || "").split("|")[0].replace(/,\s*(US|USA|United States( of America)?)\b.*$/i, "").trim();

/** Build the page model from the company's open listings (+ radar). Pure — tested offline. */
export function model(id, rows, radar) {
  const name = rows[0]?.company || radar?.name?.trim() || "";
  const states = new Set(); const fields = new Map(); const groups = new Map();
  for (const r of rows) {
    for (const s of String(r.state || "").split(",").filter(Boolean)) states.add(s);
    const f = r.field || "other"; fields.set(f, (fields.get(f) || 0) + 1);
    const k = String(r.title || "").toLowerCase().replace(/\s+/g, " ").trim();
    const g = groups.get(k) || { title: r.title, url: r.url, field: f, first_seen: r.first_seen, locs: [] };
    g.locs.push(firstLoc(r.location)); if (r.first_seen > g.first_seen) g.first_seen = r.first_seen; groups.set(k, g);
  }
  const roles = [...groups.values()].sort((a, b) => String(b.first_seen).localeCompare(String(a.first_seen)));
  const newToday = rows.filter((r) => Date.now() - new Date(r.first_seen) < 864e5).length;
  return { id, name, open: rows.length, states: [...states].sort(), fields: [...fields.entries()].sort((a, b) => b[1] - a[1]),
    roles, newToday, board: host(rows[0]?.url), radar };
}

export function renderPage(m, site = "https://www.beatthepile.com") {
  const url = `${site}/c/${encodeURIComponent(m.id)}`;
  const title = m.open ? `${m.name} internships — ${m.open} open now | Beat the Pile` : `${m.name} internships — when they open | Beat the Pile`;
  const desc = m.open
    ? `${m.open} open ${m.name} internship${m.open === 1 ? "" : "s"}${m.states.length ? ` in ${m.states.length} state${m.states.length === 1 ? "" : "s"}` : ""}, pulled straight from ${m.name}'s own job board${m.board ? ` (${m.board})` : ""}. See roles by major and when they usually open.`
    : `${m.name} has no open internships right now. See when ${m.name} usually opens internship applications.`;
  const max = m.fields[0]?.[1] || 1;
  const r = m.radar;
  const hist = r?.history ? Object.entries(r.history).sort((a, b) => b[0].localeCompare(a[0])) : [];
  const nextOpen = r && !r.opened ? r.typical : r?.typicalNext;
  const shown = m.roles.slice(0, 60);
  const ld = { "@context": "https://schema.org", "@type": "Organization", name: m.name, url, ...(m.board ? { sameAs: [`https://${m.board}`] } : {}) };

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:type" content="website">
<link rel="icon" href="/icons/icon-192.png"><link rel="manifest" href="/manifest.webmanifest">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
  :root{--font:"Geist",-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  *{box-sizing:border-box} body{margin:0;font-family:var(--font);color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .wrap{max-width:1240px;margin:0 auto;padding:0 24px} @media(max-width:560px){.wrap{padding:0 16px}}
  .hero{background:#070F1E;color:#E8EDF5;border-bottom:1px solid #1A2640}
  .hero .in{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;padding:36px 0 28px}
  .cologo{width:84px;height:84px;border-radius:18px;background:#fff;color:#0A1426;display:grid;place-items:center;font-size:28px;font-weight:700;flex-shrink:0}
  .hero h1{font-size:clamp(28px,4.5vw,40px);font-weight:600;letter-spacing:-.025em;margin:0 0 6px;color:#fff;line-height:1.1}
  .hero p{margin:0;color:#9FAAC0;font-size:15px}
  .hero .acts{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
  .b{display:inline-block;font-size:14px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:999px;border:1px solid transparent;white-space:nowrap}
  .b.go{background:#2FD39A;color:#070F1E} .b.go:hover{background:#5EE0B3}
  .b.gh{border-color:#2E3D5C;color:#E8EDF5} .b.gh:hover{border-color:#5B6B8C}
  main{padding:24px 0 56px}
  .grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start} @media(max-width:900px){.grid{grid-template-columns:1fr}}
  .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px} @media(max-width:700px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
  .stat b{display:block;font:500 26px var(--mono);letter-spacing:-.01em} .stat span{font-size:13px;color:var(--muted)}
  .panel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px}
  .panel h2{font-size:16px;font-weight:600;margin:0 0 4px} .panel .note{font-size:12px;color:var(--faint);margin:0 0 14px}
  .bar{display:grid;grid-template-columns:minmax(110px,190px) 1fr 40px;gap:12px;align-items:center;font-size:14px;margin:9px 0}
  .bar .t{height:8px;background:#EEF1F6;border-radius:4px}.bar .f{height:8px;background:#0A1426;border-radius:4px}.bar .n{font-family:var(--mono);text-align:right}
  .role{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-top:1px solid #EEF1F6;align-items:flex-start}
  .role:first-of-type{border-top:0}
  .role .tt{font-weight:500;text-decoration:none} .role .tt:hover{color:#0B7A55;text-decoration:underline}
  .role .lc{font-size:13px;color:var(--muted);margin-top:2px} .role .wh{font:12px var(--mono);color:var(--muted);white-space:nowrap}
  .role .wh.new{color:#0B7A55}
  .row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #EEF1F6;font-size:14px} .row:first-of-type{border-top:0}
  .row .k{font-family:var(--mono);font-size:13px;color:var(--muted)}
  .dark{background:#070F1E;color:#E8EDF5;border-radius:12px;padding:20px;margin-bottom:16px}
  .dark .lb{font:500 11px var(--mono);letter-spacing:.08em;color:#2FD39A;margin:0 0 8px}
  .dark p{margin:0 0 14px;font-size:15px;line-height:1.45}
  .more{display:inline-block;margin-top:10px;font-size:14px;font-weight:500;color:#0B7A55;text-decoration:none}
  .crumb{font-size:13px;color:#8D9AB3;margin:0 0 14px;padding-top:18px} .crumb a{color:#AEB9CC;text-decoration:none}
</style>
<link rel="stylesheet" href="/d.css">
</head><body>
<script src="/nav.js"></script>
<section class="hero"><div class="wrap">
  <p class="crumb"><a href="/jobs/?major=all&amp;state=all">Internships</a> / Companies / ${esc(m.name)}</p>
  <div class="in">
    <div class="cologo" aria-hidden="true">${esc(initials(m.name))}</div>
    <div style="flex:1;min-width:240px">
      <h1>${esc(m.name)} internships</h1>
      <p>${m.open ? `${m.open} open now${m.states.length ? ` · ${m.states.length} state${m.states.length === 1 ? "" : "s"}` : ""} · straight from their own job board${m.board ? ` (${esc(m.board)})` : ""}` : "No open internships right now — see when they usually open below."}</p>
    </div>
    <div class="acts">
      ${m.open ? `<a class="b go" href="/jobs/?company=${encodeURIComponent(m.id)}&amp;major=all">Save &amp; follow on Jobs</a>` : `<a class="b go" href="/radar/">Get reminded on Radar</a>`}
      <a class="b gh" href="/?company=${encodeURIComponent(m.name)}#interview">Practice a ${esc(m.name)} interview</a>
    </div>
  </div>
</div></section>
<main id="main"><div class="wrap">
  <section class="stats" aria-label="At a glance">
    <div class="stat"><b>${m.open}</b><span>open internships</span></div>
    <div class="stat"><b>${m.states.length || "—"}</b><span>state${m.states.length === 1 ? "" : "s"}</span></div>
    <div class="stat"><b>${m.newToday}</b><span>found today</span></div>
    <div class="stat"><b>${nextOpen ? "~" + esc(fmtMonthDay(nextOpen)) : "—"}</b><span>${nextOpen ? "usually opens (estimate)" : "opening date unknown"}</span></div>
  </section>
  <div class="grid">
    <div>
      ${m.fields.length ? `<section class="panel"><h2>Who they're hiring right now</h2><p class="note">Open internships by major · live</p>
        ${m.fields.slice(0, 7).map(([k, n]) => `<div class="bar"><span>${esc(FIELD_LABELS[k] || "Other")}</span><div class="t"><div class="f" style="width:${Math.max(3, Math.round(n / max * 100))}%"></div></div><span class="n">${n}</span></div>`).join("")}</section>` : ""}
      <section class="panel"><h2>Open internships${m.open ? ` (${m.roles.length} role${m.roles.length === 1 ? "" : "s"})` : ""}</h2><p class="note">Apply links go to ${esc(m.name)}'s own site${m.board ? ` (${esc(m.board)})` : ""}</p>
        ${shown.length ? shown.map((g) => { const isNew = Date.now() - new Date(g.first_seen) < 2 * 864e5; const locs = [...new Set(g.locs.filter(Boolean))];
          return `<div class="role"><div style="min-width:0"><a class="tt" href="${esc(g.url)}" target="_blank" rel="noopener nofollow">${esc(g.title)}</a><div class="lc">${esc(locs[0] || "")}${locs.length > 1 ? ` +${locs.length - 1} more` : ""} · ${esc(FIELD_LABELS[g.field] || "Other")}</div></div><span class="wh${isNew ? " new" : ""}">${isNew ? "NEW" : "found " + esc(ago(g.first_seen))}</span></div>`; }).join("")
          : `<p style="color:var(--muted);margin:0">Nothing open right now. When ${esc(m.name)} posts, it shows up here within hours.</p>`}
        ${m.roles.length > shown.length ? `<a class="more" href="/jobs/?company=${encodeURIComponent(m.id)}&amp;major=all">All ${m.roles.length} roles on the Jobs page →</a>` : ""}
      </section>
    </div>
    <aside>
      <section class="panel"><h2>When they hire</h2><p class="note">First internship posting each season · public history${r ? ` · ${r.seasons} season${r.seasons === 1 ? "" : "s"}` : ""}</p>
        ${hist.length ? hist.map(([season, d]) => `<div class="row"><span class="k">Summer '${String(season).slice(2)}</span><span>${esc(fmtDate(d))}</span></div>`).join("")
          + (nextOpen ? `<div class="row"><span class="k">Next (estimate)</span><span>~${esc(fmtDate(nextOpen))}</span></div>` : "")
          : `<p style="color:var(--muted);margin:0;font-size:14px">We don't have opening history for ${esc(m.name)} yet.</p>`}
        <a class="more" href="/radar/">Remind me before they open →</a>
      </section>
      <section class="panel"><h2>Student reviews</h2>
        <p style="font-size:14px;line-height:1.55;color:var(--muted);margin:6px 0 0">Coming soon. We'll only show real reviews from students who interned here, with school and year verified — never made up.</p></section>
      <section class="dark"><p class="lb">INTERVIEW PRACTICE</p><p>Talk through a mock ${esc(m.name)} interview against a timer and get a grade.</p><a class="b go" href="/?company=${encodeURIComponent(m.name)}#interview">Start practice</a></section>
    </aside>
  </div>
</div></main>
<script src="/feedback.js" defer></script>
</body></html>`;
}

export function renderSitemap(ids, site = "https://www.beatthepile.com") {
  const statics = ["/", "/jobs/", "/fair/", "/radar/", "/season/", "/demo/", "/privacy/"];
  const urls = [...statics.map((p) => `${site}${p}`), ...ids.map((id) => `${site}/c/${encodeURIComponent(id)}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join("\n")}\n</urlset>\n`;
}

// Names api/listings.js calls.
export function companyPage({ id, rows, radar }, site) { const m = model(id, rows || [], radar); if (!m.name) m.name = id; return renderPage(m, site); }
export const sitemap = (ids, site) => renderSitemap(ids, site);
