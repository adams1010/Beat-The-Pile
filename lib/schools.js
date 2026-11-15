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

// Nov 15: the name people actually say, for display only ("Virginia Polytechnic Institute and State University" →
// "Virginia Tech"). Uses the school's IPEDS alias when it is a real short name (not an acronym like "ABAC") that shares a
// word with the official name before any "-Campus" part, so "Penn State Erie-Behrend College" never becomes "Behrend College".
let SHORT = null;
const CURATED = { 233921: "Virginia Tech", 228723: "Texas A&M", 214777: "Penn State", 243780: "Purdue", 171100: "Michigan State", 170976: "University of Michigan",
  204796: "Ohio State", 145637: "University of Illinois", 240444: "UW-Madison", 174066: "University of Minnesota", 199193: "NC State", 199120: "UNC Chapel Hill",
  234076: "UVA", 232186: "George Mason", 232982: "Old Dominion", 231624: "William & Mary", 232423: "JMU", 234030: "VCU", 139755: "Georgia Tech",
  134130: "University of Florida", 228778: "UT Austin", 110635: "UC Berkeley", 110662: "UCLA", 123961: "USC", 166683: "MIT", 166027: "Harvard",
  243744: "Stanford", 190415: "Cornell", 215062: "Penn", 162928: "Johns Hopkins", 163286: "University of Maryland", 186380: "Rutgers", 215293: "Pitt",
  104151: "Arizona State", 126614: "CU Boulder", 236948: "University of Washington", 100751: "University of Alabama", 100858: "Auburn", 217882: "Clemson",
  153603: "Iowa State", 137351: "USF", 132903: "UCF", 134097: "Florida State", 221759: "University of Tennessee", 157085: "University of Kentucky" };
function shortMap() {
  if (SHORT) return SHORT;
  SHORT = new Map();
  try {
    const idx = JSON.parse(fs.readFileSync(new URL("../schools/index.json", import.meta.url), "utf8"));
    for (const [id, name, aliases] of idx) {
      const base = String(name).split("-")[0].toLowerCase(), first = String(aliases || "").split("|")[0].trim();
      const ok = first && /[a-z]/.test(first) && first.includes(" ") && first.split(/\s+/).some((w) => w.length > 3 && base.includes(w.toLowerCase()));
      SHORT.set(id, CURATED[id] || (ok ? first : String(name).replace(/-Main Campus$/, "")));
    }
  } catch {}
  return SHORT;
}
/** Short display name for a school name or IPEDS id; unknown names come back unchanged. */
export function shortSchool(nameOrId) {
  if (!nameOrId) return "";
  const id = Number.isInteger(+nameOrId) && +nameOrId > 99999 ? +nameOrId : schoolIdFor(nameOrId);
  return (id && shortMap().get(id)) || String(nameOrId);
}
