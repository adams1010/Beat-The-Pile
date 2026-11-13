import assert from "node:assert/strict";
const { extractStates } = await import("../lib/filter.js");
const cases = [
 ["Salem, VA, US, 24153",["VA"]],["Ridley Park, PA",["PA"]],["Forest, VA",["VA"]],
 ["Newport News, Virginia, United States",["VA"]],["USA - Pennsylvania - West Point",["PA"]],
 ["US-VA-STERLING-291 ~ 22640 Davis Dr ~ DAVIS",["VA"]],["United States-California-Redondo Beach",["CA"]],
 ["United States-Virginia-Dulles",["VA"]],["Charleston, West Virginia",["WV"]],["Washington, PA",["PA"]],
 ["Washington, DC",["DC"]],["Seattle, Washington, United States",["WA"]],["Greensboro, NC, US, 27409",["NC"]],
 ["USA - Everett, WA | USA - Herndon, VA | USA - Ridley Park, PA",["WA","VA","PA"]],
 ["GBR - Bristol, UK | GBR - Yeovil, UK",[]],["Toronto, Ontario, Canada",[]],["Bengaluru, India",[]],
 ["https://jobs.volvogroup.com/job/Macungie-Intern-Ops-PA-18062/1367923755/",["PA"]],
 ["Murrysville, Pennsylvania, United States",["PA"]],["Spring House, Pennsylvania, United States of America",["PA"]],
 ["Indianapolis, IN",["IN"]],["Portland, OR",["OR"]],["Lynchburg, VA, US",["VA"]],
 ["Milton, Ontario, CA",[]],["Calgary, AB, CA",[]],["Montreal, QC, CA",[]],["Toronto, ON, CA",[]],
 ["CA | ON | Toronto - 380 Wellington Street West",[]],["CA | BC | Vancouver - 200 Granville Street",[]],
 ["US | IL | Chicago - 8755 West Higgins Road",["IL"]],["Philly - Ontario, CA",["CA"]],["Ontario, California",["CA"]],
 ["Los Angeles, CA (On-site)",["CA"]],["Vancouver, WA | Portland, OR",["WA","OR"]],
];
let bad=0; for (const [s,w] of cases){ const g=extractStates(s); try{assert.deepEqual(g,w)}catch{bad++;console.log("✗",s,"→",g,"want",w)} }
if (bad) process.exitCode = 1;
console.log(bad?`${bad} bad`:`states: all ${cases.length} formats ✓`);

// Country codes that look like states: Mumbai, IN ≠ Indiana · Düsseldorf, DE ≠ Delaware — but US towns with the same city names stay
{
  const { extractStates: x } = await import("../lib/filter.js");
  const eq = (t, want) => { const got = JSON.stringify(x(t)); if (got !== JSON.stringify(want)) { console.error("FAIL", t, got); process.exit(1); } };
  eq("One Lodha Place, Mumbai, IN", []); eq("Düsseldorf, DE", []); eq("Berlin, DE", []); eq("London, UK", []); eq("Toronto, ON", []); eq("Dublin, Ireland", []);
  eq("https://condenast.wd115.myworkdayjobs.com/en-US/CondeCareers/job/One-Lodha-Place-Mumbai-IN/Art-Intern_R-13425", []);
  eq("Indianapolis, IN", ["IN"]); eq("Berlin, NH", ["NH"]); eq("Warsaw, IN", ["IN"]); eq("Geneva, IL", ["IL"]); eq("London, KY", ["KY"]);
  eq("Paris, TX", ["TX"]); eq("Cairo, IL", ["IL"]); eq("Dublin, OH", ["OH"]); eq("Melbourne, FL", ["FL"]); eq("Londonderry, NH", ["NH"]);
  console.log("✓ foreign cities whose country code looks like a state are dropped; same-named US towns kept");
}

// Nov 13: Masco-style "CA - Quebec - …" is Canada, not California
{
  const { extractStates: xs } = await import("../lib/filter.js");
  assert.deepEqual(xs("CA - Quebec - Mont-Royal"), []); assert.deepEqual(xs("CA - ON - Toronto"), []);
  assert.deepEqual(xs("US - California - Camarillo"), ["CA"]); assert.deepEqual(xs("Ontario, CA"), ["CA"]);
  console.log("✓ 'CA - Quebec - …' is Canada");
}
