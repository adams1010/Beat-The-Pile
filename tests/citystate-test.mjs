// Nov 23 (owner): /u/ Location + Hometown = a City box and a State box side by side, saved as "City, ST"
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../u/index.html", import.meta.url), "utf8");
const grab = (name) => html.match(new RegExp(`  const ${name} = [\\s\\S]*?;\\n(?=  const |  //)`))[0];
const { splitCS, joinCS, US_STATES } = new Function(`${grab("US_STATES")}${grab("ST_NAME")}${grab("splitCS")}${grab("joinCS")} return { splitCS, joinCS, US_STATES };`)();
assert.equal(US_STATES.length, 52);
assert.deepEqual(splitCS("Huntingdon Valley, PA"), ["Huntingdon Valley", "PA"]);
assert.deepEqual(splitCS("Blacksburg, Virginia"), ["Blacksburg", "VA"]);
assert.deepEqual(splitCS("Remote"), ["Remote", ""]);
assert.deepEqual(splitCS("London, UK"), ["London, UK", ""]);
assert.deepEqual(splitCS(""), ["", ""]);
assert.equal(joinCS("Blacksburg", "VA"), "Blacksburg, VA");
assert.equal(joinCS("Blacksburg,", ""), "Blacksburg");
assert.equal(joinCS("", "TX"), "TX");
assert.ok(/cityState\("location"/.test(html) && /cityState\("hometown"/.test(html));
assert.ok(/k\.phone \|\| p\.contact\?\.phone/.test(html), "profile Contact counts toward strength");
console.log("citystate-test ok");
