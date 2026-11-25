// scripts/build-counties.mjs — builds data/us-counties.json for the Gap Finder bot (jobs per person, job deserts).
// Rows: [geoid, county name, state, population, lat, lng]. Sources (all US Census Bureau, no key needed):
//   population: Vintage 2024 county estimates, POPESTIMATE2024
//     https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv
//   location:   2020 county CENTERS OF POPULATION (where people live, not the middle of the map: San Bernardino County's
//               middle is in the Mojave Desert, its people are around San Bernardino), falling back to the
//               2024 Gazetteer internal point for counties made after 2020 (Connecticut's planning regions)
//     https://www2.census.gov/geo/docs/reference/cenpop2020/county/CenPop2020_Mean_CO.txt
//     https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_counties_national.zip
// Usage: node scripts/build-counties.mjs <2024_Gaz_counties_national.txt> <co-est2024-alldata.csv> <CenPop2020_Mean_CO.txt>
import fs from "node:fs";

const [gazFile, popFile, cenFile] = process.argv.slice(2);
if (!gazFile || !popFile || !cenFile) {
  console.error("Usage: node scripts/build-counties.mjs <gazetteer.txt> <co-est2024-alldata.csv> <CenPop2020_Mean_CO.txt>");
  process.exit(1);
}
const lines = (file, enc = "utf8") => fs.readFileSync(file, enc).replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);

const center = new Map();
for (const line of lines(cenFile).slice(1)) {
  const r = line.split(","); if (r.length < 7) continue;
  center.set(r[0] + r[1], [+(+r[5]).toFixed(4), +(+r[6]).toFixed(4)]);
}

// The estimates CSV is latin-1 (county names like "Doña Ana"); read it as such.
const csv = lines(popFile, "latin1");
const head = csv[0].split(",");
const iSum = head.indexOf("SUMLEV"), iSt = head.indexOf("STATE"), iCo = head.indexOf("COUNTY"), iPop = head.indexOf("POPESTIMATE2024");
const pop = new Map();
for (const line of csv.slice(1)) {
  const r = line.split(",");
  if (r[iSum] !== "050") continue;           // 050 = county rows (040 = state totals)
  pop.set(r[iSt] + r[iCo], +r[iPop]);
}

const rows = [];
const gaz = lines(gazFile);
const gh = gaz[0].split("\t").map((s) => s.trim());
const g = (n) => gh.indexOf(n);
for (const line of gaz.slice(1)) {
  const r = line.split("\t").map((s) => s.trim());
  const id = r[g("GEOID")], p = pop.get(id);
  if (!p) continue;                          // Puerto Rico (not in the estimates file)
  const [lat, lng] = center.get(id) || [+(+r[g("INTPTLAT")]).toFixed(4), +(+r[g("INTPTLONG")]).toFixed(4)];
  rows.push([id, r[g("NAME")], r[g("USPS")], p, lat, lng]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
fs.writeFileSync("data/us-counties.json", JSON.stringify({
  source: "US Census Bureau: Vintage 2024 county population estimates; 2020 centers of population (2024 Gazetteer points where none)",
  rows,
}));
const total = rows.reduce((t, r) => t + r[3], 0);
console.log(`counties: ${rows.length}, people: ${total.toLocaleString()}, missing population: ${gaz.length - 1 - rows.length}, population centers used: ${rows.filter((r) => center.has(r[0])).length}`);
