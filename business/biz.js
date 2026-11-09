// /business/biz.js — shared bits for the employer pages (home, setup, company, fairs, admin).
//   biz.start(onUser)       loads Clerk once, calls onUser(user|null) now and on sign-in/out
//   biz.api(body)           POST /api/me with the sign-in token → JSON (throws Error(message) with .status, .data)
//   biz.esc(s) · biz.initials(name) · biz.logo(profile, size) · biz.when(iso) · biz.$(sel)
(function () {
  const S = { clerk: null };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => String(n || "?").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const logo = (p, size = 64) => p && typeof p.logo === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p.logo)
    ? `<span class="clogo" style="width:${size}px;height:${size}px"><img alt="" src="${esc(p.logo)}"></span>`
    : `<span class="clogo" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.34)}px" aria-hidden="true">${esc(initials(p && p.company))}</span>`;
  async function token() { try { return await S.clerk?.session?.getToken(); } catch { return null; } }
  async function api(body) {
    const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "Something went wrong. Try again in a minute."); e.status = r.status; e.data = j; throw e; }
    if (j && typeof j.status === "string" && j.profile) {   // remember verification so the top bar can show "Hiring" under your picture
      try { const was = localStorage.getItem("btp_hiring") === "1", now = j.status === "verified"; localStorage.setItem("btp_hiring", now ? "1" : "0"); if (was !== now) window.btpNavMe && window.btpNavMe(); } catch {}
    }
    return j;
  }
  async function start(onUser) {
    try {
      const pk = (await fetch("/api/config").then((r) => r.json())).clerkPublishableKey; if (!pk) throw 0;
      if (!window.Clerk) {
        const host = atob(pk.replace(/^pk_(test|live)_/, "")).replace(/\$$/, "").trim(); if (!/clerk/.test(host)) throw 0;
        await new Promise((ok, bad) => { const s = document.createElement("script"); s.src = `https://${host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
          s.setAttribute("data-clerk-publishable-key", pk); s.async = true; s.crossOrigin = "anonymous"; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
      }
      if (typeof window.Clerk.load === "function" && !window.Clerk.loaded) await window.Clerk.load({});
      S.clerk = window.Clerk;
      let last = S.clerk.user?.id || null;
      S.clerk.addListener?.(({ user }) => { const id = user?.id || null; if (id !== last) { last = id; onUser(user || null); } });
      await onUser(S.clerk.user || null);
    } catch { onUser(undefined); }
  }
  const when = (iso) => { const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5); return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }); };
  const signInCard = (title, text) => `<div class="card center"><h1>${esc(title)}</h1><p class="sub">${esc(text)}</p><a class="btn pri" href="/start/?role=employer&next=${encodeURIComponent(location.pathname)}">Sign in</a></div>`;
  const statusBanner = (b) => b.status === "verified" ? "" :
    b.status === "rejected" ? `<div class="banner bad"><b>We couldn't verify your company.</b> ${esc(b.reviewNote || "Use Report a problem if you think this is a mistake.")}</div>` :
    !b.profile?.company || !b.emailVerified ? `<div class="banner"><b>Finish setting up your company.</b> Add your company and confirm your work email so we can verify you. <a href="/business/setup/">Continue setup →</a></div>` :
    `<div class="banner"><b>Your company is being verified.</b> We check every company before it can contact students, usually within a day. Meanwhile, build your company page.</div>`;
  window.biz = { start, api, esc, initials, logo, when, signInCard, statusBanner, $: (s) => document.querySelector(s), clerk: () => S.clerk };
})();
