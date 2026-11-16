// /invite.js — "Invite classmates" card (Nov 16). Your link is beatthepile.com/?ref=<your @handle>; nav.js remembers the
// ref on any page and sign-up (/start/ step 3 → onboard) credits you once. Shows how many students joined from your link
// (POST /api/me {action:"invite_stats"}). Used on Orbit and on your own profile (/u/). No names of who joined, just a count.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CSS = `.btpinv{background:#fff;border:1px solid #DCE2EC;border-radius:10px;padding:14px 16px;margin:0 0 12px}
.btpinv h2{font-size:15px;margin:0 0 4px}.btpinv p{font-size:13px;color:#55627A;margin:0 0 10px;line-height:1.45}
.btpinv .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.btpinv button,.btpinv a.b{font:inherit;font-size:13px;font-weight:600;border-radius:999px;padding:7px 14px;cursor:pointer;border:1px solid #C9D2E3;background:#fff;color:#060A2C;text-decoration:none}
.btpinv .go{background:#4A7000;border-color:#4A7000;color:#fff}
.btpinv .n{font-size:13px;color:#060A2C;margin-top:10px}.btpinv .n b{font-variant-numeric:tabular-nums}`;
  function style() { if (document.getElementById("btpinvcss")) return; const s = document.createElement("style"); s.id = "btpinvcss"; s.textContent = CSS; document.head.appendChild(s); }

  let cache = null;   // one stats call per page, even when the page re-renders
  async function mount(el, getToken) {
    if (!el) return; style();
    let d = cache;
    if (!d) try { const tk = await getToken(); if (!tk) return; const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tk }, body: JSON.stringify({ action: "invite_stats" }) }); if (r.ok) d = await r.json(); } catch {}
    if (!d) return; cache = d;
    if (!d.handle) { el.innerHTML = `<section class="btpinv"><h2>Invite classmates</h2><p>Save your profile first to get your own invite link.</p><div class="row"><a class="b go" href="/u/">Set up my profile</a></div></section>`; return; }
    const link = `https://www.beatthepile.com/?ref=${encodeURIComponent(d.handle)}`;
    const msg = `I've been using Beat the Pile to find internships. It pulls real openings straight from company job boards. Join me: ${link}`;
    const n = Number(d.joined) || 0;
    el.innerHTML = `<section class="btpinv"><h2>Invite classmates</h2>
      <p>Orbit works best when your friends are on it. Send your link to the people in your major or your group chats.</p>
      <div class="row"><button type="button" class="go" data-inv="share">Invite friends</button><button type="button" data-inv="copy">Copy link</button></div>
      <div class="n">${n ? `<b>${n}</b> ${n === 1 ? "friend" : "friends"} joined from your link` : "Nobody has joined from your link yet"}</div></section>`;
    el.querySelector('[data-inv="share"]').onclick = async (e) => {
      if (navigator.share) { try { await navigator.share({ title: "Beat the Pile", text: msg, url: link }); return; } catch (err) { if (err && err.name === "AbortError") return; } }
      if (/iPhone|iPad|Android/i.test(navigator.userAgent)) { location.href = `sms:?&body=${encodeURIComponent(msg)}`; return; }
      copy(e.target, msg, "Message copied");
    };
    el.querySelector('[data-inv="copy"]').onclick = (e) => copy(e.target, link, "Link copied");
  }
  async function copy(btn, text, done) {
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Copy this:", text); return; }
    const was = btn.textContent; btn.textContent = done; setTimeout(() => { btn.textContent = was; }, 1800);
  }
  window.btpInvite = { mount };
})();
