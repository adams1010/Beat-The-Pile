// /nav.js — one navigation bar for every student page, so Jobs · Career Fair · My Season · Radar are always
// in the same place (phones included). Include with <script src="/nav.js"></script> right after <body>.
// Owner tools (/bots, /discovery) are NOT in this bar; they have their own small link in the footer of those pages.
(function () {
  if (window.__btpNav) return; window.__btpNav = true;
  // "Saved" = every internship you've saved (Jobs page + homepage matches), shown on the Jobs page's Saved view.
  const LINKS = [["/jobs/", "Jobs"], ["/jobs/?view=saved", "♡ Saved"], ["/fair/", "Career Fair"], ["/season/", "My Season"], ["/radar/", "Radar"]];
  const here = location.pathname.replace(/index\.html$/, "") + (new URLSearchParams(location.search).get("view") === "saved" ? "?view=saved" : "");
  const css = `.btpnav{background:#06101F;color:#fff;font:600 14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;position:relative;z-index:30}
.btpnav .in{max-width:960px;margin:0 auto;display:flex;align-items:center;gap:4px;padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));min-height:48px}
.btpnav .logo{color:#00C285;font-weight:800;text-decoration:none;margin-right:10px;white-space:nowrap;letter-spacing:-.01em}
.btpnav .links{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}
.btpnav .links::-webkit-scrollbar{display:none}
.btpnav .links a{color:#CBD5E1;text-decoration:none;padding:8px 10px;border-radius:8px;white-space:nowrap}
.btpnav .links a:hover{color:#fff;background:rgba(255,255,255,.06)}
.btpnav .links a[aria-current=page]{color:#fff;background:rgba(0,194,133,.18)}
.btpnav a:focus-visible{outline:2px solid #00C285;outline-offset:2px}
.btpskip{position:absolute;left:-999px;top:0;background:#fff;color:#0A1628;padding:8px 12px;z-index:100;border-radius:0 0 8px 0;font-weight:700}
.btpskip:focus{left:0}
@media print{.btpnav{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const nav = document.createElement("nav"); nav.className = "btpnav"; nav.setAttribute("aria-label", "Main");
  nav.innerHTML = `<a class="btpskip" href="#main">Skip to content</a><div class="in"><a class="logo" href="/">Beat the Pile</a><div class="links">${
    LINKS.map(([h, t]) => `<a href="${h}"${here === h || here === h.slice(0, -1) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</div></div>`;
  const mount = () => {
    document.body.insertBefore(nav, document.body.firstChild);
    const main = document.querySelector("main"); if (main && !main.id) main.id = "main";
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
