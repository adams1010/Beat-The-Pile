// scripts/build-place-list.mjs — /schools/places.json: every US city/town we can map ("Blacksburg, VA"), for the location
// pickers on /u/ and /start/. Built from data/us-places.json (US Census Gazetteer). Run after build-places.mjs.
import fs from "node:fs";
const P = JSON.parse(fs.readFileSync(new URL("../data/us-places.json", import.meta.url), "utf8"));
const cap = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bMc([a-z])/g, (m, c) => "Mc" + c.toUpperCase()).replace(/\b(Of|The|And|De|La|Du)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
const out = [];
for (const [st, towns] of Object.entries(P)) for (const t of Object.keys(towns)) if (!/\b(cdp|township|borough)$/.test(t) || true) out.push(`${cap(t)}, ${st}`);
out.sort((a, b) => a.localeCompare(b));
fs.writeFileSync(new URL("../schools/places.json", import.meta.url), JSON.stringify(["Remote", ...new Set(out)]));
console.log("places:", out.length);
