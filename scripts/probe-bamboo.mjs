const UA = { "User-Agent": "Mozilla/5.0 (compatible; BeatThePileBot/1.0; +https://www.beatthepile.com/)" };
for (const s of ["acluga", "aceelectric"]) {
  const l = await (await fetch(`https://${s}.bamboohr.com/careers/list`, { headers: { ...UA, Accept: "application/json" } })).json();
  const j = l.result[0];
  const pg = await fetch(`https://${s}.bamboohr.com/careers/${j.id}`, { headers: UA, redirect: "manual" });
  const bad = await fetch(`https://${s}.bamboohr.com/careers/99999999`, { headers: UA, redirect: "manual" });
  const det = await fetch(`https://${s}.bamboohr.com/careers/${j.id}/detail`, { headers: { ...UA, Accept: "application/json" } });
  const badDet = await fetch(`https://${s}.bamboohr.com/careers/99999999/detail`, { headers: { ...UA, Accept: "application/json" } });
  const dj = await det.json().catch(() => null);
  console.log("JOB", s, "page", pg.status, "| bad page", bad.status, bad.headers.get("location"), "| detail", det.status, "| bad detail", badDet.status, "| detail keys", Object.keys(dj?.result?.jobOpening || dj?.result || {}).slice(0, 25).join(","));
  console.log("   dates:", JSON.stringify({ d: dj?.result?.jobOpening?.datePosted, c: dj?.result?.jobOpening?.dateCreated }), "| status labels:", [...new Set(l.result.map((x) => x.employmentStatusLabel))].join("; "), "| locTypes", [...new Set(l.result.map((x) => x.locationType + "/" + x.isRemote))].join(","));
}
console.log("PROBE_RESULT ok");
