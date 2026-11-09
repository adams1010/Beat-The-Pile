// /majors/ page: its major → field map must match lib/geo.js fieldsForMajor for every homepage quiz major, and every
// field it links to must be a real option on /jobs (so a tap never lands on an empty, unknown major).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { fieldsForMajor } = await import("../lib/geo.js");
const page = readFileSync(new URL("../majors/index.html", import.meta.url), "utf8");
const MAP = JSON.parse(page.match(/const MAP = (\{.*\});/)[1]);
const home = readFileSync(new URL("../src/home.jsx", import.meta.url), "utf8");
const MAJORS = Function(`return ${home.match(/const MAJORS=(\[[^\]]*\])/)[1]}`)().filter((m) => m !== "Other");
const jobs = readFileSync(new URL("../jobs/index.html", import.meta.url), "utf8");
const OPTIONS = new Set([...jobs.matchAll(/<option value="([a-z_]+)"/g)].map((m) => m[1]));
assert.deepEqual(Object.keys(MAP).sort(), [...MAJORS].sort(), "every quiz major is on the page");
for (const m of MAJORS) {
  const want = (fieldsForMajor(m) || []).map((k) => (k === "engineering" ? "eng" : k));
  assert.deepEqual(MAP[m], want, m);
  assert.ok(MAP[m].length && MAP[m].every((k) => OPTIONS.has(k)), `${m} links to real /jobs majors`);
}
console.log(`✓ /majors/: ${MAJORS.length} majors match fieldsForMajor and open real /jobs majors`);
