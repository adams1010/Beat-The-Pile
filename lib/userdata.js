// lib/userdata.js — safe read-modify-write for one student's row in user_jobs.
// Two tabs (or a phone and a laptop) saving at the same moment used to overwrite each other: both read the
// row, both changed it, the second write erased the first change. Now every write says "only if the row is
// still at version N" and bumps the version; if someone else got there first, we re-read and redo the change.
import { db } from "./db.js";

const TRIES = 5;
export class Conflict extends Error {}

export async function loadRow(uid) {
  const rows = await db.selectAsAdmin(`user_jobs?select=*&clerk_user_id=eq.${encodeURIComponent(uid)}&limit=1`);
  return rows[0] || null;
}

/**
 * fn(row) gets the latest row (or null) and returns a patch object, or { error, status } to stop.
 * Returns { row: updatedRow } or { error, status }.
 */
export async function mutate(uid, fn) {
  for (let i = 0; i < TRIES; i++) {
    let row = await loadRow(uid);
    if (!row) {                                                     // first write ever: create the row, then edit it
      await db.insertIgnore("user_jobs", [{ clerk_user_id: uid }], "clerk_user_id");
      row = await loadRow(uid);
      if (!row) throw new Error("couldn't create your account row");
    }
    const out = await fn(row);
    if (out?.error) return out;
    const v = Number(row.version || 0);
    const changed = await db.updateReturning(
      `user_jobs?clerk_user_id=eq.${encodeURIComponent(uid)}&version=eq.${v}`,
      { ...out, version: v + 1, updated_at: new Date().toISOString() });
    if (Array.isArray(changed) && changed.length) return { row: changed[0] };
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));   // someone else saved first — retry on fresh data
  }
  throw new Conflict("Too many saves at once — try again");
}
