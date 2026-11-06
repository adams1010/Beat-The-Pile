// lib/bots.js — InternIQ's bots, their on/off switches (table bot_settings) and run log (table bot_runs).
// Every bot checks its switch before working and logs one line per run, so the /bots control room can show
// what each one is doing. If the switch can't be read, the bot runs (fail open): a database hiccup should
// never silently stop the company finder.
import { db } from "./db.js";

export const BOTS = [
  { id: "finder",  name: "Company Finder",       main: true, how: "Every 15–60 min",  what: "Finds each company's own job board and proves it's really theirs" },
  { id: "scout",   name: "Board Scout",          how: "Weekly, Sun ~3 AM ET", what: "Reads the public web index for every company job board (Workday, Greenhouse, iCIMS…) and keeps the ones hiring interns" },
  { id: "import",  name: "New-Company Scout",    how: "Nightly ~3 AM ET", what: "Pulls brand-new engineering companies from the public internship list" },
  { id: "browser", name: "Browser Pass",         how: "Nightly ~4:30 AM ET", what: "Opens careers sites in a real browser to find boards hidden behind JavaScript" },
  { id: "sync",    name: "Internship Sync",      how: "Hourly",           what: "Pulls fresh internships from every verified company's board" },
  { id: "links",   name: "Link Checker",         how: "Twice a day",      what: "Opens every listing like a student would and hides dead links" },
  { id: "remind",  name: "Follow-up Emails",     how: "Daily ~8:20 AM ET", what: "Emails students who turned on reminders when a follow-up is due (max one every 3 days), plus weekly new-internship alerts for students who turned those on" },
  { id: "radar",   name: "Opening Radar",        how: "Daily ~6:40 AM ET", what: "Refreshes when each company usually opens internships" },
];
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
