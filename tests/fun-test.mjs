// Swipe jobs + Pay Guess (Nov 26): real jobs only, the daily pool is balanced and sane, pages wired into the site.
import assert from "node:assert/strict";
import fs from "node:fs";
const { gamePool } = await import("../scripts/pay-finder.mjs");

const row = (i, kind, pay, co = "c" + i) => ({ id: `${co}:${i}`, company_id: co, company: co.toUpperCase(), title: "Job " + i, kind, state: "VA,MD", field: "software", url: "https://x/" + i, pay });
const rows = [];
for (let i = 0; i < 400; i++) rows.push(row(i, "intern", { lo: 20, hi: 30, u: "h" }));
for (let i = 400; i < 700; i++) rows.push(row(i, "fulltime", { lo: 60000, hi: 70000, u: "y" }));
for (let i = 700; i < 900; i++) rows.push(row(i, "hourly", { lo: 16, hi: 18, u: "h" }));
rows.push(row(901, "intern", { lo: 300000, hi: 300000, u: "y" }), row(902, "hourly", { lo: 8, hi: 9, u: "h" }), row(903, "shadow", { lo: 15, hi: 15, u: "h" }));
rows.push({ ...row(5, "intern", { lo: 20, hi: 30, u: "h" }), id: "c5:dup" });   // same company + title → once
const pool = gamePool(rows);
const n = (k) => pool.filter((p) => p.kind === k).length;
assert.deepEqual([n("intern"), n("fulltime"), n("hourly"), n("shadow")], [250, 200, 150, 0], "balanced by job type");
assert.ok(pool.every((p) => p.hr >= 12 && p.hr <= 100), "no $144/hr 'interns', no below-minimum pay");
assert.equal(new Set(pool.map((p) => p.company_id + p.title)).size, pool.length, "one per company + title");
assert.deepEqual(pool.find((p) => p.kind === "fulltime").pay[2], "y");
assert.equal(pool[0].state, "VA", "first state only");
assert.deepEqual(gamePool(rows).map((p) => p.id), pool.map((p) => p.id), "same input, same pool (everyone plays the same five)");

const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const play = read("play/index.html"), jobs = read("jobs/index.html");
assert.ok(play.includes("/pay/game.json") && play.includes("btp_play") && play.includes("dayNo - 20782"), "Pay Guess: daily pool, streak storage, #1 = Nov 26 2026");
assert.ok(!play.includes("—") && play.includes('<script src="/nav.js"></script>'));
// Swipe mode lives in the Jobs search (owner, Nov 26): right = Wishlist (the saved list), left = dump, up = apply now
assert.ok(jobs.includes('id="modeSeg"') && jobs.includes('data-mode="swipe"') && jobs.includes('if (!state.swipe) p.set("mode", "list")') && jobs.includes('state.swipe = p.get("mode") !== "list"') && jobs.includes('data-mode="swipe" aria-pressed="true">Swipe'), "Swipe is the default; List is the switch (?mode=list)");
assert.ok(/if \(dir === "right" && !state\.mine\.saved\.has\(j\.id\)\) toggle\("saved", j\.id\)/.test(jobs), "right swipe adds to the Wishlist via the same toggle as ♡ Save");
assert.ok(/if \(dir === "up"\) \{ window\.open\(j\.url[^}]*pendingApply = /.test(jobs), "up opens the application and asks 'Did you apply?' on return");
assert.ok(jobs.includes('toggle("applied", p.id)'), "the Did-you-apply answer works without a list card");
assert.ok(jobs.includes("♡ Wishlist <span id=\"savedN\">"), "the saved chip is the Wishlist");
assert.ok(!/>(WISHLIST|DUMP|APPLY NOW)</.test(jobs), "no ALL-CAPS labels");
assert.ok(read("swipe/index.html").includes('location.replace("/jobs/?mode=swipe"'), "old /swipe/ links forward to Swipe mode");
const nav = read("nav.js"); assert.ok(nav.includes('["/jobs/?mode=swipe"') && nav.includes('["/play/"') && nav.includes('"/jobs/?mode=swipe": "swipe"') && nav.includes('"/play/": "game"'), "Tools menu + own icons");
assert.ok(read(".github/workflows/data-bots.yml").includes("pay/game.json"));
console.log("✓ fun: Pay Guess pool (balanced, sane, stable); Swipe mode in Jobs (Wishlist / dump / apply now); both in Tools + footer");
