import assert from "node:assert/strict";
import { isAdminEmail } from "../lib/admins.js";

process.env.ADMIN_EMAILS = "owner@example.com, Admin@Example.com";
assert.equal(isAdminEmail("owner@example.com"), true);
assert.equal(isAdminEmail(" ADMIN@example.com "), true);
assert.equal(isAdminEmail("rando@example.com"), false);
assert.equal(isAdminEmail(""), false);
assert.equal(isAdminEmail(null), false);

delete process.env.ADMIN_EMAILS;   // falls back to the built-in owner hashes
assert.equal(isAdminEmail("owner@example.com"), false);
assert.equal(isAdminEmail("rando@example.com"), false);
console.log("admins ok");
