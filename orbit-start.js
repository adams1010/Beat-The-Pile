// /orbit-start.js — "Build your orbit" sheet (Nov 10). Shown right after a student finishes sign-up (/start/ step 3)
// and after they save their profile (/u/), until they've joined 3 orbits. A short checklist + real people from their
// school (classmates in their major first) with a one-tap "Join orbit". Real people only — public profiles, never fake.
//   btpOrbitStart.show({ getToken: async () => token, done: () => {...}, force: false })
(function () {
  const GOAL = 3;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ini = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const css = `
  .bos-back{position:fixed;inset:0;background:rgba(6,10,44,.55);z-index:3000;display:grid;place-items:center;padding:16px}
  .bos{background:#fff;color:#060A2C;border-radius:16px;max-width:560px;width:100%;max-height:min(88vh,760px);overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.35);font-family:Geist,-apple-system,Segoe UI,Roboto,sans-serif}
  .bos header{background:#060A2C;color:#fff;padding:20px 22px 18px;border-radius:16px 16px 0 0}
  .bos header h2{margin:0 0 4px;font-size:21px;letter-spacing:-.01em}.bos header p{margin:0;color:#B8C2D6;font-size:14px}
  .bos .bar{height:6px;background:#22304D;border-radius:6px;margin-top:12px;overflow:hidden}.bos .bar i{display:block;height:100%;background:#B0F701;transition:width .4s}
  .bos .in{padding:16px 22px 20px}
  .bos .chk{display:grid;gap:6px;margin:0 0 14px;padding:0;list-style:none}
  .bos .chk li{display:flex;gap:10px;align-items:center;font-size:14px}
  .bos .chk i{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid #C9D1DE;display:grid;place-items:center;font-style:normal;font-size:12px;color:#fff}
  .bos .chk li.ok i{background:#4A7000;border-color:#4A7000}.bos .chk li.ok span{color:#55627A}
  .bos .chk a{color:#4A7000;font-weight:600}
  .bos h3{font-size:14px;margin:4px 0 8px;color:#55627A;font-weight:600}
  .bos .ppl{display:grid;gap:8px}
  .bos .p{display:flex;align-items:center;gap:10px;border:1px solid #DCE2EC;border-radius:12px;padding:9px 10px}
  .bos .av{flex:none;width:40px;height:40px;border-radius:50%;background:#F2FADF;color:#4A7000;display:grid;place-items:center;font-weight:700;font-size:14px;overflow:hidden}
  .bos .av img{width:100%;height:100%;object-fit:cover}
  .bos .who{flex:1;min-width:0}.bos .who b{display:block;font-size:14.5px}.bos .who small{display:block;color:#55627A;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bos .tag{font-size:11px;font-weight:600;color:#4A7000;background:#F2FADF;border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:1px}
  .bos button.j{flex:none;border:0;background:#4A7000;color:#fff;font:inherit;font-weight:600;font-size:13.5px;border-radius:999px;padding:8px 14px;cursor:pointer;min-height:36px}
  .bos button.j[disabled]{background:#F2FADF;color:#3A5A00;cursor:default}
  .bos .empty{border:1px dashed #C9D1DE;border-radius:12px;padding:14px;font-size:14px;color:#55627A}
  .bos .foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}
  .bos .foot a,.bos .foot button{font:inherit;font-size:14px}
  .bos .ghost{background:none;border:0;color:#55627A;cursor:pointer;text-decoration:underline}
  .bos .go{border:0;background:#B0F701;color:#060A2C;font-weight:700;border-radius:999px;padding:10px 18px;cursor:pointer}
  .bos .err{color:#B42318;font-size:13px;margin-top:8px}`;

  async function api(getToken, body) {
    const t = await getToken();
    const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Something went wrong"); return j;
  }

  async function show({ getToken, done, force } = {}) {
    const finish = () => { try { done && done(); } catch {} };
    try { if (!force && +localStorage.getItem("btp_orbit_skips") >= 3) return finish(); } catch {}
    let o; try { o = await api(getToken, { action: "orbit" }); } catch { return finish(); }
    const joined0 = (o.connections || []).length + (o.sent || 0);
    if (!force && joined0 >= GOAL) return finish();
    // Real people: your major + school first, then your school, then insiders at companies you follow. Only ones you haven't joined.
    const seen = new Set(), ppl = [];
    for (const [list, tag] of [[o.classmates, "Your major"], [o.schoolmates, "Your school"], [o.atTargets, "Insider"]])
      for (const p of list || []) if (p.handle && (p.link || "none") === "none" && !seen.has(p.handle) && ppl.length < 8) { seen.add(p.handle); ppl.push({ ...p, tag }); }
    const m = o.me || {};
    let joined = joined0;
    if (!document.getElementById("bos-css")) { const s = document.createElement("style"); s.id = "bos-css"; s.textContent = css; document.head.append(s); }
    const back = document.createElement("div"); back.className = "bos-back"; back.setAttribute("role", "dialog"); back.setAttribute("aria-modal", "true"); back.setAttribute("aria-labelledby", "bosT");
    const draw = () => {
      const n = Math.min(joined, GOAL);
      back.innerHTML = `<div class="bos"><header><h2 id="bosT">You're in. Now build your orbit.</h2>
          <p>Join a few people's orbits so you can message classmates and see where they're interning.</p>
          <div class="bar" aria-hidden="true"><i style="width:${Math.round(((m.isPublic ? 1 : 0) + 1 + n) / (GOAL + 2) * 100)}%"></i></div></header>
        <div class="in">
          <ul class="chk">
            <li class="ok"><i>✓</i><span>Profile saved</span></li>
            <li class="${m.isPublic ? "ok" : ""}"><i>${m.isPublic ? "✓" : ""}</i><span>${m.isPublic ? "Classmates can find you in Orbit" : `Show your profile in Orbit <a href="#" id="bosPub">Turn it on</a>`}</span></li>
            <li class="${n >= GOAL ? "ok" : ""}"><i>${n >= GOAL ? "✓" : ""}</i><span>Join ${GOAL} people's orbits <b data-noi18n>(${n}/${GOAL})</b></span></li>
            <li class="${(m.following || 0) > 0 ? "ok" : ""}"><i>${(m.following || 0) > 0 ? "✓" : ""}</i><span>${(m.following || 0) > 0 ? "Following a company" : `Follow a company you want <a href="/jobs/">Browse jobs</a>`}</span></li>
          </ul>
          <h3>${m.school ? `People at <span data-noi18n>${esc(m.school)}</span>` : "People on Beat the Pile"}</h3>
          <div class="ppl">${ppl.length ? ppl.map((p, i) => `<div class="p"><span class="av">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(ini(p.name))}</span>
              <span class="who"><b><span data-noi18n>${esc(p.name)}</span><span class="tag">${esc(p.tag)}</span></b><small data-noi18n>${esc([p.major, p.gradYear ? "Class of " + p.gradYear : "", p.at ? "Interned at " + p.at : ""].filter(Boolean).join(" · "))}</small></span>
              <button class="j" type="button" data-i="${i}" ${p.joined ? "disabled" : ""}>${p.joined ? "✓ Requested" : "Join orbit"}</button></div>`).join("")
            : `<div class="empty">${m.school ? "No one else from your school is on Beat the Pile yet. You're early. Share the link with classmates:" : "Add your school to your profile to see classmates here."}${m.school ? ` <b data-noi18n>beatthepile.com/start</b>` : ""}</div>`}</div>
          <div class="err" id="bosErr" role="alert"></div>
          <div class="foot"><a href="/orbit/" style="color:#4A7000;font-weight:600">Open Orbit</a>
            <span><button class="ghost" type="button" id="bosLater">Not now</button> <button class="go" type="button" id="bosDone">${n >= GOAL || !ppl.length ? "Done" : "Continue"}</button></span></div>
        </div></div>`;
      back.querySelectorAll("button.j").forEach((b) => b.onclick = async () => {
        const p = ppl[+b.dataset.i]; b.disabled = true; b.textContent = "Joining…";
        try { await api(getToken, { action: "orbit_connect", to: p.handle }); p.joined = true; joined++; try { window.btpTrack && window.btpTrack("orbit_start_join", {}); } catch {} draw(); }
        catch (e) { b.disabled = false; b.textContent = "Join orbit"; back.querySelector("#bosErr").textContent = e.message; }
      });
      const pub = back.querySelector("#bosPub");
      if (pub) pub.onclick = async (e) => { e.preventDefault(); try { await api(getToken, { action: "onboard", show: true }); m.isPublic = true; draw(); } catch (er) { back.querySelector("#bosErr").textContent = er.message; } };
      back.querySelector("#bosLater").onclick = () => { try { localStorage.setItem("btp_orbit_skips", String((+localStorage.getItem("btp_orbit_skips") || 0) + 1)); } catch {} close(); };
      back.querySelector("#bosDone").onclick = close;
      const first = back.querySelector("button.j:not([disabled])") || back.querySelector("#bosDone"); first && first.focus();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    function close() { document.removeEventListener("keydown", onKey); back.remove(); finish(); }
    draw(); document.body.append(back); document.addEventListener("keydown", onKey);
    try { window.btpTrack && window.btpTrack("orbit_start_shown", { people: ppl.length }); } catch {}
  }
  window.btpOrbitStart = { show };
})();
