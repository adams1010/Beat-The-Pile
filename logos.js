// /logos.js — swap initials tiles for real company logos (only logos the Logo Finder PROVED belong to the company).
// Any element with data-logo-id="<company id>" gets upgraded; initials stay if there's no logo or the image fails.
// The logo list is one small cached request (/api/listings?logos=1), kept for 6 hours in this tab's session storage.
(function () {
  if (window.__btpLogos) return; window.__btpLogos = true;
  const KEY = "btp_logos_v1", TTL = 6 * 3600e3;
  let map = null, waiting = [];
  const css = document.createElement("style");
  css.textContent = `[data-logo-id].has-logo{background:#fff!important;padding:5px;overflow:hidden}[data-logo-id].has-logo img{width:100%;height:100%;object-fit:contain;display:block;border-radius:4px}`;
  document.head.appendChild(css);
  const src = (v) => (v.startsWith("fav:") ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(v.slice(4))}&sz=128` : v);
  function upgrade(el) {
    if (!map || el.dataset.logoDone) return; el.dataset.logoDone = "1";
    const v = map[el.dataset.logoId]; if (!v) return;
    const img = new Image(); img.alt = ""; img.decoding = "async"; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
    img.onload = () => {
      if (img.naturalWidth < 24 && !v.startsWith("fav:")) return;          // tiny/broken icon → keep initials
      if (v.startsWith("fav:") && img.naturalWidth <= 16) return;          // Google's generic 16px globe = no real icon
      el.dataset.initials = el.textContent; el.textContent = ""; el.appendChild(img); el.classList.add("has-logo");
    };
    img.src = src(v);
  }
  const scan = (root) => root.querySelectorAll && root.querySelectorAll("[data-logo-id]:not([data-logo-done])").forEach(upgrade);
  function ready(m) { map = m || {}; scan(document); waiting.forEach((f) => f()); waiting = []; }
  try { const c = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (c && Date.now() - c.t < TTL) ready(c.m); } catch {}
  if (!map) fetch("/api/listings?logos=1").then((r) => (r.ok ? r.json() : {})).then((m) => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), m })); } catch {}
    ready(m);
  }).catch(() => ready({}));
  new MutationObserver((ms) => { if (!map) return; for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches("[data-logo-id]")) upgrade(n); scan(n); } })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
