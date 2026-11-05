// scripts/build-home.mjs — builds the homepage app: src/home.jsx (what you edit) → home.js (what browsers load).
// Run after ANY change to src/home.jsx:   npm install && node scripts/build-home.mjs
// Why: browsers used to compile the JSX themselves with in-browser Babel (slow first load, development React).
// home.js starts with the source's fingerprint; tests/home-build-test.mjs fails if you forget to rebuild.
import fs from "node:fs";
import crypto from "node:crypto";
import { transformSync } from "@babel/core";

const src = fs.readFileSync(new URL("../src/home.jsx", import.meta.url), "utf8");
const hash = crypto.createHash("sha256").update(src).digest("hex").slice(0, 16);
const out = transformSync(src, { presets: [["@babel/preset-react", { runtime: "classic" }]], filename: "home.jsx", babelrc: false, configFile: false, compact: false, comments: false });
fs.writeFileSync(new URL("../home.js", import.meta.url), `/* built from src/home.jsx ${hash} — do not edit; run node scripts/build-home.mjs */\n${out.code}\n`);
console.log(`home.js built (${(out.code.length / 1024).toFixed(0)} KB, source ${hash})`);
