// scripts/build-school-domains.mjs — every US college's own web domain (US Dept. of Education IPEDS HD file, WEBADDR column),
// so faculty/staff verification can require an email ON the school's domain (lib/staffcheck.js).
//   node scripts/build-school-domains.mjs <HD20xx.csv>   →  schools/domains.json  { "233921": "vt.edu", … }
import fs from "node:fs";
const file = process.argv[2]; if (!file) { console.error("usage: node scripts/build-school-domains.mjs <HD csv>"); process.exit(1); }
const buf = fs.readFileSync(file); let text = buf.toString("utf8"); if (text.includes("�")) text = buf.toString("latin1");
const lines = text.split(/\r?\n/);
const split = (l) => { const out = []; let f = "", q = false; for (let i = 0; i < l.length; i++) { const c = l[i];
  if (q) { if (c === '"') { if (l[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ",") { out.push(f); f = ""; } else f += c; }
  out.push(f); return out; };
const head = split(lines[0]).map((h) => h.replace(/[^A-Za-z0-9_]/g, "").toUpperCase());
const U = head.indexOf("UNITID"), W = head.indexOf("WEBADDR");
if (U < 0 || W < 0) throw new Error("UNITID/WEBADDR missing");
// registrable domain: last two labels (vt.edu, umich.edu); three for k12/state-style hosts (xyz.k12.va.us, cc.va.us)
export const baseOf = (host) => { const p = String(host || "").toLowerCase().replace(/^www\d?\./, "").split(".").filter(Boolean);
  if (p.length < 2) return ""; const tld = p.slice(-2).join(".");
  return /^(k12|cc|co|edu|state|ac)\.[a-z]{2}$/.test(tld) || /\.(us)$/.test(tld) && p.length >= 3 ? p.slice(-3).join(".") : tld; };
const out = {};
for (const l of lines.slice(1)) { if (!l.trim()) continue; const r = split(l); const id = +r[U]; let w = String(r[W] || "").trim(); if (!id || !w) continue;
  if (!/^https?:\/\//i.test(w)) w = "https://" + w; let h = ""; try { h = new URL(w).hostname; } catch { continue; }
  const d = baseOf(h); if (d && /\./.test(d)) out[id] = d; }
fs.writeFileSync("schools/domains.json", JSON.stringify(out));
console.log(`school domains: ${Object.keys(out).length}`);
