// /i18n.js — site language (English / Español). Loaded by /nav.js on every page.
//   Choice lives in localStorage "btp_lang" ("en" default | "es"); pick it from Tools ▾ → Language, or on /u/ (Profile).
//   How it works: when Spanish is on, it loads /i18n/es.json and swaps any text node, placeholder, aria-label or title whose
//   whole text matches an English key (whitespace collapsed), plus a few number patterns ("12 open" → "12 abiertas").
//   A MutationObserver catches everything pages render later. Job titles, company names and places are employer data and
//   are never in the dictionary, so they stay as written. Mark anything that must never change with data-noi18n.
(function () {
  if (window.btpI18n) return;
  const get = () => { try { return localStorage.getItem("btp_lang") === "es" ? "es" : "en"; } catch { return "en"; } };
  const lang = get();
  const api = window.btpI18n = {
    lang,
    set(l) { try { localStorage.setItem("btp_lang", l === "es" ? "es" : "en"); } catch {} location.reload(); },
    picker() {   // a small labeled select; used on /u/
      return `<label class="btp-lang" style="display:flex;align-items:center;gap:10px;font-size:14px"><span>${lang === "es" ? "Idioma del sitio" : "Language for the site"}</span>
        <select onchange="btpI18n.set(this.value)" style="font:inherit;border:1px solid #DCE2EC;border-radius:8px;padding:6px 10px;background:#fff">
        <option value="en"${lang === "en" ? " selected" : ""}>English</option><option value="es"${lang === "es" ? " selected" : ""}>Español</option></select></label>`;
    },
  };
  if (lang !== "es") return;
  document.documentElement.lang = "es";
  // hide the page for a moment so it doesn't flash English (never longer than 900 ms)
  const hide = document.createElement("style"); hide.textContent = "body{opacity:0}"; document.head.appendChild(hide);
  const show = () => hide.remove(); setTimeout(show, 900);

  let dict = null, pats = [];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT|SVG)$/;
  // dictionary, then number patterns; a pattern's captured parts are translated too when they're known phrases
  function one(t) {
    if (dict[t] != null) return dict[t];
    for (const [re, to] of pats) { const m = t.match(re); if (m) return to.replace(/\$(\d)/g, (_, i) => { const g = m[+i] ?? ""; return dict[g] ?? g; }); }
    return null;
  }
  function tr(raw) {
    const t = String(raw).replace(/\s+/g, " ").trim();
    if (!t || !/[A-Za-z]/.test(t)) return null;
    let out = one(t);
    // "Fall 2026 · Sep 15–17, 2026 · 200 employers" → translate each "·" part on its own
    if (out == null && t.includes(" · ")) { const parts = t.split(" · "), tx = parts.map((x) => one(x) ?? x); if (tx.some((x, i) => x !== parts[i])) out = tx.join(" · "); }
    if (out == null || out === t) return null;
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    return lead + out + trail;
  }
  const skipped = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { if (SKIP.test(e.tagName.toUpperCase()) || e.hasAttribute("data-noi18n") || e.isContentEditable) return true; } return false; };
  function attrs(el) {
    for (const a of ["placeholder", "aria-label", "title"]) { const v = el.getAttribute && el.getAttribute(a); if (v) { const x = tr(v); if (x) el.setAttribute(a, x); } }
    if (el.tagName === "OPTGROUP" && el.label) { const x = tr(el.label); if (x) el.label = x; }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) { const x = tr(root.nodeValue); if (x) root.nodeValue = x; } return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    attrs(root);
    root.querySelectorAll("[placeholder],[aria-label],[title],optgroup").forEach((el) => { if (!skipped(el)) attrs(el); });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { if (skipped(n.parentElement)) continue; const x = tr(n.nodeValue); if (x) n.nodeValue = x; }
  }
  function start() {
    walk(document.body); const tt = tr(document.title); if (tt) document.title = tt; show();
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") { const n = m.target; if (!skipped(n.parentElement)) { const x = tr(n.nodeValue); if (x) n.nodeValue = x; } }
        else if (m.type === "attributes") attrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });
  }
  fetch("/i18n/es.json").then((r) => r.json()).then((d) => {
    dict = d.strings || {}; pats = (d.patterns || []).map(([re, to]) => [new RegExp(re), to]);
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  }).catch(show);
})();
