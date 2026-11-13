// /consent.js — analytics only with consent: saved choice > GPC/DNT > Europe opt-in > on elsewhere. Legal pages + footer links exist.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const src = fs.readFileSync(new URL("../consent.js", import.meta.url), "utf8");
function run({ tz = "America/New_York", saved = null, gpc = false } = {}) {
  const store = new Map(saved ? [["btp_consent", saved]] : []);
  const els = [];
  const el = () => ({ className: "", innerHTML: "", setAttribute() {}, hasAttribute: () => false, querySelector: () => ({ onclick: null, focus() {} }), appendChild() {}, remove() {} });
  const document = { body: { hasAttribute: () => false, appendChild: (e) => els.push(e) }, head: { appendChild() {} }, createElement: el, querySelector: (s) => els.find((e) => s === "." + e.className) || null, addEventListener() {} };
  const ctx = { window: {}, document, navigator: { globalPrivacyControl: gpc }, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }) }, CustomEvent: class { constructor(t, o) { this.detail = o.detail; } }, Date };
  ctx.window.dispatchEvent = () => {};
  vm.runInNewContext(src, ctx);
  return { c: ctx.window.btpConsent, banner: els.some((e) => e.className === "btpcookie"), footer: els.find((e) => e.className === "btpfoot"), store };
}
let r = run(); assert.equal(r.c.analytics(), true, "US: on by default"); assert.equal(r.banner, false, "no banner in the US");
assert.match(r.footer.innerHTML, /\/privacy\/.*\/terms\/.*\/cookies\/.*\/refunds\/.*\/accessibility\/.*Cookie settings/);
r = run({ tz: "Europe/Berlin" }); assert.equal(r.c.analytics(), false, "Europe: off until yes"); assert.equal(r.banner, true);
r.c.set("all"); assert.equal(r.c.analytics(), true); assert.equal(r.store.get("btp_consent"), "all");
r = run({ tz: "Europe/London", saved: "necessary" }); assert.equal(r.c.analytics(), false); assert.equal(r.banner, false, "a saved choice hides the banner");
r = run({ gpc: true }); assert.equal(r.c.analytics(), false, "Global Privacy Control = off");
r = run({ gpc: true, saved: "all" }); assert.equal(r.c.analytics(), true, "your own choice wins");
const ph = fs.readFileSync(new URL("../ph.js", import.meta.url), "utf8");
assert.match(ph, /c\.analytics\(\)/); assert.match(ph, /mask_all_text: true/);
for (const p of ["privacy", "terms", "cookies", "refunds", "accessibility"]) {
  const h = fs.readFileSync(new URL(`../${p}/index.html`, import.meta.url), "utf8");
  assert.match(h, /<script src="\/nav\.js"><\/script>/, p); assert.match(h, /<main id="main">/, p);
}
assert.match(fs.readFileSync(new URL("../terms/index.html", import.meta.url), "utf8"), /16 or older/);
assert.match(fs.readFileSync(new URL("../start/index.html", import.meta.url), "utf8"), /agree to our <a href="\/terms\/">Terms of Use/);
console.log("✓ consent: Europe opt-in, US on with opt-out, GPC respected, saved choice wins; legal pages + footer + sign-up agreement");
