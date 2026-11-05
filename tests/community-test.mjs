// /api/community — nothing public until reviewed; AI failure keeps posts pending; durable limits; reports; owner tools.
import assert from "node:assert/strict";
import { installFake, makeKeys, invoke, env } from "./fakedb.mjs";
env();
const { jwk, tok } = makeKeys();
let mode = "ok";
const f = installFake({ jwk, clerkUsers: { user_owner: "shiloniadam10@gmail.com", user_x: "x@x.com" },
  anthropic: (b) => mode === "down" ? { status: 529 } : mode === "junk" ? { text: "I think it's fine" }
    : { text: b.messages[0].content.includes("buy crypto") ? '{"hide":true,"reason":"spam"}' : '{"hide":false,"reason":""}' } });
const c = (await import("../api/community.js")).default;
let n = 0;
const post = (body, action, ip = "5.5.5." + (++n), auth) => invoke(c, { method: "POST", query: action ? { action } : {}, body, headers: { "x-forwarded-for": ip, ...(auth ? { authorization: "Bearer " + auth } : {}) } });
const list = async () => (await invoke(c, { method: "GET", query: {} })).body.posts;

let r = await post({ content: "Apply early to Boeing, their portal opens in August", display_name: "Adam" });
assert.equal(r.code, 200); assert.equal(r.body.visible, true); assert.ok(r.body.deleteToken.length >= 20);
assert.deepEqual(Object.keys(r.body.post).sort(), ["category", "content", "created_at", "display_name", "id"], "only public fields returned");
const good = r.body.post.id;
r = await post({ content: "buy crypto now at scam.example" }); assert.equal(r.body.visible, false); assert.equal(r.body.status, "hidden");
mode = "down"; r = await post({ content: "AI is down but this is fine content" }); assert.equal(r.body.status, "pending", "AI down → waits for review"); assert.equal(r.body.visible, false);
mode = "junk"; r = await post({ content: "AI says something odd" }); assert.equal(r.body.status, "pending", "unreadable AI answer → waits for review");
delete process.env.ANTHROPIC_API_KEY; r = await post({ content: "No AI key configured at all" }); assert.equal(r.body.status, "pending", "no AI key → waits"); process.env.ANTHROPIC_API_KEY = "k";
mode = "ok";
let posts = await list(); assert.deepEqual(posts.map((p) => p.id), [good], "only approved posts are public");
assert.ok(!("delete_token" in posts[0]) && !("review_note" in posts[0]) && !("status" in posts[0]));
console.log("✓ moderation fails closed: AI down / junk / no key → pending, never public");

// replies only on approved posts; counts only approved replies
r = await post({ post_id: good, content: "Thanks, super helpful" }, "reply"); assert.equal(r.body.visible, true);
r = await post({ post_id: 2, content: "replying to a hidden post" }, "reply"); assert.equal(r.code, 404);
mode = "down"; await post({ post_id: good, content: "pending reply" }, "reply"); mode = "ok";
posts = await list(); assert.equal(posts[0].reply_count, 1, "pending replies not counted");
assert.equal((await invoke(c, { method: "GET", query: { action: "replies", post_id: String(good) } })).body.replies.length, 1);
console.log("✓ replies: approved only");

// durable rate limit per visitor
let last; for (let i = 0; i < 5; i++) last = await post({ content: "spamming the wall " + i }, null, "7.7.7.7");
assert.equal(last.code, 429); assert.ok(f.T("rate_hits").some((x) => x.key === "community-post:7.7.7.7"));
console.log("✓ posting rate limit is stored in the database");

// reports: one per person, 3 hide it for review, owner notified via feedback
for (const ip of ["1.1.1.1", "1.1.1.1", "1.1.1.2", "1.1.1.3"]) await post({ kind: "post", id: good }, "report", ip);
const row = f.T("community_posts").find((p) => p.id === good); assert.equal(row.reports, 3, "same person can't report twice"); assert.equal(row.status, "pending");
assert.ok(!(await list()).some((p) => p.id === good), "hidden after 3 reports until reviewed"); assert.ok(f.T("feedback").some((x) => x.kind === "community_report"));
console.log("✓ reports: 3 people → hidden pending owner review; owner gets a feedback note");

// owner tools: Clerk admin only
assert.equal((await post({}, "admin_list")).code, 401); assert.equal((await post({}, "admin_list", "1", tok("user_x"))).code, 401);
r = await post({}, "admin_list", "1", tok("user_owner")); assert.equal(r.code, 200); assert.ok(r.body.posts.length >= 4);
await post({ kind: "post", id: good, status: "approved" }, "admin_review", "1", tok("user_owner")); assert.ok((await list()).some((p) => p.id === good));
console.log("✓ owner review: list everything, approve/hide (admins only)");

// delete own post: right token only
const mine = await post({ content: "my own tip to delete" }); const id = mine.body.post.id;
assert.equal((await post({ id, token: "wrong-token-xxxxxxxxxxxx" }, "owner_delete")).code, 403);
assert.equal((await post({ id, token: mine.body.deleteToken }, "owner_delete")).code, 200);
assert.ok(!f.T("community_posts").some((p) => p.id === id));
console.log("COMMUNITY TESTS PASSED");
