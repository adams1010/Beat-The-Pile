// scripts/probe.mjs — run ad-hoc checks against real job sites from GitHub's servers
// (Claude's workspace can't reach them). Usage: node scripts/probe.mjs '<js expression using fetch>'
const code = process.argv[2] || "";
const AsyncFunction = (async () => {}).constructor;
const out = await new AsyncFunction("fetch", code)(fetch);
console.log("PROBE_RESULT " + JSON.stringify(out, null, 1));
