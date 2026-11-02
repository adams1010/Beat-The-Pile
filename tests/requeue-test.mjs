import assert from "node:assert/strict";
process.env.INTERNIQ_DB_URL="https://f.co"; process.env.INTERNIQ_DB_SERVICE_KEY="s"; process.env.INTERNIQ_DB_ANON_KEY="a"; process.env.CRON_SECRET="s";
const T = new Map([
  ["x-corning", { id:"x-corning", status:"no_board", hint:"https://corning.wd1.myworkdayjobs.com/External", config:{ triedHint:null }, attempts:1 }],
  ["x-garmin",  { id:"x-garmin",  status:"identity_failed", hint:"https://g.wd1.myworkdayjobs.com/G", config:{ triedHint:"https://g.wd1.myworkdayjobs.com/G" }, attempts:1 }],
  ["x-abbott",  { id:"x-abbott",  status:"live", hint:"https://abbott.wd5.myworkdayjobs.com/abbottcareers", config:{ host:"abbott.wd5.myworkdayjobs.com", tenant:"abbott", site:"abbottcareers" }, ats:"workday", enabled:true }],
]);
const mk=(s,b)=>({ok:s<400,status:s,url:"",text:async()=>b===undefined?"":JSON.stringify(b),json:async()=>b});
globalThis.fetch = async (url,o={}) => { const u=new URL(String(url)); const m=o.method||"GET"; const q=u.searchParams;
  if (!u.pathname.includes("company_candidates")) return mk(404);
  if (m==="POST") return mk(201);
  if (m==="PATCH") { const ids=(q.get("id")||"").replace(/^in\.\(|\)$/g,"").replace(/^eq\./,"").split(",").map(decodeURIComponent); ids.forEach(id=>T.has(id)&&Object.assign(T.get(id), JSON.parse(o.body))); return mk(204); }
  if (q.get("hint")==="not.is.null") return mk(200,[...T.values()].filter(r=>r.hint && r.status!=="live" && r.status!=="pending"));
  if (q.get("enabled")==="eq.true") return mk(200,[...T.values()].filter(r=>r.enabled));
  return mk(200, []);
};
const cand = await import("../lib/candidates.js"); cand.CANDIDATES.length = 0;
const h = (await import("../api/discover.js")).default;
const res={}; res.status=(s)=>(res.code=s,res); res.json=(b)=>(res.body=b,res);
await h({headers:{authorization:"Bearer s"}}, res);
assert.equal(T.get("x-corning").status, "pending");
assert.equal(T.get("x-garmin").status, "identity_failed");
assert.equal(T.get("x-abbott").status, "live");
console.log("requeue ✓ new hint re-tested; already-tried hint and live companies untouched");
