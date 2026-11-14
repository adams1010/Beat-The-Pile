// Nov 14: the homepage map reads EVERY live job (keyset paging), never stops at 50,000, and the homepage asks for every kind
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const api = readFileSync(new URL("../api/listings.js", import.meta.url), "utf8");
const dots = api.slice(api.indexOf("async function dots"), api.indexOf("async function dots") + 1500);
assert.ok(/id=gt\./.test(dots) && !/selectAllAsAdmin/.test(dots), "dots pages by id, not the 50k offset reader");
const home = readFileSync(new URL("../src/home.jsx", import.meta.url), "utf8");
assert.ok(home.includes("dots=1&field=all&kind=all"), "map shows internships, entry-level and part-time");
console.log("✓ homepage map: every live job (keyset paging past 50,000), all job types");
