// /clubs/ (Nov 19): every club has a real https source, real job areas, a description and no em dashes;
// the page loads the data file and the nav links to it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIELDS } from "../lib/fields.js";
const KEYS = new Set([...FIELDS.map(([k]) => k), "other"]);
const ix = JSON.parse(readFileSync(new URL("../clubs/index.json", import.meta.url), "utf8"));
assert.ok(ix.schools.length >= 4, "VT, UVA, JMU, Penn State");
let total = 0, all = readFileSync(new URL("../clubs/index.html", import.meta.url), "utf8");
for (const sc of ix.schools) {
const raw = readFileSync(new URL(`../clubs/${sc.file}`, import.meta.url), "utf8"); all += raw;
const d = JSON.parse(raw);
assert.equal(d.unitid, sc.unitid, `${sc.file} unitid matches the index`);
assert.ok(d.clubs.length >= 5, `${sc.school} has clubs`);
if (d.find) assert.ok(/^https:\/\//.test(d.find.url), `${sc.school} find link is https`);
const ids = new Set(); total += d.clubs.length;
for (const c of d.clubs) {
  assert.ok(!ids.has(c.id), `unique id ${c.id}`); ids.add(c.id);
  assert.ok(c.name && c.does && c.who && c.skills.length, `${c.id} filled in`);
  assert.ok(c.sources.length && c.sources.every((u) => /^https:\/\//.test(u)), `${c.id} has sources`);
  assert.ok(c.fields.length && c.fields.every((f) => KEYS.has(f)), `${c.id} fields are real`);
  if (c.sponsors) assert.ok(/^https:\/\//.test(c.sponsors.source) && c.sponsors.note, `${c.id} backers are cited`);
}
}
assert.ok(!all.includes("—"), "no em dashes");
assert.ok(readFileSync(new URL("../nav.js", import.meta.url), "utf8").includes('"/clubs/"'));
console.log(`✓ clubs: ${total} clubs at ${ix.schools.length} schools, all cited`);
