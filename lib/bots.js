// lib/bots.js — Beat the Pile's bots, their on/off switches (table bot_settings) and run log (table bot_runs).
// Every bot checks its switch before working and logs one line per run, so the /bots control room can show
// what each one is doing. If the switch can't be read, the bot runs (fail open): a database hiccup should
// never silently stop the company finder.
import { db } from "./db.js";

export const BOTS = [
  { id: "finder",  name: "Company Finder",       main: true, how: "Hourly",  what: "Finds each company's own job board and proves it's really theirs" },
  { id: "scout",   name: "Board Scout",          how: "Daily ~3 AM ET", what: "Reads the public web index for every company job board (Workday, Greenhouse, iCIMS…) and keeps the ones hiring interns" },
  { id: "import",  name: "New-Company Scout",    how: "Nightly ~3 AM ET", what: "Pulls brand-new engineering companies from the public internship list" },
  { id: "browser", name: "Browser Pass",         how: "Nightly ~4:30 AM ET", what: "Opens careers sites in a real browser to find boards hidden behind JavaScript" },
  { id: "sync",    name: "Internship Sync",      how: "Manual only (Turbo Sync reads every board since Nov 15)",           what: "Pulls fresh internships from every verified company's board" },
  { id: "turbo",   name: "Turbo Sync",           how: "Every 2 hours",    what: "Reads every verified company's whole job board from GitHub's servers, 24 at a time with no time limit, so big boards (hospitals, banks) come in complete" },
  { id: "links",   name: "Link Checker",         how: "Twice a day",      what: "Opens every listing like a student would and hides dead links" },
  { id: "remind",  name: "Follow-up Emails",     how: "Daily ~8:20 AM ET", what: "Emails students who turned on reminders when a follow-up is due (max one every 3 days), plus weekly new-internship alerts for students who turned those on" },
  { id: "radar",   name: "Opening Radar",        how: "Daily ~6:40 AM ET", what: "Refreshes when each company usually opens internships" },
  { id: "logos",   name: "Logo Finder",          how: "Daily ~5:15 AM ET", what: "Finds each company's real website, proves it's theirs, and uses its logo (initials stay when unproven)" },
  { id: "ccfind",  name: "Careers Finder",       how: "Weekly (Sun ~4 AM ET)", what: "Looks up parked companies' careers pages in Common Crawl's public archive and hands any job-board link on them to the Company Finder to prove" },
  // Nov 25 (owner): analyst bots. They change nothing; they read public data and report where we're thin (lib/insights.js).
  { id: "gaps",    name: "Gap Finder",           how: "Daily ~2:30 AM ET", what: "Measures jobs per person in every state, the biggest places with few jobs nearby, and big colleges with few internships within 50 miles" },
  { id: "unlock",  name: "Unlock Finder",        how: "Daily ~2:30 AM ET", what: "Sorts every stuck company by what's wrong and what would fix it, scores each company source, and lists big internship employers we're still missing" },
  { id: "watchdog", name: "Watchdog",            how: "Hourly",           what: "Checks every bot is running and succeeding; restarts any that went quiet and opens an alert if one stays broken" },
];
// Longest a bot may go without a run before it counts as stalled (minutes). /bots and the Watchdog both use this.
// GitHub's own schedules often fire hours late, so the daily ones get 30 h, not 24.
export const STALE_MIN = { finder: 180, sync: null, turbo: 6 * 60, links: 14 * 60, import: 30 * 60, browser: 30 * 60, radar: 30 * 60, logos: 30 * 60, remind: 30 * 60, scout: 2 * 1440, ccfind: 8 * 1440, gaps: 30 * 60, unlock: 30 * 60, watchdog: 180 };
// How the Watchdog restarts a stalled bot: the GitHub workflow that runs it (null = can't/shouldn't restart automatically;
// Follow-up Emails is never restarted by a robot so nobody gets a second email).
export const RESTART = { finder: "discover.yml", sync: null, turbo: "turbo-sync.yml", links: null, scout: "board-scout.yml", browser: "deep-discover.yml", radar: "radar.yml", logos: "logos.yml", import: "discover.yml", remind: null, ccfind: "cc-careers.yml", gaps: "insights.yml", unlock: "insights.yml", watchdog: null };

/** One bot's health from its recent runs (newest first). */
export function botHealth(bot, runs, now = Date.now()) {
  const last = runs[0], lastOk = runs.find((r) => r.ok);
  let fails = 0; for (const r of runs) { if (r.ok) break; fails++; }
  const quietMin = last ? Math.round((now - Date.parse(last.ran_at)) / 6e4) : null;
  // Nov 22: a manual-only bot (STALE_MIN null, e.g. Internship Sync since Turbo Sync took over) is never "stalled"
  const lim = bot in STALE_MIN ? STALE_MIN[bot] : 1440;
  const stale = lim === null ? false : quietMin == null ? true : quietMin > lim;
  const failing = fails >= 3;
  return { bot, lastRun: last?.ran_at || null, lastOk: lastOk?.ran_at || null, quietMin, fails, stale, failing, healthy: !stale && !failing,
           lastSummary: last?.summary || null };
}
export const BOT_IDS = BOTS.map((b) => b.id);

export async function botOn(bot) {
  try {
    const rows = await db.selectAsAdmin(`bot_settings?select=enabled&bot=eq.${encodeURIComponent(bot)}&limit=1`);
    return rows[0]?.enabled !== false;
  } catch { return true; }
}

export async function logRun(bot, ok, summary, stats = null) {
  try { await db.insert("bot_runs", [{ bot, ok: !!ok, summary: String(summary || "").slice(0, 300), stats }]); }
  catch (e) { console.warn(`[bots] couldn't log ${bot}:`, e.message); }
}
