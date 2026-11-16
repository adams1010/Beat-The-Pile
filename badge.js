// /badge.js — "New badge" toast for Tracker + My Season (Nov 15). Compares achievement levels before/after a save.
(function () {
  let last = null;
  function show(a) {
    const t = document.createElement("div");
    t.setAttribute("role", "status");
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#060A2C;color:#fff;border-radius:10px;padding:12px 16px;font:500 14px/1.4 Geist,system-ui,sans-serif;display:flex;gap:12px;align-items:center;max-width:calc(100vw - 32px)";
    t.innerHTML = '<span style="width:30px;height:30px;border-radius:50%;background:#060A2C;border:3px solid #B0F701;color:#B0F701;display:grid;place-items:center;font-weight:700;flex-shrink:0"></span><span></span><a href="/u/" style="color:#B0F701;font-weight:600;text-decoration:none;white-space:nowrap">See badges</a>';
    t.children[0].textContent = a.level; t.children[1].textContent = "New badge: " + a.label;
    document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
  }
  window.btpBadges = {
    /** Call with the achievements list from every /api/me response. The first call only remembers. */
    seen(list) {
      if (!Array.isArray(list)) return;
      const now = Object.fromEntries(list.map((a) => [a.id, a.level]));
      if (last) { const up = list.filter((a) => a.level > (last[a.id] || 0) && a.label); if (up.length) show(up[up.length - 1]); }
      last = now;
    },
  };
})();
