// Recruiters (Nov 9): a person account with their own page + orbit, linked to their company's page (same verified domain).
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env(); process.env.RESEND_API_KEY = "re_test";
const { jwk, tok } = makeKeys();
const f = installFake({ jwk, clerkUsers: {
  u_co: { email: "hr@acme.com", role: "employer" }, u_rec: { email: "jane@acme.com", role: "employer" },
  u_adm: { email: "mdxp21@gmail.com", role: "student" }, u_ana: { email: "ana@vt.edu", role: "student" } } });
const me = (await import("../api/me.js")).default;
const call = (sub, body) => invoke(me, { method: "POST", body, headers: { authorization: "Bearer " + tok(sub) } });
const get = (query) => invoke(me, { method: "GET", query });
async function verify(sub, email, profile) {
  assert.equal((await call(sub, { action: "biz_save", profile })).code, 200);
  await call(sub, { action: "biz_email_start", email });
  const code = f.calls.emails.at(-1).subject.match(/^(\d{6})/)[1];
  assert.equal((await call(sub, { action: "biz_email_confirm", code })).code, 200);
  const list = (await call("u_adm", { action: "biz_admin_list" })).body.employers;
  const row = list.find((x) => x.company === profile.company && (x.name || "") === (profile.name || x.name || ""));
  for (const e of list.filter((x) => x.status !== "verified")) await call("u_adm", { action: "biz_admin_review", key: e.key, status: "verified" });
  return row;
}
await verify("u_co", "hr@acme.com", { kind: "company", company: "Acme Aerospace", website: "acme.com", about: "We build satellites." });
await verify("u_rec", "jane@acme.com", { kind: "recruiter", company: "Acme Aerospace", name: "Jane Smith", title: "University Recruiter", bio: "I hire ME interns." });
let r = await call("u_rec", { action: "biz_get" });
assert.equal(r.body.profile.kind, "recruiter"); const recSlug = r.body.slug;
const coSlug = (await call("u_co", { action: "biz_get" })).body.slug;
assert.notEqual(recSlug, coSlug);
// recruiter's own page: the person, linked to the company page
r = await get({ co: recSlug });
assert.equal(r.code, 200); assert.equal(r.body.kind, "recruiter");
assert.deepEqual([r.body.person.name, r.body.person.title, r.body.person.bio], ["Jane Smith", "University Recruiter", "I hire ME interns."]);
assert.equal(r.body.companySlug, coSlug); assert.equal(r.body.company.about, "We build satellites.", "company facts come from the company's page");
// company page lists the recruiter with a link to her page
r = await get({ co: coSlug });
assert.equal(r.body.kind, "company");
const jane = r.body.team.find((m) => m.name === "Jane Smith"); assert.ok(jane); assert.equal(jane.slug, recSlug);
assert.ok(!JSON.stringify(r.body).includes("u_rec"), "no Clerk ids");
// a student joins the recruiter's own orbit; her business orbit centers on her
r = await get({ co: recSlug });
assert.equal((await call("u_ana", { action: "orbit_connect", to: r.body.ownerKey })).body.link, "requested");
r = await call("u_rec", { action: "biz_orbit" });
assert.equal(r.body.me.kind, "recruiter"); assert.equal(r.body.me.name, "Jane Smith");
assert.equal(r.body.requests.length, 1, "Ana's request is in Jane's own orbit, not the company account's");
assert.equal((await call("u_co", { action: "biz_orbit" })).body.requests.length, 0);
console.log("✓ recruiters: own page + orbit, linked to the company page; company page lists them");
