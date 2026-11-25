// /theme.js — Dark / Navy / Gray appearance (Nov 24, owner: "only change the light parts of the UI like every other app,
// don't overlay the entire thing"). Loaded by nav.js only when a non-Light appearance is picked.
// How: every element's real (computed) colors are read once. Only LIGHT backgrounds turn dark (white cards → surface,
// light grey/blue page → page color, light tints keep their hue but go dark), only DARK text/icons sitting on those light
// areas turn light, and light borders turn dark. Anything colored or already dark (navy bars, lime and green buttons,
// photos, logos, the map) is left exactly as it is. :hover rules in our own stylesheets get the same treatment.
// Overrides are inline !important, remembered per element, and removed again when the student goes back to Light.
(function () {
  if (window.btpThemeEngine) return;
  const PAL = {
    dark: { page: [15, 17, 21], surf: [24, 27, 34], bord: [44, 49, 60], text: [231, 234, 240], mute: [168, 176, 190] },
    navy: { page: [11, 20, 48], surf: [21, 33, 72], bord: [44, 60, 108], text: [232, 237, 248], mute: [170, 182, 211] },
    gray: { page: [43, 45, 49], surf: [54, 57, 63], bord: [76, 80, 88], text: [236, 237, 239], mute: [181, 185, 192] },
  };
  let P = null;                                   // current palette (null = light, nothing applied)
  const touched = new Set(), SET = new WeakMap(), LIGHT = new WeakMap(), sheetBackups = [];
  const SKIP = new Set(["IMG", "VIDEO", "CANVAS", "IFRAME", "PICTURE", "SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "BR", "SOURCE", "TEMPLATE"]);

  const parse = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || ""); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; };
  const fromHsl = (h, s, l) => { const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  const css = (c, a = 1) => a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`;
  // a light background → its dark counterpart (null = not light, leave it)
  const darkBg = (c) => { if (!c || c[3] < 0.05) return null; const [h, s, l] = hsl(c);
    if (l >= 0.97) return css(P.surf, c[3]);
    if (l >= 0.86 && s < 0.4) return css(P.page, c[3]);
    if (l >= 0.8) return css(fromHsl(h, Math.min(s, 0.55) * 0.7, 0.19), c[3]);   // a light tint keeps its hue, goes dark
    return null; };
  // dark text / icon on a light background → light (colored text keeps its hue)
  const lightFg = (c) => { if (!c || c[3] < 0.05) return null; const [h, s, l] = hsl(c); if (l > 0.5) return null;
    if (l < 0.2) return css(P.text, c[3]);                                       // ink (our navy #060A2C too) → plain light text
    if (s < 0.25) return css(l < 0.3 ? P.text : P.mute, c[3]);
    return css(fromHsl(h, Math.min(s, 0.75), 0.74), c[3]); };
  const lightBorder = (c) => { if (!c || c[3] < 0.05) return null; const l = hsl(c)[2]; return l >= 0.78 ? css(P.bord, c[3]) : null; };

  // the page's own inline value for each property we override is kept and put back (React writes inline styles too)
  function clear(el){ const props = SET.get(el); if (!props) return;
    for (const [p, [v, pri]] of props) { if (el.style.getPropertyValue(p) !== props.mine.get(p)) continue;   // the page changed it since: keep theirs
      if (v) el.style.setProperty(p, v, pri); else el.style.removeProperty(p); }
    SET.delete(el); touched.delete(el); }
  function put(el, prop, val){ let s = SET.get(el); if (!s) { s = new Map(); s.mine = new Map(); SET.set(el, s); touched.add(el); }
    if (!s.has(prop)) s.set(prop, [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
    el.style.setProperty(prop, val, "important"); s.mine.set(prop, el.style.getPropertyValue(prop)); }
  // parentLight: the nearest painted background above this element was light (so dark text here needs flipping)
  function paint(el, parentLight){
    if (SKIP.has(el.tagName)) return;
    clear(el);
    const cs = getComputedStyle(el), bg = parse(cs.backgroundColor);
    let light = parentLight;
    if (bg && bg[3] >= 0.05) { const d = darkBg(bg); light = !!d; if (d) put(el, "background-color", d); }
    LIGHT.set(el, light);
    if (light) {
      const fg = lightFg(parse(cs.color)); if (fg) put(el, "color", fg);
      if (el instanceof SVGElement) {
        if (cs.fill && cs.fill !== "none") { const f = lightFg(parse(cs.fill)); if (f) put(el, "fill", f); }
        if (cs.stroke && cs.stroke !== "none") { const f = lightFg(parse(cs.stroke)); if (f) put(el, "stroke", f); }
      }
    }
    for (const side of ["top", "right", "bottom", "left"]) if (parseFloat(cs[`border-${side}-width`]) > 0) { const b = lightBorder(parse(cs[`border-${side}-color`])); if (b) put(el, `border-${side}-color`, b); }
    if (el.tagName === "svg" && el.querySelectorAll("*").length > 150) return;   // maps and charts: leave their insides alone
    for (const k of el.children) paint(k, light);
  }
  const parentLightOf = (el) => { for (let p = el.parentElement; p; p = p.parentElement) if (LIGHT.has(p)) return LIGHT.get(p); return true; };

  // our own stylesheets: :hover / :focus / :active rules get the same color swap (inline paint can't see hover states)
  function sheets(){
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } walk(rules); }
    function walk(rules){ for (const r of rules) { if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
      if (!r.selectorText || !/:(hover|focus|active)/.test(r.selectorText) || r.__btpDone) continue; r.__btpDone = true;
      const st = r.style, bg = parse(st.backgroundColor), d = darkBg(bg);
      const fg = !bg || d ? lightFg(parse(st.color)) : null;
      if (d || fg) { sheetBackups.push([st, st.backgroundColor, st.getPropertyPriority("background-color"), st.color, st.getPropertyPriority("color")]);
        if (d) st.setProperty("background-color", d, "important"); if (fg) st.setProperty("color", fg, "important"); } } }
  }
  function unsheets(){ for (const [st, bg, bp, c, cp] of sheetBackups.splice(0)) { st.setProperty("background-color", bg, bp); st.setProperty("color", c, cp); }
    for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) delete r.__btpDone; } catch {} } }

  let obs = null, queue = new Set(), raf = 0;
  function flush(){ raf = 0; if (!P) { queue.clear(); return; }
    const roots = [...queue].filter((el) => el.isConnected && ![...queue].some((o) => o !== el && o.contains(el))); queue.clear();
    for (const el of roots) paint(el, parentLightOf(el));
    obs && obs.takeRecords();                    // our own inline writes are not changes to react to
  }
  function watch(){
    obs = new MutationObserver((ms) => { if (!P) return;
      for (const m of ms) { if (m.type === "childList") { for (const n of m.addedNodes) if (n.nodeType === 1) queue.add(n); }
        else if (m.target.nodeType === 1) queue.add(m.target); }
      if (queue.size && !raf) raf = requestAnimationFrame(flush); });
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "aria-pressed", "aria-selected", "aria-expanded", "open", "hidden", "disabled"] });
  }
  // pseudo-elements can't be read or painted inline: the few light ones we draw get the surface color here
  const pseudo = document.createElement("style"); pseudo.id = "btpThemePseudo";
  const PSEUDO = [".tk-main::before", ".tk-main::after"];
  function apply(name){
    const next = PAL[name] || null;
    if (P) { for (const el of [...touched]) clear(el); unsheets(); }
    P = next;
    document.documentElement.style.colorScheme = P ? "dark" : "";
    pseudo.textContent = P ? `${PSEUDO.join(",")}{background:${css(P.surf)}!important}input::placeholder,textarea::placeholder{color:${css(P.mute)}!important;opacity:1}` : "";
    if (P && !pseudo.isConnected) (document.head || document.documentElement).appendChild(pseudo);
    if (!P) return;
    paint(document.documentElement, true); sheets(); obs && obs.takeRecords();
    if (!obs) watch();
  }
  window.btpThemeEngine = { apply };
})();
