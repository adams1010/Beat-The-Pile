// Nov 25 (owner): open jobs not re-checked for 7 days are hidden (closed) when Turbo Sync starts; a read reopens them
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const disc = readFileSync(new URL("../api/discovery.js", import.meta.url), "utf8"), sync = readFileSync(new URL("../api/sync.js", import.meta.url), "utf8");
assert.match(disc, /const STALE_DAYS = 7;/);
assert.match(disc, /listings\?closed_at=is\.null&last_seen=lt\.\$\{new Date\(Date\.now\(\) - STALE_DAYS \* 864e5\)\.toISOString\(\)\}/);
assert.match(sync, /last_seen: runStart, closed_at: null/, "a job seen again is reopened");
assert.match(sync, /!openAt\.has\(l\.id\)/, "jobs not open (hidden ones too) are written again");
const orbit = readFileSync(new URL("../orbit/index.html", import.meta.url), "utf8");
assert.ok(!/innerWidth < 900\) sec\.scrollIntoView/.test(orbit), "phones stay on the sky when a ring is picked");
assert.match(orbit, /\* drag\.sign/, "the near half of the orbit follows the pointer");
assert.match(orbit, /getScreenCTM\(\)\.inverse\(\)/, "pointer mapped with the SVG matrix (letterboxed sky)");
const jobs = readFileSync(new URL("../jobs/index.html", import.meta.url), "utf8");
assert.match(jobs, /innerHeight - top - 16/, "side rails fit the window");
console.log("stale + orbit + rails ok");
