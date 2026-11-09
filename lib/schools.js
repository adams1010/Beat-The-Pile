// lib/schools.js — server side of the school list (schools/index.json, US Dept. of Education IPEDS). Turns whatever a
// student typed ("Virginia Tech", "VT", "Virginia Polytechnic Institute and State University") into one school id, so
// Orbit puts classmates together however they wrote it. Aliases come from IPEDS itself.
import fs from "node:fs";
let MAP = null;
const norm = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/\bthe\b/g, "").replace(/[^a-z0-9]/g, "");
function load() {
  if (MAP) return MAP;
  MAP = new Map();
  try {
    const idx = JSON.parse(fs.readFileSync(new URL("../schools/index.json", import.meta.url), "utf8"));
    const seen = new Map();   // an alias two schools share ("USC") is ambiguous → dropped
    for (const [id, name, aliases] of idx) {
      MAP.set(norm(name), id);
      for (const a of String(aliases || "").split("|")) { const k = norm(a); if (k.length < 2) continue; seen.set(k, seen.has(k) && seen.get(k) !== id ? -1 : id); }
    }
    for (const [k, id] of seen) if (id > 0 && !MAP.has(k)) MAP.set(k, id);
  } catch { /* no list deployed: names only */ }
  return MAP;
}
/** IPEDS id for a school name or alias, or null. */
export function schoolIdFor(name) { const k = norm(name); return k ? load().get(k) || null : null; }
