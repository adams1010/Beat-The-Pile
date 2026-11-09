// /nav.js — the one top bar for every page. Include with <script src="/nav.js"></script> right after <body>.
//   Jobs · Career Fair · Orbit · My Season · Profile · Tools ▾ · [account]   (follow-ups live in My Season; Radar is under Tools)
//   Each top-bar item has a line icon above its label (LinkedIn-style). Icons are inline SVG, 24px grid, 1.75 stroke — no emoji.
// "Saved" lives inside My Season (and the ♡ Saved filter on Jobs). Owner tools (/bots, /discovery) are not listed.
// If the page has an #acct element (its sign-in / sign-out widget), it is moved into the bar's right side.
(function () {
  if (window.__btpNav) return; window.__btpNav = true;
  // Line icons (24×24, stroke = currentColor) so they follow the link color and never look like emoji.
  const ICON = {
    jobs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M3 12.5h18"/>',
    fair: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5c0 1.4 1.1 2.5 2.5 2.5S9 10.9 9 9.5c0 1.4 1.1 2.5 2.5 2.5h1c1.4 0 2.5-1.1 2.5-2.5 0 1.4 1.1 2.5 2.5 2.5S20 10.9 20 9.5"/><path d="M5.5 12v8h13v-8"/><path d="M10 20v-4.5h4V20"/>',
    orbit: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z"/>',
    season: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/>',
    profile: '<circle cx="12" cy="8.5" r="3.75"/><path d="M4.5 20c.9-3.6 3.9-5.75 7.5-5.75s6.6 2.15 7.5 5.75"/>',
    talent: '<circle cx="9" cy="8.5" r="3.25"/><path d="M3 19.5c.6-3.1 3-5 6-5s5.4 1.9 6 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16 14.6c2.6-.3 4.6 1.3 5 4.9"/>',
    business: '<path d="M4 20.5V6.5L12 3.5v17"/><path d="M12 9.5h8v11"/><path d="M3 20.5h18"/><path d="M7.5 8.5h1M7.5 12h1M7.5 15.5h1M15.5 13h1M15.5 16.5h1"/>',
    tools: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  };
  const svg = (k) => `<svg class="btpic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  // Account type (chosen once after sign-in on /start/ or in the welcome sheet below): "student" | "employer" | null
  let ROLE = null; try { ROLE = localStorage.getItem("btp_role"); } catch {}
  const MAIN = ROLE === "employer"
    ? [["/business/talent/", "Talent", "talent"], ["/fair/", "Career Fair", "fair"], ["/jobs/", "Jobs", "jobs"], ["/business/", "Business", "business"]]
    : [["/jobs/", "Jobs", "jobs"], ["/fair/", "Career Fair", "fair"], ["/orbit/", "Orbit", "orbit"], ["/season/", "My Season", "season"], ["/u/", "Profile", "profile"], ["/business/", "For business", "business"]];
  const TOOLS = [
    ["/radar/", "Opening Radar", "When each company usually opens internships"],
    ["/#quiz", "Match quiz", "Real openings matched to your major"],
    ["/#interview", "Interview practice", "Talk it out against a timer, get graded"],
    ["/#resumebuilder", "Resume builder", "Starter resume from your answers"],
    ["/#score", "Resume check", "How a resume reads against a posting"],
    ["/#wall", "Community", "Tips from other students"],
    ["/demo/", "Try it", "Hands-on demo in 2 minutes"],
  ];
  const path = location.pathname.replace(/index\.html$/, "");
  const cur = (h) => h === path || h.slice(0, -1) === path;
  const css = `
.btpnav{--n-bg:#060A2C;--n-fg:#E8EDF5;--n-dim:#AEB9CC;--n-line:#1A2640;--n-acc:#B0F701;
  background:var(--n-bg);color:var(--n-fg);font:500 14px/1.2 "Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;position:sticky;top:0;z-index:50;border-bottom:1px solid var(--n-line)}
.btpnav .in{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:6px;min-height:60px;
  padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.btpnav .logo{display:flex;align-items:center;gap:8px;color:#fff;font-weight:650;text-decoration:none;margin-right:14px;white-space:nowrap;letter-spacing:-.01em}
.btpnav .logo img{display:block;height:38px;width:auto}
.btpnav .mark{width:26px;height:26px;border-radius:7px;background:var(--n-acc);display:grid;place-items:center;color:#060A2C;font:700 11px "Geist",sans-serif;letter-spacing:-.02em}
.btpnav .q{flex:1 1 220px;max-width:380px;display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-radius:8px;background:#16223A;border:1px solid #263452;margin-right:10px}
.btpnav .q input{flex:1;min-width:0;background:transparent;border:0;color:var(--n-fg);font:inherit;font-size:14px;outline:0}
.btpnav .q input::placeholder{color:#8D9AB3}
.btpnav .q:focus-within{border-color:var(--n-acc)}
.btpnav .q kbd{font:500 11px "Geist",sans-serif;color:#8D9AB3;border:1px solid #263452;border-radius:4px;padding:1px 6px}
.btpnav .links{display:flex;align-items:center;gap:2px;flex:0 1 auto;margin-left:auto;min-width:0;overflow-x:auto;scrollbar-width:none}
.btpnav .links::-webkit-scrollbar{display:none}
.btpnav .links a,.btpnav summary{color:var(--n-dim);text-decoration:none;font-size:13px;padding:8px 12px;border-radius:6px;white-space:nowrap;cursor:pointer}
.btpnav .links>a,.btpnav .links>details>summary{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 12px 5px;font-size:12px;line-height:1;min-width:64px;border-bottom:2px solid transparent;border-radius:6px 6px 0 0}
.btpnav .links .btpic{display:block;flex-shrink:0}
.btpnav .links>a[aria-current=page]{background:transparent;border-bottom-color:var(--n-acc)}
.btpnav .links a:hover,.btpnav summary:hover{color:#fff}
.btpnav .links a[aria-current=page]{color:#fff;background:#16223A}
.btpnav details{position:relative}
.btpnav summary{list-style:none;display:flex;align-items:center;gap:4px}
.btpnav .links>details>summary .lbl{display:flex;align-items:center}
.btpnav summary::-webkit-details-marker{display:none}
.btpnav .mob summary::after,.btpnav .links summary .lbl::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px);margin-left:4px}
.btpnav .menu{position:fixed;margin-top:8px;min-width:280px;background:#fff;color:#060A2C;border:1px solid #DCE2EC;border-radius:12px;box-shadow:0 16px 40px rgba(6,10,44,.22);padding:6px;z-index:60}
.btpnav .menu a{display:block;padding:10px 12px;border-radius:8px;color:#060A2C;text-decoration:none;transition:background .12s}
.btpnav .menu a:hover,.btpnav .menu a:focus-visible{background:#F1F4F9;color:#060A2C;box-shadow:inset 3px 0 0 #4A7000}
.btpnav .menu a:hover small{color:#55627A}
.btpnav .menu b{display:block;font-weight:600;font-size:14px}
.btpnav .menu small{display:block;color:#5B6675;font-size:12.5px;margin-top:2px;font-weight:400}
.btpnav .right{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:6px}
.btpnav .me{width:32px;height:32px;border-radius:50%;background:#4A7000;color:#fff;display:grid;place-items:center;font:600 12px "Geist",sans-serif;text-decoration:none;overflow:hidden;flex-shrink:0;border:2px solid #1A2640}
.btpnav .me[hidden]{display:none}.btpnav .me img{width:100%;height:100%;object-fit:cover}
.btpnav .me:hover,.btpnav .me[aria-current=page]{border-color:var(--n-acc)}
.btpnav #acct{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--n-dim)}
.btpnav #acct span,.btpnav #acct .who{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--n-dim)}
.btpnav #acct button{font:inherit;font-size:13px;font-weight:600;border-radius:7px;padding:6px 12px;cursor:pointer;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.18)}
.btpnav #acct .signin,.btpnav #acct #si{background:var(--n-acc);color:#060A2C;border-color:var(--n-acc);border-radius:999px;padding:7px 16px}
.btpnav a:focus-visible,.btpnav summary:focus-visible,.btpnav button:focus-visible{outline:2px solid var(--n-acc);outline-offset:2px}
.btpskip{position:absolute;left:-999px;top:0;background:#fff;color:#060A2C;padding:8px 12px;z-index:100;font-weight:600}
.btpskip:focus{left:0}
body.btp-has-nav header .top,body.btp-has-nav header .topbar{display:none}
.btpnav .mob{display:none}
@media (max-width:900px){.btpnav .q{display:none}}
@media (max-width:640px){.btpnav .logo img{height:34px;width:auto}.btpnav .logo{margin-right:6px}
  .btpnav #acct span,.btpnav #acct .who{display:none}
  .btpnav .links{display:none}.btpnav .mob{display:block;margin-left:auto}.btpnav .mob summary{color:#fff;border:1px solid rgba(255,255,255,.18);padding:7px 10px}
  .btpnav .mob .menu{left:8px!important;right:8px;min-width:0}}
.btpnav .menu .sep{height:1px;background:#E3E7ED;margin:6px 4px}
@media print{.btpnav{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  // Site language (English / Español): /i18n.js translates the page when Spanish is picked.
  if (!document.querySelector('script[src="/i18n.js"]')) { const i = document.createElement("script"); i.src = "/i18n.js"; document.head.appendChild(i); }
  let LANG = "en"; try { LANG = localStorage.getItem("btp_lang") === "es" ? "es" : "en"; } catch {}
  const langItem = (rich) => `<a role="menuitem" href="#" data-btp-lang="${LANG === "es" ? "en" : "es"}">${rich ? `<b>Language</b><small>${LANG === "es" ? "Switch to English" : "Cambiar a español"}</small>` : `<b>${LANG === "es" ? "English" : "Español"}</b>`}</a>`;
  if (!document.querySelector('link[href*="family=Geist"]')) {
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap"; document.head.appendChild(f);
  }
  const nav = document.createElement("nav"); nav.className = "btpnav"; nav.setAttribute("aria-label", "Main");
  nav.innerHTML = `<a class="btpskip" href="#main">Skip to content</a><div class="in">
    <a class="logo" href="/" aria-label="Beat the Pile home"><picture><source media="(max-width:640px)" srcset="/brand/mark-white.png"><img src="/brand/logo-white.png" alt="Beat the Pile" width="95" height="38"></picture></a>
    <form class="q" role="search" action="/jobs/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D9AB3" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input name="q" aria-label="Search internships" placeholder="Search internships, jobs, companies"><input type="hidden" name="state" value="all"><kbd>/</kbd></form>
    <div class="links">${MAIN.map(([h, t, k]) => `<a href="${h}"${cur(h) ? ' aria-current="page"' : ""}>${svg(k)}<span>${t}</span></a>`).join("")}
      <details><summary>${svg("tools")}<span class="lbl">Tools</span></summary><div class="menu" role="menu">${TOOLS.map(([h, t, d]) => `<a role="menuitem" href="${h}"><b>${t}</b><small>${d}</small></a>`).join("")}<div class="sep"></div>${langItem(true)}</div></details></div>
    <details class="mob"><summary>Menu</summary><div class="menu" role="menu">${MAIN.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}<div class="sep"></div>${TOOLS.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}<div class="sep"></div>${langItem(false)}</div></details>
    <div class="right" id="btpRight"><a class="me" id="btpMe" href="/u/" hidden></a></div></div>`;
  addEventListener("keydown", (e) => { const t = e.target.tagName; if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t) && !e.target.isContentEditable) { const i = nav.querySelector(".q input"); if (i && i.offsetParent) { e.preventDefault(); i.focus(); } } });
  // your photo/initials (saved by the profile page or the homepage after sign-in) → links to your profile
  window.btpNavMe = () => { const a = nav.querySelector("#btpMe"); if (!a) return; let me = null; try { me = JSON.parse(localStorage.getItem("btp_me") || "null"); } catch {}
    if (!me) { a.hidden = true; return; }
    a.hidden = false; a.title = "Your profile"; a.setAttribute("aria-label", "Your profile"); if (path.startsWith("/u/")) a.setAttribute("aria-current", "page");
    a.innerHTML = me.photo && /^data:image\/(jpeg|png|webp);base64,/.test(me.photo) ? `<img alt="" src="${me.photo.replace(/"/g, "")}">` : String(me.i || "").replace(/[^A-Z0-9]/gi, "").slice(0, 2) || "Me"; };
  window.btpNavMe();
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
        m.style.top = r.bottom + "px"; if (!det.classList.contains("mob")) m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + "px"; };
      det.addEventListener("toggle", () => det.open && place());
      document.addEventListener("click", (e) => { if (det.open && !det.contains(e.target)) det.open = false; });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") det.open = false; });
      addEventListener("resize", () => det.open && place());
      det.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", () => { det.open = false; }));
      det.querySelectorAll("[data-btp-lang]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault();
        const l = a.dataset.btpLang; if (window.btpI18n) window.btpI18n.set(l); else { try { localStorage.setItem("btp_lang", l); } catch {} location.reload(); } }));
    }
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  // ── Welcome sheet: right after someone signs in for the first time, ask "looking" or "hiring" (saved on their Clerk account) ──
  const DEST = { student: "/jobs/", employer: "/business/talent/" };
  async function saveRole(role, go){
    const u = window.Clerk && window.Clerk.user;
    try { if (u) await u.update({ unsafeMetadata: { ...(u.unsafeMetadata || {}), role } }); } catch {}
    try { localStorage.setItem("btp_role", role); } catch {}
    location.href = go || DEST[role];
  }
  window.btpSaveRole = saveRole;
  window.btpRoleCards = (pre) => `<div class="btprole-cards">
      <button class="btprole-card${pre === "student" ? " on" : ""}" data-role="student"><span class="btprole-ic">${svg("jobs")}</span><b>I'm looking for an internship or job</b>
        <small>Internships first, plus new-grad jobs, from company job boards. Every major. Career Fair Mode, My Season, Orbit.</small><span class="btprole-go">Find internships and jobs →</span></button>
      <button class="btprole-card${pre === "employer" ? " on" : ""}" data-role="employer"><span class="btprole-ic">${svg("talent")}</span><b>I'm hiring interns or new grads</b>
        <small>Find students and recent grads by major, school and skills, and meet them at career fairs. Free during beta.</small><span class="btprole-go">Find interns →</span></button></div>`;
  const sheetCss = `.btprole{position:fixed;inset:0;z-index:200;background:rgba(6,10,44,.72);display:grid;place-items:center;padding:16px;font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.btprole .box{background:#fff;border-radius:16px;max-width:760px;width:100%;padding:28px;box-shadow:0 24px 60px rgba(6,10,44,.4)}
.btprole h2{margin:0 0 4px;font-size:24px;color:#060A2C;letter-spacing:-.01em}.btprole p{margin:0 0 18px;color:#55627A}
.btprole-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.btprole-card{font:inherit;text-align:left;cursor:pointer;background:#fff;border:2px solid #DCE2EC;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:8px;color:#060A2C;transition:border-color .12s,box-shadow .12s}
.btprole-card:hover,.btprole-card:focus-visible,.btprole-card.on{border-color:#4A7000;box-shadow:0 0 0 4px #F2FADF;outline:0}
.btprole-card b{font-size:18px}.btprole-card small{color:#55627A;font-size:14px;line-height:1.45}
.btprole-ic{width:44px;height:44px;border-radius:12px;background:#060A2C;color:#B0F701;display:grid;place-items:center}
.btprole-go{margin-top:auto;color:#4A7000;font-weight:600;font-size:14px;padding-top:6px}
@media (max-width:620px){.btprole-cards{grid-template-columns:1fr}.btprole .box{padding:20px}}`;
  const sc = document.createElement("style"); sc.textContent = sheetCss; document.head.appendChild(sc);
  document.addEventListener("click", (e) => { const c = e.target.closest && e.target.closest(".btprole-card"); if (c) { c.disabled = true; saveRole(c.dataset.role); } });
  function sheet(){
    if (document.querySelector(".btprole") || path.startsWith("/start")) return;
    const d = document.createElement("div"); d.className = "btprole"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Welcome");
    d.innerHTML = `<div class="box"><h2>Welcome to Beat the Pile</h2><p>What brings you here? You can switch later.</p>${window.btpRoleCards()}</div>`;
    document.body.appendChild(d); d.querySelector(".btprole-card").focus();
  }
  let tries = 0;
  const watch = setInterval(() => {      // pages load Clerk themselves; once it's ready, sync the role or ask for it
    const C = window.Clerk; if (++tries > 60) return clearInterval(watch);
    if (!C || !C.loaded) return;
    clearInterval(watch);
    const role = C.user && C.user.unsafeMetadata && C.user.unsafeMetadata.role;
    if (role && role !== ROLE) { try { localStorage.setItem("btp_role", role); } catch {} if (role === "employer" || ROLE === "employer") location.reload(); }
    else if (C.user && !role) sheet();
  }, 500);
})();
