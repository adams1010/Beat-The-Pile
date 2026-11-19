// /nav.js — the one top bar for every page. Include with <script src="/nav.js"></script> right after <body>.
//   Jobs · Career Fair · Orbit · My Season · Profile · Tools ▾ · [account]   (follow-ups live in My Season; Radar is under Tools)
//   Each top-bar item has a line icon above its label (LinkedIn-style). Icons are inline SVG, 24px grid, 1.75 stroke — no emoji.
// "Saved" lives inside My Season (and the ♡ Saved filter on Jobs). Owner tools (/bots, /discovery) are not listed.
// If the page has an #acct element (its sign-in / sign-out widget), it is moved into the bar's right side.
(function () {
  if (window.__btpNav) return; window.__btpNav = true;
  // Nov 17: AI calls carry the sign-in when there is one, so signed-in students get their own AI pool (api/generate.js)
  if (!window.__btpGenFetch) { window.__btpGenFetch = true; const F = window.fetch.bind(window);
    window.fetch = async (u, o = {}) => {
      if (typeof u === "string" && u.split("?")[0] === "/api/generate" && window.Clerk?.session) {
        try { const t = await window.Clerk.session.getToken(); if (t) { const h = new Headers(o.headers || {}); if (!h.has("Authorization")) h.set("Authorization", "Bearer " + t); o = { ...o, headers: h }; } } catch {}
      }
      return F(u, o);
    }; }
  // Nov 17: every page gets the app tags (Add to Home Screen / installed app), not just the few that had them
  { const H = document.head, has = (sel) => H.querySelector(sel), add = (tag, attrs) => { const e = document.createElement(tag); Object.assign(e, attrs); H.appendChild(e); };
    if (!has('link[rel="manifest"]')) add("link", { rel: "manifest", href: "/manifest.webmanifest" });
    if (!has('link[rel="apple-touch-icon"]')) add("link", { rel: "apple-touch-icon", href: "/icons/icon-180.png?v=4" });
    if (!has('meta[name="theme-color"]')) { const m = document.createElement("meta"); m.name = "theme-color"; m.content = "#060A2C"; H.appendChild(m); }
    if (!has('meta[name="apple-mobile-web-app-capable"]')) { const m = document.createElement("meta"); m.name = "apple-mobile-web-app-capable"; m.content = "yes"; H.appendChild(m); }
    if (!has('meta[name="apple-mobile-web-app-title"]')) { const m = document.createElement("meta"); m.name = "apple-mobile-web-app-title"; m.content = "Beat the Pile"; H.appendChild(m); } }
  // Line icons (24×24, stroke = currentColor) so they follow the link color and never look like emoji.
  const ICON = {
    home: '<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>',
    jobs: '<path d="M4 15.5 12 19.5l8-4"/><path d="M4 12 12 16l8-4"/><path d="M12 3.5v8"/><path d="m8.5 7 3.5-3.5L15.5 7"/>',   // Nov 10: our own mark — a pile with one rising off the top (not LinkedIn's briefcase)
    fair: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5c0 1.4 1.1 2.5 2.5 2.5S9 10.9 9 9.5c0 1.4 1.1 2.5 2.5 2.5h1c1.4 0 2.5-1.1 2.5-2.5 0 1.4 1.1 2.5 2.5 2.5S20 10.9 20 9.5"/><path d="M5.5 12v8h13v-8"/><path d="M10 20v-4.5h4V20"/>',
    orbit: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z"/>',
    season: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/>',
    tracker: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5V20"/><path d="m5.6 6.9.9.9 1.6-1.6"/><path d="M12 14.5h6"/><path d="M12 17.5h4"/>',   // Nov 12: Tracker — a sheet with a ticked box
    profile: '<circle cx="12" cy="8.5" r="3.75"/><path d="M4.5 20c.9-3.6 3.9-5.75 7.5-5.75s6.6 2.15 7.5 5.75"/>',
    msg: '<path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.1-4.3A8.5 8.5 0 1 1 20.5 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    pkg: '<path d="M20.5 13.5 13.5 20.5a1.5 1.5 0 0 1-2.1 0L3.5 12.6V3.5h9.1l7.9 7.9a1.5 1.5 0 0 1 0 2.1z"/><circle cx="8" cy="8" r="1.4"/>',
    talent: '<circle cx="9" cy="8.5" r="3.25"/><path d="M3 19.5c.6-3.1 3-5 6-5s5.4 1.9 6 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16 14.6c2.6-.3 4.6 1.3 5 4.9"/>',
    business: '<path d="M4 20.5V6.5L12 3.5v17"/><path d="M12 9.5h8v11"/><path d="M3 20.5h18"/><path d="M7.5 8.5h1M7.5 12h1M7.5 15.5h1M15.5 13h1M15.5 16.5h1"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    tools: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  };
  const svg = (k) => `<svg class="btpic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  // Account type (chosen once after sign-in on /start/ or in the welcome sheet below): "student" | "employer" | null
  let ROLE = null; try { ROLE = localStorage.getItem("btp_role"); } catch {}
  // Nov 16: invite links (?ref=<handle>) — remember who sent this visitor so sign-up can credit them
  try { const r = new URLSearchParams(location.search).get("ref"); if (r && /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(r)) localStorage.setItem("btp_ref", r); } catch {}
  // Nov 8: employers get their own site — no student pages in their bar, and student-only pages (and the /business/ sales page)
  // send them to their home, /business/home/.
  const BIZ = ROLE === "employer";
  if (BIZ) {
    const p0 = location.pathname.replace(/index\.html$/, "");
    if (["/", "/jobs/", "/jobs", "/season/", "/season", "/fair/", "/fair", "/radar/", "/radar", "/demo/", "/demo", "/u/", "/u", "/business/", "/business", "/internship/", "/internship", "/tracker/", "/tracker"].includes(p0)) { location.replace("/business/home/"); return; }
  }
  const MAIN = BIZ
    ? [["/business/home/", "Home", "home"], ["/business/talent/", "Talent", "talent"], ["/business/messages/", "Messages", "msg"], ["/orbit/", "Orbit", "orbit"], ["/business/fairs/", "Career Fairs", "fair"], ["/business/packages/", "Packages", "pkg"]]
    : [["/", "Home", "home"], ["/jobs/", "Jobs", "jobs"], ["/fair/", "Career Fair", "fair"], ["/orbit/", "Orbit", "orbit"], ["/season/", "My Season", "season"], ["/tracker/", "Tracker", "tracker"]];
  // Your profile (or company page), switching between student and business, language and sign-out all live in the
  // menu behind your picture on the right — like Instagram's "switch to professional account".
  const TOOLS = BIZ ? [] : [
    ["/internship/", "My Internship", "Got an offer? Prep, first weeks, wrap-up"],
    ["/companies/", "Companies", "Look up any company and follow it"],
    ["/radar/", "Opening Radar", "When each company usually opens internships"],
    ["/clubs/", "Clubs & teams", "Which clubs fit your major and lead to internships"],
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
.btpnav .in{max-width:1440px;margin:0 auto;display:flex;align-items:center;gap:6px;min-height:60px;
  padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.btpnav .logo{display:flex;align-items:center;gap:8px;color:#fff;font-weight:650;text-decoration:none;margin-right:14px;white-space:nowrap;letter-spacing:-.01em}
.btpnav .logo img{display:block;height:38px;width:auto}
.btpnav .btpbiz{font:600 12px/1 "Geist",sans-serif;color:#060A2C;background:#B0F701;border-radius:999px;padding:4px 9px;margin-left:2px}
.btpnav .mark{width:26px;height:26px;border-radius:7px;background:var(--n-acc);display:grid;place-items:center;color:#060A2C;font:700 11px "Geist",sans-serif;letter-spacing:-.02em}
.btpnav .q{flex:1 1 220px;max-width:380px;display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-radius:8px;background:#16223A;border:1px solid #263452;margin-right:10px}
.btpnav .q input{flex:1;min-width:0;background:transparent;border:0;color:var(--n-fg);font:inherit;font-size:14px;outline:0}
.btpnav .q input::placeholder{color:#8D9AB3}
.btpnav .q:focus-within{border-color:var(--n-acc)}
.btpnav .q{position:relative}
.btpnav .qs{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;color:#060A2C;border:1px solid #DCE2EC;border-radius:10px;box-shadow:none;padding:6px;z-index:60}
.btpnav .qs a{display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:8px;color:#060A2C;text-decoration:none;font-size:14px}
.btpnav .qs a:hover,.btpnav .qs a[aria-selected=true]{background:#F2FADF}
.btpnav .qs small{color:#55627A;font-size:12px;margin-left:auto}
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
.btpnav .menu{position:fixed;margin-top:8px;min-width:280px;background:#fff;color:#060A2C;border:1px solid #DCE2EC;border-radius:10px;box-shadow:none;padding:6px;z-index:60}
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
.btpnav .langs{display:flex;align-items:center;justify-content:space-between;gap:10px}.btpnav .langsel{font:500 13px "Geist",sans-serif;border:1px solid #DCE2EC;background:#fff;color:#060A2C;border-radius:8px;padding:5px 8px;cursor:pointer}
.btpnav .acctmenu a.acctrow{display:flex;align-items:center;gap:10px;padding:8px 10px}
.btpnav .acctrow .me.sm{width:34px;height:34px;font-size:12px;border:0}
.btpnav .acctrow.on .me.sm{outline:2px solid #4A7000;outline-offset:2px}
.btpnav .acctrow .me.plus{background:#EEF1F6;color:#060A2C;font-size:18px;font-weight:500}
.btpnav .acctrow .t{flex:1;min-width:0}.btpnav .acctrow .t b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btpnav .acctrow .ck{flex-shrink:0}
.btpnav .accthd{display:block;padding:6px 10px 2px;font-size:12px;color:#5E6A80}
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
/* Nov 16: phones get a LinkedIn-style bottom tab bar; the top bar keeps only the logo and your picture */
.btptab{display:none}
@media (max-width:640px){
  .btpnav .mob{display:none}.btpnav .right{margin-left:auto}
  body.btp-has-nav{padding-bottom:calc(66px + max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)))}
  .btptab{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:75;background:#060A2C;border-top:1px solid #1A2640;
    padding:0 env(safe-area-inset-right,0px) max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)) env(safe-area-inset-left,0px);font:500 11px/1.1 "Geist",-apple-system,sans-serif}
  .btptab>a,.btptab>details>summary{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:58px;color:#AEB9CC;text-decoration:none;list-style:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .btptab>details{flex:1;display:flex}.btptab>details>summary::-webkit-details-marker{display:none}
  .btptab>a[aria-current="page"],.btptab>details[open]>summary{color:#B0F701}
  .btptab .btpic{width:23px;height:23px}
  .btptab .btpbw{position:relative;display:block;height:23px}.btptab .btpbw .btpbadge{position:absolute;top:-5px;left:13px}
  .btptab .btpbadge{font:700 10.5px/16px "Geist",sans-serif;font-style:normal;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#B0F701;color:#060A2C;text-align:center}
  .btptab .btpbadge[hidden]{display:none!important}
  .btptab .more{position:fixed;left:8px;right:8px;bottom:calc(66px + max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)));max-height:65vh;overflow:auto;background:#fff;color:#060A2C;border:1px solid #DCE2EC;border-radius:10px;padding:6px;font-size:14px}
  .btptab .more{display:block!important;flex-direction:column}.btptab .more a{display:block!important;width:auto!important;padding:11px 12px;border-radius:8px;color:#060A2C;text-decoration:none}.btptab .more a:active{background:#EEF1F6}
  .btptab .more b{display:block;font-weight:600}.btptab .more small{display:block;color:#55627A;font-size:12px;margin-top:2px}
  .btptab .more .sep{height:1px;background:#E3E7ED;margin:6px 4px}
  .btptab .more button{font:inherit;background:none;border:0;color:#060A2C;cursor:pointer;text-align:left}
  .btptab .more .edit{display:block;width:100%;padding:11px 12px;font-weight:600;color:#4A7000}
  .btptab .more .edhd{padding:10px 12px 6px}.btptab .more .edhd b{display:block}.btptab .more .edhd small{color:#55627A;font-size:12px}
  .btptab .more .pin{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:8px}
  .btptab .more .pin[aria-pressed="true"]{background:#F2FADF;font-weight:600}
  .btptab .more .edrow{display:flex;gap:8px;padding:6px 8px}
  .btptab .more .eddone{background:#4A7000!important;color:#fff!important;border-radius:999px!important;padding:8px 18px!important;font-weight:600}
  .btptab .more .edreset{border:1px solid #C9D2E3!important;border-radius:999px!important;padding:8px 14px!important}
  .iqfb-btn{bottom:calc(72px + max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)))!important}.iqp{bottom:calc(120px + max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)))!important}
  .btpcookie{bottom:calc(72px + max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)))!important}
  .toast,.totop{bottom:calc(74px + max(8px, calc(env(safe-area-inset-bottom,0px) - 12px)))!important}.sheet{z-index:80!important}}
.btpnav .menu .sep{height:1px;background:#E3E7ED;margin:6px 4px}
@media print{.btpnav{display:none}}
/* Nov 13 mobile pass: iPhone zooms the page into any field under 16px; Clerk's sign-in boxes were 30px tall and grey */
@media (max-width:768px){input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]),select,textarea{font-size:16px!important}
.btpfoot nav a,.btpfoot nav button{display:inline-flex;align-items:center;min-height:44px;padding:0 6px}}
.cl-formButtonPrimary{background:#4A7000!important;min-height:48px!important;font-size:16px!important;border-radius:999px!important;box-shadow:none!important}
.cl-formButtonPrimary:hover{background:#3B5A00!important}
.cl-socialButtonsBlockButton,.cl-formFieldInput{min-height:48px!important;font-size:16px!important}
.cl-footerActionLink,.cl-formFieldAction{color:#4A7000!important}
:focus-visible{outline:2px solid #4A7000;outline-offset:2px}.btpnav :focus-visible{outline-color:#B0F701}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  // Site language (English / Español): /i18n.js translates the page when Spanish is picked.
  // Nov 12: cookie choice + legal footer (Privacy · Terms · Cookies · Refunds · Accessibility) on every page
  if (!document.querySelector('script[src="/consent.js"]')) { const c = document.createElement("script"); c.src = "/consent.js"; document.head.appendChild(c); }
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
      : `<form class="q" role="search" action="/jobs/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D9AB3" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input name="q" aria-label="Search jobs, companies or people" placeholder="Search jobs, companies or people" autocomplete="off"><input type="hidden" name="state" value="all"><kbd>/</kbd><div class="qs" role="listbox" hidden></div></form>`}
    <div class="links">${MAIN.map(([h, t, k]) => `<a href="${h}"${cur(h) ? ' aria-current="page"' : ""}>${k === "orbit" ? `<span class="btpbw">${svg(k)}<i class="btpbadge" data-noi18n hidden></i></span>` : svg(k)}<span>${t}</span></a>`).join("")}
      ${TOOLS.length ? `<details><summary>${svg("tools")}<span class="lbl">Tools</span></summary><div class="menu" role="menu">${TOOLS.map(([h, t, d]) => `<a role="menuitem" href="${h}"><b>${t}</b><small>${d}</small></a>`).join("")}</div></details>` : ""}</div>
    <details class="mob"><summary>Menu<i class="btpbadge" data-noi18n hidden></i></summary><div class="menu" role="menu">${MAIN.map(([h, t, k]) => `<a role="menuitem" href="${h}"><b>${t}</b>${k === "orbit" ? '<i class="btpbadge" data-noi18n hidden></i>' : ""}</a>`).join("")}${TOOLS.length ? `<div class="sep"></div>${TOOLS.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}` : ""}</div></details>
    <div class="right" id="btpRight">
      <a class="btpsignin" id="btpSignIn" href="/start/?next=${encodeURIComponent(location.pathname + location.search)}" hidden>Sign in</a>
      <details class="acct" id="btpAcct" hidden><summary class="me" id="btpMe" aria-label="Your account menu"></summary>
        <div class="menu acctmenu" role="menu">
          <div class="acchead"><span class="me big" id="btpMe2" aria-hidden="true"></span><div style="min-width:0"><b id="btpAName" data-noi18n></b><small id="btpAEmail" data-noi18n></small></div></div>
          <a role="menuitem" class="pri" href="${BIZ ? "/business/company/" : "/u/"}">${BIZ ? (bizKind() === "recruiter" ? "View your profile" : "View company page") : "View profile"}</a>
          <div class="sep"></div>
          <div id="btpAccts"></div>
          <div class="sep"></div>
          <div class="langs"><label for="btpLangSel"><b>Language</b></label><select id="btpLangSel" class="langsel" data-noi18n>${LANGS.map(([k, n]) => `<option value="${k}"${k === LANG ? " selected" : ""}>${n}</option>`).join("")}</select></div>
          <div class="sep"></div>
          <a role="menuitem" href="#" data-btp-signout>Sign out</a>
        </div></details></div></div>`;
  // Top-bar search (students): jobs by default; a small menu offers "People" too (→ Orbit's Find people). "@name" = people.
  (() => {
    const f = nav.querySelector("form.q[action='/jobs/']"); if (!f) return;
    const i = f.querySelector("input[name=q]"), box = f.querySelector(".qs"); let sel = 0;
    const esc2 = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const opts = (v) => [["/jobs/?state=all&q=" + encodeURIComponent(v), "Jobs and internships", v], ["/orbit/?q=" + encodeURIComponent(v.replace(/^@/, "")), "People", v], ["/companies/?q=" + encodeURIComponent(v), "Companies", v]];   // Nov 15: + Companies (follow any company)
    const paint = () => { const v = i.value.trim(); if (!v) { box.hidden = true; return; }
      if (v.startsWith("@")) sel = 1;
      box.innerHTML = opts(v).map(([h, t, q], k) => `<a role="option" href="${h}" aria-selected="${k === sel}"><span>${t}</span><small data-noi18n>“${esc2(q.slice(0, 40))}”</small></a>`).join(""); box.hidden = false; };
    i.addEventListener("input", () => { sel = 0; paint(); });
    i.addEventListener("focus", paint);
    i.addEventListener("keydown", (e) => { if (box.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : 2)) % 3; paint(); }
      else if (e.key === "Escape") box.hidden = true; });
    f.addEventListener("submit", (e) => { const v = i.value.trim(); if (!v) return; e.preventDefault(); location.href = opts(v)[sel][0]; });
    document.addEventListener("click", (e) => { if (!f.contains(e.target)) box.hidden = true; });
  })();
  addEventListener("keydown", (e) => { const t = e.target.tagName; if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t) && !e.target.isContentEditable) { const i = nav.querySelector(".q input"); if (i && i.offsetParent) { e.preventDefault(); i.focus(); } } });
  // your photo/initials (saved by the profile page or the homepage after sign-in) → links to your profile
  // signed in (or this browser was) → your picture; signed out → "Sign in" (goes to /start/: email first, then student or business)
  let ACCT = { user: undefined };
  window.btpNavMe = () => {
    const box = nav.querySelector("#btpAcct"), si = nav.querySelector("#btpSignIn"); if (!box) return;
    let me = null; try { me = JSON.parse(localStorage.getItem("btp_me") || "null"); } catch {}
    const u = ACCT.user, signedIn = u ? true : u === null ? false : !!me;
    box.hidden = !signedIn; si.hidden = signedIn || (u === undefined && seenSignIn()) || path.startsWith("/start");   // already on the sign-in page
    if (!signedIn) return;
    const email = u?.primaryEmailAddress?.emailAddress || "";
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || (me && me.n) || email.split("@")[0] || "Your account";
    const ini = (me && me.i) || name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "Me";
    const pic = me && me.photo && /^data:image\/(jpeg|png|webp);base64,/.test(me.photo) ? `<img alt="" src="${me.photo.replace(/"/g, "")}">` : String(ini).replace(/[^A-Z0-9]/gi, "").slice(0, 2) || "Me";
    nav.querySelector("#btpMe").innerHTML = pic; nav.querySelector("#btpMe2").innerHTML = pic;
    let hiring = false; try { hiring = BIZ && localStorage.getItem("btp_hiring") === "1"; } catch {}
    box.classList.toggle("hiring", hiring); nav.querySelector("#btpMe").title = hiring ? "Your account · Hiring" : "Your account";
    nav.querySelector("#btpAName").textContent = name; nav.querySelector("#btpAEmail").textContent = email;
    // Nov 18 pm (owner): Instagram-style accounts under ONE email. Everyone has a personal account; a business account
    // is added from here (company setup) and then both show as rows: tap the other one to switch (= unsafeMetadata.role).
    // Known business: current role is employer, Clerk unsafeMetadata.biz {n}, or this device's btp_bizname.
    const C = window.Clerk, esc = (t) => String(t || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const md = (u && u.unsafeMetadata) || {};
    let bizName = (md.biz && md.biz.n) || ""; try { bizName = bizName || localStorage.getItem("btp_bizname") || ""; } catch {}
    const hasBiz = BIZ || !!bizName || (md.biz && md.biz.on);
    const ini2 = (t) => String(t || "?").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
    const row = (kind, title, sub, on, av) => `<a role="menuitemradio" aria-checked="${on}" href="#" class="acctrow${on ? " on" : ""}" ${on ? "" : `data-btp-to="${kind}"`}><span class="me sm" aria-hidden="true">${av}</span><span class="t"><b data-noi18n>${esc(title)}</b><small>${sub}</small></span>${on ? '<svg class="ck" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7000" stroke-width="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>' : ""}</a>`;
    // Nov 18 pm (owner): the business row (and your picture while on the business side) = the company's own logo.
    let bizLogo = ""; try { bizLogo = localStorage.getItem("btp_bizlogo") || ""; } catch {}
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(bizLogo)) bizLogo = "";
    const bizAv = bizLogo ? `<img alt="" src="${bizLogo}">` : esc(ini2(bizName || "Business"));
    if (BIZ && bizLogo) { nav.querySelector("#btpMe").innerHTML = bizAv; nav.querySelector("#btpMe2").innerHTML = bizAv; }
    if (hasBiz && u && !bizLogo && !ACCT.bizAsked) { ACCT.bizAsked = true;   // another device / never opened a business page here: ask once
      (async () => { try { const t = await C.session.getToken(); const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify({ action: "biz_get" }) });
        const j = r.ok ? await r.json() : null, p = (j && j.profile) || {};
        if (p.company && p.kind !== "recruiter") { localStorage.setItem("btp_bizname", String(p.company).slice(0, 80)); if (/^data:image\/(jpeg|png|webp);base64,/.test(p.logo || "")) localStorage.setItem("btp_bizlogo", p.logo); window.btpNavMe(); } } catch {} })(); }
    const sess = (C && C.client && (C.client.signedInSessions || C.client.activeSessions)) || [];
    const others = sess.filter((x) => x && x.user && x.id !== (C.session && C.session.id));
    nav.querySelector("#btpAccts").innerHTML = `<small class="accthd">Your accounts</small>` +
      row("student", name, "Personal", !BIZ, pic) +
      (hasBiz ? row("employer", bizName || "Business account", "Business", BIZ, bizAv) : "") +
      others.map((x) => { const e = x.user.primaryEmailAddress?.emailAddress || "", n = [x.user.firstName, x.user.lastName].filter(Boolean).join(" ") || e.split("@")[0];
        return `<a role="menuitem" href="#" class="acctrow" data-btp-sess="${esc(x.id)}" data-biz="${((x.user.unsafeMetadata || {}).role === "employer") ? 1 : 0}"><span class="me sm" aria-hidden="true">${esc(ini2(n))}</span><span class="t"><b data-noi18n>${esc(n)}</b><small data-noi18n>${esc(e)}</small></span></a>`; }).join("") +
      (hasBiz ? "" : `<a role="menuitem" href="#" class="acctrow add" data-btp-addbiz><span class="me sm plus" aria-hidden="true">+</span><span class="t"><b>Add account</b><small>A business account on this same email</small></span></a>`);
    if (path.startsWith("/u/") || path.startsWith("/business/company/")) nav.querySelector("#btpMe").classList.add("cur");
  };
  const seenSignIn = () => { try { return !!(localStorage.getItem("btp_me") || localStorage.getItem("btp_role")); } catch { return false; } };
  window.btpNavMe();
  const later = () => {     // the rest of the page exists now
    const main = document.querySelector("main"); if (main && !main.id) main.id = "main";
    const acct = document.getElementById("acct"); if (acct && !nav.contains(acct)) nav.querySelector("#btpRight").appendChild(acct);
  };
  // Nov 16: phone bottom bar = 4 pinned pages + More (everything else). Students and employers pick their own 4
  // ("Edit bar" in More → tap to pin/unpin); saved on this device in localStorage btp_tabs[_biz]. Desktop is unchanged.
  const TOOL_ICON = { "/internship/": "jobs", "/companies/": "business", "/radar/": "season", "/clubs/": "orbit", "/#quiz": "tracker", "/#interview": "talent", "/#resumebuilder": "profile", "/#score": "tracker", "/#wall": "orbit", "/demo/": "home" };
  const SHORT = { "Career Fairs": "Fairs", "Career Fair": "Fair", "My Season": "Season", "My Internship": "Internship", "Opening Radar": "Radar", "Match quiz": "Quiz", "Interview practice": "Interview", "Resume builder": "Resume", "Resume check": "Resume check", "Community": "Community", "Try it": "Demo", "My profile": "Profile", "Company": "Company" };
  const PICKS = [...MAIN, ...(BIZ ? [["/business/company/", "Company", "business"]] : [["/u/", "My profile", "profile"]]), ...TOOLS.map(([h, t]) => [h, t, TOOL_ICON[h] || "tools"])];
  const TKEY = BIZ ? "btp_tabs_biz" : "btp_tabs";
  const DEF = BIZ ? ["/business/home/", "/business/talent/", "/orbit/", "/business/fairs/"] : ["/", "/jobs/", "/orbit/", "/tracker/"];
  const readPins = () => { try { const v = JSON.parse(localStorage.getItem(TKEY) || "null"); const ok = Array.isArray(v) ? v.filter((h) => PICKS.some(([x]) => x === h)).slice(0, 4) : []; return ok.length ? ok : DEF; } catch { return DEF; } };
  let PINS = readPins(), editing = false;
  const tab = document.createElement("nav"); tab.className = "btptab"; tab.setAttribute("aria-label", "Main (phone)");
  const pinIcon = (on) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="${on ? "#4A7000" : "none"}" stroke="${on ? "#4A7000" : "#8090A8"}" stroke-width="1.8" aria-hidden="true"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/></svg>`;
  const drawTab = () => {
    const pinned = PINS.map((h) => PICKS.find(([x]) => x === h)).filter(Boolean);
    const rest = PICKS.filter(([h]) => !PINS.includes(h));
    const wasOpen = tab.querySelector("details")?.open;
    tab.innerHTML = pinned.map(([h, t, k]) => `<a href="${h}"${cur(h) ? ' aria-current="page"' : ""}>${k === "orbit" || k === "talent" ? `<span class="btpbw">${svg(k)}<i class="btpbadge" data-noi18n hidden></i></span>` : svg(k)}<span>${SHORT[t] || t}</span></a>`).join("") +
      `<details${wasOpen ? " open" : ""}><summary>${svg("tools")}<span>More</span></summary><div class="more" role="menu">` +
      (editing
        ? `<div class="edhd"><b>Pick up to 4 for your bar</b><small>${PINS.length} of 4 pinned</small></div>${PICKS.map(([h, t]) => `<button type="button" class="pin" data-pin="${h}" aria-pressed="${PINS.includes(h)}">${pinIcon(PINS.includes(h))}<span>${t}</span></button>`).join("")}<div class="sep"></div><div class="edrow"><button type="button" class="eddone" data-tabedit="done">Done</button><button type="button" class="edreset" data-tabedit="reset">Reset</button></div>`
        : `${rest.map(([h, t]) => `<a role="menuitem" href="${h}"><b>${t}</b></a>`).join("")}<div class="sep"></div><button type="button" class="edit" data-tabedit="edit">Edit bar</button>`) +
      `</div></details>`;
    try { window.btpBadgeRepaint && window.btpBadgeRepaint(); } catch {}
  };
  const savePins = () => { try { localStorage.setItem(TKEY, JSON.stringify(PINS)); } catch {} };
  tab.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pin]"), ed = e.target.closest("[data-tabedit]");
    if (p) { e.preventDefault(); e.stopPropagation(); const h = p.dataset.pin; PINS = PINS.includes(h) ? PINS.filter((x) => x !== h) : PINS.length < 4 ? [...PINS, h] : [...PINS.slice(1), h]; if (!PINS.length) PINS = [h]; savePins(); drawTab(); return; }
    if (ed) { e.preventDefault(); e.stopPropagation(); const a = ed.dataset.tabedit; if (a === "edit") editing = true; else if (a === "done") editing = false; else { PINS = DEF.slice(); savePins(); } drawTab(); return; }
    if (e.target.closest(".more a")) tab.querySelector("details").open = false;
  });
  drawTab();
  document.addEventListener("click", (e) => { const d = tab.querySelector("details"); if (d.open && !tab.contains(e.target)) d.open = false; });
  const mount = () => {
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.appendChild(tab);
    document.body.classList.add("btp-has-nav");
    nav.querySelector(".btpskip").addEventListener("click", (e) => {   // pages without a <main>: jump to whatever follows the bar
      let t = document.getElementById("main"); if (!t) { t = nav.nextElementSibling; while (t && /^(SCRIPT|STYLE)$/.test(t.tagName)) t = t.nextElementSibling; }
      if (!t) return; e.preventDefault(); if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1"); t.focus(); t.scrollIntoView(); });
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
      det.querySelector("#btpLangSel")?.addEventListener("change", (e) => {   // Nov 18 (owner): a dropdown, not a row of buttons
        const l = e.target.value; if (window.btpI18n) window.btpI18n.set(l); else { try { localStorage.setItem("btp_lang", l); } catch {} location.reload(); } });
      det.addEventListener("click", async (e) => {
        const to = e.target.closest("[data-btp-to]"), addb = e.target.closest("[data-btp-addbiz]"), sw = e.target.closest("[data-btp-sess]"); if (!to && !addb && !sw) return;
        e.preventDefault(); det.open = false;
        try { sessionStorage.removeItem("btp_orbit_n"); } catch {}
        if (to) return saveRole(to.dataset.btpTo, to.dataset.btpTo === "employer" ? "/business/home/" : "/");
        if (addb) return saveRole("employer", "/business/setup/?kind=company");
        const C = window.Clerk; if (!C) return;
        try { ["btp_me", "btp_hiring", "btp_role", "btp_bizname", "btp_bizlogo"].forEach((k) => localStorage.removeItem(k)); } catch {}
        try { await C.setActive({ session: sw.dataset.btpSess }); } catch {} location.href = sw.dataset.biz === "1" ? "/business/home/" : "/";
      });
      det.querySelectorAll("[data-btp-signout]").forEach((a) => a.addEventListener("click", async (e) => { e.preventDefault();
        try { localStorage.removeItem("btp_me"); sessionStorage.removeItem("btp_orbit_n"); } catch {}
        const C = window.Clerk, n = ((C && C.client && (C.client.signedInSessions || C.client.activeSessions)) || []).length;
        try { if (C) await (n > 1 ? C.signOut({ sessionId: C.session.id }) : C.signOut()); } catch {}
        try { ["btp_role", "btp_hiring", "btp_bizname", "btp_bizlogo"].forEach((k) => localStorage.removeItem(k)); } catch {} location.href = "/"; }));
    }
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  // ── Welcome sheet: right after someone signs in for the first time, ask "looking" or "hiring" (saved on their Clerk account) ──
  const DEST = { student: "/start/?school=1", employer: "/business/setup/", educator: "/start/?school=1" };   // students + staff: the quick school step next
  async function saveRole(role, go){
    const u = window.Clerk && window.Clerk.user;
    const md = (u && u.unsafeMetadata) || {}, leavingBiz = md.role === "employer" && role !== "employer";   // keep the business account listed after switching away
    try { if (u) await u.update({ unsafeMetadata: { ...md, role, ...(leavingBiz ? { biz: { ...(md.biz || {}), on: 1 } } : {}) } }); } catch {}
    try { localStorage.setItem("btp_role", role); } catch {}
    location.href = go || DEST[role];
  }
  window.btpSaveRole = saveRole;
  function bizKind(){ try { return localStorage.getItem("btp_bizkind") || "company"; } catch { return "company"; } }
  // Nov 16 (owner): two ways in. Everyone is a person first (personal account); recruiters and school staff EARN badges from
  // their profile (/u/#badges): Recruiter · Company (work-email code + approval) and Professor · School (school email + directory + approval).
  window.btpRoleCards = (pre) => `<div class="btprole-cards two">
      <button class="btprole-card${pre !== "employer" ? " on" : ""}" data-role="student"><span class="btprole-ic">${svg("jobs")}</span><b>Personal account</b>
        <small>Find internships and jobs from company job boards, build your profile and join your school's orbit. Recruit or work at a school? Add a Recruiter or Faculty badge from your profile.</small><span class="btprole-go">Create my account →</span></button>
      <button class="btprole-card${pre === "employer" ? " on" : ""}" data-role="employer" data-kind="company"><span class="btprole-ic">${svg("talent")}</span><b>Set up my company page</b>
        <small>Your company's page: about, who you hire, perks, live jobs, career fairs. We confirm your work email before it goes live.</small><span class="btprole-go">Set up the company page →</span></button></div>`;
  // Nov 9: three ways in — student, recruiter (a person, own orbit), company page. Both business kinds are role "employer";
  // the kind decides which setup they see.
  const roleDest = (c, next) => c.dataset.kind ? `/business/setup/?kind=${c.dataset.kind}` + (next ? `&next=${encodeURIComponent(next)}` : "") : next;
  window.btpRoleDest = roleDest;
  const sheetCss = `.btprole{position:fixed;inset:0;z-index:200;background:rgba(6,10,44,.72);display:grid;place-items:center;padding:16px;font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.btprole .box{background:#fff;border-radius:10px;max-width:900px;width:100%;padding:28px;box-shadow:none}
.btprole h2{margin:0 0 4px;font-size:24px;color:#060A2C;letter-spacing:-.01em}.btprole p{margin:0 0 18px;color:#55627A}
.btprole-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:820px;margin:0 auto}
.btprole-card{font:inherit;text-align:left;cursor:pointer;background:#fff;border:2px solid #DCE2EC;border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:8px;color:#060A2C;transition:border-color .12s,box-shadow .12s}
.btprole-card:hover,.btprole-card:focus-visible,.btprole-card.on{border-color:#4A7000;box-shadow:0 0 0 4px #F2FADF;outline:0}
.btprole-card b{font-size:18px}.btprole-card small{color:#55627A;font-size:14px;line-height:1.45}
.btprole-ic{width:44px;height:44px;border-radius:10px;background:#060A2C;color:#B0F701;display:grid;place-items:center}
.btprole-go{margin-top:auto;color:#4A7000;font-weight:600;font-size:14px;padding-top:6px}
@media (max-width:620px){.btprole-cards{grid-template-columns:1fr}.btprole .box{padding:20px}}`;
  const sc = document.createElement("style"); sc.textContent = sheetCss; document.head.appendChild(sc);
  document.addEventListener("click", (e) => { const c = e.target.closest && e.target.closest(".btprole-card"); if (c) { c.disabled = true; saveRole(c.dataset.role, roleDest(c)); } });
  // Orbit tab badge (Talent tab for employers): unread messages + people asking to join your orbit ("10+" past 9).
  let lastBadge = 0; window.btpBadgeRepaint = () => paintBadge(lastBadge);
  const paintBadge = (n) => { n = Number(n) || 0; lastBadge = n;
    document.querySelectorAll(".btpnav .btpbadge,.btptab .btpbadge").forEach((b) => { b.hidden = n <= 0; b.textContent = n >= 10 ? "10+" : String(n); });
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
      if (r.ok) { const j = await r.json(); window.btpOrbitBadge(j.n); if (j.needsSchool) askSchool(C); }
    } catch {} finally { badgeBusy = false; }
  }
  // Nov 10: a student (or school staff) with no school on file goes to the quick school step once per visit,
  // so they land in their school's orbit. "Skip for now" there stops it for this browser session.
  function askSchool(C){
    const role = (C.user && C.user.unsafeMetadata && C.user.unsafeMetadata.role) || "";
    if (!["student", "educator"].includes(role) || /^\/(start|u|privacy|business|co)\b/.test(path)) return;
    try { if (sessionStorage.getItem("btp_school_skip")) return; } catch {}
    location.href = "/start/?school=1&next=" + encodeURIComponent(location.pathname + location.search + location.hash);
  }
  function startBadge(C){
    orbitBadge(C);
    setInterval(() => { if (document.visibilityState === "visible") orbitBadge(C, true); }, 30000);   // Nov 18: 30 s on Vercel Pro (Nov 15: was 15 s, Nov 17: 120 s (Vercel CPU at 90% of the free 4 h/month); tab focus still re-checks at once
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
