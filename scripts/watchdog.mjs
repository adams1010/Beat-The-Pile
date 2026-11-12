// scripts/watchdog.mjs — 🛡 Watchdog (GitHub, hourly). Makes sure no bot silently stops again (Nov 11–12: the Company
// Finder logged nothing for ~30 h because database hiccups crashed its runs).
//  1. Asks /api/discovery?health=1 which switched-on bots are stalled (no run for longer than their limit) or failing
//     (3 failed runs in a row).
//  2. Restarts each one by starting the GitHub workflow that runs it (never Follow-up Emails).
//  3. If a bot is STILL unhealthy on the next check, opens one GitHub issue for it ("bot-alert" label), so the owner gets
//     GitHub's normal notification; adds a comment instead if that issue is already open, and closes it once healthy.
//  4. Logs one line to /bots.
// Env: CRON_SECRET, GH_TOKEN (the workflow's GITHUB_TOKEN), GITHUB_REPOSITORY.
const BASE = process.env.BTP_BASE || "https://www.beatthepile.com";
const SECRET = process.env.CRON_SECRET, GH = process.env.GH_TOKEN, REPO = process.env.GITHUB_REPOSITORY;
const auth = { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };
const gh = async (path, init = {}) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...init, headers: { Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok && r.status !== 204) throw new Error(`GitHub ${path} → ${r.status}`);
  return r.status === 204 ? null : r.json();
};
const ago = (m) => (m == null ? "never" : m < 120 ? `${m} min` : `${Math.round(m / 60)} h`);

export async function check({ fetchHealth, restart, openIssues, openIssue, comment, close, log }) {
  const { bots } = await fetchHealth();
  const sick = bots.filter((b) => !b.healthy), notes = [];
  const issues = await openIssues();                       // [{number, title}] with label bot-alert
  for (const b of sick) {
    const why = b.stale ? `no run for ${ago(b.quietMin)} (limit ${ago(b.staleMin)})` : `${b.fails} failed runs in a row`;
    let did = "can't restart automatically";
    if (b.restart) { try { await restart(b.restart); did = `restarted (${b.restart})`; } catch (e) { did = `restart failed: ${e.message}`; } }
    notes.push(`${b.name}: ${why} → ${did}`);
    const title = `Bot alert: ${b.name}`, existing = issues.find((i) => i.title === title);
    const body = `**${b.name}** looks unhealthy: ${why}.\n\nLast run: ${b.lastRun || "none"} · last good run: ${b.lastOk || "none"}\nLast message: ${b.lastSummary || "—"}\n\nWatchdog: ${did}. See https://www.beatthepile.com/bots/`;
    // Alert a person only when the restart didn't fix it by the next hourly check (or it can't be restarted)
    if (existing) await comment(existing.number, `Still unhealthy: ${why}. ${did}.`);
    else if (b.seenSickBefore || !b.restart) await openIssue(title, body);
  }
  for (const i of issues) {
    const name = i.title.replace(/^Bot alert: /, "");
    if (!sick.some((b) => b.name === name)) await close(i.number, `${name} is healthy again — closing.`);
  }
  const summary = sick.length ? `${sick.length} of ${bots.length} bots needed help: ${notes.join(" · ")}` : `All ${bots.length} bots healthy`;
  await log(!sick.some((b) => b.seenSickBefore), summary, { checked: bots.length, unhealthy: sick.length });
  return { summary, sick };
}

if (process.argv[1] && process.argv[1].endsWith("watchdog.mjs")) {
  const sw = await fetch(`${BASE}/api/discovery?bots=1`).then((r) => r.json()).catch(() => ({}));
  if ((sw.bots || []).find((b) => b.id === "watchdog")?.enabled === false) { console.log("Watchdog is switched off on /bots"); process.exit(0); }
  // "Sick before" = an open alert issue exists, or last hour's check already flagged this bot by name
  const prev = await fetch(`${BASE}/api/discovery?health=1`, { headers: auth }).then((r) => r.ok ? r.json() : Promise.reject(new Error(`health ${r.status}`)));
  const res = await check({
    fetchHealth: async () => {
      const issues = await gh(`/issues?state=open&labels=bot-alert&per_page=50`).catch(() => []);
      const prevNotes = String(prev.lastWatchdog?.summary || "");   // what the last hourly check flagged
      for (const b of prev.bots) b.seenSickBefore = issues.some((i) => i.title === `Bot alert: ${b.name}`) || prevNotes.includes(`${b.name}:`);
      return prev;
    },
    restart: (wf) => gh(`/actions/workflows/${wf}/dispatches`, { method: "POST", body: JSON.stringify({ ref: "main" }) }),
    openIssues: async () => (await gh(`/issues?state=open&labels=bot-alert&per_page=50`).catch(() => [])).map((i) => ({ number: i.number, title: i.title })),
    openIssue: (title, body) => gh(`/issues`, { method: "POST", body: JSON.stringify({ title, body, labels: ["bot-alert"] }) }),
    comment: (n, body) => gh(`/issues/${n}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
    close: async (n, body) => { await gh(`/issues/${n}/comments`, { method: "POST", body: JSON.stringify({ body }) }); await gh(`/issues/${n}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) }); },
    log: (ok, summary, stats) => fetch(`${BASE}/api/discovery`, { method: "POST", headers: auth, body: JSON.stringify({ action: "botlog", bot: "watchdog", ok, summary, stats }) }).catch(() => {}),
  });
  console.log(res.summary);
}
