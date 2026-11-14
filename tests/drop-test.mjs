// Nov 14: The Drop (/drop/) — live timeline of new jobs: hour buckets, Day 1 badge, hiring-spree cards, "N new drops" pill
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = readFileSync(new URL("../drop/index.html", import.meta.url), "utf8");
for (const s of ["Last hour", "Earlier today", "Yesterday", "Day 1", "just dropped", "new drops", "/lib/categories.js", "first_seen", "/nav.js", "data-noi18n"]) assert.ok(page.includes(s), s);
assert.ok(!/—/.test(page.replace(/<style>[\s\S]*?<\/style>/, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "no em dashes in what people read");
const nav = readFileSync(new URL("../nav.js", import.meta.url), "utf8");
assert.ok(nav.includes('["/drop/", "The Drop", "drop"]') && /drop: '<path/.test(nav), "top bar tab + line icon");
console.log("✓ The Drop: timeline buckets, Day 1, hiring sprees, new-drops pill, in the top bar");
