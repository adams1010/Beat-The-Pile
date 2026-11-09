// lib/orbitnet.js — Orbit part 2 (Nov 2026): two-way Connect, in-app messages, "going to the same fair".
// Tables from supabase/orbit.sql: orbit_links (user_a < user_b, pending|accepted), orbit_messages, user_jobs.orbit_fair(_on).
// Rules:
//  • You can only send a Connect request to a PUBLIC profile (by its /u/ handle).
//  • Messages: connected students ↔ each other; employer accounts → students who turned on "Let employers find me";
//    students can reply to an employer who wrote to them. Nobody else can start a conversation.
//  • The browser never sees Clerk ids. People you already know about are addressed by a "peer key" (a keyed hash of
//    their id) that only resolves for people you have a link or messages with.
//  • "Same fair": only students who opted in to the same fair see each other.
import crypto from "node:crypto";
import { db } from "./db.js";
import { card } from "./orbit.js";
import { mutate } from "./userdata.js";
import { employerCards, isVerifiedEmployer } from "./employer.js";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const KEY_RE = /^p_[A-Za-z0-9_-]{18}$/;
const FAIR_RE = /^[a-z0-9-]{3,80}$/;
const UID_RE = /^[A-Za-z0-9_]{3,80}$/;
export const MAX_BODY = 2000;

export const pair = (x, y) => (x < y ? [x, y] : [y, x]);
export function peerKey(uid) {
  const secret = process.env.CLERK_SECRET_KEY || process.env.CRON_SECRET || "btp-orbit";
  return "p_" + crypto.createHmac("sha256", secret).update("orbit-peer:" + uid).digest("base64url").slice(0, 18);
}
/** none | requested (you sent it) | incoming (they sent it) | connected */
export function linkState(link, uid) {
  if (!link) return "none";
  if (link.status === "accepted") return "connected";
  return link.requested_by === uid ? "requested" : "incoming";
}
export const otherOf = (link, uid) => (link.user_a === uid ? link.user_b : link.user_a);
export function cleanBody(s) {
  return String(s ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, MAX_BODY);
}

/** Pure: who may send `from` → `to`? Tested in tests/orbitnet-test.mjs. */
export function canMessage({ link, fromRole, fromVerified = true, toRow, toRole, theyWroteMe }) {
  if (link?.status === "accepted") return { ok: true };
  if (fromRole === "employer" && !fromVerified) return { ok: false, why: "Your company is still being verified. You can message students once it's approved." };
  if (fromRole === "employer" && toRow?.profile_public === true && toRow?.profile?.openToEmployers === true) return { ok: true, employer: true };
  if (toRole === "employer" && theyWroteMe) return { ok: true };
  if (fromRole === "employer") return { ok: false, why: "This student isn't taking messages from employers right now." };
  return { ok: false, why: "Join their orbit first. Once they accept, you can message each other." };
}

const inList = (ids) => ids.filter((x) => UID_RE.test(x)).map((x) => `"${x}"`).join(",");
const enc = encodeURIComponent;
const linksOf = (uid) => db.selectAsAdmin(`orbit_links?select=*&or=(user_a.eq.${enc(uid)},user_b.eq.${enc(uid)})&limit=1000`);
// Nov 9 bug: the table's check (user_a < user_b) is judged by the DATABASE's text order, which ignores upper/lower case
// ("user_2abc" < "user_2Xyz"), while JS puts every capital first. For some pairs of Clerk ids the insert broke ("Couldn't
// update your account"). So: a link is found in either order, and an insert the database refuses is retried the other way.
const bothWays = (a, b) => `or=(and(user_a.eq.${enc(a)},user_b.eq.${enc(b)}),and(user_a.eq.${enc(b)},user_b.eq.${enc(a)}))`;
async function linkBetween(a, b) {
  return (await db.selectAsAdmin(`orbit_links?select=*&${bothWays(a, b)}&limit=1`))[0] || null;
}
async function insertLink(uid, other) {
  const [a, b] = pair(uid, other);
  for (const [x, y] of [[a, b], [b, a]]) {
    try { await db.insert("orbit_links", [{ user_a: x, user_b: y, status: "pending", requested_by: uid }]); return; }
    catch (e) {
      const m = String(e?.message);
      if (/23505|duplicate/i.test(m)) return;                       // already there
      if (!/23514|check constraint/i.test(m)) throw e;              // the order check → try the other order
    }
  }
}
async function rowsFor(uids) {
  const ids = inList([...new Set(uids)]);
  return ids ? db.selectAsAdmin(`user_jobs?select=clerk_user_id,handle,profile,profile_public&clerk_user_id=in.(${ids})&limit=1000`) : [];
}
const myMessages = (uid, limit = 400) =>
  db.selectAsAdmin(`orbit_messages?select=id,sender,recipient,body,created_at,read_at&or=(sender.eq.${enc(uid)},recipient.eq.${enc(uid)})&order=created_at.desc&limit=${limit}`);

/** A person card for someone you have a relationship with. Private profiles show name only (no /u/ link). */
export function peerCard(uid, row, extra = {}) {
  if (row?.profile) {
    const c = card(row, extra);
    if (row.profile_public !== true) c.handle = null;
    return { ...c, key: peerKey(uid) };
  }
  return { handle: null, name: extra.name || "Beat the Pile user", headline: "", school: "", major: "", gradYear: null, photo: null, ...extra, key: peerKey(uid) };
}

/** Employer display name from Clerk: "Jane Smith · boeing.com" (the email's domain only, never the address). */
async function employerLabel(uid) {
  if (!process.env.CLERK_SECRET_KEY) return null;
  try {
    const r = await fetch(`https://api.clerk.com/v1/users/${enc(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
    if (!r.ok) return null;
    const u = await r.json();
    if (u?.unsafe_metadata?.role !== "employer") return null;
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    const em = (u.email_addresses || []).find((e) => e.id === u.primary_email_address_id) || (u.email_addresses || [])[0];
    const domain = String(em?.email_address || "").split("@")[1] || "";
    const company = String(u.unsafe_metadata?.company || "").slice(0, 80);
    return { name: name || company || "Employer", headline: ["Employer", company || domain].filter(Boolean).join(" · "), employer: true };
  } catch { return null; }
}

/** Resolve `to` (a public handle, or a peer key of someone you already have a link/messages with) → { uid, row }. */
async function resolve(uid, to) {
  to = String(to || "").trim();
  if (HANDLE_RE.test(to.toLowerCase())) {
    const r = (await db.selectAsAdmin(`user_jobs?select=clerk_user_id,handle,profile,profile_public&handle=eq.${enc(to.toLowerCase())}&limit=1`))[0];
    if (!r || r.profile_public !== true || r.clerk_user_id === uid) return null;
    return { uid: r.clerk_user_id, row: r };
  }
  if (!KEY_RE.test(to)) return null;
  const [links, msgs] = await Promise.all([linksOf(uid), myMessages(uid, 1000)]);
  const known = new Set([...links.map((l) => otherOf(l, uid)), ...msgs.map((m) => (m.sender === uid ? m.recipient : m.sender))]);
  for (const id of known) if (peerKey(id) === to) return { uid: id, row: (await rowsFor([id]))[0] || null };
  // Nov 8: a VERIFIED employer's recruiter key (shown on their public company page /co/<slug>) — so students can join their orbit too.
  const emps = await db.selectAllAsAdmin("employers?select=clerk_user_id&status=eq.verified&order=clerk_user_id.asc").catch(() => []);
  for (const e of emps) if (e.clerk_user_id !== uid && peerKey(e.clerk_user_id) === to) return { uid: e.clerk_user_id, row: (await rowsFor([e.clerk_user_id]))[0] || null, employer: true };
  return null;
}

/** Extra data for the main Orbit view: link states, connections, requests, fair, unread count. */
export async function orbitExtras(uid, row, publics) {
  const [links, unread] = await Promise.all([linksOf(uid), db.countAsAdmin(`orbit_messages?recipient=eq.${enc(uid)}&read_at=is.null`).catch(() => 0)]);
  const states = new Map(links.map((l) => [otherOf(l, uid), linkState(l, uid)]));
  const rows = await rowsFor(links.map((l) => otherOf(l, uid)));
  const byUid = new Map(rows.map((r) => [r.clerk_user_id, r]));
  const emp = await employerCards(links.map((l) => otherOf(l, uid)).filter((id) => !byUid.get(id)?.profile));
  const pick = (s) => links.filter((l) => linkState(l, uid) === s).map((l) => { const id = otherOf(l, uid); return peerCard(id, byUid.get(id), { ...(emp.get(id) || {}), link: s }); });
  const fair = row?.orbit_fair_on === true && FAIR_RE.test(row?.orbit_fair || "") ? row.orbit_fair : null;
  const sameFair = fair ? (publics || []).filter((r) => r.clerk_user_id !== uid && r.orbit_fair_on === true && r.orbit_fair === fair && r.handle && r.profile)
    .slice(0, 40).map((r) => ({ ...card(r), link: states.get(r.clerk_user_id) || "none" })) : [];
  return { states, connections: pick("connected").slice(0, 200), requests: pick("incoming").slice(0, 50), sent: pick("requested").length,
    fair: { id: row?.orbit_fair || null, on: row?.orbit_fair_on === true, people: sameFair }, unread };
}

async function inbox(uid) {
  const msgs = await myMessages(uid, 400);
  const threads = new Map();
  for (const m of msgs) {
    const peer = m.sender === uid ? m.recipient : m.sender;
    const t = threads.get(peer) || { peer, last: null, unread: 0 };
    if (!t.last) t.last = { body: m.body.slice(0, 140), at: m.created_at, mine: m.sender === uid };
    if (m.recipient === uid && !m.read_at) t.unread++;
    threads.set(peer, t);
  }
  const list = [...threads.values()].slice(0, 60);
  const rows = new Map((await rowsFor(list.map((t) => t.peer))).map((r) => [r.clerk_user_id, r]));
  const emp = await employerCards(list.map((t) => t.peer).filter((id) => !rows.get(id)?.profile));
  const out = [];
  for (const t of list) {
    const r = rows.get(t.peer);
    const extra = r?.profile ? {} : emp.get(t.peer) || (await employerLabel(t.peer)) || {};
    out.push({ ...peerCard(t.peer, r, extra), last: t.last, unread: t.unread });
  }
  return { threads: out, unread: out.reduce((n, t) => n + t.unread, 0) };
}

/** The number on the Orbit tab: unread messages + people asking to join your orbit. */
export async function notifyCount(uid) {
  const [unread, asks] = await Promise.all([
    db.countAsAdmin(`orbit_messages?recipient=eq.${enc(uid)}&read_at=is.null`),
    db.selectAsAdmin(`orbit_links?select=user_a&status=eq.pending&requested_by=neq.${enc(uid)}&or=(user_a.eq.${enc(uid)},user_b.eq.${enc(uid)})&limit=100`),
  ]);
  return unread + asks.length;
}

/**
 * Search people (Nov 9): /orbit/?q= and the top-bar search. PUBLIC profiles only (the same people Orbit already shows);
 * matches name, @handle, school, major, headline, skills and the companies in their experience. Employer accounts only
 * ever see students who turned on "Let employers find me", and only once verified (same rule as Find talent).
 * Results carry your orbit state with each person, never ids or emails.
 */
export async function searchPeople(uid, q, { roleOf } = {}) {
  const words = String(q || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9 .&'-]/g, " ").split(/\s+/).filter((w) => w.length >= 2).slice(0, 6);
  if (!words.length) return { q: "", people: [] };
  const employer = roleOf ? (await roleOf(uid)) === "employer" : false;
  if (employer && !(await isVerifiedEmployer(uid))) return { q: words.join(" "), people: [], employerPending: true };
  const rows = await db.selectAllAsAdmin("user_jobs?select=clerk_user_id,handle,profile,profile_public&profile_public=eq.true&order=handle.asc");
  const scored = [];
  for (const r of rows) {
    if (r.clerk_user_id === uid || !r.handle || !r.profile) continue;
    const p = r.profile;
    if (employer && p.openToEmployers !== true) continue;
    const name = String(p.name || "").toLowerCase(), handle = String(r.handle).toLowerCase();
    const rest = [p.school, p.major, p.headline, p.location, ...(p.skills || []), ...(p.experience || []).map((e) => e?.org)].join(" ").toLowerCase();
    let score = 0, all = true;
    for (const w of words) {
      const v = handle === w ? 6 : name.split(/\s+/).some((x) => x.startsWith(w)) ? 4 : handle.startsWith(w) ? 3 : rest.includes(w) ? 1.5 : 0;
      if (!v) all = false; score += v;
    }
    if (all) scored.push([r, score]);
  }
  scored.sort((a, b) => b[1] - a[1] || String(a[0].profile.name || "").localeCompare(String(b[0].profile.name || "")));
  const top = scored.slice(0, 30).map(([r]) => r);
  const links = await linksOf(uid).catch(() => []);
  const states = new Map(links.map((l) => [otherOf(l, uid), linkState(l, uid)]));
  return { q: words.join(" "), people: top.map((r) => ({ ...card(r), link: states.get(r.clerk_user_id) || "none" })), more: scored.length > 30 };
}

/** All orbit_* actions. deps = { roleOf, rateOk } (injected so tests can fake them). Returns { status, body }. */
export async function orbitAction(uid, action, body, { roleOf, rateOk }) {
  const ok = (b) => ({ status: 200, body: b }), no = (error, status = 400) => ({ status, body: { error } });

  if (action === "orbit_fair") {
    const fair = body.fair == null || body.fair === "" ? null : String(body.fair);
    if (fair !== null && !FAIR_RE.test(fair)) return no("Pick a fair from the list");
    const out = await mutate(uid, () => ({ orbit_fair: fair, orbit_fair_on: body.on === true && !!fair }));
    return out.error ? no(out.error, out.status) : ok({ fair: { id: out.row.orbit_fair, on: out.row.orbit_fair_on === true } });
  }
  if (action === "orbit_search") return ok(await searchPeople(uid, body.q, { roleOf }));
  if (action === "orbit_inbox") return ok(await inbox(uid));
  if (action === "orbit_count") return ok({ n: await notifyCount(uid) });

  if (action === "orbit_state") {          // viewing someone's /u/ page: is it you?
    const mine = (await db.selectAsAdmin(`user_jobs?select=handle&clerk_user_id=eq.${enc(uid)}&limit=1`))[0];
    if (mine?.handle && mine.handle === String(body.to || "").trim().toLowerCase()) return ok({ self: true });
  }
  const peer = await resolve(uid, body.to);
  if (!peer) return no("We couldn't find that person. They may have made their profile private.", 404);
  const link = await linkBetween(uid, peer.uid);
  const where = `orbit_links?${bothWays(uid, peer.uid)}`;

  if (action === "orbit_state") return ok({ link: linkState(link, uid), key: peerKey(peer.uid) });
  if (action === "orbit_connect") {
    const s = linkState(link, uid);
    if (s === "incoming") { await db.update(where, { status: "accepted", updated_at: new Date().toISOString() }); return ok({ link: "connected" }); }
    if (s !== "none") return ok({ link: s });
    if ((await roleOf(uid)) === "employer") {
      if (!(await isVerifiedEmployer(uid))) return no("Your company is still being verified. You can add students to your orbit once it's approved.", 403);
      if (peer.row?.profile?.openToEmployers !== true) return no("This student isn't open to employers right now.", 403);
    }
    if (!(await rateOk(`orbit-connect:${uid}`, 86400, 40))) return no("That's a lot of orbit requests for one day. Try again tomorrow.", 429);
    await insertLink(uid, peer.uid);
    return ok({ link: linkState(await linkBetween(uid, peer.uid), uid) });
  }
  if (action === "orbit_accept") {
    if (linkState(link, uid) !== "incoming") return ok({ link: linkState(link, uid) });
    await db.update(where, { status: "accepted", updated_at: new Date().toISOString() });
    return ok({ link: "connected" });
  }
  if (action === "orbit_remove") {           // withdraw a request, decline one, or disconnect
    if (link) await db.deleteRows(where);
    return ok({ link: "none" });
  }

  const between = `or=(and(sender.eq.${enc(uid)},recipient.eq.${enc(peer.uid)}),and(sender.eq.${enc(peer.uid)},recipient.eq.${enc(uid)}))`;
  const permission = async () => {
    const [fromRole, toRole] = await Promise.all([link?.status === "accepted" ? null : roleOf(uid), link?.status === "accepted" ? null : roleOf(peer.uid)]);
    const theyWroteMe = toRole === "employer"
      ? (await db.selectAsAdmin(`orbit_messages?select=id&sender=eq.${enc(peer.uid)}&recipient=eq.${enc(uid)}&limit=1`)).length > 0 : false;
    const fromVerified = fromRole === "employer" ? await isVerifiedEmployer(uid) : true;
    return { ...canMessage({ link, fromRole, fromVerified, toRow: peer.row, toRole, theyWroteMe }), fromRole };
  };

  if (action === "orbit_thread") {
    const msgs = await db.selectAsAdmin(`orbit_messages?select=id,sender,body,created_at,read_at&${between}&order=created_at.desc&limit=200`);
    await db.update(`orbit_messages?recipient=eq.${enc(uid)}&sender=eq.${enc(peer.uid)}&read_at=is.null`, { read_at: new Date().toISOString() });
    const perm = await permission();
    const extra = peer.row?.profile ? {} : (await employerCards([peer.uid])).get(peer.uid) || (await employerLabel(peer.uid)) || {};
    return ok({ peer: { ...peerCard(peer.uid, peer.row, extra), link: linkState(link, uid) }, canSend: perm.ok, why: perm.why || null,
      messages: msgs.reverse().map((m) => ({ id: m.id, mine: m.sender === uid, body: m.body, at: m.created_at })) });
  }
  if (action === "orbit_send") {
    const text = cleanBody(body.body);
    if (!text) return no("Write a message first");
    const perm = await permission();
    if (!perm.ok) return no(perm.why, 403);
    if (!(await rateOk(`orbit-send:${uid}`, 3600, 40))) return no("You're sending a lot of messages. Take a short break and try again.", 429);
    if (perm.employer && perm.fromRole === "employer") {
      const started = (await db.selectAsAdmin(`orbit_messages?select=id&${between}&limit=1`)).length > 0;
      if (!started && !(await rateOk(`orbit-employer-new:${uid}`, 86400, 25))) return no("Employer accounts can start up to 25 new conversations a day.", 429);
    }
    await db.insert("orbit_messages", [{ sender: uid, recipient: peer.uid, body: text }]);
    return ok({ sent: true, message: { mine: true, body: text, at: new Date().toISOString() } });
  }
  return no("Unknown action");
}

/** "Delete all my data" also removes your connections and every message you sent or received. */
export async function deleteOrbitData(uid) {
  await db.deleteRows(`orbit_links?or=(user_a.eq.${enc(uid)},user_b.eq.${enc(uid)})`);
  await db.deleteRows(`orbit_messages?or=(sender.eq.${enc(uid)},recipient.eq.${enc(uid)})`);
}
