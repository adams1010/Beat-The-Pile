// /feedback.js — floating "Report a problem" button for any Beat the Pile page. Include with <script src="/feedback.js" defer></script>.
(function () {
  if (window.__iqFeedback) return; window.__iqFeedback = true;
  const css = `.iqfb-btn{position:fixed;right:14px;bottom:14px;z-index:70;font:500 13px "Geist",-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#060A2C;border:1px solid #D5DBE3;border-radius:8px;padding:8px 12px;box-shadow:0 2px 8px rgba(6,10,44,.08);cursor:pointer}
.iqfb-scrim{position:fixed;inset:0;background:rgba(10,22,40,.45);z-index:71;display:none}.iqfb-scrim.on{display:block}
.iqfb{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:72;width:min(420px,calc(100vw - 32px));background:#fff;border-radius:16px;padding:18px;display:none;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1E293B}
.iqfb.on{display:block}.iqfb h3{margin:0 0 4px;font-size:18px;color:#060A2C}.iqfb p{margin:0 0 12px;color:#64748B;font-size:13px}
.iqfb .k{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.iqfb .k button{font:600 13px inherit;padding:7px 10px;border-radius:999px;border:1px solid #EEF6D8;background:#fff;color:#64748B;cursor:pointer}
.iqfb .k button[aria-pressed=true]{background:#060A2C;color:#fff;border-color:#060A2C}
.iqfb textarea,.iqfb input{width:100%;box-sizing:border-box;font:16px inherit;padding:10px;border:1px solid #EEF6D8;border-radius:10px;margin-bottom:8px}
.iqfb textarea{min-height:90px}.iqfb .row{display:flex;gap:8px;justify-content:flex-end}
.iqfb .row button{font:700 14px inherit;padding:10px 14px;border-radius:10px;border:1px solid #EEF6D8;background:#fff;cursor:pointer}.iqfb .row .go{background:#4A7000;border-color:#4A7000;color:#fff}
@media (max-width:640px){.iqfb-btn{width:38px;height:38px;padding:0;border-radius:50%;font-size:0;right:10px;bottom:10px;opacity:.9;box-shadow:0 4px 14px rgba(10,22,40,.12)}.iqfb-btn::after{content:"?";font-size:17px;font-weight:600;color:#55627A}}
@media print{.iqfb-btn{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const kinds = [["wrong", "Wrong listing"], ["broken", "Broken link"], ["missing", "Missing a company"], ["idea", "Idea"], ["other", "Other"]];
  const wrap = document.createElement("div");
  wrap.innerHTML = `<button class="iqfb-btn" type="button" aria-haspopup="dialog" aria-label="Report a problem or send feedback">Feedback</button><div class="iqfb-scrim"></div>
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
      box.querySelector("textarea").value = ""; go.textContent = "Sent — thanks!"; setTimeout(() => { close(); go.textContent = "Send"; go.disabled = false; }, 1200);
    } catch { go.textContent = "Couldn't send — try again"; go.disabled = false; }
  };

  // ── One-time check-in on a student's 3rd day of visits (small card, never a popup; dismiss = never again) ──
  try {
    const KEY = "btp_pulse", s = JSON.parse(localStorage.getItem(KEY) || "{}"), today = new Date().toISOString().slice(0, 10);
    s.days = Array.isArray(s.days) ? s.days : [];
    if (!s.days.includes(today)) { s.days.push(today); s.days = s.days.slice(-10); }
    localStorage.setItem(KEY, JSON.stringify(s));
    const owner = /^\/(bots|discovery)\b/.test(location.pathname);
    if (!s.done && s.days.length >= 3 && !owner && document.body.dataset.fbButton !== "off") setTimeout(showPulse, 4000);
    function finish() { s.done = 1; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
    function showPulse() {
      const st2 = document.createElement("style");
      st2.textContent = `.iqp{position:fixed;right:14px;bottom:62px;z-index:69;width:min(330px,calc(100vw - 28px));background:#fff;border:1px solid #DCE2EC;border-radius:12px;padding:14px;box-shadow:0 8px 24px rgba(10,20,38,.12);font:14px "Geist",-apple-system,Segoe UI,Roboto,sans-serif;color:#060A2C}
.iqp b{display:block;font-weight:600;margin-bottom:8px;padding-right:22px}.iqp .x{position:absolute;top:8px;right:8px;border:0;background:none;font-size:18px;color:#5E6A80;cursor:pointer;line-height:1;padding:4px}
.iqp .o{display:flex;gap:6px;flex-wrap:wrap}.iqp .o button{font:500 13px inherit;padding:7px 12px;border-radius:999px;border:1px solid #C9D1DE;background:#fff;color:#060A2C;cursor:pointer}
.iqp .o button:hover{border-color:#4A7000}.iqp textarea{width:100%;box-sizing:border-box;font:16px inherit;padding:8px;border:1px solid #C9D1DE;border-radius:8px;margin:10px 0 8px;min-height:64px}
.iqp .go{font:600 13px inherit;padding:8px 14px;border-radius:999px;border:0;background:#4A7000;color:#fff;cursor:pointer}.iqp small{color:#55627A}
@media (max-width:640px){.iqp{right:10px;left:10px;width:auto;bottom:58px}}@media print{.iqp{display:none}}`;
      document.head.appendChild(st2);
      const c = document.createElement("div"); c.className = "iqp"; c.setAttribute("role", "region"); c.setAttribute("aria-label", "Quick question");
      c.innerHTML = `<button class="x" type="button" aria-label="Close">×</button><b>Quick one: is Beat the Pile helping your search?</b>
        <div class="o"><button type="button" data-a="yes">Yes</button><button type="button" data-a="somewhat">Kind of</button><button type="button" data-a="no">Not yet</button></div>`;
      document.body.appendChild(c);
      c.querySelector(".x").onclick = () => { finish(); c.remove(); };
      c.querySelector(".o").onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return; const ans = b.dataset.a; finish();
        try { window.btpTrack && window.btpTrack("pulse_answer", { answer: ans }); } catch {}
        const ask = ans === "yes" ? "Nice. What's the one thing you'd add?" : "What would make it worth it for you?";
        c.innerHTML = `<button class="x" type="button" aria-label="Close">×</button><b>${ask}</b><textarea aria-label="${ask}" placeholder="Optional"></textarea><button class="go" type="button">Send</button>`;
        const send = async (note) => {
          try { await fetch("/api/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feedback", page: location.pathname, kind: "pulse", message: `Helping? ${ans}${note ? " — " + note : ""}` }) }); } catch {}
        };
        c.querySelector(".x").onclick = () => { send(""); c.remove(); };
        c.querySelector(".go").onclick = async () => { const note = c.querySelector("textarea").value.trim(); await send(note); c.innerHTML = `<small>Thanks — that goes straight to the team.</small>`; setTimeout(() => c.remove(), 1800); };
      };
    }
  } catch {}
})();
