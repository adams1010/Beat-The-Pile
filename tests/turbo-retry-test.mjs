// Nov 23: Turbo Sync retries Workday-busy boards in later passes instead of skipping them every run
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const out = execFileSync(process.execPath, ["--import", new URL("./turbo-fakefetch.mjs", import.meta.url).pathname, new URL("../scripts/turbo-sync.mjs", import.meta.url).pathname, "--minutes=30"],
  { cwd: mkdtempSync(join(tmpdir(), "turbo-")),   // its own folder: the fingerprint cache must start empty
    env: { ...process.env, CRON_SECRET: "x", SITE: "https://fake.test", BTP_TURBO: "1", WD_PAUSE: "off", WD_COOL_MS: "300", TURBO_PAUSE_MS: "400" }, encoding: "utf8", timeout: 60000 });
const saved = JSON.parse(out.match(/SAVED (.*)/)[1]);
assert.equal(saved.length, 3, out);
assert.ok(saved.every((r) => !r.busy && r.n > 0), "all three boards read after the retry passes: " + JSON.stringify(saved));
assert.match(out, /pass 2: \d+ boards were busy/);
assert.match(out, /busy boards retried, 0 still busy/);
console.log("✓ turbo retry: busy Workday boards are read again in a later pass");
