// scripts/build-schools.mjs — every US college and the programs it actually awards degrees in, from the US Department of
// Education's IPEDS data (public domain): HD = institutions, C_A = completions by program (CIP code), CIPCode2020 = program names.
// Used by /u/ (school picker → that school's majors, so students at one school pick the same major name → Orbit's inner ring).
//   node scripts/build-schools.mjs <dir with HD2024.csv, C2024_A.csv, CIPCode2020.csv>
// Writes schools/index.json  [[unitid, name, aliases, city, state], …]   (degree-granting schools with programs)
//        schools/cip.json    { "14.1901": "Mechanical Engineering", … }
//        schools/p/<n>.json  { unitid: ["14.1901", …] }   n = unitid % 64 (so a page loads one small file)
//        schools/world.json  [[name, country], …]  universities outside the US, from the open "university-domains-list"
//                            (github.com/Hipo/university-domains-list, MIT) when world_universities_and_domains.json is in <dir>
import fs from "node:fs";
import { cleanMajorName } from "../lib/majornames.js";
const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/build-schools.mjs <dir>"); process.exit(1); }
const find = (re) => { const f = fs.readdirSync(dir).find((n) => re.test(n)); if (!f) throw new Error("missing " + re); return dir + "/" + f; };

// tiny CSV reader (quoted fields, commas inside quotes)
function* rows(file) {
  const buf = fs.readFileSync(file); let text = buf.toString("utf8");
  if (text.includes("\uFFFD")) text = buf.toString("latin1");   // older IPEDS files are Windows-1252
  let i = 0, row = [], f = "", q = false;
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0]) yield row; row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); yield row; }
}
function table(file) {
  const it = rows(file); const head = it.next().value.map((h) => h.replace(/[^A-Za-z0-9_]/g, "").toUpperCase());   // drops a byte-order mark ("ï»¿") and quotes
  const ix = (n) => head.indexOf(n);
  return { ix, it };
}
const STATES = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR".split(" "));

// 1) program names
const cip = {};
{ const { ix, it } = table(find(/^cipcode2020\.csv$/i));
  const c = ix("CIPCODE"), t = ix("CIPTITLE");
  for (const r of it) {
    const code = String(r[c] || "").replace(/[="\s]/g, ""); if (!/^\d{2}\.\d{4}$/.test(code)) continue;
    cip[code] = cleanMajorName(String(r[t] || "").trim().replace(/\.$/, "").replace(/,\s*General$/i, "").replace(/\s*\/\s*/g, " / "), code);   // Nov 14: names students say
  } }
// 2) which programs each school awards (associate 3, bachelor's 5, master's 7; any graduate in the last year counts).
// Nov 14: a school that awards bachelor's degrees lists ONLY its bachelor's majors (no grad-only programs or certificates in an
// undergrad's dropdown); a two-year college lists its associate programs; a graduate-only school its master's programs.
const progs = new Map(), byLevel = new Map();
{ const { ix, it } = table(find(/^c20\d\d_a(_rv)?\.csv$/i));
  const u = ix("UNITID"), c = ix("CIPCODE"), a = ix("AWLEVEL"), n = ix("CTOTALT");
  for (const r of it) {
    const code = String(r[c] || "").trim(); if (!/^\d{2}\.\d{4}$/.test(code) || !cip[code]) continue;
    if (!["3", "5", "7"].includes(String(r[a]).trim()) || !(+r[n] > 0)) continue;
    const id = +r[u], lv = String(r[a]).trim();
    if (!byLevel.has(id)) byLevel.set(id, { 3: new Set(), 5: new Set(), 7: new Set() });
    byLevel.get(id)[lv].add(code);
  }
  for (const [id, L] of byLevel) progs.set(id, L[5].size ? L[5] : L[3].size ? L[3] : L[7]);
}
// 3) the schools
const index = [];
{ const { ix, it } = table(find(/^hd20\d\d(_rv)?\.csv$/i));
  const u = ix("UNITID"), nm = ix("INSTNM"), al = ix("IALIAS"), city = ix("CITY"), st = ix("STABBR");
  for (const r of it) {
    const id = +r[u]; if (!progs.has(id) || !STATES.has(String(r[st]).trim())) continue;
    const aliases = String(r[al] || "").split(/[|,;]/).map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 60).slice(0, 4).join("|");
    index.push([id, String(r[nm]).trim(), aliases, String(r[city]).trim(), String(r[st]).trim()]);
  } }
index.sort((a, b) => a[1].localeCompare(b[1]));
const used = new Set(); for (const s of progs.values()) for (const c of s) used.add(c);
const shards = Array.from({ length: 64 }, () => ({}));
for (const [id] of index) shards[id % 64][id] = [...progs.get(id)].sort();
fs.mkdirSync("schools/p", { recursive: true });
fs.writeFileSync("schools/index.json", JSON.stringify(index));
fs.writeFileSync("schools/cip.json", JSON.stringify(Object.fromEntries([...used].sort().map((c) => [c, cip[c]]))));
shards.forEach((s, i) => fs.writeFileSync(`schools/p/${i}.json`, JSON.stringify(s)));
// 4) the rest of the world (no program lists — the major picker falls back to every program name)
const wf = fs.readdirSync(dir).find((n) => /^world_universities_and_domains\.json$/i.test(n));
if (wf) {
  const seenW = new Set(), world = [];
  for (const u of JSON.parse(fs.readFileSync(dir + "/" + wf, "utf8"))) {
    const nm = String(u?.name || "").trim(), co = String(u?.country || "").trim();
    if (!nm || !co || /^united states/i.test(co) || u.alpha_two_code === "US") continue;
    const k = nm.toLowerCase() + "|" + co; if (seenW.has(k)) continue; seenW.add(k); world.push([nm, co]);
  }
  world.sort((a, b) => a[0].localeCompare(b[0]));
  fs.writeFileSync("schools/world.json", JSON.stringify(world));
  console.log(`world: ${world.length} universities outside the US`);
}
console.log(`schools: ${index.length}, programs: ${used.size}, index ${(fs.statSync("schools/index.json").size / 1024).toFixed(0)} KB`);
