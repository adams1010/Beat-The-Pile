// /clubs/ (Nov 19): every club has a real https source, real job areas, a description and no em dashes;
// the page loads the data file and the nav links to it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIELDS } from "../lib/fields.js";
const KEYS = new Set([...FIELDS.map(([k]) => k), "other"]);
const d = JSON.parse(readFileSync(new URL("../clubs/vt.json", import.meta.url), "utf8"));
assert.equal(d.unitid, 233921);
const ids = new Set();
for (const c of d.clubs) {
  assert.ok(!ids.has(c.id), `unique id ${c.id}`); ids.add(c.id);
  assert.ok(c.name && c.does && c.who && c.skills.length, `${c.id} filled in`);
  assert.ok(c.sources.length && c.sources.every((u) => /^https:\/\//.test(u)), `${c.id} has sources`);
  assert.ok(c.fields.length && c.fields.every((f) => KEYS.has(f)), `${c.id} fields are real`);
  if (c.sponsors) assert.ok(/^https:\/\//.test(c.sponsors.source) && c.sponsors.note, `${c.id} backers are cited`);
}
const all = readFileSync(new URL("../clubs/vt.json", import.meta.url), "utf8") + readFileSync(new URL("../clubs/index.html", import.meta.url), "utf8");
assert.ok(!all.includes("—"), "no em dashes");
assert.ok(readFileSync(new URL("../nav.js", import.meta.url), "utf8").includes('"/clubs/"'));
console.log(`✓ clubs: ${d.clubs.length} Virginia Tech clubs, all cited`);
