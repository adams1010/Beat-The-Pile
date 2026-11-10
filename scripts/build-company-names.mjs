// Builds /companies/names.json for the Interview practice company lookup (Nov 10).
//   node scripts/build-company-names.mjs [sec_company_tickers_exchange.json]
// Sources, merged and de-duplicated: data/company-aliases.json (nicknames + acronyms: SAP, RTX ↔ Raytheon …),
// every company we track (lib/companies.js + data/backlog.json), and — when the file is given — every company
// listed with the SEC (company_tickers_exchange.json: name + ticker, public). Output: [[shown name, ...other names]].
import fs from "node:fs";
import { COMPANIES } from "../lib/companies.js";

const SUFFIX = /[,.]?\s+(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|llc|l\.?p|holdings?|group|n\.?v|s\.?a|s\.?e|ag|se|sa|nv|the)\.?$/i;
const clean = (n) => { let s = String(n || "").replace(/\s+/g, " ").replace(/\/[A-Z]{2,3}\/?$/, "").trim(); for (let i = 0; i < 3; i++) s = s.replace(SUFFIX, "").trim(); return s; };
const caseFix = (s) => (/[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b([a-z])([a-z']*)/g, (m, a, b) => (m.length <= 3 && !/[aeiou]/.test(m) ? m.toUpperCase() : a.toUpperCase() + b)));
const key = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

const out = new Map();          // key(shown) → [shown, ...aliases]
const byAlias = new Map();      // key(any name) → key(shown)
function add(shown, aliases = [], { nameOnly = false } = {}) {
  shown = String(shown || "").trim(); if (!shown || shown.length > 80) return;
  const names = [shown, ...aliases].map((x) => String(x || "").trim()).filter(Boolean);
  // SEC rows join an existing company only by their NAME (a ticker like "APL" must never pull them into someone else's row)
  let k = (nameOnly ? [key(shown)] : names.map(key)).find((x) => byAlias.has(x)); k = k ? byAlias.get(k) : key(shown);
  if (!k) return;
  const row = out.get(k) || [shown]; out.set(k, row);
  for (const n of names) { const nk = key(n); if (!nk) continue; if (!byAlias.has(nk)) byAlias.set(nk, k); if (!row.some((x) => key(x) === nk)) row.push(n); }
}

for (const a of JSON.parse(fs.readFileSync("data/company-aliases.json", "utf8")).aliases) add(a[0], a.slice(1));
for (const c of COMPANIES) { const m = /^(.*?)\s*\((.*)\)\s*$/.exec(c.company); m ? add(m[1], m[2].split(/\s*\/\s*/)) : add(c.company); }
for (const c of JSON.parse(fs.readFileSync("data/backlog.json", "utf8")).companies) add(c.company);
const sec = process.argv[2];
if (sec && fs.existsSync(sec)) {
  const j = JSON.parse(fs.readFileSync(sec, "utf8")), fi = j.fields || [];
  const iN = fi.indexOf("name"), iT = fi.indexOf("ticker"), iX = fi.indexOf("exchange");
  for (const r of j.data || []) {
    if (!r[iN] || (iX >= 0 && !r[iX])) continue;                    // OTC shells with no exchange are skipped
    const nm = caseFix(clean(r[iN])); if (nm.length < 2) continue;
    const tk = r[iT] && String(r[iT]).length >= 2 ? String(r[iT]).toUpperCase() : null;
    add(nm, tk && (!byAlias.has(key(tk)) || byAlias.get(key(tk)) === byAlias.get(key(nm))) ? [tk] : [], { nameOnly: true });
  }
}
const list = [...out.values()].sort((a, b) => a[0].localeCompare(b[0]));
fs.mkdirSync("companies", { recursive: true });
fs.writeFileSync("companies/names.json", JSON.stringify(list));
console.log(`companies/names.json: ${list.length} companies, ${list.reduce((n, r) => n + r.length - 1, 0)} other names`);
