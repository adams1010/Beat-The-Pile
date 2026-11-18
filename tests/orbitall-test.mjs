// Nov 17 (owner): Orbit shows everyone available (no small caps), photos only for the first PHOTO_MAX people,
// and the sky layout fits every person without overlapping circles.
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildOrbit, CAP, PHOTO_MAX } from "../lib/orbit.js";

const pic = "data:image/jpeg;base64," + "A".repeat(100);
const row = (i, extra = {}) => ({ clerk_user_id: "u" + i, handle: "h" + i, profile_public: true,
  profile: { name: "Person " + i, school: "Virginia Tech", major: i % 2 ? "Mechanical Engineering" : "Biology", gradYear: 2027, photo: pic, ...extra } });
const me = { clerk_user_id: "me", handle: "me", profile: { name: "Me", school: "Virginia Tech", major: "Mechanical Engineering", gradYear: 2027 } };
const publics = [...Array.from({ length: 300 }, (_, i) => row(i)), ...Array.from({ length: 200 }, (_, i) => row(1000 + i, { school: "Purdue University" }))];
const o = buildOrbit({ uid: "me", me, publics, followed: [], fresh: [], posts: [], states: new Map(), targets: [] });
assert.equal(o.classmates.length, 150, "every same-major classmate");
assert.equal(o.schoolmates.length, 300, "the whole school");
assert.equal(o.everyone.length, 200, "everyone else");
assert.ok(CAP.everyone >= 1000 && CAP.schoolmates >= 500);
const withPhoto = new Set([...o.classmates, ...o.schoolmates, ...o.everyone].filter((c) => c.photo).map((c) => c.handle));
assert.equal(withPhoto.size, PHOTO_MAX, "photos kept for the first people only");
assert.ok(o.classmates.slice(0, 10).every((c) => c.photo), "closest people keep their photos");

// The sky layout (orbit/index.html skyLayout): all fit, none overlap, circles shrink as rings fill.
const src = fs.readFileSync(new URL("../orbit/index.html", import.meta.url), "utf8");
const skyLayout = new Function(src.match(/function skyLayout[\s\S]*?\n  }\n/)[0] + "; return skyLayout;")();
for (const [R, band] of [[92, 18], [150, 24], [205, 24]]) {
  let last = 99;
  for (const n of [1, 5, 12, 40, 100, 250, 400]) {
    const L = skyLayout(n, R, band); assert.equal(L.length, n);
    const r = L[0].r; assert.ok(r <= last + 1e-9, "circles never grow as the ring fills"); last = r;
    const P = L.map((o) => [o.rr * Math.cos(o.a), o.rr * Math.sin(o.a)]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) >= 2 * r - 0.01, `overlap R${R} n${n}`);
    for (const o of L) assert.ok(Math.abs(o.rr - R) <= band + 0.01, "stays inside its ring's band");
  }
}
console.log("✓ orbit shows everyone: no small caps, photos for the first 60, the sky fits every person without overlaps");
