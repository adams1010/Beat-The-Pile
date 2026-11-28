// Nov 28: jobs opened with Apply land in the Wishlist; follow-up reminders ticked at sign-up (first sign-up only)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const jobs = readFileSync(new URL("../jobs/index.html", import.meta.url), "utf8");
assert.match(jobs, /function keepOpened\(id\)/);
assert.ok((jobs.match(/keepOpened\(/g) || []).length >= 4, "Apply, swipe up and the swipe Apply button all keep the job");
assert.match(jobs, /state\.mine\.applied\.has\(id\)\) return/);
const start = readFileSync(new URL("../start/index.html", import.meta.url), "utf8");
assert.match(start, /id="o_remind" checked/);
assert.match(start, /remind: !!\$\("#o_remind"\)\?\.checked/);
const me = readFileSync(new URL("../api/me.js", import.meta.url), "utf8");
assert.match(me, /body\.remind === true && !r\?\.profile && !r\?\.remind_email/);
assert.match(me, /\.\.\.remindPatch\(r\)/);
console.log("pro-prep-test ok");
