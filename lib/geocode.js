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

/** A city typed without a state ("Blacksburg") → every state that has a Census place by that name:
 *  [{ q: "Blacksburg, VA", state: "VA", pt }]. One match = use it; several = ask which one. */
export function cityMatches(q) {
  const k0 = placeKey(tidy(String(q || "").trim())); if (!k0 || /\d/.test(k0)) return [];
  const k = ALIAS[k0] || k0, out = [];
  const nice = String(q).trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  for (const [st, idx] of Object.entries(places())) {
    const pt = idx[k] || idx[k.replace(/ (township|city|town|village|borough)$/, "")];
    if (pt) out.push({ q: `${nice}, ${st}`, state: st, pt });
  }
  return out;
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

// ── Forgiving place lookup for search boxes (Nov 13) ──────────────────────────────────────────────────────────
// "washingdon dc" → Washington, DC · "pittsburg pa" → Pittsburgh, PA · "blacksburg virgina" → Blacksburg, VA ·
// "newyork" → New York, NY · "charlote" → Charlotte, NC (or a choice of states). Typos are fixed only against real
// Census place names; we never invent a place.
function editDist(a, b, max) {             // Damerau-Levenshtein, gives up past `max`
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let low = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v); if (v < low) low = v;
    }
    if (low > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}
const typoBudget = (k) => (k.replace(/ /g, "").length >= 8 ? 2 : k.length >= 5 ? 1 : 0);
/** Typed state → code: "VA", "va", "Virginia", "virgina", "d.c." */
function stateOf(t) {
  const k = placeKey(t).replace(/ /g, "");
  if (!k) return null;
  if (k.length === 2 && STATE_NAMES[k.toUpperCase()]) return k.toUpperCase();
  for (const [c, n] of Object.entries(STATE_NAMES)) if (placeKey(n).replace(/ /g, "") === k) return c;
  if (k.length >= 5) { let best = null, bd = 3; for (const [c, n] of Object.entries(STATE_NAMES)) { const d = editDist(k, placeKey(n).replace(/ /g, ""), 2); if (d < bd) { bd = d; best = c; } } if (best && bd <= (k.length >= 8 ? 2 : 1)) return best; }
  return null;
}
const titleCase = (k) => k.replace(/\b\w/g, (c) => c.toUpperCase());
// The big US cities people mean when they type a bare name ("Atlanta", "chicgo"): a tie-breaker only, never a guess when
// none of the matches is one of these (then we ask which state).
const BIG = new Set(("new york|NY,los angeles|CA,chicago|IL,houston|TX,phoenix|AZ,philadelphia|PA,san antonio|TX,san diego|CA,dallas|TX,austin|TX,jacksonville|FL,"
  + "fort worth|TX,san jose|CA,columbus|OH,charlotte|NC,indianapolis|IN,san francisco|CA,seattle|WA,denver|CO,oklahoma city|OK,nashville|TN,el paso|TX,"
  + "washington|DC,boston|MA,las vegas|NV,portland|OR,detroit|MI,louisville|KY,memphis|TN,baltimore|MD,milwaukee|WI,albuquerque|NM,tucson|AZ,fresno|CA,"
  + "sacramento|CA,mesa|AZ,kansas city|MO,atlanta|GA,omaha|NE,colorado springs|CO,raleigh|NC,long beach|CA,virginia beach|VA,miami|FL,oakland|CA,"
  + "minneapolis|MN,tulsa|OK,tampa|FL,arlington|TX,new orleans|LA,wichita|KS,cleveland|OH,bakersfield|CA,aurora|CO,anaheim|CA,honolulu|HI,"
  + "urban honolulu|HI,santa ana|CA,riverside|CA,corpus christi|TX,lexington|KY,henderson|NV,stockton|CA,saint paul|MN,cincinnati|OH,saint louis|MO,"
  + "pittsburgh|PA,greensboro|NC,lincoln|NE,anchorage|AK,plano|TX,orlando|FL,irvine|CA,newark|NJ,durham|NC,chula vista|CA,toledo|OH,fort wayne|IN,"
  + "saint petersburg|FL,laredo|TX,jersey city|NJ,chandler|AZ,madison|WI,lubbock|TX,scottsdale|AZ,reno|NV,buffalo|NY,gilbert|AZ,glendale|AZ,"
  + "north las vegas|NV,winston salem|NC,chesapeake|VA,norfolk|VA,fremont|CA,garland|TX,irving|TX,hialeah|FL,richmond|VA,boise city|ID,spokane|WA,"
  + "baton rouge|LA,tacoma|WA,san bernardino|CA,modesto|CA,fontana|CA,des moines|IA,moreno valley|CA,santa clarita|CA,fayetteville|NC,birmingham|AL,"
  + "oxnard|CA,rochester|NY,port saint lucie|FL,grand rapids|MI,huntsville|AL,salt lake city|UT,frisco|TX,yonkers|NY,amarillo|TX,glendale|CA,"
  + "huntington beach|CA,mckinney|TX,montgomery|AL,augusta|GA,aurora|IL,akron|OH,little rock|AR,tempe|AZ,columbus|GA,overland park|KS,"
  + "grand prairie|TX,tallahassee|FL,cape coral|FL,mobile|AL,knoxville|TN,shreveport|LA,worcester|MA,ontario|CA,vancouver|WA,sioux falls|SD,"
  + "chattanooga|TN,brownsville|TX,fort lauderdale|FL,providence|RI,newport news|VA,rancho cucamonga|CA,santa rosa|CA,peoria|AZ,oceanside|CA,"
  + "elk grove|CA,salem|OR,pembroke pines|FL,eugene|OR,garden grove|CA,cary|NC,fort collins|CO,corona|CA,springfield|MO,jackson|MS,alexandria|VA,"
  + "hayward|CA,clarksville|TN,lakewood|CO,lancaster|CA,salinas|CA,palmdale|CA,hollywood|FL,springfield|MA,sunnyvale|CA,macon|GA,pasadena|TX,"
  + "pomona|CA,kansas city|KS,escondido|CA,killeen|TX,naperville|IL,joliet|IL,bellevue|WA,rockford|IL,savannah|GA,paterson|NJ,torrance|CA,"
  + "bridgeport|CT,mcallen|TX,mesquite|TX,syracuse|NY,midland|TX,pasadena|CA,murfreesboro|TN,miramar|FL,dayton|OH,fullerton|CA,olathe|KS,"
  + "orange|CA,thornton|CO,roseville|CA,denton|TX,waco|TX,surprise|AZ,carrollton|TX,west valley city|UT,charleston|SC,warren|MI,hampton|VA,"
  + "gainesville|FL,visalia|CA,coral springs|FL,columbia|SC,cedar rapids|IA,sterling heights|MI,new haven|CT,stamford|CT,concord|CA,elizabeth|NJ,"
  + "athens clarke county|GA,thousand oaks|CA,lafayette|LA,simi valley|CA,topeka|KS,norman|OK,fargo|ND,wilmington|NC,abilene|TX,odessa|TX,"
  + "columbia|MO,pearland|TX,victorville|CA,hartford|CT,vallejo|CA,allentown|PA,berkeley|CA,richardson|TX,arvada|CO,ann arbor|MI,rochester|MN,"
  + "cambridge|MA,sugar land|TX,lansing|MI,evansville|IN,college station|TX,fairfield|CA,clearwater|FL,beaumont|TX,independence|MO,provo|UT,"
  + "west jordan|UT,murrieta|CA,palm bay|FL,el monte|CA,carlsbad|CA,charleston|WV,temecula|CA,springfield|IL,gresham|OR,lowell|MA,billings|MT,"
  + "manchester|NH,burlington|VT,portland|ME,wilmington|DE,cheyenne|WY,blacksburg|VA,state college|PA,boulder|CO,durham|NC,chapel hill|NC,"
  + "tysons|VA,reston|VA,herndon|VA,mclean|VA,bethesda|MD,silver spring|MD,rockville|MD,annapolis|MD,trenton|NJ,albany|NY,harrisburg|PA,"
  + "columbus|IN,redmond|WA,palo alto|CA,mountain view|CA,santa clara|CA,san mateo|CA").split(","));
const isBig = (city, st) => BIG.has(`${city}|${st}`);
// Nov 14: "San Francisco - SF9", "New York City", "Austin" — a big US city with no state written. Only names that are one
// big city (not Portland OR/ME, Columbus OH/GA, Kansas City MO/KS…). → "CA" | null
const BIG_ONE = (() => { const m = new Map(), dup = new Set(); for (const x of BIG) { const [c, st] = x.split("|"); if (m.has(c) && m.get(c) !== st) dup.add(c); m.set(c, st); } for (const c of dup) m.delete(c); m.set("new york city", "NY"); m.set("nyc", "NY"); m.set("sf", "CA"); m.set("dc", "DC"); return m; })();
export function bigCityState(text = "") {
  const k = placeKey(String(text).split(/\s+[-–(|]\s*|,|\//)[0] || "");
  return BIG_ONE.get(k) || null;
}
/** When several places match, pick the one big city among them (and say so); otherwise null. */
const pickBig = (list, key = (x) => [x.city, x.state]) => { const b = list.filter((x) => isBig(...key(x))); return b.length === 1 ? b[0] : null; };
/** Closest real places to a typed city key (in one state, or everywhere). → [{ city, state, pt, d }] best first. */
function fuzzyCity(k, onlyState) {
  const max = typoBudget(k), squash = k.replace(/ /g, ""), out = [];
  for (const [st, idx] of Object.entries(places())) {
    if (onlyState && st !== onlyState) continue;
    for (const [name, pt] of Object.entries(idx)) {
      if (name === k) { out.push({ city: name, state: st, pt, d: 0 }); continue; }
      if (!max || Math.abs(name.length - k.length) > max + 1) continue;
      const d = Math.min(editDist(k, name, max), editDist(squash, name.replace(/ /g, ""), max));
      if (d <= max) out.push({ city: name, state: st, pt, d });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}
/**
 * What did they mean? → { pt, q: "Washington, DC", fixed: bool } | { choices: ["Charlotte, NC", …] } | null.
 * Exact answers first (ZIP, "City, ST", a city in one state); typos only when nothing exact exists.
 */
export function resolvePlace(input) {
  const raw = String(input || "").trim().replace(/\s+/g, " ");
  if (!raw) return null;
  if (/^\d{5}$/.test(raw)) { const pt = zips()[raw]; return pt ? { pt, q: raw, fixed: false } : null; }
  const exact = geocodeOne(raw);
  if (exact?.pt) return { pt: exact.pt, q: `${titleCase(placeKey(exact.city || raw.split(",")[0]))}, ${exact.state}`, fixed: false };
  // split "city [,] state": the state is the last word(s) when they read as one (code, name, or a misspelled name)
  const parts = raw.replace(/\bd\.?\s?c\.?$/i, "DC").split(/\s*,\s*/);
  let city = parts.length > 1 ? parts.slice(0, -1).join(" ") : raw, st = parts.length > 1 ? stateOf(parts[parts.length - 1]) : null;
  if (!st && parts.length === 1) {
    const w = raw.split(" ");
    for (const n of [2, 1]) if (w.length > n) { const s2 = stateOf(w.slice(-n).join(" ")); if (s2) { st = s2; city = w.slice(0, -n).join(" "); break; } }
  }
  if (!st && parts.length === 1 && stateOf(raw) === "DC") st = "DC", city = "washington";
  const k0 = placeKey(tidy(city)); if (!k0 || /\d/.test(k0)) return null;
  const k = ALIAS[k0] || k0;
  if (st === "DC" || /^washington ?dc$|^district of columbia$/.test(k)) return { pt: places().DC?.washington, q: "Washington, DC", fixed: !/^washington,? ?d\.?c\.?$/i.test(raw) };
  if (st) {
    const idx = places()[st] || {};
    const hit = idx[k] || idx[k.replace(/ (township|city|town|village|borough)$/, "")];
    const label = (name) => `${titleCase(name)}, ${st}`;
    if (hit) return { pt: hit, q: label(k), fixed: placeKey(raw) !== placeKey(`${k} ${st}`) && placeKey(raw) !== placeKey(`${k}, ${STATE_NAMES[st]}`) };
    const f = fuzzyCity(k, st);
    if (!f.length) return null;
    const top = f.filter((x) => x.d === f[0].d);
    if (top.length === 1) return { pt: top[0].pt, q: label(top[0].city), fixed: true };
    return { choices: top.slice(0, 12).map((x) => label(x.city)) };
  }
  const m = cityMatches(city);
  if (m.length === 1) return { pt: m[0].pt, q: m[0].q, fixed: false };
  if (m.length > 1) {
    const big = pickBig(m, (x) => [k, x.state]);
    if (big) return { pt: big.pt, q: `${titleCase(k)}, ${big.state}`, fixed: false, others: m.filter((x) => x !== big).map((x) => x.q).slice(0, 20) };
    return { choices: m.map((x) => x.q).slice(0, 30) };
  }
  const f = fuzzyCity(k, null);
  if (!f.length) return null;
  const big = pickBig(f.filter((x) => x.d <= f[0].d + 1));                 // "chicgo" → Chicago, IL beats Chico, CA
  if (big) return { pt: big.pt, q: `${titleCase(big.city)}, ${big.state}`, fixed: true };
  const top = f.filter((x) => x.d === f[0].d);
  if (top.length === 1) return { pt: top[0].pt, q: `${titleCase(top[0].city)}, ${top[0].state}`, fixed: true };
  return { choices: top.slice(0, 12).map((x) => `${titleCase(x.city)}, ${x.state}`), fixed: true };
}
