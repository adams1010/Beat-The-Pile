// /nav.js — the one top bar for every page. Include with <script src="/nav.js"></script> right after <body>.
//   Jobs · Career Fair · My Season · Radar · Tools ▾ · [account]
// "Saved" lives inside My Season (and the ♡ Saved filter on Jobs). Owner tools (/bots, /discovery) are not listed.
// If the page has an #acct element (its sign-in / sign-out widget), it is moved into the bar's right side.
(function () {
  if (window.__btpNav) return; window.__btpNav = true;
  const MAIN = [["/jobs/", "Jobs"], ["/fair/", "Career Fair"], ["/season/", "My Season"], ["/radar/", "Radar"]];
  const TOOLS = [
    ["/#quiz", "Match quiz", "Real openings matched to your major"],
    ["/#interview", "Interview practice", "Mock interview with follow-up questions"],
    ["/#resumebuilder", "Resume builder", "Starter resume from your answers"],
    ["/#score", "Resume check", "How a resume reads against a posting"],
    ["/#dashboard", "Follow-ups", "Who to follow up with, drafts included"],
    ["/#wall", "Community", "Tips from other students"],
    ["/demo/", "How it works", "90-second walkthrough"],
  ];
  const path = location.pathname.replace(/index\.html$/, "");
  const cur = (h) => h === path || h.slice(0, -1) === path;
  const css = `
.btpnav{--n-bg:#0B1220;--n-fg:#E6EAF0;--n-dim:#9AA4B2;--n-line:rgba(255,255,255,.08);--n-acc:#2FBF8A;
  background:var(--n-bg);color:var(--n-fg);font:500 14px/1.2 "Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;position:sticky;top:0;z-index:50;border-bottom:1px solid var(--n-line)}
.btpnav .in{max-width:1080px;margin:0 auto;display:flex;align-items:center;gap:6px;min-height:52px;
  padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.btpnav .logo{display:flex;align-items:center;gap:8px;color:#fff;font-weight:650;text-decoration:none;margin-right:14px;white-space:nowrap;letter-spacing:-.01em}
.btpnav .mark{width:22px;height:22px;border-radius:6px;background:var(--n-acc);display:grid;place-items:center;color:#0B1220;font-size:11px;font-weight:800;letter-spacing:-.02em}
.btpnav .links{display:flex;align-items:center;gap:2px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
.btpnav .links::-webkit-scrollbar{display:none}
.btpnav .links a,.btpnav summary{color:var(--n-dim);text-decoration:none;padding:8px 10px;border-radius:7px;white-space:nowrap;cursor:pointer}
.btpnav .links a:hover,.btpnav summary:hover{color:#fff}
.btpnav .links a[aria-current=page]{color:#fff;box-shadow:inset 0 -2px 0 var(--n-acc);border-radius:0}
.btpnav details{position:relative}
.btpnav summary{list-style:none;display:flex;align-items:center;gap:4px}
.btpnav summary::-webkit-details-marker{display:none}
.btpnav summary::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px);margin-left:4px}
.btpnav .menu{position:fixed;margin-top:8px;min-width:260px;background:#fff;color:#0B1220;border:1px solid #E3E7ED;border-radius:10px;box-shadow:0 12px 32px rgba(11,18,32,.18);padding:6px;z-index:60}
.btpnav .menu a{display:block;padding:9px 10px;border-radius:7px;color:#0B1220;text-decoration:none}
.btpnav .menu a:hover,.btpnav .menu a:focus-visible{background:#F2F4F7}
.btpnav .menu b{display:block;font-weight:600;font-size:14px}
.btpnav .menu small{display:block;color:#5B6675;font-size:12.5px;margin-top:2px;font-weight:400}
.btpnav .right{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:6px}
.btpnav #acct{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--n-dim)}
.btpnav #acct span,.btpnav #acct .who{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--n-dim)}
.btpnav #acct button{font:inherit;font-size:13px;font-weight:600;border-radius:7px;padding:6px 12px;cursor:pointer;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.18)}
.btpnav #acct .signin,.btpnav #acct #si{background:var(--n-acc);color:#0B1220;border-color:var(--n-acc)}
.btpnav a:focus-visible,.btpnav summary:focus-visible,.btpnav button:focus-visible{outline:2px solid var(--n-acc);outline-offset:2px}
.btpskip{position:absolute;left:-999px;top:0;background:#fff;color:#0B1220;padding:8px 12px;z-index:100;font-weight:600}
.btpskip:focus{left:0}
body.btp-has-nav header .top,body.btp-has-nav header .topbar{display:none}
.btpnav .mob{display:none}
@media (max-width:640px){.btpnav .logo .word{display:none}.btpnav #acct span,.btpnav #acct .who{display:none}
  .btpnav .links{display:none}.btpnav .mob{display:block;margin-left:auto}.btpnav .mob summary{color:#fff;border:1px solid rgba(255,255,255,.18);padding:7px 10px}
  .btpnav .mob .menu{left:8px!important;right:8px;min-width:0}.btpnav .menu .sep{height:1px;background:#E3E7ED;margin:6px 4px}}
@media print{.btpnav{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  if (!document.querySelector('link[href*="family=Geist"]')) {
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap"; document.head.appendChild(f);
  }
  const nav = document.createElement("nav"); nav.className = "btpnav"; nav.setAttribute("aria-label", "Main");
  nav.innerHTML = `<a class="btpskip" href="#main">Skip to content</a><div class="in">
    <a class="logo" href="/"><span class="mark" aria-hidden="true">BP</span><span class="word">Beat the Pile</span></a>
    <div class="links">${MAIN.map(([h, t]) => `<a href="${h}"${cur(h) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}
      <details><summary>Tools</summary><div class="menu" role="menu">${TOOLS.map(([h, t, d]) => `<a role="menuitem" href="${h}"><b>${t}</b><small>${d}</small></a>`).join("")}</div></details></div>
    <details class="mob"><summary>Menu</summary><div class="menu" role="menu">${MAIN.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}<div class="sep"></div>${TOOLS.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}</div></details>
    <div class="right" id="btpRight"></div></div>`;
  const later = () => {     // the rest of the page exists now
    const main = document.querySelector("main"); if (main && !main.id) main.id = "main";
    const acct = document.getElementById("acct"); if (acct && !nav.contains(acct)) nav.querySelector("#btpRight").appendChild(acct);
  };
  const mount = () => {
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add("btp-has-nav");
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", later); else later();
    for (const det of nav.querySelectorAll("details")) {
      const place = () => { const r = det.querySelector("summary").getBoundingClientRect(), m = det.querySelector(".menu");
        m.style.top = r.bottom + "px"; if (!det.classList.contains("mob")) m.style.left = Math.max(8, Math.min(r.left, innerWidth - 276)) + "px"; };
      det.addEventListener("toggle", () => det.open && place());
      document.addEventListener("click", (e) => { if (det.open && !det.contains(e.target)) det.open = false; });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") det.open = false; });
      addEventListener("resize", () => det.open && place());
      det.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", () => { det.open = false; }));
    }
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
