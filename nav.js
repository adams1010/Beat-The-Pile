// /nav.js — the one top bar for every page. Include with <script src="/nav.js"></script> right after <body>.
//   Jobs · Career Fair · My Season · Radar · Tools ▾ · [account]   (follow-ups live in My Season)
// "Saved" lives inside My Season (and the ♡ Saved filter on Jobs). Owner tools (/bots, /discovery) are not listed.
// If the page has an #acct element (its sign-in / sign-out widget), it is moved into the bar's right side.
(function () {
  if (window.__btpNav) return; window.__btpNav = true;
  const MAIN = [["/jobs/", "Jobs"], ["/fair/", "Career Fair"], ["/season/", "My Season"], ["/radar/", "Radar"]];
  const TOOLS = [
    ["/u/", "My profile", "A shareable page for recruiters"],
    ["/#quiz", "Match quiz", "Real openings matched to your major"],
    ["/#interview", "Interview practice", "Talk it out against a timer, get graded"],
    ["/#resumebuilder", "Resume builder", "Starter resume from your answers"],
    ["/#score", "Resume check", "How a resume reads against a posting"],
    ["/#wall", "Community", "Tips from other students"],
    ["/demo/", "How it works", "90-second walkthrough"],
  ];
  const path = location.pathname.replace(/index\.html$/, "");
  const cur = (h) => h === path || h.slice(0, -1) === path;
  const css = `
.btpnav{--n-bg:#070F1E;--n-fg:#E8EDF5;--n-dim:#AEB9CC;--n-line:#1A2640;--n-acc:#2FD39A;
  background:var(--n-bg);color:var(--n-fg);font:500 14px/1.2 "Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;position:sticky;top:0;z-index:50;border-bottom:1px solid var(--n-line)}
.btpnav .in{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:6px;min-height:60px;
  padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.btpnav .logo{display:flex;align-items:center;gap:8px;color:#fff;font-weight:650;text-decoration:none;margin-right:14px;white-space:nowrap;letter-spacing:-.01em}
.btpnav .mark{width:26px;height:26px;border-radius:7px;border:1px solid var(--n-acc);display:grid;place-items:center;color:var(--n-acc);font:500 11px "Geist Mono",ui-monospace,monospace}
.btpnav .q{flex:1 1 220px;max-width:380px;display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-radius:8px;background:#16223A;border:1px solid #263452;margin-right:10px}
.btpnav .q input{flex:1;min-width:0;background:transparent;border:0;color:var(--n-fg);font:inherit;font-size:14px;outline:0}
.btpnav .q input::placeholder{color:#8D9AB3}
.btpnav .q:focus-within{border-color:var(--n-acc)}
.btpnav .q kbd{font:11px "Geist Mono",monospace;color:#8D9AB3;border:1px solid #263452;border-radius:4px;padding:1px 6px}
.btpnav .links{display:flex;align-items:center;gap:2px;flex:0 1 auto;margin-left:auto;min-width:0;overflow-x:auto;scrollbar-width:none}
.btpnav .links::-webkit-scrollbar{display:none}
.btpnav .links a,.btpnav summary{color:var(--n-dim);text-decoration:none;font-size:13px;padding:8px 12px;border-radius:6px;white-space:nowrap;cursor:pointer}
.btpnav .links a:hover,.btpnav summary:hover{color:#fff}
.btpnav .links a[aria-current=page]{color:#fff;background:#16223A}
.btpnav details{position:relative}
.btpnav summary{list-style:none;display:flex;align-items:center;gap:4px}
.btpnav summary::-webkit-details-marker{display:none}
.btpnav summary::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px);margin-left:4px}
.btpnav .menu{position:fixed;margin-top:8px;min-width:280px;background:#fff;color:#0A1426;border:1px solid #DCE2EC;border-radius:12px;box-shadow:0 16px 40px rgba(7,15,30,.22);padding:6px;z-index:60}
.btpnav .menu a{display:block;padding:10px 12px;border-radius:8px;color:#0A1426;text-decoration:none;transition:background .12s}
.btpnav .menu a:hover,.btpnav .menu a:focus-visible{background:#F1F4F9;color:#0A1426;box-shadow:inset 3px 0 0 #0B7A55}
.btpnav .menu a:hover small{color:#55627A}
.btpnav .menu b{display:block;font-weight:600;font-size:14px}
.btpnav .menu small{display:block;color:#5B6675;font-size:12.5px;margin-top:2px;font-weight:400}
.btpnav .right{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:6px}
.btpnav #acct{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--n-dim)}
.btpnav #acct span,.btpnav #acct .who{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--n-dim)}
.btpnav #acct button{font:inherit;font-size:13px;font-weight:600;border-radius:7px;padding:6px 12px;cursor:pointer;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.18)}
.btpnav #acct .signin,.btpnav #acct #si{background:var(--n-acc);color:#070F1E;border-color:var(--n-acc);border-radius:999px;padding:7px 16px}
.btpnav a:focus-visible,.btpnav summary:focus-visible,.btpnav button:focus-visible{outline:2px solid var(--n-acc);outline-offset:2px}
.btpskip{position:absolute;left:-999px;top:0;background:#fff;color:#0B1220;padding:8px 12px;z-index:100;font-weight:600}
.btpskip:focus{left:0}
body.btp-has-nav header .top,body.btp-has-nav header .topbar{display:none}
.btpnav .mob{display:none}
@media (max-width:900px){.btpnav .q{display:none}}
@media (max-width:640px){.btpnav .logo .word{display:none}.btpnav #acct span,.btpnav #acct .who{display:none}
  .btpnav .links{display:none}.btpnav .mob{display:block;margin-left:auto}.btpnav .mob summary{color:#fff;border:1px solid rgba(255,255,255,.18);padding:7px 10px}
  .btpnav .mob .menu{left:8px!important;right:8px;min-width:0}.btpnav .menu .sep{height:1px;background:#E3E7ED;margin:6px 4px}}
@media print{.btpnav{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  if (!document.querySelector('link[href*="family=Geist"]')) {
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap"; document.head.appendChild(f);
  }
  const nav = document.createElement("nav"); nav.className = "btpnav"; nav.setAttribute("aria-label", "Main");
  nav.innerHTML = `<a class="btpskip" href="#main">Skip to content</a><div class="in">
    <a class="logo" href="/"><span class="mark" aria-hidden="true">BP</span><span class="word">Beat the Pile</span></a>
    <form class="q" role="search" action="/jobs/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D9AB3" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input name="q" aria-label="Search internships" placeholder="Search internships, companies, majors"><input type="hidden" name="state" value="all"><kbd>/</kbd></form>
    <div class="links">${MAIN.map(([h, t]) => `<a href="${h}"${cur(h) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}
      <details><summary>Tools</summary><div class="menu" role="menu">${TOOLS.map(([h, t, d]) => `<a role="menuitem" href="${h}"><b>${t}</b><small>${d}</small></a>`).join("")}</div></details></div>
    <details class="mob"><summary>Menu</summary><div class="menu" role="menu">${MAIN.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}<div class="sep"></div>${TOOLS.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}</div></details>
    <div class="right" id="btpRight"></div></div>`;
  addEventListener("keydown", (e) => { const t = e.target.tagName; if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t) && !e.target.isContentEditable) { const i = nav.querySelector(".q input"); if (i && i.offsetParent) { e.preventDefault(); i.focus(); } } });
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
