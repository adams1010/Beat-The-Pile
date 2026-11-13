// Nov 13: the Near box forgives typos — always the next best real place, never an invented one.
import assert from "node:assert/strict";
const { resolvePlace } = await import("../lib/geocode.js");
const to = (q) => resolvePlace(q)?.q;
const cases = { "washingdon dc": "Washington, DC", "Washington, DC": "Washington, DC", "dc": "Washington, DC", "washington d.c.": "Washington, DC",
  "pittsburg pa": "Pittsburgh, PA", "pitsburgh": "Pittsburgh, PA", "blacksburg virgina": "Blacksburg, VA", "Blacksburg, Virginia": "Blacksburg, VA",
  "blaksburg": "Blacksburg, VA", "newyork": "New York, NY", "charlote": "Charlotte, NC", "chicgo": "Chicago, IL", "phildelphia": "Philadelphia, PA",
  "los angelos": "Los Angeles, CA", "san fransisco ca": "San Francisco, CA", "richmnod va": "Richmond, VA", "Arlignton VA": "Arlington, VA",
  "houstin tx": "Houston, TX", "atlanta": "Atlanta, GA", "dalas": "Dallas, TX", "24060": "24060" };
for (const [q, want] of Object.entries(cases)) assert.equal(to(q), want, q);
assert.equal(resolvePlace("washingdon dc").fixed, true); assert.equal(resolvePlace("Blacksburg, VA").fixed, false);
assert.ok(resolvePlace("springfield").choices.length > 3, "no big city among them → ask which state");
assert.equal(resolvePlace("xqzzy"), null, "nonsense stays not-found");
assert.equal(resolvePlace("99999"), null);
console.log("✓ forgiving places: typos, missing commas, misspelled states, bare big cities → the real place; nonsense → not found");
