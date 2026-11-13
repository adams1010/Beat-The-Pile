// /consent.js (Nov 12 2026) — cookie choice + the legal footer on every page (loaded by /nav.js).
// The only optional tracking on the site is PostHog analytics (/ph.js). Everything else we store is needed for the
// site to work (sign-in, your saved jobs, language). Rules — kept in step with /cookies/:
//   • a choice you made (Accept / Necessary only) always wins — localStorage btp_consent = "all" | "necessary"
//   • Global Privacy Control or Do Not Track on → analytics off, no banner
//   • visitors whose time zone is in Europe (EU/EEA/UK/Switzerland need opt-in) → banner; analytics off until "Accept"
//   • everyone else → analytics on, "Cookie settings" in the footer turns it off
(function () {
  if (window.btpConsent) return;
  var KEY = "btp_consent";
  function saved() { try { var v = localStorage.getItem(KEY); return v === "all" || v === "necessary" ? v : null; } catch (e) { return null; } }
  function gpc() { try { return navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1"; } catch (e) { return false; } }
  function optInRegion() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      return /^Europe\//.test(tz) || /^Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)$/.test(tz) || tz === "Arctic/Longyearbyen";
    } catch (e) { return false; }
  }
  function analytics() { var s = saved(); if (s) return s === "all"; if (gpc()) return false; return !optInRegion(); }
  function set(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    try { if (v !== "all" && window.posthog && window.posthog.__loaded) window.posthog.opt_out_capturing(); } catch (e) {}
    try { if (v === "all" && window.posthog && window.posthog.__loaded) window.posthog.opt_in_capturing(); } catch (e) {}
    var b = document.querySelector(".btpcookie"); if (b) b.remove();
    try { window.dispatchEvent(new CustomEvent("btp-consent", { detail: { analytics: v === "all" } })); } catch (e) {}
  }
  var css = ".btpcookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:9000;max-width:560px;margin:0 auto;background:#fff;color:#060A2C;border:1px solid #DCE2EC;border-radius:10px;box-shadow:none;padding:16px 18px;font:15px/1.5 Geist,-apple-system,Segoe UI,Roboto,sans-serif}"
    + ".btpcookie h2{font-size:16px;margin:0 0 4px}.btpcookie p{margin:0 0 12px;color:#3D4A5C}.btpcookie a{color:#3A5A00}"
    + ".btpcookie .row{display:flex;gap:8px;flex-wrap:wrap}.btpcookie button{font:inherit;font-weight:600;border-radius:999px;padding:9px 18px;cursor:pointer;border:1.5px solid #4A7000}"
    + ".btpcookie .yes{background:#4A7000;color:#fff}.btpcookie .no{background:#fff;color:#3A5A00}"
    + ".btpcookie button:focus-visible,.btpfoot a:focus-visible,.btpfoot button:focus-visible{outline:2px solid #4A7000;outline-offset:2px}"
    + ".btpfoot{border-top:1px solid #E3E7ED;margin-top:40px;padding:18px 16px 26px;font:13.5px/1.6 Geist,-apple-system,Segoe UI,Roboto,sans-serif;color:#4A5568;text-align:center}"
    + ".btpfoot nav{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 16px;margin-bottom:6px}.btpfoot a,.btpfoot button{color:#3A5A00;text-decoration:none;background:none;border:0;font:inherit;padding:0;cursor:pointer}"
    + ".btpfoot a:hover,.btpfoot button:hover{text-decoration:underline}@media print{.btpcookie,.btpfoot{display:none}}";
  function banner(force) {
    if (document.querySelector(".btpcookie")) return;
    var d = document.createElement("div"); d.className = "btpcookie"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Cookie choices");
    d.innerHTML = "<h2>Cookies</h2><p>We use cookies and similar storage that the site needs to work, like keeping you signed in. With your OK we also count page visits with PostHog analytics, without your name or email. <a href=\"/cookies/\">Cookie policy</a></p>"
      + "<div class=\"row\"><button type=\"button\" class=\"yes\">Accept analytics</button><button type=\"button\" class=\"no\">Necessary only</button></div>";
    d.querySelector(".yes").onclick = function () { set("all"); };
    d.querySelector(".no").onclick = function () { set("necessary"); };
    document.body.appendChild(d);
    if (force) d.querySelector(".yes").focus();
  }
  function footer() {
    if (document.querySelector(".btpfoot") || document.body.hasAttribute("data-nofoot")) return;
    var f = document.createElement("footer"); f.className = "btpfoot";
    f.innerHTML = "<nav aria-label=\"Legal\"><a href=\"/privacy/\">Privacy</a><a href=\"/terms/\">Terms</a><a href=\"/cookies/\">Cookies</a><a href=\"/refunds/\">Refunds</a><a href=\"/accessibility/\">Accessibility</a><button type=\"button\" class=\"btpcset\">Cookie settings</button></nav>"
      + "<div>© " + new Date().getFullYear() + " CuzzoCore LLC. Beat the Pile is a service of CuzzoCore LLC. Job listings come from each employer's own job board. Company names and logos belong to their owners.</div>";
    f.querySelector(".btpcset").onclick = function () { banner(true); };
    document.body.appendChild(f);
  }
  window.btpConsent = { analytics: analytics, set: set, open: function () { banner(true); } };
  function ready() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    footer();
    if (!saved() && !gpc() && optInRegion()) banner(false);
  }
  // Nov 13: wait for the whole page to parse; running as soon as <body> existed put the footer ABOVE the page on /u/
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
