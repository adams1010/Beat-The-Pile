import fs from "node:fs"; import assert from "node:assert/strict";
import { pickCompanies, normName, keyFor } from "../lib/simplify.js";
import { CANDIDATES } from "../lib/candidates.js";
import { COMPANIES, boardKey } from "../lib/companies.js";
// Uses the real SimplifyJobs list (13 MB) — downloaded once into tests/fixtures (git-ignored); skipped if offline.
const FIX = "fixtures/Summer2027-Internships.json";
if (!fs.existsSync(FIX)) {
  try { const { SIMPLIFY_URL } = await import("../lib/simplify.js"); const r = await fetch(SIMPLIFY_URL); if (!r.ok) throw new Error(r.status); fs.mkdirSync("fixtures", { recursive: true }); fs.writeFileSync(FIX, await r.text()); }
  catch (e) { console.log("SKIPPED (no network for the real list):", e.message); process.exit(0); }
}
const d = JSON.parse(fs.readFileSync(FIX, "utf8"));
const names = new Set([...CANDIDATES, ...COMPANIES].map((c) => normName(c.company)));
const rows = pickCompanies(d, names, new Set(COMPANIES.map(boardKey)));
console.log("picked", rows.length);
assert.ok(!rows.some((r) => /rtx|raytheon/i.test(r.company)), "hand-verified RTX skipped");
assert.ok(!rows.some((r) => /universit/i.test(r.company)), "universities skipped");
assert.ok(!rows.some((r) => /private/i.test(r.hint)), "private boards skipped");
assert.equal(new Set(rows.map((r) => r.id)).size, rows.length, "unique ids");
assert.equal(keyFor("Marvell"), "marvell"); assert.equal(keyFor("General Atomics"), "generalatomics"); assert.equal(keyFor("Analog Devices"), "analog".length >= 6 ? "analog" : "");
console.log(rows.slice(0, 25).map((r) => `${r.company} [${r.key}] ${r.hint.slice(0, 70)}`).join("\n"));
console.log("SIMPLIFY TESTS PASSED");
