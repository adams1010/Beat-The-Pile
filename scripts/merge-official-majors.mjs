// Nov 14 2026: add a school's official major list to schools/official.json.
//   node scripts/merge-official-majors.mjs <dir>   — each <dir>/<unitid>.txt = first line source URL, then one major per line.
// Official names come first (degree tags like ", B.A." / "(BSEd)" dropped); then any program the US Dept. of Education says the
// school awards that the official page didn't name, so a page we read incompletely never hides a real major.
import fs from "node:fs";
import { cleanMajorName } from "../lib/majornames.js";
const dir = process.argv[2], root = new URL("..", import.meta.url).pathname;
const off = JSON.parse(fs.readFileSync(root + "schools/official.json", "utf8")), cip = JSON.parse(fs.readFileSync(root + "schools/cip.json", "utf8"));
off._sources ||= {};
const key = (s) => s.toLowerCase().replace(/&/g, "and").replace(/\b(general|studies|bachelor of|and|b\.?[asp]\.?|bsed|b\.?s\.?ed\.?)\b/g, "").replace(/[^a-z]/g, "");
const tidy = (s) => s.replace(/\s*[,(]\s*(B\.?A\.?|B\.?S\.?|B\.?P\.?S\.?|BSEd|B\.?F\.?A\.?|B\.?B\.?A\.?|B\.?M\.?|B\.?S\.?N\.?)\.?\s*\)?\s*$/i, "").replace(/\s+-\s+General$/i, "").replace(/\s+/g, " ").trim();
for (const f of fs.readdirSync(dir).filter((n) => /^\d+\.txt$/.test(n))) {
  const id = f.replace(".txt", ""), lines = fs.readFileSync(dir + "/" + f, "utf8").split("\n").map((x) => x.trim()).filter(Boolean);
  const src = lines.shift(), names = [];
  for (const l of lines) { const t = tidy(l); if (t && !names.some((n) => n.toLowerCase() === t.toLowerCase())) names.push(t); }
  const keys = names.map(key);
  const shard = JSON.parse(fs.readFileSync(root + `schools/p/${+id % 64}.json`, "utf8"))[id] || [];
  const extra = [...new Set(shard.map((c) => cip[c] || cleanMajorName("", c)).filter(Boolean))].filter((n) => { const k = key(n); return k.length > 2 && !keys.some((o) => o === k || (o.length >= 5 && k.length >= 5 && (o.includes(k) || k.includes(o)))); });
  off[id] = [...names, ...extra].sort((a, b) => a.localeCompare(b));
  off._sources[id] = src;
  console.log(id, names.length, "official +", extra.length, "from federal data:", extra.slice(0, 12).join(" | "));
}
fs.writeFileSync(root + "schools/official.json", JSON.stringify(off, null, 1));
