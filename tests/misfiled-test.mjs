// Nov 20: companies parked as "Uses iCIMS/Eightfold, needs a new scraper" that weren't (real link shapes from their pages)
import assert from "node:assert/strict";
import { scanHtml } from "../lib/discover.js";

// Hospitals whose only iCIMS link is the staff login → not "needs a new scraper"
const hmh = `<a href="https://internal-hackensackmeridianhealth.icims.com/jobs/login?loginOnly=1&amp;hashed=-435623455">Employees</a>`;
let s = scanHtml(hmh, "https://www.hackensackmeridianhealth.org/en/careers");
assert.equal(s.boards.length, 0); assert.equal(s.unsupported.length, 0, "staff login is not a job system");
s = scanHtml(`<a href="https://employees-memorialcare.icims.com/">Current employees</a>`, "https://careers.memorialcare.org/");
assert.equal(s.unsupported.length, 0);

// Celanese writes its board links as / JSON → read them
s = scanHtml(`{"url":"https:\\u002F\\u002Fcareer-celanese.icims.com\\u002Fjobs\\u002Fsearch?ss=1"}`, "https://www.celanese.com/careers");
assert.ok(s.boards.some((b) => b.ats === "icims" && b.config.base === "https://career-celanese.icims.com"), JSON.stringify(s.boards));

// Eightfold on the company's own address → a board on that host
s = scanHtml(`<script>window.cfg={"cdn":"app.eightfold.ai"}</script><a href="https://infineon.eightfold.ai/careerhub">Employees</a>`, "https://jobs.infineon.com/careers");
assert.ok(s.boards.some((b) => b.ats === "eightfold" && b.config.host === "jobs.infineon.com"), JSON.stringify(s.boards));
assert.equal(s.unsupported.length, 0);
// …but a marketing page that only mentions Eightfold's privacy policy is not a board
s = scanHtml(`<a href="https://eightfold.ai/privacy-policy/">Privacy</a>`, "https://www.example.com/about");
assert.equal(s.boards.length, 0); assert.equal(s.unsupported.length, 0);

// Real unsupported systems still get flagged
s = scanHtml(`<a href="https://acme.dayforcehcm.com/CandidatePortal">Jobs</a>`, "https://acme.com/careers");
assert.ok(s.unsupported.includes("Dayforce"));
// A real public iCIMS board still works
s = scanHtml(`<a href="https://careers-acme.icims.com/jobs/search">Jobs</a>`, "https://acme.com/careers");
assert.ok(s.boards.some((b) => b.ats === "icims"));
console.log("misfiled-test ok");
