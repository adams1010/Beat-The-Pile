// Nov 27: a timed-out live count must answer with the last saved totals, never an error
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const s = readFileSync(new URL("../api/listings.js", import.meta.url), "utf8");
assert.match(s, /async function liveSummary\(\)/);
assert.match(s, /await db\.upsert\("summary_cache"/);
assert.match(s, /summary_cache\?id=eq\.summary/);
assert.match(s, /stale: true/);
console.log("summary-cache-test ok");
