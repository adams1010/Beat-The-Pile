// scripts/build-major-list.mjs (Nov 19) — every major name we know → its /jobs areas, for the "Your major" box on /jobs.
// Names: the homepage quiz majors + every federal (CIP) program name + every school's official major names.
// Areas come from lib/geo.js fieldsForMajor (same rules as the quiz, /majors and alerts). Output: jobs/majors.json
//   [[name, "field,field"], …]   ("" = we can't tell → every major). Re-run after changing fieldsForMajor or the school lists.
import fs from "node:fs";
import { fieldsForMajor } from "../lib/geo.js";
import { FIELDS } from "../lib/fields.js";
import { cleanMajorName } from "../lib/majornames.js";
await import("../jobs/search.js");   // sets globalThis.btpJobSearch (areasOf = the /jobs search word → area rules)
const { areasOf } = globalThis.btpJobSearch;
const KEYS = new Set([...FIELDS.map(([k]) => k), "other"]);
const home = fs.readFileSync("src/home.jsx", "utf8");
const quiz = Function(`return ${home.match(/const MAJORS=(\[[^\]]*\])/)[1]}`)().filter((m) => m !== "Other");
const cip = Object.values(JSON.parse(fs.readFileSync("schools/cip.json", "utf8")));
const off = JSON.parse(fs.readFileSync("schools/official.json", "utf8"));
const offNames = Object.entries(off).filter(([k]) => !k.startsWith("_")).flatMap(([, v]) => v);
const norm = (s) => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const seen = new Map();
for (const raw of [...quiz, ...offNames, ...cip]) {
  if (/^other\b/i.test(raw)) continue;
  const name = (cleanMajorName(raw) || raw).trim(); if (!name || name.length > 70) continue;
  const k = norm(name); if (seen.has(k)) continue;
  let f = (fieldsForMajor(name) || []).filter((x) => KEYS.has(x));
  if (!f.length) f = [...new Set(norm(name).split(" ").flatMap((w) => areasOf(w)))].filter((x) => KEYS.has(x)).slice(0, 4);   // "Zoology", "Anatomy"
  seen.set(k, [name, f.join(",")]);
}
const out = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0]));
fs.writeFileSync("jobs/majors.json", JSON.stringify(out));
console.log(`jobs/majors.json: ${out.length} majors, ${out.filter((x) => x[1]).length} mapped to job areas`);
