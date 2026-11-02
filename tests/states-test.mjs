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
];
let bad=0; for (const [s,w] of cases){ const g=extractStates(s); try{assert.deepEqual(g,w)}catch{bad++;console.log("✗",s,"→",g,"want",w)} }
console.log(bad?`${bad} bad`:`states: all ${cases.length} formats ✓`);
