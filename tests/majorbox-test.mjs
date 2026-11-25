// /jobs "Your major" box (Nov 19): jobs/majors.json has every quiz + official major, every area in it is a real
// field the API accepts, and the API turns several areas into one in.(…) filter.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIELDS } from "../lib/fields.js";
const KEYS = new Set([...FIELDS.map(([k]) => k), "other"]);
const list = JSON.parse(readFileSync(new URL("../jobs/majors.json", import.meta.url), "utf8"));
const names = new Set(list.map(([n]) => n));
const home = readFileSync(new URL("../src/home.jsx", import.meta.url), "utf8");
const quiz = Function(`return ${home.match(/const MAJORS=(\[[^\]]*\])/)[1]}`)().filter((m) => m !== "Other");
for (const m of quiz) assert.ok(names.has(m), `quiz major ${m} is in the box`);
assert.ok(list.length > 1200, "every federal program name is in");
for (const [n, f] of list) if (f) for (const k of f.split(",")) assert.ok(KEYS.has(k), `${n}: ${k} is a real field`);
const get = (n) => list.find((x) => x[0] === n)?.[1];
assert.equal(get("Mechanical Engineering"), "mechanical,engineering");
assert.ok(get("Psychology").split(",").length >= 2);
assert.ok(get("Zoology / Animal Biology").includes("science_health"));
const api = readFileSync(new URL("../api/listings.js", import.meta.url), "utf8");
assert.equal((api.match(/field=in\.\(\$\{p\.field\}\)/g) || []).length, 2, "both list paths filter several areas");
const page = readFileSync(new URL("../jobs/index.html", import.meta.url), "utf8");
assert.ok(page.includes('id="majorIn"') && page.includes("/pick.js") && page.includes("/jobs/majors.json"));
console.log(`✓ major box: ${list.length} majors, ${quiz.length} quiz majors present, multi-area filter on`);
// Nov 24 (owner): no company grouping on /jobs: every role is its own card, no toggle; no "Hiring most right now"; tools on the right
assert.ok(!page.includes("GROUP_MIN") && !page.includes('id="grpOff"') && page.includes("const groupOn = false"), "no grouping");
assert.ok(!page.includes("Hiring most right now") && page.includes("data-btp-tools"), "tools rail, no hiring-most list");
console.log("✓ /jobs: every role its own card, tools on the right");
