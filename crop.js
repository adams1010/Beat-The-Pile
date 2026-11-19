/* /crop.js (Nov 19 2026): the same crop + zoom dialog as the personal profile photo (/u/), for any page.
   btpCrop.pick(file, { shape: "circle" | "square", size: 320, title, hint, fit: true }) → JPEG data URL, or null on Cancel.
   shape "square" (logos) shows a rounded square frame; fit:true lets you zoom OUT until the whole image fits (white around it),
   so a wide logo never gets cut off. Output is shrunk until it's under ~85 KB (server limit ~90 KB). */
(() => {
  const css = `dialog.btpcrop{border:0;border-radius:10px;padding:20px;max-width:calc(100vw - 24px);font-family:inherit;color:#060A2C}
dialog.btpcrop::backdrop{background:rgba(6,10,44,.55)}dialog.btpcrop h2{margin:0 0 2px;font-size:18px}dialog.btpcrop p{margin:0;color:#55627A;font-size:13px}
.btpcrop .cv{position:relative;overflow:hidden;margin:14px auto;border-radius:10px;background:#0B1030;touch-action:none;cursor:grab;user-select:none}
.btpcrop .cv.sq{background:#fff;outline:1px solid #DCE2EC}
.btpcrop .cv:active{cursor:grabbing}.btpcrop .cv:focus-visible{outline:2px solid #4A7000;outline-offset:3px}
.btpcrop .cv img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;pointer-events:none}
.btpcrop .ring{position:absolute;inset:0;border:2px solid #fff;pointer-events:none;box-shadow:0 0 0 999px rgba(6,10,44,.55)}
.btpcrop .ring.c{border-radius:50%}.btpcrop .ring.s{inset:8%;border-radius:14%;border-color:#4A7000}
.btpcrop .zm{display:flex;align-items:center;gap:10px;margin:0 0 14px}.btpcrop .zm input{flex:1;accent-color:#4A7000}
.btpcrop .zb{width:34px;height:34px;border-radius:50%;border:1px solid #DCE2EC;background:#fff;font:600 18px/1 inherit;cursor:pointer;color:#060A2C}
.btpcrop .bt{display:flex;gap:8px;justify-content:flex-end}
.btpcrop .bt button{font:inherit;font-size:14px;font-weight:600;border-radius:999px;padding:9px 18px;cursor:pointer;border:1px solid #4A7000;color:#4A7000;background:#fff}
.btpcrop .bt button.pri{background:#4A7000;color:#fff}`;
  let styled = false;
  function dialog(img, url, o){
    if (!styled) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); styled = true; }
    return new Promise((done) => {
      const W = img.naturalWidth, H = img.naturalHeight, V = Math.min(300, innerWidth - 64), sq = o.shape === "square";
      const frame = sq ? V * 0.84 : V, inset = (V - frame) / 2;          // the square frame sits inside an 8% margin
      const cover = frame / Math.min(W, H), contain = frame / Math.max(W, H);
      const minZ = o.fit ? contain / cover : 1;
      const base = cover; let z = 1, s = base, ox = (V - W * s) / 2, oy = (V - H * s) / 2;
      const d = document.createElement("dialog"); d.className = "btpcrop"; d.setAttribute("aria-label", o.title || "Crop");
      d.innerHTML = `<h2></h2><p></p><div class="cv${sq ? " sq" : ""}" style="width:${V}px;height:${V}px" tabindex="0" aria-label="Image. Drag or use arrow keys to move it."><img alt="" draggable="false"><div class="ring ${sq ? "s" : "c"}"></div></div>
        <div class="zm"><button type="button" class="zb" data-z="-1" aria-label="Zoom out">−</button><input type="range" min="${minZ}" max="4" step="0.01" value="1" aria-label="Zoom"><button type="button" class="zb" data-z="1" aria-label="Zoom in">+</button></div>
        <div class="bt"><button type="button" data-x>Cancel</button><button type="button" class="pri" data-ok>${o.ok || "Use this"}</button></div>`;
      d.querySelector("h2").textContent = o.title || "Crop your image"; d.querySelector("p").textContent = o.hint || "Drag to move. Zoom to fit.";
      document.body.appendChild(d);
      const cv = d.querySelector(".cv"), pic = d.querySelector("img"), range = d.querySelector("input");
      pic.src = url;
      const clamp = () => {   // keep the frame covered (or, zoomed out past cover, keep the image inside the frame)
        const iw = W * s, ih = H * s;
        ox = iw >= frame ? Math.min(inset, Math.max(inset + frame - iw, ox)) : Math.max(inset, Math.min(inset + frame - iw, ox));
        oy = ih >= frame ? Math.min(inset, Math.max(inset + frame - ih, oy)) : Math.max(inset, Math.min(inset + frame - ih, oy)); };
      const paint = () => { clamp(); pic.style.transform = `translate(${ox}px,${oy}px) scale(${s})`; range.value = String(z); };
      const zoomTo = (nz, cx = V / 2, cy = V / 2) => { nz = Math.max(minZ, Math.min(4, nz)); const ns = base * nz;
        ox = cx - (cx - ox) * (ns / s); oy = cy - (cy - oy) * (ns / s); z = nz; s = ns; paint(); };
      paint();
      const pts = new Map(); let pinch = null;
      cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), z }; } });
      cv.addEventListener("pointermove", (e) => { const p0 = pts.get(e.pointerId); if (!p0) return; const p1 = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, p1);
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], r = cv.getBoundingClientRect(); zoomTo(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
        else if (pts.size === 1) { ox += p1.x - p0.x; oy += p1.y - p0.y; paint(); } });
      const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      cv.addEventListener("wheel", (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomTo(z * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      cv.addEventListener("keydown", (e) => { const k = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
        if (k) { e.preventDefault(); ox += k[0]; oy += k[1]; paint(); } else if (e.key === "+" || e.key === "=") zoomTo(z + 0.1); else if (e.key === "-") zoomTo(z - 0.1); });
      range.oninput = () => zoomTo(Number(range.value));
      d.querySelectorAll("[data-z]").forEach((b) => b.onclick = () => zoomTo(z + Number(b.dataset.z) * 0.25));
      const finish = (v) => { d.close(); d.remove(); done(v); };
      d.querySelector("[data-x]").onclick = () => finish(null);
      d.addEventListener("cancel", (e) => { e.preventDefault(); finish(null); });
      // the frame in the image's own pixels (may extend past the image when zoomed out; that area stays white)
      d.querySelector("[data-ok]").onclick = () => finish({ sx: (inset - ox) / s, sy: (inset - oy) / s, side: frame / s });
      d.showModal(); cv.focus();
    });
  }
  function pick(file, o = {}){
    return new Promise((ok, bad) => {
      if (!file || !/^image\//.test(file.type || "image/")) return bad(new Error("That isn't an image, pick a JPG or PNG."));
      if (file.size > 15e6) return bad(new Error("That image is over 15 MB, pick a smaller one."));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = async () => {
        const c0 = await dialog(img, url, o);
        if (!c0) { URL.revokeObjectURL(url); return ok(null); }
        try {
          const N = o.size || 320, c = document.createElement("canvas"); c.width = c.height = N;
          const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, N, N); x.imageSmoothingQuality = "high";
          const k = N / c0.side; x.drawImage(img, -c0.sx * k, -c0.sy * k, img.naturalWidth * k, img.naturalHeight * k);
          let q = 0.88, out = c.toDataURL("image/jpeg", q); while (out.length > 85000 && q > 0.4) { q -= 0.08; out = c.toDataURL("image/jpeg", q); }
          URL.revokeObjectURL(url); out.length > 85000 ? bad(new Error("Couldn't make that image small enough, try another.")) : ok(out);
        } catch { URL.revokeObjectURL(url); bad(new Error("Couldn't read that image, try a JPG or PNG.")); } };
      img.onerror = () => { URL.revokeObjectURL(url); bad(new Error("Couldn't read that image, try a JPG or PNG (iPhone HEIC photos may need converting).")); };
      img.src = url;
    });
  }
  window.btpCrop = { pick };
})();
