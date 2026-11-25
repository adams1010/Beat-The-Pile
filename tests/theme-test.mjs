// Nov 24 (owner): Appearance in the account menu (Light, Dark, Navy, Gray, Match my device). Only light parts change.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const nav = readFileSync(new URL("../nav.js", import.meta.url), "utf8"), th = readFileSync(new URL("../theme.js", import.meta.url), "utf8");
for (const k of ["light", "dark", "navy", "gray", "device"]) assert.ok(nav.includes(`["${k}",`), "theme option " + k);
assert.ok(nav.includes('id="btpThemeSel"') && nav.includes("btp_theme") && nav.includes("/theme.js"), "menu dropdown, saved per device, engine loaded on demand");
assert.ok(!/filter:\s*invert/.test(nav), "no whole-page color flip");
assert.ok(/dark:\s*\{/.test(th) && /navy:\s*\{/.test(th) && /gray:\s*\{/.test(th) && th.includes("btpThemeEngine"), "three dark palettes");
// the color rules: light backgrounds → dark, saturated/dark ones (lime, navy, green buttons) untouched; dark ink → light
const g = { window: {} }; new Function("window", "document", "getComputedStyle", "MutationObserver", "requestAnimationFrame", "SVGElement",
  th.replace("window.btpThemeEngine = { apply };", "window.btpThemeEngine = { apply }; window.__t = { darkBg, lightFg, setP: (n) => { P = PAL[n]; } };"))(
  g.window, { createElement: () => ({}), documentElement: {}, styleSheets: [] }, () => ({}), function () {}, () => 0, function () {});
const T = g.window.__t; T.setP("dark");
assert.equal(T.darkBg([255, 255, 255, 1]), "rgb(24,27,34)", "white card → surface");
assert.equal(T.darkBg([238, 241, 246, 1]), "rgb(15,17,21)", "light page → page");
assert.equal(T.darkBg([6, 10, 44, 1]), null, "navy stays");
assert.equal(T.darkBg([176, 247, 1, 1]), null, "lime stays");
assert.equal(T.darkBg([74, 112, 0, 1]), null, "green button stays");
assert.equal(T.lightFg([6, 10, 44, 1]), "rgb(231,234,240)", "navy ink → light text");
assert.equal(T.lightFg([255, 255, 255, 1]), null, "light text stays");
console.log("✓ appearance: Light/Dark/Navy/Gray/device, only light parts change");
