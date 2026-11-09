/* ════════════════════════════════════════════════════════════════
 *  Hall 3D — Site context (บริบทรอบ Hall) ตามแปลนจริง
 *  อาคาร Data Hall (หลังคาลาดเอียง + แผงโซลาร์) · Utility (ชิลเลอร์บนหลังคา) · Admin · Security
 *  รั้วทึบ · ต้นไม้ · ถนน · ลานจอดรถ · Substation · ถังน้ำมัน · รถเทรลเลอร์เครื่องปั่นไฟ
 *  ทุกอย่างรวมเป็น BufferGeometry (vertex color) ไม่กี่ก้อน → draw call น้อย ไม่ต้องโหลดไฟล์ภายนอก
 *  ใช้: const S = H3Site(THREE, { tag }); scene.add(S.group); S.update(camDist, 'auto'|'on'|'off')
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const PAN = 3;                                   // ขนาดแผ่นผนัง (ม.) ที่ texture ซ้ำ
const hex = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const G = uv => ({ p: [], n: [], c: [], u: uv ? [] : null });

/* ── primitive: สามเหลี่ยม/สี่เหลี่ยม (flat normal) ── */
function tri(g, a, b, c, n, rgb) {
  for (const q of [a, b, c]) {
    g.p.push(q[0], q[1], q[2]); g.n.push(n[0], n[1], n[2]); g.c.push(rgb[0], rgb[1], rgb[2]);
    if (g.u) { if (Math.abs(n[1]) > .7) g.u.push(q[0] / PAN, q[2] / PAN); else g.u.push((q[0] * Math.abs(n[2]) + q[2] * Math.abs(n[0])) / PAN, q[1] / PAN); }
  }
}
function quad(g, a, b, c, d, rgb, ctr) {           // ctr = จุดภายในวัตถุ ใช้หาด้านนอกเอง (ไม่ต้องห่วงทิศการวนจุด)
  let n = nrm(crs(sub(b, a), sub(c, a)));
  const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
  if (dot(n, sub(m, ctr)) < 0) { n = [-n[0], -n[1], -n[2]]; tri(g, a, d, c, n, rgb); tri(g, a, c, b, n, rgb); }
  else { tri(g, a, b, c, n, rgb); tri(g, a, c, d, n, rgb); }
}
function triN(g, v, nn, rgb) {                      // สามเหลี่ยม smooth normal (ต้นไม้/ท่อ)
  let [a, b, c] = v, [na, nb, nc] = nn;
  if (dot(crs(sub(b, a), sub(c, a)), [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]]) < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
  [[a, na], [b, nb], [c, nc]].forEach(([q, n]) => { g.p.push(q[0], q[1], q[2]); g.n.push(n[0], n[1], n[2]); g.c.push(rgb[0], rgb[1], rgb[2]); if (g.u) g.u.push(0, 0); });
}
/* ── ก้อนทรงสี่เหลี่ยมคางหมู/ลาดเอียง: f = 4 จุด [x,z] · y0,y1 = ตัวเลขหรืออาร์เรย์ 4 ค่า ── */
function hx(T, f, y0, y1, side, top, o = {}) {
  const Y0 = Array.isArray(y0) ? y0 : [y0, y0, y0, y0], Y1 = Array.isArray(y1) ? y1 : [y1, y1, y1, y1];
  const B = f.map((q, i) => [q[0], Y0[i], q[1]]), U = f.map((q, i) => [q[0], Y1[i], q[1]]);
  const ctr = [0, 0, 0]; B.concat(U).forEach(q => { ctr[0] += q[0] / 8; ctr[1] += q[1] / 8; ctr[2] += q[2] / 8; });
  const gs = o.flat ? T.flat : T.clad;
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(gs, B[i], B[j], U[j], U[i], side, ctr); }
  if (top) quad(T.flat, U[0], U[1], U[2], U[3], top, ctr);
  if (o.bot) quad(T.flat, B[0], B[1], B[2], B[3], side, ctr);
}
const R = (x0, z0, x1, z1) => { const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(z0, z1), d = Math.max(z0, z1); return [[a, c], [b, c], [b, d], [a, d]]; };
const SG = (p, q, t) => { const d = nrm([q[0] - p[0], 0, q[1] - p[1]]), nx = -d[2] * t / 2, nz = d[0] * t / 2; return [[p[0] + nx, p[1] + nz], [q[0] + nx, q[1] + nz], [q[0] - nx, q[1] - nz], [p[0] - nx, p[1] - nz]]; };
const bx = (T, x0, z0, x1, z1, y0, y1, side, top, o) => hx(T, R(x0, z0, x1, z1), y0, y1, side, top, o);
/* แผ่นบางติดผนัง (ช่องระบายอากาศ/กระจก/ประตู): axis 'z' → ระนาบ z=k แผ่ไปตาม x · dir = ทิศที่หันออก */
function plate(g, axis, k, dir, s0, s1, y0, y1, rgb) {
  const P = (s, y) => axis == 'z' ? [s, y, k] : [k, y, s], c = P((s0 + s1) / 2, (y0 + y1) / 2);
  c[axis == 'z' ? 2 : 0] -= dir * 10; quad(g, P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1), rgb, c);
}
function flat(g, pts, y, rgb) {                     // พื้นราบ (รูปนูนเท่านั้น) fan triangulation
  for (let i = 1; i < pts.length - 1; i++) {
    const a = [pts[0][0], y, pts[0][1]], b = [pts[i][0], y, pts[i][1]], c = [pts[i + 1][0], y, pts[i + 1][1]];
    if (crs(sub(b, a), sub(c, a))[1] > 0) tri(g, a, b, c, [0, 1, 0], rgb); else tri(g, a, c, b, [0, 1, 0], rgb);
  }
}
function disc(g, cx, y, cz, rx, rz, rgb, n = 24) {
  const P = [], k = i => i / n * Math.PI * 2; for (let i = 0; i < n; i++) P.push([cx + rx * Math.cos(k(i)), cz - rz * Math.sin(k(i))]);
  flat(g, P, y, rgb);
}
function tube(g, a, b, r, rgb, seg = 10, caps = true) {
  const ax = nrm(sub(b, a)), u = nrm(crs(ax, Math.abs(ax[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), w = crs(ax, u);
  const dir = i => { const t = i / seg * Math.PI * 2; return [Math.cos(t) * u[0] + Math.sin(t) * w[0], Math.cos(t) * u[1] + Math.sin(t) * w[1], Math.cos(t) * u[2] + Math.sin(t) * w[2]]; };
  const at = (c, d) => [c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r];
  for (let i = 0; i < seg; i++) {
    const d0 = dir(i), d1 = dir(i + 1), p0 = at(a, d0), p1 = at(a, d1), q0 = at(b, d0), q1 = at(b, d1);
    triN(g, [p0, p1, q1], [d0, d1, d1], rgb); triN(g, [p0, q1, q0], [d0, d1, d0], rgb);
    if (caps) { triN(g, [a, p0, p1], [[-ax[0], -ax[1], -ax[2]], [-ax[0], -ax[1], -ax[2]], [-ax[0], -ax[1], -ax[2]]], rgb); triN(g, [b, q0, q1], [ax, ax, ax], rgb); }
  }
}
/* ก้อนกลม (พุ่มไม้/ทรงต้นไม้) = icosphere + สุ่มสว่าง-มืดเป็นกลุ่มใบ */
const ICO = d => {
  const t = (1 + Math.sqrt(5)) / 2; let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (; d > 0; d--) {
    const m = new Map(), mid = (i, j) => { const k = i < j ? i + '_' + j : j + '_' + i; if (!m.has(k)) { const a = v[i], b = v[j]; v.push(nrm([a[0] + b[0], a[1] + b[1], a[2] + b[2]])); m.set(k, v.length - 1); } return m.get(k); };
    const nf = []; for (const [a, b, c] of f) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } f = nf;
  }
  return { v, f };
};
const ICO0 = ICO(0), ICO1 = ICO(1);
function blob(g, cx, cy, cz, rx, ry, rz, rgb, R_, ico = ICO1) {
  const nz = ico.v.map(q => 1 + .1 * Math.sin(q[0] * 9.1 + q[1] * 5.3 + q[2] * 7.7 + cx * 3.1 + cz));
  ico.f.forEach(f => {
    const k = .82 + .3 * R_(), V = f.map(i => [cx + ico.v[i][0] * rx * nz[i], cy + ico.v[i][1] * ry * nz[i], cz + ico.v[i][2] * rz * nz[i]]);
    const N = f.map(i => nrm([ico.v[i][0] / rx, ico.v[i][1] / ry, ico.v[i][2] / rz]));
    triN(g, V, N, rgb.map(q => Math.min(1, q * k)));
  });
}

window.H3Site = function (THREE, cfg) {
  const R_ = rng(11), tag = cfg.tag || (() => ({ position: { set() { } } }));
  const W = (px, py) => [(py - 582.5) * .2, 2 - (px - 467.5) * .2];            // แปลน(px,py) → โลก [x,z]
  const PW = a => a.map(([px, py]) => W(px, py));
  const PR = ([x0, y0, x1, y1]) => { const a = W(x0, y0), b = W(x1, y1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }; // → [X0,Z0,X1,Z1]
  const rc = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const F = { flat: G(), clad: G(1) }, H = { flat: G(), clad: G(1) }, GN = G(), TR = G();   // F=ถาวร · H=เปลือกอาคาร Phase 1 (เห็นเมื่อถอยไกล) · GN=ผนังโปร่ง+เครื่องปั่นไฟ (เห็นเมื่อซูมเข้า)
  const K = Object.fromEntries(Object.entries({
    out: 0x070d1c, grass: 0x2c5f2a, lawn: 0x387434, road: 0x4b5058, apron: 0x666c74, park: 0x40454d, walk: 0x80868e, rust: 0x6e4636, gravel: 0x5c6168, line: 0xcfd4da,
    hallWall: 0x6a707a, hallRoof: 0x8e949c, rim: 0xb8bec6, louver: 0x262a31, door: 0x1f2228, solar: 0x1b3a78,
    utWall: 0x5d636c, utRoof: 0x757b83, chiller: 0xc2c8cf, chillerTop: 0xd0d5db, fanRing: 0x8a9099, fan: 0x16181d, stack: 0x53585f, muffler: 0x6b7078,
    admDark: 0x2f343c, admMid: 0x6a7079, glass: 0x1b3552, admRoof: 0xa0a6ae, canopy: 0xb4bac2,
    secWall: 0x5d6670, secRoof: 0xb4bac2, gate: 0x2c3036, pillar: 0x565c66, stone: 0x8a8f96,
    fence: 0x858b93, cap: 0x4a4f57, post: 0x666c75, cab: 0xd2a526, trailer: 0x6f7b88, trailerTop: 0x8a95a1, tyre: 0x1a1c20,
    trunk: 0x5a4332, cyp: 0x1c5a2c, tank: 0xaeb4bb, trafo: 0x4d6a58, porcelain: 0x9a6b3a, genset: 0xcfd8f0
  }).map(([k, v]) => [k, hex(v)]));
  const GRN = [0x2f7a3a, 0x3b8c44, 0x256b34, 0x4a9a48, 0x2a6a30].map(hex);
  const SITE = [[162, 20], [1371, 20], [1212, 802], [20, 846]], LOOP = [[190, 48], [1345, 48], [1196, 775], [130, 815]];

  /* ───────── พื้น: นอกไซต์ · สนามหญ้า · ถนนวน · ลานจอด · ถนนกลาง · Substation ───────── */
  flat(F.flat, PW(rc(-1500, -1500, 3000, 3000)), -.8, K.out);
  flat(F.flat, PW(SITE), -.6, K.grass);
  flat(F.flat, PW(LOOP), -.45, K.road);
  flat(F.flat, PW([[40, 845], [120, 830], [85, 1015], [10, 1015]]), -.45, K.road);
  [[305, 85, 1165, 385], [305, 440, 1165, 745]].forEach(r => flat(F.flat, PW(rc(...r)), -.3, K.lawn));
  const HALLS = [[355, 105, 580, 368], [930, 105, 1150, 368], [930, 450, 1150, 715]], UTILS = [[610, 100, 730, 368], [775, 100, 890, 368], [775, 455, 890, 715]];
  const P1H = [350, 445, 585, 720], P1U = [610, 450, 730, 715];
  HALLS.concat(UTILS, [P1H, P1U]).forEach(([a, b, c, d]) => flat(F.flat, PW(rc(a - 18, b - 18, c + 18, d + 18)), -.22, K.apron));   // ลานคอนกรีตรอบอาคาร
  flat(F.flat, PW(rc(738, 90, 768, 325)), -.1, K.park);                                  // ซอยบริการระหว่าง Utility
  flat(F.flat, PW(rc(240, 100, 332, 232)), -.15, K.park);                                // ลานจอดรถ
  flat(F.flat, PW(rc(300, 400, 1135, 420)), -.12, K.rust); flat(F.flat, PW(rc(540, 420, 556, 450)), -.12, K.rust);
  flat(F.flat, PW(rc(1170, 110, 1240, 280)), -.15, K.gravel);                            // ลาน 115 kV
  [[215, 650, 55, 55], [218, 573, 44, 20]].forEach(([px, py, rx, ry]) => { const [x, z] = W(px, py); disc(F.flat, x, -.12, z, ry * .2, rx * .2, K.lawn, 28); });
  /* ทางเดินจาก Security ไป Admin */
  const WALK = PW([[112, 745], [150, 702], [196, 690], [242, 652], [262, 590], [262, 500]]);
  for (let i = 0; i < WALK.length - 1; i++) flat(F.flat, SG(WALK[i], WALK[i + 1], 3.4), -.08, K.walk);
  /* ช่องจอดรถ + รถ */
  for (let py = 105; py <= 230; py += 12.5) { const [x, z0] = W(244, py), z1 = W(264, py)[1], z2 = W(308, py)[1], z3 = W(328, py)[1];
    flat(F.flat, [[x - .06, z0], [x + .06, z0], [x + .06, z1], [x - .06, z1]], -.11, K.line); flat(F.flat, [[x - .06, z2], [x + .06, z2], [x + .06, z3], [x - .06, z3]], -.11, K.line); }
  [[0, 3], [0, 5], [0, 8], [1, 2], [1, 6], [1, 7], [0, 1]].forEach(([side, i]) => {
    const [x] = W(0, 111 + i * 12.5), z = W(side ? 318 : 254, 0)[1], cc = [0xc9ced4, 0x2f3b52, 0x8b2f2f, 0x1f2328, 0xdfe3e8][(i + side) % 5].toString(16).padStart(6, '0');
    bx(F, x - .9, z - 2.2, x + .9, z + 2.2, .25, 1.05, hex(parseInt(cc, 16)), hex(parseInt(cc, 16)), { flat: 1 }); bx(F, x - .8, z - 1.2, x + .8, z + 1.0, 1.05, 1.65, K.glass, K.glass, { flat: 1 });
  });

  /* ───────── รั้วทึบรอบไซต์ + ประตู ───────── */
  const cen = [(162 + 1371 + 1212 + 20) / 4, (20 + 20 + 802 + 846) / 4], ins = (p, k) => [p[0] + (cen[0] - p[0]) * k, p[1] + (cen[1] - p[1]) * k];
  const WP = SITE.map(p => ins(p, .012));
  const wall = (p, q) => {
    const a = W(...p), b = W(...q), len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    hx(F, SG(a, b, .35), 0, 2.6, K.fence, K.cap); hx(F, SG(a, b, .6), 2.6, 2.85, K.cap, K.cap, { flat: 1 });
    const n = Math.max(1, Math.round(len / 4.2));
    for (let i = 0; i <= n; i++) { const c = [a[0] + d[0] * len * i / n, a[1] + d[1] * len * i / n]; hx(F, SG([c[0] - d[0] * .28, c[1] - d[1] * .28], [c[0] + d[0] * .28, c[1] + d[1] * .28], .7), 0, 3.1, K.post, K.cap, { flat: 1 }); }
  };
  for (let i = 0; i < 4; i++) {
    const p = WP[i], q = WP[(i + 1) % 4];
    if (i != 2) { wall(p, q); continue; }
    const t = px => (p[0] - px) / (p[0] - q[0]), pt = k => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k], tA = t(128), tB = t(32);
    wall(p, pt(tA)); wall(pt(tB), q);
    const gA = W(...pt(tA)), gB = W(...pt(tB)), gm = [(gA[0] + gB[0]) / 2, (gA[1] + gB[1]) / 2];
    [gA, gB].forEach(g => bx(F, g[0] - .8, g[1] - .8, g[0] + .8, g[1] + .8, 0, 4.2, K.pillar, K.cap));
    hx(F, SG([gA[0], gA[1] - .6 * Math.sign(gA[1] - gB[1])], [gm[0], gm[1] - .4 * Math.sign(gA[1] - gB[1])], .25), 0, 2.4, K.gate, K.cap, { flat: 1 });
    hx(F, SG([gm[0], gm[1] + .4 * Math.sign(gA[1] - gB[1])], [gB[0], gB[1] + .6 * Math.sign(gA[1] - gB[1])], .25), 0, 2.4, K.gate, K.cap, { flat: 1 });
  }

  /* ───────── Security gatehouse + กำแพงโค้ง ───────── */
  { const [X0, Z0, X1, Z1] = PR([70, 742, 132, 772]);
    bx(F, X0, Z0, X1, Z1, 0, 3.8, K.secWall, null); bx(F, X0 - .9, Z0 - .9, X1 + .9, Z1 + .9, 3.8, 4.15, K.secRoof, K.secRoof, { flat: 1 });
    for (let s = Z0 + 1; s + 1.6 < Z1; s += 2.4) { plate(F.flat, 'x', X1 + .05, 1, s, s + 1.6, 1.2, 3.0, K.glass); plate(F.flat, 'x', X0 - .05, -1, s, s + 1.6, 1.2, 3.0, K.glass); }
    const c = W(101, 757), r = 13, arc = [], a0 = -.9, a1 = 1.0;
    for (let i = 0; i <= 10; i++) { const t = a0 + (a1 - a0) * i / 10; arc.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t) * 1.2]); }
    for (let i = 0; i < 10; i++) hx(F, SG(arc[i], arc[i + 1], .8), 0, 2.5, K.stone, K.cap);
    tag('SECURITY BLDG', '#9fe0ea', 17).position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); }

  /* ───────── Admin (2 ชั้น กระจก+แผงเข้ม หลังคาขาว มีหลังคาคลุมทางเข้า) ───────── */
  { const A = PR([190, 392, 320, 490]), B = PR([205, 255, 300, 392]);
    const glaze = ([X0, Z0, X1, Z1], lv) => lv.forEach(([y0, y1]) => {
      for (let s = X0 + 1.5; s + 2.3 < X1 - 1; s += 2.7) { plate(F.flat, 'z', Z0 - .06, -1, s, s + 2.3, y0, y1, K.glass); plate(F.flat, 'z', Z1 + .06, 1, s, s + 2.3, y0, y1, K.glass); }
      for (let s = Z0 + 1.5; s + 2.3 < Z1 - 1; s += 2.7) { plate(F.flat, 'x', X0 - .06, -1, s, s + 2.3, y0, y1, K.glass); plate(F.flat, 'x', X1 + .06, 1, s, s + 2.3, y0, y1, K.glass); } });
    hx(F, R(...A), 0, 8.4, K.admDark, K.admRoof); glaze(A, [[.9, 3.6], [4.6, 7.4]]);
    hx(F, R(...B), 0, 7.2, K.admMid, K.admRoof); glaze(B, [[.9, 3.4], [4.0, 6.4]]);
    [A, B].forEach(([X0, Z0, X1, Z1], i) => { const h = i ? 7.2 : 8.4; bx(F, X0, Z0, X1, Z0 + .3, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X0, Z1 - .3, X1, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X0, Z0, X0 + .3, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X1 - .3, Z0, X1, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); });
    bx(F, A[0] + 3, A[1] + 5, A[0] + 7, A[1] + 12, 9, 10.6, K.utWall, K.utRoof, { flat: 1 });
    [[A[0] + 10, A[1] + 7], [A[0] + 10, A[1] + 11], [A[0] + 10, A[1] + 15]].forEach(([x, z]) => { disc(F.flat, x, 9.05, z, 1.1, 1.1, K.fanRing, 10); disc(F.flat, x, 9.08, z, .85, .85, K.fan, 10); });
    const [C0, D0, C1, D1] = PR([235, 490, 300, 512]);   // หลังคาคลุมทางเข้า
    bx(F, C0, D0, C1, D1, 3.6, 3.95, K.canopy, K.canopy, { flat: 1 }); [[C0 + .4, D0 + .4], [C0 + .4, D1 - .4], [C1 - .4, D0 + .4], [C1 - .4, D1 - .4]].forEach(([x, z]) => bx(F, x - .18, z - .18, x + .18, z + .18, 0, 3.6, K.canopy, K.canopy, { flat: 1 }));
    tag('ADMIN BLDG', '#9fe0ea', 17).position.set((A[0] + A[2]) / 2, 13, (A[1] + A[3]) / 2); }

  /* ───────── Data Hall: หลังคาลาดเอียง (สูงฝั่ง G → ต่ำฝั่ง A ตาม Section-2) + ขอบหลังคาขาว + แผงโซลาร์ ───────── */
  function hall(T, px) {
    const [X0, Z0, X1, Z1] = PR(px), HL = 9.2, HH = 11.8, hz = [HL, HL, HH, HH], up = a => a.map(v => v + .5);
    hx(T, R(X0, Z0, X1, Z1), 0, hz, K.hallWall, K.hallRoof);
    hx(T, R(X0, Z0, X0 + .5, Z1), hz, up(hz), K.rim, K.rim, { flat: 1 }); hx(T, R(X1 - .5, Z0, X1, Z1), hz, up(hz), K.rim, K.rim, { flat: 1 });
    hx(T, R(X0, Z0, X1, Z0 + .5), HL, HL + .5, K.rim, K.rim, { flat: 1 }); hx(T, R(X0, Z1 - .5, X1, Z1), HH, HH + .5, K.rim, K.rim, { flat: 1 });
    const ry = z => HL + (z - Z0) / (Z1 - Z0) * (HH - HL) + .12, mx = 4.1, mz = 2.1;
    for (let x = X0 + 3.5; x + mx <= X1 - 3.5; x += mx + .22) for (let z = Z0 + 3.2; z + mz <= Z1 - 3.2; z += mz + .22) {
      const k = .9 + .2 * R_(), c = K.solar.map(v => v * k);
      quad(T.flat, [x, ry(z), z], [x + mx, ry(z), z], [x + mx, ry(z + mz), z + mz], [x, ry(z + mz), z + mz], c, [x + mx / 2, ry(z) - 5, z + mz / 2]);
    }
    plate(T.flat, 'z', Z0 - .05, -1, X0 + 2, X1 - 2, HL - 3.6, HL - 1.5, K.louver); plate(T.flat, 'z', Z1 + .05, 1, X0 + 2, X1 - 2, HH - 3.6, HH - 1.5, K.louver);
    [Z0 + 11, Z1 - 11].forEach(zc => { plate(T.flat, 'x', X1 + .05, 1, zc - 2.3, zc + 2.3, 0, 4.2, K.door); bx(T, X1, zc - 3.2, X1 + 1.8, zc + 3.2, 4.7, 4.9, K.rim, K.rim, { flat: 1 }); });
    plate(T.flat, 'x', X0 - .05, -1, (Z0 + Z1) / 2 - 1, (Z0 + Z1) / 2 + 1, 0, 2.3, K.door);
    return [(X0 + X1) / 2, HH, (Z0 + Z1) / 2];
  }
  /* ───────── Utility: 2 ชั้น + หอบันได + ชิลเลอร์เรียงแถวบนหลังคา (+ปล่องไอเสียเครื่องปั่นไฟ) ───────── */
  function util(T, px, o = {}) {
    const [X0, Z0, X1, Z1] = PR(px), HU = 10.5, tw = 8.5, zc = (Z0 + Z1) / 2, sx = X0 + tw;
    hx(T, R(X0, Z0, X1, Z1), 0, HU, K.utWall, K.utRoof); bx(T, X0, Z0, sx, Z1, HU, HU + 3.4, K.utWall, K.utRoof);
    bx(T, sx, Z0, X1, Z0 + .4, HU, HU + .8, K.utWall, K.rim); bx(T, sx, Z1 - .4, X1, Z1, HU, HU + .8, K.utWall, K.rim); bx(T, X1 - .4, Z0 + .4, X1, Z1 - .4, HU, HU + .8, K.utWall, K.rim);
    for (let x = sx + 1; x + 5.4 <= X1 - 1; x += 6.4) [[1, 4.6], [5.6, 9.2]].forEach(([y0, y1]) => { plate(T.flat, 'z', Z0 - .05, -1, x, x + 5.4, y0, y1, K.louver); plate(T.flat, 'z', Z1 + .05, 1, x, x + 5.4, y0, y1, K.louver); });
    [zc - 6, zc + 6].forEach(z => plate(T.flat, 'x', X1 + .05, 1, z - 2.3, z + 2.3, 0, 4.4, K.door));
    for (let z = Z0 + 3; z + 1.6 < Z1 - 2; z += 4.2) plate(T.flat, 'x', X0 - .05, -1, z, z + 1.6, 1.5, 12, K.glass);
    const mz = 6.4, z0c = zc - (3 * mz + 1.6) / 2, nr = Math.floor((X1 - sx - 5) / 6.1);
    for (let r = 0; r < nr; r++) {
      const xc = sx + 3.8 + r * 6.1;
      for (let m = 0; m < 3; m++) {
        const za = z0c + m * (mz + .8), zb = za + mz;
        bx(T, xc - 1.3, za, xc + 1.3, zb, HU + .5, HU + 3.1, K.chiller, K.chillerTop, { flat: 1 });
        for (let fx = -1; fx <= 1; fx += 2) for (let k = 0; k < 3; k++) { const fz = za + (k + .5) * mz / 3; disc(T.flat, xc + fx * .65, HU + 3.13, fz, 1.0, 1.0, K.fanRing, 10); disc(T.flat, xc + fx * .65, HU + 3.16, fz, .8, .8, K.fan, 10); }
      }
    }
    (o.stacks || []).forEach(py => { const x = W(0, py)[0], zs = Z0 - 1.7;
      tube(T.flat, [x, .2, zs], [x, HU + 5.5, zs], .42, K.stack, 10); tube(T.flat, [x, 2, zs], [x, 6.6, zs], .75, K.muffler, 12);
      tube(T.flat, [x, HU - 2.2, zs], [x, HU - 2.2, Z0], .34, K.stack, 8); tube(T.flat, [x, HU + 5.5, zs], [x, HU + 5.9, zs], .6, K.fan, 10); });
    return [(X0 + X1) / 2, HU + 3.4, zc];
  }
  HALLS.forEach(p => { const c = hall(F, p); tag('DATA HALL BLDG', '#9fe0ea', 18).position.set(c[0], c[1] + 3, c[2]); });
  UTILS.forEach(p => { const c = util(F, p); tag('UTILITY BLDG', '#9fe0ea', 16).position.set(c[0], c[1] + 3.5, c[2]); });
  hall(H, P1H); const pu = util(H, P1U, { stacks: [517, 562, 607, 652] }); tag('UTILITY BLDG · GENSET', '#9fe0ea', 24).position.set(pu[0], 17.5, pu[2]);
  [[537, 368, 560, 400], [718, 368, 730, 400], [775, 368, 790, 400], [1110, 368, 1130, 400]].forEach(r => { const [a, b, c, d] = PR(r); bx(F, a, b, c, d, 0, 3.2, K.utWall, K.rim); });   // ทางเชื่อม

  /* ───────── ถังน้ำมัน · Substation 115 kV ───────── */
  { const [X0, Z0, X1, Z1] = PR([625, 771, 688, 790]), xc = (X0 + X1) / 2;
    bx(F, X0 - .4, Z0, X1 + .4, Z1, 0, .5, K.apron, K.apron, { flat: 1 }); tube(F.flat, [xc, 2.3, Z0 + .8], [xc, 2.3, Z1 - .8], 1.7, K.tank, 16);
    [.22, .5, .78].forEach(t => bx(F, X0 + .3, Z1 + (Z0 - Z1) * t - .3, X1 - .3, Z1 + (Z0 - Z1) * t + .3, .5, 1.1, K.pillar, K.pillar, { flat: 1 }));
    tag('FUEL TANK', '#9fe0ea', 12).position.set(xc, 6, (Z0 + Z1) / 2); }
  { const [X0, Z0, X1, Z1] = PR([1170, 110, 1240, 280]);
    [[X0, Z0, X1, Z0], [X1, Z0, X1, Z1], [X1, Z1, X0, Z1], [X0, Z1, X0, Z0]].forEach(([a, b, c, d]) => hx(F, SG([a, b], [c, d], .12), 0, 2.4, K.cap, K.cap, { flat: 1 }));
    [[1180, 130, 1195, 150], [1205, 130, 1220, 150], [1180, 180, 1195, 200], [1205, 180, 1220, 200]].forEach(r => { const [a, b, c, d] = PR(r), cx = (a + c) / 2, cz = (b + d) / 2;
      bx(F, a, b, c, d, .5, 3.9, K.trafo, K.trafo, { flat: 1 }); bx(F, a - .9, b + .5, a, d - .5, .8, 3.3, K.stack, K.stack, { flat: 1 });
      [-1, 0, 1].forEach(k => tube(F.flat, [cx, 3.9, cz + k * 1.1], [cx, 5.6, cz + k * 1.1], .24, K.porcelain, 8)); });
    [[X0 + 1.5, Z0 + 1.5], [X0 + 1.5, Z1 - 1.5]].forEach(([x, z]) => tube(F.flat, [x, 0, z], [x, 13, z], .14, K.pillar, 6));
    const [a, b, c, d] = PR([1195, 235, 1232, 270]); bx(F, a, b, c, d, 0, 3.6, K.utWall, K.utRoof);
    tag('115 kV SUBSTATION', '#9fe0ea', 22).position.set((X0 + X1) / 2, 8, (Z0 + Z1) / 2); }

  /* ───────── รถเทรลเลอร์เครื่องปั่นไฟ (ตามตำแหน่งในแปลน) ───────── */
  const truck = (px, py, alongX, s) => {
    const [x, z] = W(px, py), q = (a0, a1, b0, b1, y0, y1, sd, tp) => alongX ? bx(F, x + s * a0, z + b0, x + s * a1, z + b1, y0, y1, sd, tp, { flat: tp !== K.trailerTop }) : bx(F, x + b0, z + s * a0, x + b1, z + s * a1, y0, y1, sd, tp, { flat: tp !== K.trailerTop });
    q(-6.5, 4, -1.3, 1.3, .95, 3.9, K.trailer, K.trailerTop); q(-6.5, 4.4, -1.1, 1.1, .45, .95, K.tyre, K.tyre); q(4.5, 7.4, -1.25, 1.25, .55, 3.2, K.cab, K.cab);
    [-5, -3.6, 5.5].forEach(a => q(a - .6, a + .6, -1.45, 1.45, 0, 1, K.tyre, K.tyre));
  };
  truck(150, 610, true, 1); truck(1290, 200, true, -1); truck(385, 755, false, -1); truck(745, 100, true, -1);

  /* ───────── ต้นไม้: แถวไซเปรสริมรั้วด้านหน้า · ต้นกลมตามถนน/ลาน/สนาม ───────── */
  flat(F.flat, PW([[-20, 846], [150, 822], [112, 1015], [-30, 1015]]), -.6, K.grass);   // สนามหญ้าข้างถนนทางเข้า
  const round = (px, py, s = 1) => { const [x, z] = W(px, py); s *= .85 + .35 * R_(); tube(TR, [x, 0, z], [x, 3.4 * s, z], .24 * s, K.trunk, 6, false); blob(TR, x, 4.9 * s, z, 2.7 * s, 2.5 * s, 2.7 * s, GRN[(R_() * GRN.length) | 0], R_); };
  const cyp = (px, py, s = 1) => { const [x, z] = W(px, py); s *= .9 + .3 * R_(); blob(TR, x, 3.3 * s, z, 1.0 * s, 3.4 * s, 1.0 * s, K.cyp, R_); };
  for (let px = 345; px <= 1185; px += 13) cyp(px, 802 + (1212 - px) / 1192 * 44 - 13);
  for (let py = 868; py <= 1000; py += 26) { round(40 - (py - 845) * .176 - 16, py, .9); round(120 - (py - 830) * .189 + 16, py, .9); }
  for (let px = 372; px <= 560; px += 26) round(px, 756, .8);
  [[215, 125], [215, 155], [232, 100], [213, 185], [222, 214], [262, 92], [170, 640], [190, 606], [225, 602], [255, 640], [250, 690], [185, 700], [215, 650], [150, 560], [160, 520], [122, 700], [262, 712], [48, 715], [95, 640], [70, 600], [296, 330], [300, 460]].forEach(([a, b]) => round(a, b, a == 215 && b == 650 ? 1.35 : 1));
  [[210, 570], [225, 575], [196, 572], [235, 573]].forEach(([a, b]) => { const [x, z] = W(a, b); blob(TR, x, .9, z, 1.2, .9, 1.2, GRN[2], R_, ICO0); });

  /* ───────── ประกอบ mesh ───────── */
  const group = new THREE.Group(), shell = new THREE.Group(), near = new THREE.Group(), mats = [];
  const ct = (() => { if (typeof document == 'undefined') return null; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#eef0f3'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)'; g.fillRect(i * 32, 0, 32, 128); g.fillStyle = 'rgba(15,20,30,.34)'; g.fillRect(i * 32, 0, 2, 128); }
    g.fillStyle = 'rgba(15,20,30,.38)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 1);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
  const lam = o => { const m = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)); mats.push(m); return m; };
  const mFlat = lam(), mClad = lam(ct ? { map: ct } : {});
  const mk = (g, m, into) => {
    if (!g.p.length) return; const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3));
    if (g.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2)); into.add(new THREE.Mesh(geo, m));
  };
  /* ผนังโปร่ง + เครื่องปั่นไฟ 4 ชุด ของ Utility Phase 1 (เห็นเมื่อซูมเข้า — ตอนถอยไกลจะกลายเป็นตัวอาคารทึบ) */
  { const [X0, Z0, X1, Z1] = PR(P1U), N = { flat: GN, clad: GN };
    [[650, 510, 700, 525], [650, 555, 700, 570], [650, 600, 700, 615], [650, 645, 700, 660]].forEach(r => { const [a, b, c, d] = PR(r); bx(N, a, b, c, d, 0, 3.5, K.genset, K.genset, { flat: 1 }); });
    const bg = new THREE.BoxGeometry(X1 - X0, 14, Z1 - Z0), ghost = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: 0x3b8e9c, transparent: true, opacity: .2, depthWrite: false }));
    ghost.position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); mats.push(ghost.material); near.add(ghost);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({ color: 0x5fb4ff, transparent: true, opacity: .3 })); ed.position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); near.add(ed); mats.push(ed.material); }
  mk(F.flat, mFlat, group); mk(F.clad, mClad, group); mk(TR, mFlat, group); mk(H.flat, mFlat, shell); mk(H.clad, mClad, shell); mk(GN, mFlat, near);
  group.add(shell); group.add(near); shell.visible = false;
  /* d = ระยะกล้อง: ไกล → เห็นอาคาร Phase 1 ทึบ (หลังคา+เปลือก) · ใกล้ → เห็นภายใน Hall/Rack · mode: auto|on|off */
  const update = (d, mode) => { const on = mode == 'on' || (mode != 'off' && d > 150); if (shell.visible == on) return 0; shell.visible = on; near.visible = !on; return 1; };
  const dispose = () => { group.traverse(o => { o.geometry && o.geometry.dispose(); }); mats.forEach(m => m.dispose()); ct && ct.dispose(); };
  return { group, update, dispose, W };
};
})();
