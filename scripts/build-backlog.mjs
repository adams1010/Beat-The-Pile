// scripts/build-backlog.mjs — the Company Finder's to-do list (data/backlog.json).
// Every company that has posted engineering internships on the public SimplifyJobs lists over the last few
// seasons (internship + new-grad lists), picked with the SAME rules as the nightly import (US, engineering titles,
// a readable job-board link). The robot pulls the next batch from here whenever its queue runs low, and each
// company still has to pass the normal proof check before anything goes live.
//   node scripts/build-backlog.mjs listings1.json listings2.json …
import fs from "node:fs";
import { pickCompanies, normName } from "../lib/simplify.js";
import { COMPANIES, boardKey } from "../lib/companies.js";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: build-backlog.mjs listings.json…"); process.exit(1); }

// Merge all postings, newest copy of each wins (so the job-board link is the most recent one)
const byId = new Map();
for (const f of files) for (const x of JSON.parse(fs.readFileSync(f, "utf8"))) {
  const id = x.id || x.url; if (!id) continue;
  const prev = byId.get(id);
  if (!prev || (x.date_updated || 0) >= (prev.date_updated || 0)) byId.set(id, x);
}
// Most recent postings first, so each company's hint is its newest board link
const all = [...byId.values()].sort((a, b) => (b.date_posted || 0) - (a.date_posted || 0));
const picked = pickCompanies(all, new Set(COMPANIES.map((c) => normName(c.company))), new Set(COMPANIES.map(boardKey)), { minGen: 1, ownSites: true, anyMajor: true });
const out = picked.map((p) => ({ company: p.company, key: p.key, hint: p.hint || undefined, domain: p.domain || undefined, priority: p.priority }));
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/backlog.json", JSON.stringify({ built: new Date().toISOString(), count: out.length, companies: out }));
console.log(`backlog: ${out.length} companies from ${byId.size} postings in ${files.length} files`);
