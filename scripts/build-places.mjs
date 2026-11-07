// scripts/build-places.mjs — builds data/us-places.json and data/us-zips.json from the US Census Gazetteer (public domain).
// Download the 2024 Gazetteer files (place, county subdivision, ZCTA) from
// https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html, unzip, then:
//   node scripts/build-places.mjs <dir with 2024_Gaz_*.txt>
// us-places.json: { "VA": { "blacksburg": [37.2296, -80.4139], ... } }  (cities, towns, CDPs, then townships)
// us-zips.json:   { "24060": [37.25, -80.42], ... }
import fs from "node:fs"; import path from "node:path";
import { placeKey } from "../lib/geocode.js";
const dir = process.argv[2];
const rows = (f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split("\t").map((x) => x.trim()));
const r4 = (x) => Math.round(+x * 1e4) / 1e4;
// Gazetteer names carry a type word: "Blacksburg town", "Horsham township", "Nashville-Davidson metropolitan government (balance)"
const TYPE = /\s+(city and borough|consolidated government|metropolitan government|unified government|urban county|city|town|village|borough|township|municipality|cdp|plantation|charter township|gore|grant|location|purchase|comunidad|zona urbana|ccd|precinct|district|(\(balance\)))(\s+\(balance\))?$/i;
function baseName(n) { const s = n.replace(/\s*\(balance\)\s*$/i, "").replace(TYPE, "");   // once: "Kansas City city" → "Kansas City"
  return s.replace(/\s*\(balance\)\s*$/i, "").split(/-(?=[A-Z][a-z]+ (metropolitan|consolidated|unified))/)[0]; }
const miles = ([a, b], [c, d]) => { const R = 3958.8, q = Math.PI / 180, x = Math.sin(((c - a) * q) / 2) ** 2 + Math.cos(a * q) * Math.cos(c * q) * Math.sin(((d - b) * q) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const out = {}, area = {};
function add(st, name, lat, lng, land, rank, water = 0, geoid = null) {
  const b = baseName(name), keys = new Map([[placeKey(b), rank]]);
  // short forms only fill gaps (rank 9): "Nashville-Davidson" → "nashville", "Braintree Town" → "braintree", "Boise City" → "boise"
  const alt = (k) => { if (k && !keys.has(k)) keys.set(k, 9); };
  if (/[-/]/.test(b)) alt(placeKey(b.split(/[-/]/)[0]));
  if (/ (Town|City)$/.test(b)) alt(placeKey(b.replace(/ (Town|City)$/, "")));
  for (const [k, rk] of keys) { if (!k) continue;
    out[st] ||= {}; area[st] ||= {};
    const cur = area[st][k];
    // cities/towns beat CDPs beat townships beat short forms; same rank → bigger land area wins
    if (!cur || rk < cur.rank) { out[st][k] = [r4(lat), r4(lng)]; area[st][k] = { rank: rk, land, water, name, geoid }; }
    else if (rk === cur.rank) {
      // Same name, same kind, same state: "Cranberry township" (Butler Co.) vs "Cranberry township" (Venango Co.), 50 mi apart.
      // If they're more than 10 mi apart we can't know which one the employer meant → ambiguous, no point (unless a better rank shows up).
      const far = miles(out[st][k] || [r4(lat), r4(lng)], [+lat, +lng]) > 10;
      if (far) { cur.ambiguous = true; cur.names = (cur.names || [cur.name]).concat(name); }
      else if (land > cur.land) { out[st][k] = [r4(lat), r4(lng)]; Object.assign(cur, { land, water, name, geoid }); }
    }
  }
}
for (const r of rows("2024_Gaz_place_national.txt")) add(r[0], r[3], r[10], r[11], +r[6], /CDP$/.test(r[3]) ? 1 : 0, +r[7], r[1]);
// County subdivisions: real towns/townships only (PA/NJ/MI/New England). Census county divisions (CCD), unorganized
// territories and precincts are statistical areas, not places — "Honolulu CCD" is pinned near Midway Island.
for (const r of rows("2024_Gaz_cousubs_national.txt")) if (!/^County subdivisions not defined|\b(CCD|UT|precinct|district|unorganized|gore|grant|location|purchase)$/i.test(r[3])) add(r[0], r[3], r[9], r[10], +r[5], 2, +r[6]);
const zips = {}; for (const r of rows("2024_Gaz_zcta_national.txt")) zips[r[0]] = [r4(r[5]), r4(r[6])];
// Places that are mostly water can have their "internal point" offshore (San Francisco's is out by the Farallon Islands).
// For a mostly-water place whose point is >5 mi from every ZIP center, use the land-weighted center of the ZIP areas that
// make up the place (Census ZCTA↔place relationship file, tab20_zcta520_place20_natl.txt). No relationship → drop it.
const grid = new Map(); for (const [z, p] of Object.entries(zips)) { const k = Math.floor(p[0]) + "," + Math.floor(p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
const nearestZip = (p) => { let best = null, bd = Infinity; for (let r = 1; r <= 3 && !best; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (const q of grid.get((Math.floor(p[0]) + a) + "," + (Math.floor(p[1]) + b)) || []) { const d = miles(p, q); if (d < bd) { bd = d; best = q; } } return [best, bd]; };
const parts = {};                                                      // place GEOID → [[zip, land], ...]
const rel = path.join(dir, "tab20_zcta520_place20_natl.txt");
if (fs.existsSync(rel)) for (const l of fs.readFileSync(rel, "utf8").split("\n").slice(1)) { const c = l.split("|"); if (c[1] && c[9]) (parts[c[9]] ||= []).push([c[1], +c[16]]); }
else console.log("(no ZCTA-place relationship file: offshore points will be dropped)");
const snapped = [], dropped = [];
for (const st of Object.keys(out)) for (const k of Object.keys(out[st])) { const m = area[st][k]; if (!(m.water > m.land)) continue;
  const [, d] = nearestZip(out[st][k]); if (d <= 5) continue;
  const zs = (parts[m.geoid] || []).filter(([z, w]) => zips[z] && w > 0), W = zs.reduce((n, [, w]) => n + w, 0);
  if (W > 0) { out[st][k] = [r4(zs.reduce((n, [z, w]) => n + zips[z][0] * w, 0) / W), r4(zs.reduce((n, [z, w]) => n + zips[z][1] * w, 0) / W)]; snapped.push(`${m.name}, ${st}`); }
  else { delete out[st][k]; dropped.push(`${m.name}, ${st}`); }
}
const amb = []; for (const st of Object.keys(out)) for (const k of Object.keys(out[st])) if (area[st][k].ambiguous) { amb.push(`${k}, ${st}`); delete out[st][k]; }
console.log("ambiguous names left unplaced:", amb.length); if (process.env.AMB) fs.writeFileSync(process.env.AMB, amb.join("\n"));
console.log("re-centered on land:", snapped.length, snapped.slice(0, 8).join("; "), "| dropped:", dropped.length);
fs.writeFileSync("data/us-places.json", JSON.stringify(out));
fs.writeFileSync("data/us-zips.json", JSON.stringify(zips));
console.log("places", Object.values(out).reduce((n, o) => n + Object.keys(o).length, 0), "zips", Object.keys(zips).length);
