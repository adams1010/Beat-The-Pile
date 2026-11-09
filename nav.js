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
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    tools: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  };
  const svg = (k) => `<svg class="btpic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  // Account type (chosen once after sign-in on /start/ or in the welcome sheet below): "student" | "employer" | null
  let ROLE = null; try { ROLE = localStorage.getItem("btp_role"); } catch {}
  // Nov 8: employers get their own site — no student pages in their bar, and student-only pages (and the /business/ sales page)
  // send them to their home, /business/home/.
  const BIZ = ROLE === "employer";
  if (BIZ) {
    const p0 = location.pathname.replace(/index\.html$/, "");
    if (["/", "/jobs/", "/jobs", "/season/", "/season", "/fair/", "/fair", "/radar/", "/radar", "/demo/", "/demo", "/u/", "/u", "/business/", "/business"].includes(p0)) { location.replace("/business/home/"); return; }
  }
  const MAIN = BIZ
    ? [["/business/home/", "Home", "home"], ["/business/talent/", "Talent", "talent"], ["/orbit/", "Orbit", "orbit"], ["/business/fairs/", "Career Fairs", "fair"]]
    : [["/jobs/", "Jobs", "jobs"], ["/fair/", "Career Fair", "fair"], ["/orbit/", "Orbit", "orbit"], ["/season/", "My Season", "season"]];
  // Your profile (or company page), switching between student and business, language and sign-out all live in the
  // menu behind your picture on the right — like Instagram's "switch to professional account".
  const TOOLS = BIZ ? [] : [
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
.btpnav .btpbiz{font:600 12px/1 "Geist",sans-serif;color:#060A2C;background:#B0F701;border-radius:999px;padding:4px 9px;margin-left:2px}
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
.btpnav .btpbw{position:relative;display:block}
.btpnav .btpbadge{font:700 10.5px/16px "Geist",sans-serif;font-style:normal;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#B0F701;color:#060A2C;
  text-align:center;font-variant-numeric:tabular-nums;box-shadow:0 0 0 2px #060A2C;box-sizing:border-box}
.btpnav .btpbw .btpbadge{position:absolute;top:-5px;left:13px}
.btpnav .mob summary .btpbadge,.btpnav .menu .btpbadge{display:inline-block;margin-left:6px;vertical-align:1px}
.btpnav .btpbadge[hidden]{display:none!important}
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
.btpnav #acct{display:none!important}
.btpnav details.acct summary.me{list-style:none;cursor:pointer;padding:0;border-radius:50%;min-width:0}
.btpnav details.acct summary.me::-webkit-details-marker{display:none}
.btpnav .me.cur,.btpnav details.acct[open] summary.me{border-color:var(--n-acc)}
.btpnav details.acct{position:relative}
.btpnav details.acct.hiring summary.me{border-color:#B0F701}
.btpnav details.acct.hiring::after{content:"Hiring";position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);font:700 9px/1.3 "Geist",sans-serif;color:#060A2C;background:#B0F701;border:2px solid #060A2C;border-radius:999px;padding:0 5px;pointer-events:none;white-space:nowrap}
.btpnav .btpsignin{font:600 13px "Geist",sans-serif;background:var(--n-acc);color:#060A2C;border-radius:999px;padding:8px 16px;text-decoration:none;white-space:nowrap}
.btpnav .btpsignin[hidden],.btpnav details.acct[hidden]{display:none}
.btpnav .acctmenu{min-width:280px;max-width:calc(100vw - 16px)}
.btpnav .acchead{display:flex;gap:10px;align-items:center;padding:10px 10px 12px}
.btpnav .acchead b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.btpnav .acchead small{display:block;color:#5B6675;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btpnav .me.big{width:44px;height:44px;font-size:15px;border:0}
.btpnav .acctmenu a.pri{display:block;text-align:center;border:1px solid #4A7000;color:#4A7000;border-radius:999px;font-weight:600;margin:0 8px 6px;padding:7px 12px}
.btpnav .acctmenu a.pri:hover{background:#F2FADF}
.btpnav .langs{padding:8px 10px}.btpnav .langs b{font-size:13px}
.btpnav .langrow{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.btpnav .langrow button{font:500 12.5px "Geist",sans-serif;border:1px solid #DCE2EC;background:#fff;color:#060A2C;border-radius:999px;padding:4px 10px;cursor:pointer}
.btpnav .langrow button[aria-pressed=true]{background:#060A2C;color:#fff;border-color:#060A2C}
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
  const LANGS = [["en", "English"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["nl", "Nederlands"]];
  let LANG = "en"; try { const l = localStorage.getItem("btp_lang"); if (LANGS.some(([k]) => k === l)) LANG = l; } catch {}
  if (!document.querySelector('link[href*="family=Geist"]')) {
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap"; document.head.appendChild(f);
  }
  const nav = document.createElement("nav"); nav.className = "btpnav"; nav.setAttribute("aria-label", "Main");
  nav.innerHTML = `<a class="btpskip" href="#main">Skip to content</a><div class="in">
    <a class="logo" href="${BIZ ? "/business/home/" : "/"}" aria-label="Beat the Pile ${BIZ ? "Business home" : "home"}"><picture><source media="(max-width:640px)" srcset="/brand/mark-white.png"><img src="/brand/logo-white.png" alt="Beat the Pile" width="95" height="38"></picture>${BIZ ? '<span class="btpbiz">Business</span>' : ""}</a>
    ${BIZ ? `<form class="q" role="search" action="/business/talent/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D9AB3" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input name="q" aria-label="Search students" placeholder="Search students by skill, major or school"><kbd>/</kbd></form>`
      : `<form class="q" role="search" action="/jobs/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D9AB3" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input name="q" aria-label="Search internships" placeholder="Search internships, jobs, companies"><input type="hidden" name="state" value="all"><kbd>/</kbd></form>`}
    <div class="links">${MAIN.map(([h, t, k]) => `<a href="${h}"${cur(h) ? ' aria-current="page"' : ""}>${k === "orbit" ? `<span class="btpbw">${svg(k)}<i class="btpbadge" data-noi18n hidden></i></span>` : svg(k)}<span>${t}</span></a>`).join("")}
      ${TOOLS.length ? `<details><summary>${svg("tools")}<span class="lbl">Tools</span></summary><div class="menu" role="menu">${TOOLS.map(([h, t, d]) => `<a role="menuitem" href="${h}"><b>${t}</b><small>${d}</small></a>`).join("")}</div></details>` : ""}</div>
    <details class="mob"><summary>Menu<i class="btpbadge" data-noi18n hidden></i></summary><div class="menu" role="menu">${MAIN.map(([h, t, k]) => `<a role="menuitem" href="${h}"><b>${t}</b>${k === "orbit" ? '<i class="btpbadge" data-noi18n hidden></i>' : ""}</a>`).join("")}${TOOLS.length ? `<div class="sep"></div>${TOOLS.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}` : ""}</div></details>
    <div class="right" id="btpRight">
      <a class="btpsignin" id="btpSignIn" href="/start/?next=${encodeURIComponent(location.pathname + location.search)}" hidden>Sign in</a>
      <details class="acct" id="btpAcct" hidden><summary class="me" id="btpMe" aria-label="Your account menu"></summary>
        <div class="menu acctmenu" role="menu">
          <div class="acchead"><span class="me big" id="btpMe2" aria-hidden="true"></span><div style="min-width:0"><b id="btpAName" data-noi18n></b><small id="btpAEmail" data-noi18n></small></div></div>
          <a role="menuitem" class="pri" href="${BIZ ? "/business/company/" : "/u/"}">${BIZ ? "View company page" : "View profile"}</a>
          <div class="sep"></div>
          <a role="menuitem" href="#" data-btp-switch="${BIZ ? "student" : "employer"}"><b>${BIZ ? "Switch to student account" : "Switch to business account"}</b><small>${BIZ ? "Look for internships and jobs" : "Hire interns and new grads"}</small></a>
          <div class="sep"></div>
          <div class="langs"><b>Language</b><div class="langrow">${LANGS.map(([k, n]) => `<button type="button" data-btp-lang="${k}" aria-pressed="${k === LANG}" data-noi18n>${n}</button>`).join("")}</div></div>
          <div class="sep"></div>
          <a role="menuitem" href="#" data-btp-signout>Sign out</a>
        </div></details></div></div>`;
  addEventListener("keydown", (e) => { const t = e.target.tagName; if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t) && !e.target.isContentEditable) { const i = nav.querySelector(".q input"); if (i && i.offsetParent) { e.preventDefault(); i.focus(); } } });
  // your photo/initials (saved by the profile page or the homepage after sign-in) → links to your profile
  // signed in (or this browser was) → your picture; signed out → "Sign in" (goes to /start/: email first, then student or business)
  let ACCT = { user: undefined };
  window.btpNavMe = () => {
    const box = nav.querySelector("#btpAcct"), si = nav.querySelector("#btpSignIn"); if (!box) return;
    let me = null; try { me = JSON.parse(localStorage.getItem("btp_me") || "null"); } catch {}
    const u = ACCT.user, signedIn = u ? true : u === null ? false : !!me;
    box.hidden = !signedIn; si.hidden = signedIn || (u === undefined && seenSignIn());
    if (!signedIn) return;
    const email = u?.primaryEmailAddress?.emailAddress || "";
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || (me && me.n) || email.split("@")[0] || "Your account";
    const ini = (me && me.i) || name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "Me";
    const pic = me && me.photo && /^data:image\/(jpeg|png|webp);base64,/.test(me.photo) ? `<img alt="" src="${me.photo.replace(/"/g, "")}">` : String(ini).replace(/[^A-Z0-9]/gi, "").slice(0, 2) || "Me";
    nav.querySelector("#btpMe").innerHTML = pic; nav.querySelector("#btpMe2").innerHTML = pic;
    let hiring = false; try { hiring = BIZ && localStorage.getItem("btp_hiring") === "1"; } catch {}
    box.classList.toggle("hiring", hiring); nav.querySelector("#btpMe").title = hiring ? "Your account · Hiring" : "Your account";
    nav.querySelector("#btpAName").textContent = name; nav.querySelector("#btpAEmail").textContent = email;
    if (path.startsWith("/u/") || path.startsWith("/business/company/")) nav.querySelector("#btpMe").classList.add("cur");
  };
  const seenSignIn = () => { try { return !!(localStorage.getItem("btp_me") || localStorage.getItem("btp_role")); } catch { return false; } };
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
        m.style.top = r.bottom + "px";
        if (det.classList.contains("acct")) m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + "px";
        else if (!det.classList.contains("mob")) m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + "px"; };
      det.addEventListener("toggle", () => det.open && place());
      document.addEventListener("click", (e) => { if (det.open && !det.contains(e.target)) det.open = false; });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") det.open = false; });
      addEventListener("resize", () => det.open && place());
      det.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", () => { det.open = false; }));
      det.querySelectorAll("[data-btp-lang]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault();
        const l = a.dataset.btpLang; if (window.btpI18n) window.btpI18n.set(l); else { try { localStorage.setItem("btp_lang", l); } catch {} location.reload(); } }));
      det.querySelectorAll("[data-btp-switch]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); det.open = false;
        saveRole(a.dataset.btpSwitch, a.dataset.btpSwitch === "employer" ? "/business/home/" : "/jobs/"); }));
      det.querySelectorAll("[data-btp-signout]").forEach((a) => a.addEventListener("click", async (e) => { e.preventDefault();
        try { localStorage.removeItem("btp_me"); sessionStorage.removeItem("btp_orbit_n"); } catch {}
        try { if (window.Clerk) await window.Clerk.signOut(); } catch {} location.href = "/"; }));
    }
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  // ── Welcome sheet: right after someone signs in for the first time, ask "looking" or "hiring" (saved on their Clerk account) ──
  const DEST = { student: "/jobs/", employer: "/business/setup/" };
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
        <small>Find students and recent grads by major, school and skills, and meet them at career fairs.</small><span class="btprole-go">Find interns →</span></button></div>`;
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
  // Orbit tab badge (Talent tab for employers): unread messages + people asking to join your orbit ("10+" past 9).
  const paintBadge = (n) => { n = Number(n) || 0;
    nav.querySelectorAll(".btpbadge").forEach((b) => { b.hidden = n <= 0; b.textContent = n >= 10 ? "10+" : String(n); });
    const a = nav.querySelector('.links a[href="/orbit/"],.links a[href="/business/talent/"]');
    if (a) { const t = (a.querySelector(":scope > span:last-child") || a).textContent.trim(); a.setAttribute("aria-label", n > 0 ? `${t}, ${n >= 10 ? "10 or more" : n} new` : t); } };
  window.btpOrbitBadge = (n) => { try { sessionStorage.setItem("btp_orbit_n", JSON.stringify({ n, at: Date.now() })); } catch {} paintBadge(n); };
  // Checked on every page load (cached 15 s so quick page hops don't re-ask), then every 30 s while the tab is open
  // and visible, and again whenever you come back to the tab — so it shows up without visiting Orbit or refreshing.
  let badgeBusy = false;
  async function orbitBadge(C, force){
    if (!C || !C.user || !C.session) return paintBadge(0);
    let c = null; try { c = JSON.parse(sessionStorage.getItem("btp_orbit_n") || "null"); } catch {}
    if (c) paintBadge(c.n);
    if (!force && c && Date.now() - c.at < 15000) return;
    if (badgeBusy) return; badgeBusy = true;
    try {
      const t = await C.session.getToken(); if (!t) return;
      const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify({ action: "orbit_count" }) });
      if (r.ok) window.btpOrbitBadge((await r.json()).n);
    } catch {} finally { badgeBusy = false; }
  }
  function startBadge(C){
    orbitBadge(C);
    setInterval(() => { if (document.visibilityState === "visible") orbitBadge(C, true); }, 15000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") orbitBadge(C); });
    addEventListener("focus", () => orbitBadge(C));
  }
  // Pages that never load sign-in themselves (Radar, Privacy, Business…): if this browser has been signed in before,
  // load Clerk here so the badge still works everywhere.
  let clerkLoading = null;
  window.btpLoadClerk = () => loadClerkHere();
  function loadClerkHere(){ return (clerkLoading ||= loadClerkOnce()); }
  async function loadClerkOnce(){
    try {
      const pk = (await fetch("/api/config").then((r) => r.json())).clerkPublishableKey; if (!pk || window.Clerk) return;
      const host = atob(pk.replace(/^pk_(test|live)_/, "")).replace(/\$$/, "").trim(); if (!/clerk/.test(host)) return;
      await new Promise((ok, bad) => { const s = document.createElement("script"); s.src = `https://${host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
        s.setAttribute("data-clerk-publishable-key", pk); s.async = true; s.crossOrigin = "anonymous"; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
      if (window.Clerk && !window.Clerk.loaded) await window.Clerk.load({});
    } catch {}
  }
  function sheet(){
    if (document.querySelector(".btprole") || path.startsWith("/start")) return;
    const d = document.createElement("div"); d.className = "btprole"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Welcome");
    d.innerHTML = `<div class="box"><h2>Welcome to Beat the Pile</h2><p>What brings you here? You can switch later.</p>${window.btpRoleCards()}</div>`;
    document.body.appendChild(d); d.querySelector(".btprole-card").focus();
  }
  let tries = 0;
  const watch = setInterval(() => {      // pages load Clerk themselves; once it's ready, sync the role or ask for it
    const C = window.Clerk; if (++tries > 60) return clearInterval(watch);
    if (!C && tries === 8 && seenSignIn()) loadClerkHere();      // ~4 s and still no sign-in on this page
    if (!C || !C.loaded) return;
    clearInterval(watch);
    const role = C.user && C.user.unsafeMetadata && C.user.unsafeMetadata.role;
    if (role && role !== ROLE) { try { localStorage.setItem("btp_role", role); } catch {} if (role === "employer" || ROLE === "employer") location.reload(); }
    else if (C.user && !role) sheet();
    ACCT.user = C.user || null; window.btpNavMe();
    startBadge(C);
    let lastU = C.user?.id || null;
    C.addListener && C.addListener(({ user }) => { ACCT.user = user || null; window.btpNavMe(); const id = user?.id || null; if (id === lastU) return; lastU = id;
      try { sessionStorage.removeItem("btp_orbit_n"); } catch {} if (!user) paintBadge(0); else setTimeout(() => orbitBadge(C, true), 300); });
  }, 500);
})();
