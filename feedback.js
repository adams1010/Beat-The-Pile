// /feedback.js — floating "Report a problem" button for any InternIQ page. Include with <script src="/feedback.js" defer></script>.
(function () {
  if (window.__iqFeedback) return; window.__iqFeedback = true;
  const css = `.iqfb-btn{position:fixed;right:14px;bottom:14px;z-index:70;font:600 13px -apple-system,Segoe UI,Roboto,sans-serif;background:#0A1628;color:#fff;border:0;border-radius:999px;padding:10px 14px;box-shadow:0 4px 16px rgba(10,22,40,.25);cursor:pointer}
.iqfb-scrim{position:fixed;inset:0;background:rgba(10,22,40,.45);z-index:71;display:none}.iqfb-scrim.on{display:block}
.iqfb{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:72;width:min(420px,calc(100vw - 32px));background:#fff;border-radius:16px;padding:18px;display:none;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1E293B}
.iqfb.on{display:block}.iqfb h3{margin:0 0 4px;font-size:18px;color:#0A1628}.iqfb p{margin:0 0 12px;color:#64748B;font-size:13px}
.iqfb .k{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.iqfb .k button{font:600 13px inherit;padding:7px 10px;border-radius:999px;border:1px solid #E2EEEA;background:#fff;color:#64748B;cursor:pointer}
.iqfb .k button[aria-pressed=true]{background:#0A1628;color:#fff;border-color:#0A1628}
.iqfb textarea,.iqfb input{width:100%;box-sizing:border-box;font:16px inherit;padding:10px;border:1px solid #E2EEEA;border-radius:10px;margin-bottom:8px}
.iqfb textarea{min-height:90px}.iqfb .row{display:flex;gap:8px;justify-content:flex-end}
.iqfb .row button{font:700 14px inherit;padding:10px 14px;border-radius:10px;border:1px solid #E2EEEA;background:#fff;cursor:pointer}.iqfb .row .go{background:#00C285;border-color:#00C285;color:#fff}
@media print{.iqfb-btn{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const kinds = [["wrong", "Wrong listing"], ["broken", "Broken link"], ["missing", "Missing a company"], ["idea", "Idea"], ["other", "Other"]];
  const wrap = document.createElement("div");
  wrap.innerHTML = `<button class="iqfb-btn" type="button" aria-haspopup="dialog">💬 Report a problem</button><div class="iqfb-scrim"></div>
  <div class="iqfb" role="dialog" aria-modal="true" aria-labelledby="iqfbT"><h3 id="iqfbT">Tell us what's off</h3><p>Wrong internship, dead link, company we're missing, or an idea — it goes straight to the team.</p>
  <div class="k">${kinds.map(([v, l], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
  <textarea aria-label="What happened" placeholder="e.g. 'Boeing Seattle intern link is dead' or 'Add Siemens Energy'"></textarea>
  <input type="email" aria-label="Your email (optional)" placeholder="Your email (optional, if you want a reply)">
  <div class="row"><button type="button" class="x">Cancel</button><button type="button" class="go">Send</button></div></div>`;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector(".iqfb-btn"), scrim = wrap.querySelector(".iqfb-scrim"), box = wrap.querySelector(".iqfb");
  const open = (preset) => { scrim.classList.add("on"); box.classList.add("on"); if (preset?.message) box.querySelector("textarea").value = preset.message; box._listing = preset?.listingId || null; setTimeout(() => box.querySelector("textarea").focus(), 50); };
  const close = () => { scrim.classList.remove("on"); box.classList.remove("on"); };
  window.iqReport = open;   // pages can open it pre-filled: iqReport({ message, listingId })
  if (document.body.dataset.fbButton === "off") btn.style.display = "none";   // page shows its own feedback link
  btn.onclick = () => open(); scrim.onclick = close; box.querySelector(".x").onclick = close;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  box.querySelector(".k").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; box.querySelectorAll(".k button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); };
  box.querySelector(".go").onclick = async (e) => {
    const go = e.currentTarget, message = box.querySelector("textarea").value.trim();
    if (message.length < 3) { box.querySelector("textarea").focus(); return; }
    go.disabled = true; go.textContent = "Sending…";
    try {
      const r = await fetch("/api/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feedback", page: location.pathname, kind: box.querySelector(".k [aria-pressed=true]").dataset.v, message, contact: box.querySelector("input").value, listingId: box._listing }) });
      if (!r.ok) throw new Error();
      box.querySelector("textarea").value = ""; go.textContent = "Sent ✓ Thanks!"; setTimeout(() => { close(); go.textContent = "Send"; go.disabled = false; }, 1200);
    } catch { go.textContent = "Couldn't send — try again"; go.disabled = false; }
  };
})();
