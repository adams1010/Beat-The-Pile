// Nov 24–25 (owner): Light = the light-blue "sky" look with the navy top bar kept; Appearance (Dark, Navy, Gray, device)
// changes only the light parts. The color engine lives inside nav.js (runs before first paint).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const nav = readFileSync(new URL("../nav.js", import.meta.url), "utf8");
for (const k of ["light", "dark", "navy", "gray", "device"]) assert.ok(nav.includes(`["${k}",`), "theme option " + k);
assert.ok(nav.includes('id="btpThemeSel"') && nav.includes("btp_theme"), "menu dropdown, saved per device");
assert.ok(!/filter:\s*invert/.test(nav) && !nav.includes("mix-blend-mode"), "no whole-page flip or overlay");
assert.ok(nav.includes('eff === "light" ? "sky" : eff') && nav.includes('KEEP = ".btpnav,.btptab,[data-btp-keep]"'), "Light = sky, top bar + keep areas untouched");
// pull the engine out of nav.js and test its color rules
const a = nav.indexOf("  (function () {\n    if (window.btpThemeEngine) return;".replace(/\n/g, nav.includes("\r\n") ? "\r\n" : "\n"));
const b = nav.indexOf("})();", a) + 5; assert.ok(a > 0 && b > a, "engine found in nav.js");
const w = {}; new Function("window", "document", "getComputedStyle", "MutationObserver", "requestAnimationFrame", "SVGElement", "addEventListener", nav.slice(a, b))(
  w, { createElement: () => ({}), documentElement: {}, styleSheets: [], addEventListener() {} }, () => ({}), function () {}, () => 0, function () {}, () => {});
const T = w.btpThemeEngine._t;
T.setP("sky");
assert.deepEqual(T.skyBg([6, 10, 44, 1]), { v: "rgb(220,231,248)", conv: true }, "navy panel → light blue");
assert.deepEqual(T.skyBg([238, 241, 246, 1]), { v: "rgb(233,241,252)", conv: false }, "grey page → light blue page");
assert.equal(T.skyBg([255, 255, 255, 1]), null, "white cards stay white");
assert.equal(T.skyBg([176, 247, 1, 1]), null, "lime buttons stay");
assert.equal(T.skyBg([74, 112, 0, 1]), null, "green buttons stay");
assert.equal(T.skyFg([176, 247, 1, 1]), "rgb(58,90,0)", "lime text → dark green");
assert.equal(T.skyFg([255, 255, 255, 1]), "rgb(20,34,74)", "white text → ink");
T.setP("dark");
assert.equal(T.darkBg([255, 255, 255, 1]), "rgb(24,27,34)", "dark: white card → surface");
assert.equal(T.darkBg([6, 10, 44, 1]), null, "dark: navy stays");
assert.equal(T.lightFg([6, 10, 44, 1]), "rgb(231,234,240)", "dark: navy ink → light text");
console.log("✓ colors: Light = light blue with navy top bar; Dark/Navy/Gray change only light parts");
