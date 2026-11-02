import assert from "node:assert/strict";
process.env.CRON_SECRET = "c"; process.env.INTERNIQ_DB_URL = "https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY = "s"; process.env.INTERNIQ_DB_ANON_KEY = "a";
const inserted = []; let prefer = null;
const listings = [
  { company_name: "Acme Robotics", title: "Mechanical Engineering Intern", locations: ["Pittsburgh, PA"], url: "https://acmerobotics.wd1.myworkdayjobs.com/en-us/Careers/job/Pittsburgh/ME-Intern_R1" },
  { company_name: "Acme Robotics", title: "Manufacturing Engineering Intern", locations: ["Pittsburgh, PA"], url: "https://acmerobotics.wd1.myworkdayjobs.com/en-us/Careers/job/x" },
  { company_name: "Boeing", title: "Mechanical Engineering Intern", locations: ["Seattle, WA"], url: "https://boeing.wd1.myworkdayjobs.com/EXTERNAL_CAREERS/job/x" },
  { company_name: "Data Co", title: "Software Engineer Intern", locations: ["NYC, NY"], url: "https://job-boards.greenhouse.io/dataco/jobs/1" },
  { company_name: "Maple Motors", title: "Mechanical Engineering Intern", locations: ["Toronto, ON, Canada"], url: "https://jobs.lever.co/maple/1" },
];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("SimplifyJobs")) return { ok: true, status: 200, json: async () => listings, text: async () => JSON.stringify(listings) };
  if (u.includes("/rest/v1/company_candidates") && (o.method || "GET") === "GET") return { ok: true, status: 200, text: async () => "[]" };
  if (u.includes("/rest/v1/company_candidates") && o.method === "POST") { prefer = o.headers.Prefer; inserted.push(...JSON.parse(o.body)); return { ok: true, status: 201, text: async () => "" }; }
  return { ok: true, status: 200, text: async () => "[]", json: async () => [] };
};
const h = (await import("../api/discover.js")).default;
const res = { setHeader() {} }; res.status = (c) => (res.code = c, res); res.json = (b) => (res.body = b, res);
await h({ method: "GET", query: { import: "1" }, headers: { authorization: "Bearer c" } }, res);
console.log(res.code, res.body);
assert.equal(res.code, 200); assert.deepEqual(res.body.companies, ["Acme Robotics"], "only the new ME company (Boeing known, software skipped, Canada skipped)");
assert.match(prefer, /ignore-duplicates/, "never overwrites existing rows");
assert.equal(inserted[0].id, "s-acme-robotics"); assert.equal(inserted[0].status, "pending"); assert.equal(inserted[0].source, "SimplifyJobs list");
const { scanHtml } = await import("../lib/discover.js");
assert.equal(scanHtml(inserted[0].hint).boards[0].config.site, "Careers", "lowercase locale handled");
console.log("IMPORT TESTS PASSED");
