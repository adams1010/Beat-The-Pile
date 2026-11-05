// home.js must be the build of the current src/home.jsx (run `node scripts/build-home.mjs` after editing it).
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
const src = fs.readFileSync(new URL("../src/home.jsx", import.meta.url), "utf8");
const built = fs.readFileSync(new URL("../home.js", import.meta.url), "utf8");
const hash = crypto.createHash("sha256").update(src).digest("hex").slice(0, 16);
assert.ok(built.startsWith(`/* built from src/home.jsx ${hash}`), "home.js is out of date — run: node scripts/build-home.mjs");
assert.ok(!/<\w+[\s>][^]*?\/>/.test(built.slice(0, 2000)) && !built.includes("text/babel"), "no raw JSX in the built file");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.ok(html.includes('<script src="/home.js"></script>') && !/babel|react\.development/.test(html), "homepage loads the built app with production React");
new Function(built);                                    // parses
console.log("✓ home.js matches src/home.jsx, production React, no in-browser Babel");
