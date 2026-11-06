import assert from "node:assert/strict";
const { guessJsonBoards, discoverOne } = await import("../lib/discover.js");
const J = (s, b) => ({ ok: s < 400, status: s, url: "", text: async () => JSON.stringify(b), json: async () => b });
const web = {
  "https://boards-api.greenhouse.io/v1/boards/geckorobotics": J(200, { name: "Gecko Robotics" }),
  "https://boards-api.greenhouse.io/v1/boards/geckorobotics/jobs": J(200, { jobs: [{ title: "Mechanical Engineering Intern" }, { title: "Engineer" }] }),
  "https://boards-api.greenhouse.io/v1/boards/scout": J(200, { name: "Scout RFP" }),                 // someone else's "scout" board
  "https://api.lever.co/v0/postings/xenergy?mode=json&limit=100": J(200, [{ text: "Mechanical Intern", descriptionPlain: "At X-energy we build reactors" }]),
  "https://api.lever.co/v0/postings/trex?mode=json&limit=100": J(200, [{ text: "Intern", descriptionPlain: "Join T-Rex Games!" }]),
};
globalThis.fetch = async (u) => web[String(u)] || { ok: false, status: 404, url: String(u), text: async () => "", json: async () => ({}) };

let r = await guessJsonBoards({ company: "Gecko Robotics", key: "gecko" });
assert.equal(r.status, "live"); assert.equal(r.config.token, "geckorobotics"); assert.equal(r.intern_count, 1);
console.log("gecko ✓", r.detail);
assert.equal(await guessJsonBoards({ company: "Scout Motors", key: "scout" }), null);
console.log("scout ✓ held: 'scout' board belongs to 'Scout RFP'");
r = await guessJsonBoards({ company: "X-energy", key: "xenergy" });
assert.equal(r.status, "live"); assert.equal(r.ats, "lever");
console.log("x-energy ✓", r.detail);
assert.equal(await guessJsonBoards({ company: "Trex", key: "trex" }), null);
console.log("trex ✓ held: Lever 'trex' postings don't name Trex");
assert.equal(await guessJsonBoards({ company: "ABB", key: "abb" }), null);
console.log("abb ✓ too-short name never guessed");
r = await discoverOne({ company: "Gecko Robotics", domain: "gecko-nosite.com", key: "gecko" });
assert.equal(r.status, "live");
console.log("discoverOne falls back to guess ✓\nALL GUESS TESTS PASSED");
