// scripts/build-map.mjs — the homepage's US map outline (map/us.json): state borders, already projected the same way the
// API projects internship dots (d3 geoAlbersUsa, scale 1300, 975×610 — the us-atlas "albers" files). Public-domain
// Census shapes via us-atlas. Rebuild only if the projection changes:  node scripts/build-map.mjs
import fs from "node:fs";
import { feature, mesh } from "topojson-client";
import { geoPath } from "d3-geo";
const us = JSON.parse(fs.readFileSync(new URL("../node_modules/us-atlas/states-albers-10m.json", import.meta.url)));
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1));
const path = geoPath();
const nation = round(path(feature(us, us.objects.nation)));
const borders = round(path(mesh(us, us.objects.states, (a, b) => a !== b)));
fs.writeFileSync(new URL("../map/us.json", import.meta.url), JSON.stringify({ w: 975, h: 610, nation, borders }));
console.log("map/us.json", (fs.statSync(new URL("../map/us.json", import.meta.url)).size / 1024).toFixed(0), "KB");
