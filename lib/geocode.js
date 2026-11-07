// lib/geocode.js — turn an employer's location text into map points, for "within N miles" search.
// Uses only the US Census Gazetteer (data/us-places.json, data/us-zips.json; built by scripts/build-places.mjs).
// Accuracy over coverage: a listing gets a point only when we find a real city/town IN the state the text names.
// Everything else is honest about it: remote, "4 Locations", or "state only" — never a guessed spot.
import fs from "node:fs";
import { statesInOne, STATE_NAMES } from "./filter.js";

let PLACES = null, ZIPS = null;
const load = (f) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const places = () => (PLACES ||= load("us-places.json"));
const zips = () => (ZIPS ||= load("us-zips.json"));

/** Normalized city key: "St. Louis" → "saint louis", "Ft. Worth" → "fort worth", "Coeur d'Alene" → "coeur dalene". */
export function placeKey(s = "") {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[’'`.]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\bst\b/g, "saint").replace(/\bste\b/g, "sainte").replace(/^ft\b/, "fort").replace(/^mt\b/, "mount").replace(/^pt\b/, "point")
    .replace(/\bhts\b/g, "heights").replace(/\btwp\b/g, "township");
}

// Words that are never the city in a location string (and "Remote, OR" / "Hybrid" are real-looking tokens we must skip).
const NOT_CITY = /^(remote|hybrid|on ?site|onsite|in office|office|virtual|home|home office|work from home|wfh|anywhere|nationwide|multiple|various|field|headquarters|hq|corporate|campus|main campus|plant|site|facility|usa?|us|u s a?|united states( of america)?|america|north america|n ?a|nam|americas|us remote|remote us|tbd|other|n a|none|lab|laboratory|division|east|west|north|south|central|metro|area|greater|region|county|downtown|location|locations|\d+ locations?)$/;
const CODE_RE = new RegExp(`^(${Object.keys(STATE_NAMES).join("|")})$`, "i");
const NAME_RE = new RegExp(`^(${Object.values(STATE_NAMES).map((n) => n.toLowerCase()).join("|")})$`);

const tidy = (x) => x.replace(/^(greater|metro|downtown|city of|town of)\s+/i, "").replace(/\s+(area|metro area|metro|campus|office|hq|headquarters|region)$/i, "").trim();
/** Whole comma-separated parts, and (as a fallback) the pieces of hyphenated parts: "US-TX-HOUSTON-11150 EQUITY DRIVE". */
function tokens(seg) {
  const t = seg.replace(/\(.*?\)/g, (m) => "," + m.slice(1, -1) + ",")      // "Austin (Hybrid)" → "Austin, Hybrid"
    .replace(/\b\d{5}(-\d{4})?\b/g, ",")                                  // zip codes
    .replace(/\bU\.S\.A?\.?/gi, "US");
  const whole = t.split(/\s*[,;:|/]\s*|\s+[-–—]\s+|\s{2,}/).map((x) => tidy(x.trim())).filter((x) => x && !/\d{2,}/.test(x));
  const pieces = [];
  for (const c of t.split(/\s*[,;:|/]\s*|\s{2,}/)) if (/-/.test(c)) for (const p of c.split(/\s*[-–—]\s*/)) { const q = tidy(p.trim()); if (q && !/\d{2,}/.test(q) && !whole.includes(q)) pieces.push(q); }
  return { whole, pieces };
}
// Exact other names for the same Census place (not neighborhoods mapped to a nearby city — those stay unplaced).
const ALIAS = { "new york city": "new york", nyc: "new york", "tysons corner": "tysons", "boise": "boise city", "manhattan": "new york", honolulu: "urban honolulu" };
const BIZ = /^(technical|tech|office|offices|campus|plant|site|facility|hq|ghq|headquarters|lab|labs|laboratory|building|bldg|division|corporate|main|branch|works|research|operations|ops|warehouse|distribution|manufacturing|engineering|innovation|r&d|global|regional|national|service|services)$/;
// Well-known work sites that aren't Census places, pinned to their own ZIP area (each checked: right state, a few miles
// from the neighboring town). "Cranberry Township" is ambiguous in the Census (two in PA) — the employer hub is Butler Co.
const SITES = { "PA|cranberry township": "16066", "PA|swiftwater": "18370", "MD|hunt valley": "21030", "MD|annapolis junction": "20701",
  "TX|kingwood": "77339", "OH|lewis center": "43035", "CA|woodland hills": "91367", "NY|long island city": "11101", "MA|jamaica plain": "02130",
  "NC|arden": "28704", "MS|stennis space center": "39529", "VA|wallops island": "23337", "CA|playa vista": "90094" };
const NAME_CODE = Object.fromEntries(Object.entries(STATE_NAMES).map(([c, n]) => [n.toLowerCase(), c]));
const isStateTok = (x) => CODE_RE.test(x) || NAME_RE.test(x.toLowerCase());

/** One site ("Austin, TX") → { pt:[lat,lng], city, state } | { state } | { remote:true } | null */
export function geocodeOne(seg, stateHint = null) {
  const s = String(seg || "").trim(); if (!s) return null;
  let state = statesInOne(s)[0] || null;
  if (!state && stateHint && !/[a-z]{3,},\s*[A-Z]{2}\b/.test(s)) state = stateHint;        // "Boston" + listing state MA
  if (/washington,?\s*d\.?\s?c\.?\b|district of columbia/i.test(s)) return { pt: places().DC?.washington, city: "Washington", state: "DC" };
  const remote = /\b(remote|virtual|work from home|telecommute|anywhere)\b/i.test(s);
  if (!state) return remote ? { remote: true } : null;
  const idx = places()[state] || {};
  const { whole, pieces } = tokens(s);
  const sIdx = whole.map(isStateTok).lastIndexOf(true);
  const order = [...(sIdx > 0 ? [whole[sIdx - 1]] : []), ...(sIdx >= 0 && sIdx < whole.length - 1 ? [whole[sIdx + 1]] : []), ...whole, ...pieces];
  const find = (tok) => {
    const k = placeKey(tok);
    if (!k || k.length < 3 || NOT_CITY.test(k) || CODE_RE.test(tok)) return null;
    // A state's own name is never the city ("Virginia"), except "New York, NY" — but another state's name can be ("Wyoming, Michigan").
    if (NAME_RE.test(k) && NAME_CODE[k] === state && !(state === "NY" && k === "new york")) return null;
    if (k.split(" ").length > 4) return null;
    const site = SITES[`${state}|${k}`]; if (site) return zips()[site] || null;
    return idx[ALIAS[k] || k] || idx[k.replace(/ (township|city|town|village|borough)$/, "")] || null;
  };
  for (const tok of order) { const hit = find(tok); if (hit) return { pt: hit, city: tok, state }; }
  // No commas between city and state: "Plano TX", "US SC Anderson", "Madison Wisconsin", "Kokomo Technical Center - Indiana".
  // Drop state codes / country words; try the run as written ("Kansas City" stays whole), then a state name split off
  // ("Madison Wisconsin"), and only shorten when the dropped tail is business words ("Technical Center"), never "Lewis Center".
  if (/\b(bay area|southern california|northern california|socal|norcal|tri-?state|metroplex|space coast|research triangle)\b/i.test(s)) return remote ? { remote: true, state } : { state };
  for (const tok of [...whole, ...pieces]) {
    const words = tok.split(/\s+/).filter((w) => !/^(US|USA|U\.S\.A?\.?)$/i.test(w) && !(/^[A-Z]{2}$/.test(w) && CODE_RE.test(w)));
    if (!words.length || words.length === tok.split(/\s+/).length && words.length < 2) continue;
    const tries = [words.join(" ")];
    const nm = words.map((w, i) => (NAME_RE.test(w.toLowerCase()) ? i : NAME_RE.test((w + " " + (words[i + 1] || "")).toLowerCase()) ? -2 - i : -1));
    const cut = nm.findIndex((x) => x !== -1);
    if (cut > 0) tries.push(words.slice(0, cut).join(" "));                                           // "Madison Wisconsin" → "Madison"
    for (let len = words.length - 1; len >= 1; len--) {
      const tail = words.slice(len).map((w) => w.toLowerCase());
      if (tail.every((w) => BIZ.test(w) || /^cent(er|re)$/.test(w)) && tail.some((w) => BIZ.test(w))) tries.push(words.slice(0, len).join(" "));
    }
    for (const t of tries) { const hit = find(t); if (hit) return { pt: hit, city: t, state }; }
  }
  return remote ? { remote: true, state } : { state };
}

/** Full location text (multi-site uses " | " or ";") → { pts:[[lat,lng]...], remote, multi, unplaced:[states] } */
export function geocode(location, stateHint = null) {
  const text = String(location || "");
  const res = { pts: [], remote: false, multi: false, unplaced: [] };
  if (/^\s*\d+\s+locations?\s*$/i.test(text) || /\bmultiple (us )?locations\b|\bvarious locations\b/i.test(text)) res.multi = true;
  let segs = text.split(/\s*(?:\||;|•| or | and (?=[A-Z][a-z]+,))\s*/).filter(Boolean);
  // "MO | US | St. Louis - 6 South Old Orchard" is ONE site written with pipes: a bare state or country piece means join them.
  if (segs.length > 1 && segs.some((x) => /^(US|USA|United States( of America)?)$/i.test(x.trim()) || (CODE_RE.test(x.trim()) && /^[A-Z]{2}$/.test(x.trim())))) segs = [segs.join(", ")];
  const seen = new Set();
  for (const seg of segs) {
    const g = geocodeOne(seg, segs.length === 1 ? stateHint : null);
    if (!g) continue;
    if (g.remote) res.remote = true;
    if (g.pt) { const key = g.pt.join(); if (!seen.has(key)) { seen.add(key); res.pts.push(g.pt); } }
    else if (g.state && !res.unplaced.includes(g.state)) res.unplaced.push(g.state);
  }
  return res;
}

/** "24060" or "Blacksburg, VA" → [lat,lng] or null. */
export function lookupPlace(q) {
  const s = String(q || "").trim();
  const z = s.match(/^\d{5}$/); if (z) return zips()[s] || null;
  const g = geocodeOne(s); return g?.pt || null;
}

/** Great-circle miles. */
export function miles([a, b], [c, d]) {
  const R = 3958.8, r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/** Columns stored on each listing (table listings): first point for the map box query, every point for exact distance. */
export function geoFields(location, states = []) {
  const st = Array.isArray(states) ? states : String(states || "").split(",").filter(Boolean);
  const g = geocode(location, st.length === 1 ? st[0] : null);
  const kind = g.pts.length ? "place" : g.remote ? "remote" : g.multi ? "multi" : g.unplaced.length || st.length ? "state" : "none";
  return { geo_lat: g.pts[0]?.[0] ?? null, geo_lng: g.pts[0]?.[1] ?? null, geo_pts: g.pts.length ? g.pts.slice(0, 40) : null, geo_n: g.pts.length, geo_kind: kind };
}
