// Jobvite reader (Nov 20): parses the real row markup, skips Jobvite's "no such company" FAQ page, reads the board name,
// follows pagination, and the finder spots jobs.jobvite.com links.
import assert from "node:assert/strict";
import { parseJobvite, isJobviteBoard, jobviteName, jobviteNext, jobviteList } from "../lib/fetchers/jobvite.js";
import { scanHtml } from "../lib/discover.js";

const page = `<html><head><title>Hoar Careers</title></head><body class="jv-page-body"><table class="jv-job-list"><tbody>
<tr><td class="jv-job-list-name">
    <a href="/hoar/job/or9SAfwM">Assistant Construction Project Manager</a>
</td><td class="jv-job-list-location">

    Memphis,
    Tennessee

</td></tr>
<tr><td class="jv-job-list-name"><a href="/hoar/job/oInt2026">Summer 2027 Field Engineering Intern</a></td>
<td class="jv-job-list-location">McLean,
 Virginia</td></tr>
<tr><td class="jv-job-list-name"><a href="/hoar/job/oInt2026">Summer 2027 Field Engineering Intern</a></td>
<td class="jv-job-list-location">McLean, Virginia</td></tr>
<tr><td class="jv-job-list-name"><a href="/otherco/job/xx1">Not ours</a></td><td class="jv-job-list-location">X</td></tr>
</tbody></table><a class="jv-pagination-next" href="/hoar/jobs?p=1">Next</a></body></html>`;

const jobs = parseJobvite(page, "hoar");
assert.equal(jobs.length, 2, "dedupes repeats and skips other boards' links");
assert.deepEqual(jobs[0], { sourceId: "or9SAfwM", title: "Assistant Construction Project Manager", location: "Memphis, Tennessee", url: "https://jobs.jobvite.com/hoar/job/or9SAfwM", postedOn: null });
assert.equal(jobs[1].location, "McLean, Virginia");
assert.ok(isJobviteBoard(page));
assert.ok(!isJobviteBoard("<html><title>Job Seeker FAQs and Support | Jobvite</title><body class='jv-page-body'></body>"));
assert.equal(jobviteName(page), "Hoar");
assert.equal(jobviteName("<title>Weston Solutions Careers</title>"), "Weston Solutions");
assert.equal(jobviteName("<title>Job Seeker FAQs and Support | Jobvite</title>"), "");
assert.equal(jobviteNext(page), 1);
assert.equal(jobviteNext("<p>no pages</p>"), null);
assert.equal(jobviteList("laborie"), "https://jobs.jobvite.com/laborie/jobs");
assert.equal(jobviteList("laborie", 2), "https://jobs.jobvite.com/laborie/jobs?p=2");

const found = scanHtml(`<a href="https://jobs.jobvite.com/laborie/">Careers</a> <a href="https://jobs.jobvite.com/job-seekers/">help</a>`, "https://www.laborie.com/careers/");
const jv = (found?.boards || []).filter((b) => b.ats === "jobvite").map((b) => b.config.token);
assert.deepEqual(jv, ["laborie"], "finder spots the board and skips Jobvite's own pages");
console.log("✓ Jobvite reader: rows, locations, not-found page, board name, paging, detection");
