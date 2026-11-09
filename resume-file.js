// /resume-file.js — read a resume FILE (PDF, Word .docx, .txt) into text, in the browser. Nothing is uploaded here:
// the text is what our AI tools and auto-fill use; the page decides what to save. Shared by /u/, /jobs/ and the homepage.
//   const r = await btpResumeFile.read(file)  → { text, name, size, pages, kind: "PDF"|"Word"|"Text" }
//   btpResumeFile.accept                      → the <input type=file accept> list
//   btpResumeFile.label(file)                 → "resume.pdf · 2 pages"
(function () {
  if (window.btpResumeFile) return;
  const MAX = 5 * 1024 * 1024;
  const accept = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

  let pdfjs = null;
  async function loadPdf() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (!pdfjs) pdfjs = new Promise((ok, bad) => {
      const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; ok(window.pdfjsLib); };
      s.onerror = () => { pdfjs = null; bad(new Error("Couldn't load the PDF reader. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
    return pdfjs;
  }
  async function pdfText(buf) {
    const pdf = await (await loadPdf()).getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const items = (await (await pdf.getPage(i)).getTextContent()).items;
      out += items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join("") + "\n";
    }
    return { text: out, pages: pdf.numPages };
  }
  // .docx is a zip: find word/document.xml in the central directory and inflate it (DecompressionStream, no library).
  async function docxText(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("That Word file looks damaged. Save it as a PDF and try again.");
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    for (let k = 0; k < n && p + 46 <= u8.length; k++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
      if (name === "word/document.xml") {
        const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
        const data = u8.subarray(start, start + csize);
        let xml;
        if (method === 0) xml = new TextDecoder().decode(data);
        else if (method === 8 && "DecompressionStream" in window) xml = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
        else throw new Error("This browser can't open Word files. Save it as a PDF and try again.");
        const text = xml.replace(/<\/w:p>/g, "\n").replace(/<w:(tab|br)\/>/g, (m, t) => (t === "tab" ? " " : "\n")).replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        return { text, pages: null };
      }
      p += 46 + nlen + elen + clen;
    }
    throw new Error("Couldn't find the text in that Word file. Save it as a PDF and try again.");
  }
  const tidy = (t) => String(t || "").replace(/\r/g, "").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  async function read(file) {
    if (!file) throw new Error("Pick a file first.");
    const n = (file.name || "").toLowerCase();
    if (file.size > MAX) throw new Error("That file is over 5 MB. Try a smaller PDF.");
    let r;
    if (n.endsWith(".pdf") || file.type === "application/pdf") r = { ...(await pdfText(await file.arrayBuffer())), kind: "PDF" };
    else if (n.endsWith(".docx")) r = { ...(await docxText(await file.arrayBuffer())), kind: "Word" };
    else if (n.endsWith(".txt") || file.type === "text/plain") r = { text: await file.text(), pages: null, kind: "Text" };
    else if (n.endsWith(".doc")) throw new Error("Old .doc files can't be read. Save it as a PDF or .docx and try again.");
    else throw new Error("Use a PDF, Word (.docx) or .txt file.");
    const text = tidy(r.text);
    if (text.length < 60) throw new Error(r.kind === "PDF" ? "We couldn't read text from that PDF (it may be a scanned image). Export it from Word or Google Docs as a PDF and try again." : "That file doesn't have much text in it.");
    return { text: text.slice(0, 30000), name: (file.name || "resume").slice(0, 120), size: file.size, pages: r.pages, kind: r.kind };
  }
  const label = (f) => f ? [f.name, f.pages ? `${f.pages} page${f.pages === 1 ? "" : "s"}` : f.kind].filter(Boolean).join(" · ") : "";
  window.btpResumeFile = { read, accept, label };
})();
