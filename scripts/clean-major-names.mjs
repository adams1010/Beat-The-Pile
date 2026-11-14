// One-off (Nov 14 2026): rename programs in schools/cip.json to the names students say (lib/majornames.js), without a full IPEDS rebuild.
import fs from "node:fs";
import { cleanMajorName } from "../lib/majornames.js";
const p = new URL("../schools/cip.json", import.meta.url), cip = JSON.parse(fs.readFileSync(p, "utf8"));
let n = 0; for (const [c, t] of Object.entries(cip)) { const x = cleanMajorName(t, c); if (x !== t) { cip[c] = x; n++; } }
fs.writeFileSync(p, JSON.stringify(cip)); console.log("renamed", n, "of", Object.keys(cip).length);
