// /pick.js (Nov 9) — "pick from the list" boxes for school, major and location. Type a few letters, choose from real
// options (every US college + universities worldwide, the programs a school awards, every US city/town). Picking from the
// list is what makes "Virginia Tech" and "Virginia Polytechnic Institute…" the same school for Orbit.
//   btpPick.attach(input, { load: () => Promise<[{label, sub?, alias?, id?}]>, other?: true, onPick(item) })
//   btpPick.schools() / .majors(schoolId?) / .places()   ready-made sources
(() => {
  if (window.btpPick) return;
  const css = `.bpk{position:absolute;z-index:80;background:#fff;border:1px solid #DCE2EC;border-radius:10px;box-shadow:0 12px 30px rgba(6,10,44,.16);max-height:300px;overflow:auto;padding:4px;font-family:inherit}
.bpk button{display:block;width:100%;text-align:left;font:inherit;font-size:14px;color:#060A2C;background:none;border:0;border-radius:8px;padding:8px 10px;cursor:pointer}
.bpk button small{display:block;color:#55627A;font-size:12px}
.bpk button[aria-selected=true],.bpk button:hover{background:#F2FADF}
.bpk .bpk-o{color:#4A7000;font-weight:600;border-top:1px solid #EEF1F6;border-radius:0 0 8px 8px}
.bpk p{margin:0;padding:8px 10px;color:#55627A;font-size:13px}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const J = {}; const getJ = (u) => (J[u] ||= fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));

  function rank(items, q, max) {
    const nq = norm(q), words = nq.split(" ").filter(Boolean);
    if (!words.length) return items.slice(0, max);
    const out = [];
    for (const it of items) {
      const hay = it._n || (it._n = norm(it.label + " " + (it.alias || "")));
      if (!words.every((w) => hay.includes(w))) continue;
      const lab = it._l || (it._l = norm(it.label)), al = norm(it.alias || "");
      const score = lab === nq || (it.aliases || []).some((x) => norm(x) === nq) ? 0 : lab.startsWith(nq) ? 1 : (" " + al + " ").includes(" " + nq + " ") ? 1 : (" " + hay).includes(" " + words[0]) ? 2 : 3;
      out.push([score, lab.length, it]);
      if (out.length > 4000) break;
    }
    return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, max).map((x) => x[2]);
  }

  function attach(input, o) {
    const box = document.createElement("div"); box.className = "bpk"; box.hidden = true; box.setAttribute("role", "listbox");
    document.body.appendChild(box);
    input.setAttribute("autocomplete", "off"); input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list");
    let items = null, shown = [], sel = 0, picked = input.value;
    const place = () => { const r = input.getBoundingClientRect(); box.style.left = r.left + scrollX + "px"; box.style.top = r.bottom + scrollY + 4 + "px"; box.style.width = Math.max(r.width, 260) + "px"; };
    const paint = async () => {
      if (!items) { box.innerHTML = "<p>Loading…</p>"; place(); box.hidden = false; items = (await o.load()) || []; }
      if (document.activeElement !== input) return;
      const q = input.value.trim();
      shown = q.length ? rank(items, q, o.max || 40) : (o.empty ? items.slice(0, o.max || 40) : []);
      sel = 0;
      const other = o.other && q && !shown.some((x) => norm(x.label) === norm(q));
      box.innerHTML = shown.map((it, i) => `<button type="button" role="option" data-i="${i}" aria-selected="${i === sel}">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>`).join("")
        + (other ? `<button type="button" class="bpk-o" data-other="1">${esc(o.otherLabel || "Not listed — use")} “${esc(q)}”</button>` : "")
        + (!shown.length && !other ? `<p>${q ? "Nothing matches. Try fewer letters." : esc(o.hint || "Start typing to see the list.")}</p>` : "");
      place(); box.hidden = !q && !o.empty && !o.hint;
    };
    const choose = (it) => { input.value = it.label; picked = it.label; box.hidden = true; o.onPick && o.onPick(it); input.dispatchEvent(new Event("change", { bubbles: true })); };
    input.addEventListener("input", paint);
    input.addEventListener("focus", () => { if (input.value.trim() || o.empty || o.hint) paint(); });
    input.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      const btns = [...box.querySelectorAll("button")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(btns.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); btns.forEach((b, i) => b.setAttribute("aria-selected", i === sel)); btns[sel]?.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter") { e.preventDefault(); btns[sel]?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); }
      else if (e.key === "Escape") box.hidden = true;
    });
    box.addEventListener("mousedown", (e) => {
      const b = e.target.closest("button"); if (!b) return; e.preventDefault();
      if (b.dataset.other) return choose({ label: input.value.trim(), custom: true });
      choose(shown[+b.dataset.i]);
    });
    input.addEventListener("blur", () => setTimeout(() => {
      box.hidden = true;
      const q = input.value.trim(); if (q === picked) return;
      const nq = norm(q), exact = items && items.find((x) => norm(x.label) === nq || (x.aliases || []).some((a) => norm(a) === nq));
      if (exact) return choose(exact);
      if (!q) { picked = ""; o.onPick && o.onPick(null); return; }
      if (o.other) return choose({ label: q, custom: true });
      input.value = picked;                                     // must come from the list
    }, 120));
    addEventListener("resize", () => !box.hidden && place());
    return { set(v) { input.value = v; picked = v; }, close() { box.hidden = true; } };
  }

  // ── sources ──
  const schools = async () => {
    const [us, world] = await Promise.all([getJ("/schools/index.json"), getJ("/schools/world.json")]);
    const a = (us || []).map(([id, name, alias, city, st]) => { const aliases = String(alias || "").split("|").filter(Boolean);
      return { label: name, alias: aliases.join(" "), aliases, sub: `${city}, ${st}${aliases[0] ? " · " + aliases[0] : ""}`, id }; });
    const b = (world || []).map(([name, country]) => ({ label: name, sub: country }));
    return a.concat(b);
  };
  const majors = async (schoolId) => {
    const names = (await getJ("/schools/cip.json")) || {};
    if (schoolId) {
      const shard = (await getJ(`/schools/p/${schoolId % 64}.json`)) || {};
      const own = [...new Set((shard[schoolId] || []).map((c) => names[c]).filter(Boolean))].sort((x, y) => x.localeCompare(y));
      if (own.length) return own.map((m) => ({ label: m }));
    }
    return [...new Set(Object.values(names))].sort((x, y) => x.localeCompare(y)).map((m) => ({ label: m }));
  };
  const places = async () => ((await getJ("/schools/places.json")) || []).map((p) => ({ label: p }));
  window.btpPick = { attach, schools, majors, places, rank, norm };
})();
