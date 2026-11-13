// Every page's inline <script> must parse. Nov 13: a duplicate `const` in /jobs killed the whole page script
// (the list sat on loading skeletons forever) and no test noticed.
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = new URL("..", import.meta.url).pathname, bad = [];
let n = 0;
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
  if (["node_modules", ".git", "tests"].includes(f.name)) continue;
  const p = path.join(d, f.name);
  if (f.isDirectory()) walk(p);
  else if (f.name.endsWith(".html")) {
    const s = fs.readFileSync(p, "utf8"); const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g; let m;
    while ((m = re.exec(s))) {
      const attrs = m[1]; if (/type=["'](application\/(ld\+)?json|text\/x-[^"']*|importmap)["']/i.test(attrs)) continue;
      n++;
      try { if (/type=["']module["']/i.test(attrs)) new vm.SourceTextModule(m[2]); else new vm.Script(m[2], { filename: p }); }
      catch (e) { if (!/SourceTextModule is not a constructor/.test(e.message)) bad.push(`${path.relative(root, p)}: ${e.message}`); }
    }
  } else if (f.name.endsWith(".js") && d === root.replace(/\/$/, "")) {
    try { new vm.Script(fs.readFileSync(p, "utf8"), { filename: p }); n++; } catch (e) { bad.push(`${f.name}: ${e.message}`); }
  }
} };
walk(root.replace(/\/$/, ""));
assert.deepEqual(bad, [], "inline scripts that don't parse:\n" + bad.join("\n"));
console.log(`✓ ${n} inline/page scripts parse`);
