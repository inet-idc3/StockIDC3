/* ════════════════════════════════════════════════════════════════
 *  Hall 3D (Phase 2) — Site context (บริบทรอบ Hall) ตามแปลนจริง · v2 "สมจริงขึ้น" (อ้างอิงภาพถ่ายหน้างาน)
 *  อาคาร Data Hall (หลังคาลาดเอียง + ครีบกระจกดำด้านยาว + ผนังหัวอาคารสีแชมเปญ) · Utility (ชิลเลอร์บนหลังคา)
 *  Admin · Security · รั้วคอนกรีตสีอ่อน · ต้นไม้/ปาล์ม · ถนนคอนกรีต · ลานจอดรถมีหลังคา · Substation · ถังน้ำมัน · รถเทรลเลอร์เครื่องปั่นไฟ
 *  ใหม่ใน v2:
 *   · ท้องฟ้า (ไล่สี + เมฆ + ดวงอาทิตย์/ดาว) · เทือกเขา/เนินป่า/ทุ่งนอกรั้ว · หมอกตามบรรยากาศ
 *   · เวลา 3 แบบ: day | dusk | night  → S.setTime('day'|'dusk'|'night')  (night/dusk = ไฟหน้าต่าง + เสาไฟ + แสงตกพื้น)
 *   · เงาจริงจาก Directional light — shadow map แบบ "ถ่ายครั้งเดียว" (autoUpdate=false) จึงไม่เพิ่มภาระตอนลาก/ซูม
 *   · พื้นผิวคอนกรีต/หญ้า/ผนัง/หลังคา standing-seam · ขอบถนน · ปาล์ม · ไม้ค้ำต้นไม้ · เสาไฟฟ้าแรงสูงนอกรั้ว
 *  ยังคง: BufferGeometry + vertex color ไม่กี่ก้อน (draw call น้อย) · ไม่ต้องโหลดไฟล์ภายนอก · ไม่มี animation loop
 *  Phase 2: เหมือน Phase 1 ทุกอย่าง แต่ Hall ที่ "โปร่งให้เห็น Rack" คือตึกซ้ายบน (Phase 2) ส่วน Phase 1 กลายเป็นอาคารทึบ — ส่ง cfg.phase = 2
 *       ระบบจะเลื่อนผังไซต์ทั้งก้อนให้ตึก Phase 2 มาอยู่ที่จุดกำเนิด (0,0) ตรงกับผัง Rack
 *  ใช้: const S = H3Site2(THREE, { tag, scene, renderer, hemi, sun, time, phase: 2 }); scene.add(S.group); S.update(camDist, 'auto'|'on'|'off', camera)
 *       cfg.solar=true → วาดแผงโซลาร์บนหลังคา Hall ตามแปลน (ค่าเริ่มต้นปิด เพราะภาพถ่ายหน้างานยังเป็นหลังคาโลหะล้วน) · cfg.shadows=false → ปิดเงา · cfg.shadowSize=2048|4096
 *       ถ้าไม่ส่ง scene/renderer/hemi/sun มา โมดูลจะทำงานได้เหมือนเดิม (ไม่มีเงา/ไม่ปรับหมอก)
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
const G = (uv, s) => ({ p: [], n: [], c: [], u: uv ? [] : null, s: s || PAN });   // s = ขนาด (ม.) ต่อ 1 tile ของ texture

/* ── primitive: สามเหลี่ยม/สี่เหลี่ยม (flat normal) ── */
function tri(g, a, b, c, n, rgb) {
  for (const q of [a, b, c]) {
    g.p.push(q[0], q[1], q[2]); g.n.push(n[0], n[1], n[2]); g.c.push(rgb[0], rgb[1], rgb[2]);
    if (g.u) { if (Math.abs(n[1]) > .7) g.u.push(q[0] / g.s, q[2] / g.s); else g.u.push((q[0] * Math.abs(n[2]) + q[2] * Math.abs(n[0])) / g.s, q[1] / g.s); }
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
/* ── ก้อนทรงสี่เหลี่ยมคางหมู/ลาดเอียง: f = 4 จุด [x,z] · y0,y1 = ตัวเลขหรืออาร์เรย์ 4 ค่า · o.flat = ผนังไม่ใช้ texture · o.rf = หลังคาใช้ texture standing-seam ── */
function hx(T, f, y0, y1, side, top, o = {}) {
  const Y0 = Array.isArray(y0) ? y0 : [y0, y0, y0, y0], Y1 = Array.isArray(y1) ? y1 : [y1, y1, y1, y1];
  const B = f.map((q, i) => [q[0], Y0[i], q[1]]), U = f.map((q, i) => [q[0], Y1[i], q[1]]);
  const ctr = [0, 0, 0]; B.concat(U).forEach(q => { ctr[0] += q[0] / 8; ctr[1] += q[1] / 8; ctr[2] += q[2] / 8; });
  const gs = o.flat ? T.flat : T.clad;
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(gs, B[i], B[j], U[j], U[i], side, ctr); }
  if (top) quad(o.rf && T.roof ? T.roof : T.flat, U[0], U[1], U[2], U[3], top, ctr);
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
/* ผนังแถบแนวตั้งสลับสี (เหมือนอาคาร Utility ในภาพจริง) */
function strips(g, axis, k, dir, s0, s1, y0, y1, cols, w, R_) {
  let i = 0; w = w || 3;
  for (let s = s0; s < s1 - .01; s += w, i++) { const j = .94 + .1 * R_(), c = cols[i % cols.length].map(v => Math.min(1, v * j)); plate(g, axis, k, dir, s, Math.min(s + w, s1), y0, y1, c); }
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
/* ก้อนกลม (พุ่มไม้/ทรงต้นไม้/เนินเขา) = icosphere + สุ่มสว่าง-มืดเป็นกลุ่มใบ + ด้านบนสว่างกว่าด้านล่าง (ให้ดูมีมิติ) */
const ICO = d => {
  const t = (1 + Math.sqrt(5)) / 2; let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (; d > 0; d--) {
    const m = new Map(), mid = (i, j) => { const k = i < j ? i + '_' + j : j + '_' + i; if (!m.has(k)) { const a = v[i], b = v[j]; v.push(nrm([a[0] + b[0], a[1] + b[1], a[2] + b[2]])); m.set(k, v.length - 1); } return m.get(k); };
    const nf = []; for (const [a, b, c] of f) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } f = nf;
  }
  return { v, f };
};
const ICO0 = ICO(0), ICO1 = ICO(1), ICO2 = ICO(2);
function blob(g, cx, cy, cz, rx, ry, rz, rgb, R_, ico = ICO1, vr = .3) {
  const nz = ico.v.map(q => 1 + .1 * Math.sin(q[0] * 9.1 + q[1] * 5.3 + q[2] * 7.7 + cx * 3.1 + cz));
  ico.f.forEach(f => {
    const V = f.map(i => [cx + ico.v[i][0] * rx * nz[i], cy + ico.v[i][1] * ry * nz[i], cz + ico.v[i][2] * rz * nz[i]]);
    const N = f.map(i => nrm([ico.v[i][0] / rx, ico.v[i][1] / ry, ico.v[i][2] / rz]));
    const k = (1 - vr / 2 + vr * R_()) * (.74 + .34 * ((N[0][1] + N[1][1] + N[2][1]) / 3 * .5 + .5));
    triN(g, V, N, rgb.map(q => Math.min(1, q * k)));
  });
}

window.H3Site2 = function (THREE, cfg) {
  const R_ = rng(11), tag0 = cfg.tag || (() => ({ position: { set() { } } })), SOLAR = cfg.solar === true;
  /* ป้ายชื่อเป็นของ scene (ไม่ได้อยู่ใน group) → ชดเชย offset ของไซต์ให้ตรงกับอาคาร */
  const tag = (...a) => { const s = tag0(...a), p = s.position, set = p.set.bind(p); p.set = (x, y, z) => set(x + OX, y, z + OZ); return s; };
  const W = (px, py) => [(py - 582.5) * .2, 2 - (px - 467.5) * .2];            // แปลน(px,py) → โลก [x,z]
  const PW = a => a.map(([px, py]) => W(px, py));
  const PR = ([x0, y0, x1, y1]) => { const a = W(x0, y0), b = W(x1, y1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }; // → [X0,Z0,X1,Z1]
  const rc = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  /* F=ถาวร · H=เปลือกอาคาร Phase 1 (เห็นเมื่อถอยไกล) · GN=ผนังโปร่ง+เครื่องปั่นไฟ (เห็นเมื่อซูมเข้า)
     roof = หลังคา (texture standing-seam) · glow = กระจก/ช่องแสง (สว่างตอนค่ำ) · lamp = โคมไฟเสา
     GC/GG/GO = พื้นคอนกรีต/หญ้า/นอกไซต์ (มี texture รับเงาอย่างเดียว) · OUT = เนินเขา/แนวป่า/เสาไฟฟ้านอกรั้ว */
  const F = { flat: G(), clad: G(1), roof: G(1), glow: G(), lamp: G() }, H = { flat: G(), clad: G(1), roof: G(1), glow: G() }, GN = G(), TR = G(), OUT = G();
  const GC = G(1, 12), GG = G(1, 10), GO = G(1, 16), OT = { flat: OUT, clad: OUT, roof: OUT }, LT = { flat: F.lamp, clad: F.lamp };
  /* พาเลตสีอ้างอิงจากภาพถ่ายหน้างาน: หลังคาเทาเงิน · ผนังหัวอาคารสีแชมเปญ · ครีบกระจกดำน้ำเงิน · รั้วคอนกรีตสีอ่อน · ถนนคอนกรีตสว่าง */
  const K = Object.fromEntries(Object.entries({
    field: 0x76804a, grass: 0x768548, lawn: 0x859350, road: 0x93969a, apron: 0xa3a6a9, park: 0x8f9296, walk: 0xb2b5b8, rust: 0x8a6a52, gravel: 0x8c8f92, line: 0xeceff2, curb: 0xc0c3c6,
    hallWall: 0xb9bdc4, endWall: 0xb4a07c, hallRoof: 0xaeb2b9, rim: 0xd6d9de, fin: 0x2b323d, plinth: 0x6e727a, louver: 0x2a2f37, door: 0x2a2e35, solar: 0x1b3a78,
    utWall: 0x9ca3ac, utTan: 0x9d8d72, utRoof: 0xa2a7ae, chiller: 0xc8cdd4, chillerTop: 0xd6dade, coil: 0x4a5058, fanRing: 0x8a9099, fan: 0x1a1c21, stack: 0x575c63, muffler: 0x6b7078,
    admDark: 0x5a4a3e, admMid: 0x85745f, admRoof: 0xc9cdd2, canopy: 0xc4c8cd,
    secWall: 0x6b7480, secRoof: 0xb4b9bf, gate: 0x2c3036, pillar: 0x6a707a, stone: 0xa0a5ab,
    fence: 0xcdd0d3, cap: 0x8f949b, post: 0xb4b8bd, cab: 0xd2a526, trailer: 0x7d8895, trailerTop: 0x98a2ad, tyre: 0x1a1c20,
    trunk: 0x5a4332, cyp: 0x1f5e30, tank: 0xc1c6cc, trafo: 0x56725f, porcelain: 0x9a6b3a, genset: 0xcfd8f0,
    pole: 0x5b6068, palmTrunk: 0x6b5a45, stake: 0x8a6a45, carGlass: 0x2a3947, wood: 0x4a4038
  }).map(([k, v]) => [k, hex(v)]));
  const GRN = [0x2f7a3a, 0x3b8c44, 0x256b34, 0x4a9a48, 0x2a6a30].map(hex), PALM = [0x3f8a3a, 0x4f9a42, 0x347a35].map(hex);
  const SITE = [[162, 20], [1371, 20], [1212, 802], [20, 846]], LOOP = [[190, 48], [1345, 48], [1196, 775], [130, 815]];
  const cen = [(162 + 1371 + 1212 + 20) / 4, (20 + 20 + 802 + 846) / 4], ins = (p, k) => [p[0] + (cen[0] - p[0]) * k, p[1] + (cen[1] - p[1]) * k];
  const [CX, CZ] = W(...cen);
  const lit = () => { const k = .62 + .38 * R_(); return [k, k, k]; };          // หน้าต่างแต่ละบานสว่างไม่เท่ากัน
  const LAMP = [];

  /* ───────── พื้น: นอกไซต์ (ทุ่ง) · สนามหญ้า · ถนนวน · ลานจอด · ถนนกลาง · Substation ───────── */
  const OC = [0x5f7442, 0x72804a, 0x84804f, 0x8f7e58, 0x4f6a3c].map(hex), hs = (i, j) => { const t = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return t - Math.floor(t); };
  const vn = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (hs(i, j) * (1 - u) + hs(i + 1, j) * u) * (1 - v) + (hs(i, j + 1) * (1 - u) + hs(i + 1, j + 1) * u) * v; };
  const oc = (x, z) => { const n = vn(x / 260, z / 260) * .6 + vn(x / 80, z / 80) * .3 + vn(x / 28, z / 28) * .1, k = Math.min(.999, n * 1.25) * (OC.length - 1), i = Math.floor(k), f = k - i, a = OC[i], b = OC[i + 1] || OC[i], j = .94 + .1 * vn(x / 9, z / 9); return [0, 1, 2].map(q => Math.min(1, (a[q] + (b[q] - a[q]) * f) * j)); };
  { const N = 54, C = 48, o = -N * C / 2, y = -.8, push = (x, z) => { GO.p.push(x, y, z); GO.n.push(0, 1, 0); const c = oc(x, z); GO.c.push(c[0], c[1], c[2]); GO.u.push(x / 16, z / 16); };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x0 = o + i * C, z0 = o + j * C, x1 = x0 + C, z1 = z0 + C; [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]].forEach(([x, z]) => push(x, z)); } }
  flat(GG, PW(SITE), -.6, K.grass);
  flat(GC, PW(LOOP), -.45, K.road);
  flat(GC, PW([[40, 845], [120, 830], [85, 1015], [10, 1015]]), -.45, K.road);
  [[305, 85, 1165, 385], [305, 440, 1165, 745]].forEach(r => { flat(GG, PW(rc(...r)), -.3, K.lawn);
    const P = PW(rc(...r)); for (let i = 0; i < 4; i++) hx(F, SG(P[i], P[(i + 1) % 4], .4), -.45, -.17, K.curb, K.curb, { flat: 1 }); });   // ขอบคันหินรอบสนามหญ้า
  const HALLS = [[355, 105, 580, 368], [930, 105, 1150, 368], [930, 450, 1150, 715]], UTILS = [[610, 100, 730, 368], [775, 100, 890, 368], [775, 455, 890, 715]];
  const P1H = [350, 445, 585, 720], P1U = [610, 450, 730, 715];
  /* PH = เฟสที่ "โปร่งให้เห็น Rack" · Phase 2 = ตึกซ้ายบน (ขนาดเท่า Phase 1 เลื่อนขึ้น DY พิกเซลแปลน) · Phase 1 กลายเป็นอาคารทึบ */
  const PH = cfg.phase == 2 ? 2 : 1, DY = 345, up = r => [r[0], r[1] - DY, r[2], r[3] - DY];
  const TH = PH == 2 ? up(P1H) : P1H, TU = PH == 2 ? up(P1U) : P1U, OH = PH == 2 ? HALLS.slice(1).concat([P1H]) : HALLS, OU = PH == 2 ? UTILS.slice(1).concat([P1U]) : UTILS;
  const GEN = [517, 562, 607, 652], ctrOf = r => { const [a, b, c, d] = PR(r); return [(a + c) / 2, (b + d) / 2]; }, c0 = ctrOf(P1H), c1 = ctrOf(TH), OX = c0[0] - c1[0], OZ = c0[1] - c1[1];   // OX/OZ = ระยะเลื่อนไซต์ให้ตึกเป้าหมายอยู่ที่จุดกำเนิด
  OH.concat(OU, [TH, TU]).forEach(([a, b, c, d]) => flat(GC, PW(rc(a - 18, b - 18, c + 18, d + 18)), -.22, K.apron));   // ลานคอนกรีตรอบอาคาร
  flat(GC, PW(rc(738, 90, 768, 325)), -.1, K.park);                                  // ซอยบริการระหว่าง Utility
  flat(GC, PW(rc(240, 100, 332, 232)), -.15, K.park);                                // ลานจอดรถ
  flat(GC, PW(rc(300, 400, 1135, 420)), -.12, K.rust); flat(GC, PW(rc(540, 420, 556, 450)), -.12, K.rust);
  flat(GG, PW(rc(1170, 110, 1240, 280)), -.15, K.gravel);                            // ลาน 115 kV (กรวด)
  [[215, 650, 55, 55], [218, 573, 44, 20]].forEach(([px, py, rx, ry]) => { const [x, z] = W(px, py); disc(GG, x, -.12, z, ry * .2, rx * .2, K.lawn, 28); });
  /* ทางเดินจาก Security ไป Admin */
  const WALK = PW([[112, 745], [150, 702], [196, 690], [242, 652], [262, 590], [262, 500]]);
  for (let i = 0; i < WALK.length - 1; i++) flat(GC, SG(WALK[i], WALK[i + 1], 3.4), -.08, K.walk);
  /* ช่องจอดรถ + รถ */
  for (let py = 105; py <= 230; py += 12.5) { const [x, z0] = W(244, py), z1 = W(264, py)[1], z2 = W(308, py)[1], z3 = W(328, py)[1];
    flat(F.flat, [[x - .06, z0], [x + .06, z0], [x + .06, z1], [x - .06, z1]], -.11, K.line); flat(F.flat, [[x - .06, z2], [x + .06, z2], [x + .06, z3], [x - .06, z3]], -.11, K.line); }
  [[0, 3], [0, 5], [0, 8], [1, 2], [1, 6], [1, 7], [0, 1]].forEach(([side, i]) => {
    const [x] = W(0, 111 + i * 12.5), z = W(side ? 318 : 254, 0)[1], cc = hex([0xc9ced4, 0x2f3b52, 0x8b2f2f, 0x1f2328, 0xdfe3e8][(i + side) % 5]);
    bx(F, x - .9, z - 2.2, x + .9, z + 2.2, .25, 1.05, cc, cc, { flat: 1 }); bx(F, x - .8, z - 1.2, x + .8, z + 1.0, 1.05, 1.62, K.carGlass, cc, { flat: 1 });
    [[-1, -1.4], [-1, 1.4], [1, -1.4], [1, 1.4]].forEach(([sx, sz]) => bx(F, x + sx * .78 - .1, z + sz - .38, x + sx * .78 + .1, z + sz + .38, -.1, .6, K.tyre, K.tyre, { flat: 1 }));
  });
  /* หลังคาลานจอดรถ (ตามภาพถ่าย: carport หลังคาขาว 2 แถว) */
  [[244, 264], [308, 328]].forEach(([p0, p1]) => { const x0 = W(0, 100)[0], x1 = W(0, 236)[0], z0 = W(p1, 0)[1] - .5, z1 = W(p0, 0)[1] + .5;
    bx(F, x0, z0, x1, z1, 3.1, 3.4, K.canopy, K.canopy, { flat: 1 });
    for (let x = x0 + .6; x <= x1; x += 6.3) [z0 + .3, z1 - .3].forEach(z => bx(F, x - .1, z - .1, x + .1, z + .1, -.1, 3.1, K.pillar, K.pillar, { flat: 1 })); });

  /* ───────── รั้วคอนกรีตรอบไซต์ + ประตู ───────── */
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
    for (let s = Z0 + 1; s + 1.6 < Z1; s += 2.4) { plate(F.glow, 'x', X1 + .05, 1, s, s + 1.6, 1.2, 3.0, lit()); plate(F.glow, 'x', X0 - .05, -1, s, s + 1.6, 1.2, 3.0, lit()); }
    const c = W(101, 757), r = 13, arc = [], a0 = -.9, a1 = 1.0;
    for (let i = 0; i <= 10; i++) { const t = a0 + (a1 - a0) * i / 10; arc.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t) * 1.2]); }
    for (let i = 0; i < 10; i++) hx(F, SG(arc[i], arc[i + 1], .8), 0, 2.5, K.stone, K.cap);
    tag('SECURITY BLDG', '#9fe0ea', 17).position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); }

  /* ───────── Admin (2 ชั้น กระจก+แผงสีบรอนซ์เข้ม หลังคาขาว มีหลังคาคลุมทางเข้า) ───────── */
  { const A = PR([190, 392, 320, 490]), B = PR([205, 255, 300, 392]);
    const glaze = ([X0, Z0, X1, Z1], lv) => lv.forEach(([y0, y1]) => {
      for (let s = X0 + 1.5; s + 2.3 < X1 - 1; s += 2.7) { plate(F.glow, 'z', Z0 - .06, -1, s, s + 2.3, y0, y1, lit()); plate(F.glow, 'z', Z1 + .06, 1, s, s + 2.3, y0, y1, lit()); }
      for (let s = Z0 + 1.5; s + 2.3 < Z1 - 1; s += 2.7) { plate(F.glow, 'x', X0 - .06, -1, s, s + 2.3, y0, y1, lit()); plate(F.glow, 'x', X1 + .06, 1, s, s + 2.3, y0, y1, lit()); } });
    hx(F, R(...A), 0, 8.4, K.admDark, K.admRoof, { rf: 1 }); glaze(A, [[.9, 3.6], [4.6, 7.4]]);
    hx(F, R(...B), 0, 7.2, K.admMid, K.admRoof, { rf: 1 }); glaze(B, [[.9, 3.4], [4.0, 6.4]]);
    bx(F, A[0] - .15, A[1] - .15, A[2] + .15, A[3] + .15, 4.0, 4.25, K.admRoof, K.rim, { flat: 1 });      // แถบพื้นชั้น 2
    bx(F, B[0] - .15, B[1] - .15, B[2] + .15, B[3] + .15, 3.55, 3.8, K.admRoof, K.rim, { flat: 1 });
    [A, B].forEach(([X0, Z0, X1, Z1], i) => { const h = i ? 7.2 : 8.4; bx(F, X0, Z0, X1, Z0 + .3, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X0, Z1 - .3, X1, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X0, Z0, X0 + .3, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X1 - .3, Z0, X1, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); });
    bx(F, A[0] + 3, A[1] + 5, A[0] + 7, A[1] + 12, 9, 10.6, K.utWall, K.utRoof, { flat: 1 });
    [[A[0] + 10, A[1] + 7], [A[0] + 10, A[1] + 11], [A[0] + 10, A[1] + 15]].forEach(([x, z]) => { disc(F.flat, x, 9.05, z, 1.1, 1.1, K.fanRing, 10); disc(F.flat, x, 9.08, z, .85, .85, K.fan, 10); });
    const [C0, D0, C1, D1] = PR([235, 490, 300, 512]);   // หลังคาคลุมทางเข้า
    bx(F, C0, D0, C1, D1, 3.6, 3.95, K.canopy, K.canopy, { flat: 1 }); [[C0 + .4, D0 + .4], [C0 + .4, D1 - .4], [C1 - .4, D0 + .4], [C1 - .4, D1 - .4]].forEach(([x, z]) => bx(F, x - .18, z - .18, x + .18, z + .18, 0, 3.6, K.canopy, K.canopy, { flat: 1 }));
    for (let i = 0; i < 3; i++) bx(F, C1 + i * .55, D0 + 1, C1 + i * .55 + .55, D1 - 1, -.05, .18 * (3 - i), K.stone, K.stone, { flat: 1 });   // ขั้นบันไดทางเข้า
    tag('ADMIN BLDG', '#9fe0ea', 17).position.set((A[0] + A[2]) / 2, 13, (A[1] + A[3]) / 2); }

  /* ───────── Data Hall: หลังคาลาดเอียง (สูงฝั่ง G → ต่ำฝั่ง A ตาม Section-2) · ด้านยาว = ครีบกระจกดำ · หัวอาคาร = แผงแชมเปญ · (+แผงโซลาร์ตามแปลน) ───────── */
  function hall(T, px) {
    const [X0, Z0, X1, Z1] = PR(px), HL = 9.2, HH = 11.8, hz = [HL, HL, HH, HH], up = a => a.map(v => v + .5), zc = (Z0 + Z1) / 2, ctr = [(X0 + X1) / 2, 5, zc];
    quad(T.clad, [X0, 0, Z0], [X0, 0, Z1], [X0, HH, Z1], [X0, HL, Z0], K.endWall, ctr); quad(T.clad, [X1, 0, Z0], [X1, 0, Z1], [X1, HH, Z1], [X1, HL, Z0], K.endWall, ctr);
    quad(T.clad, [X0, 0, Z0], [X1, 0, Z0], [X1, HL, Z0], [X0, HL, Z0], K.hallWall, ctr); quad(T.clad, [X0, 0, Z1], [X1, 0, Z1], [X1, HH, Z1], [X0, HH, Z1], K.hallWall, ctr);
    quad(T.roof, [X0, HL, Z0], [X1, HL, Z0], [X1, HH, Z1], [X0, HH, Z1], K.hallRoof, ctr);
    hx(T, R(X0, Z0, X0 + .5, Z1), hz, up(hz), K.rim, K.rim, { flat: 1 }); hx(T, R(X1 - .5, Z0, X1, Z1), hz, up(hz), K.rim, K.rim, { flat: 1 });
    hx(T, R(X0, Z0, X1, Z0 + .5), HL, HL + .5, K.rim, K.rim, { flat: 1 }); hx(T, R(X0, Z1 - .5, X1, Z1), HH, HH + .5, K.rim, K.rim, { flat: 1 });
    bx(T, X0 - .1, Z0 - .1, X1 + .1, Z1 + .1, 0, .6, K.plinth, K.plinth, { flat: 1 });                    // ฐานคอนกรีตสีเข้ม
    if (SOLAR) {
      const ry = z => HL + (z - Z0) / (Z1 - Z0) * (HH - HL) + .12, mx = 4.1, mz = 2.1;
      for (let x = X0 + 3.5; x + mx <= X1 - 3.5; x += mx + .22) for (let z = Z0 + 3.2; z + mz <= Z1 - 3.2; z += mz + .22) {
        const k = .9 + .2 * R_(), c = K.solar.map(v => v * k);
        quad(T.flat, [x, ry(z), z], [x + mx, ry(z), z], [x + mx, ry(z + mz), z + mz], [x, ry(z + mz), z + mz], c, [x + mx / 2, ry(z) - 5, z + mz / 2]);
      }
    }
    /* ผนังครีบกระจก (louver curtain) ทั้งด้านยาว: แผ่นหลังสว่างตอนค่ำ + ครีบดำตั้งเรียงถี่ + แนวคาดบน/ล่าง */
    const lv = (z, dir, Ht) => {
      const y0 = .9, y1 = Ht - 2.5, xa = X0 + 1.6, xb = X1 - 1.6, za = dir > 0 ? z + .06 : z - .6, zb = dir > 0 ? z + .6 : z - .06, zl = dir > 0 ? z : z - .75, zh = dir > 0 ? z + .75 : z;
      plate(T.glow, 'z', z + dir * .06, dir, xa, xb, y0, 5.4, [1, 1, 1]); plate(T.glow, 'z', z + dir * .06, dir, xa, xb, 5.4, y1, [.4, .4, .45]);
      for (let x = xa; x < xb - .3; x += 1.0) bx(T, x, za, x + .28, zb, y0, y1, K.fin, K.fin, { flat: 1 });
      bx(T, xa - .15, zl, xb + .15, zh, y1, y1 + .28, K.fin, K.hallWall, { flat: 1 }); bx(T, xa - .15, zl, xb + .15, zh, y0 - .2, y0, K.fin, K.fin, { flat: 1 }); bx(T, xa, za, xb, zb, 5.3, 5.46, K.fin, K.fin, { flat: 1 });
    };
    lv(Z0, -1, HL); lv(Z1, 1, HH);
    [Z0 + 11, Z1 - 11].forEach(zc => { plate(T.flat, 'x', X1 + .05, 1, zc - 2.3, zc + 2.3, 0, 4.2, K.door); bx(T, X1, zc - 3.2, X1 + 1.8, zc + 3.2, 4.7, 4.9, K.rim, K.rim, { flat: 1 }); });
    plate(T.flat, 'x', X0 - .05, -1, (Z0 + Z1) / 2 - 1, (Z0 + Z1) / 2 + 1, 0, 2.3, K.door);
    return [(X0 + X1) / 2, HH, (Z0 + Z1) / 2];
  }
  /* ───────── Utility: 2 ชั้น + หอบันได + ชิลเลอร์เรียงแถวบนหลังคา (+ปล่องไอเสียเครื่องปั่นไฟ) · ผนังแถบแนวตั้งสลับเทา/แทน ───────── */
  function util(T, px, o = {}) {
    const [X0, Z0, X1, Z1] = PR(px), HU = 10.5, tw = 8.5, zc = (Z0 + Z1) / 2, sx = X0 + tw, ctr = [(X0 + X1) / 2, 5, zc];
    quad(T.clad, [X0, 0, Z0], [X0, 0, Z1], [X0, HU, Z1], [X0, HU, Z0], K.utWall, ctr); quad(T.clad, [X1, 0, Z0], [X1, 0, Z1], [X1, HU, Z1], [X1, HU, Z0], K.utWall, ctr);
    const cols = [K.utWall, K.utTan, K.utWall, K.utWall]; strips(T.clad, 'z', Z0, -1, X0, X1, 0, HU, cols, 3, R_); strips(T.clad, 'z', Z1, 1, X0, X1, 0, HU, cols, 3, R_);
    quad(T.roof, [X0, HU, Z0], [X1, HU, Z0], [X1, HU, Z1], [X0, HU, Z1], K.utRoof, ctr);
    bx(T, X0, Z0, sx, Z1, HU, HU + 3.4, K.utWall, K.utRoof, { rf: 1 });
    bx(T, sx, Z0, X1, Z0 + .4, HU, HU + .8, K.utWall, K.rim); bx(T, sx, Z1 - .4, X1, Z1, HU, HU + .8, K.utWall, K.rim); bx(T, X1 - .4, Z0 + .4, X1, Z1 - .4, HU, HU + .8, K.utWall, K.rim);
    for (let x = sx + 1; x + 5.4 <= X1 - 1; x += 6.4) [[1, 4.6], [5.6, 9.2]].forEach(([y0, y1]) => { plate(T.flat, 'z', Z0 - .05, -1, x, x + 5.4, y0, y1, K.louver); plate(T.flat, 'z', Z1 + .05, 1, x, x + 5.4, y0, y1, K.louver); });
    [zc - 6, zc + 6].forEach(z => plate(T.flat, 'x', X1 + .05, 1, z - 2.3, z + 2.3, 0, 4.4, K.door));
    for (let z = Z0 + 3; z + 1.6 < Z1 - 2; z += 4.2) plate(T.glow, 'x', X0 - .05, -1, z, z + 1.6, 1.5, 12, lit());
    const mz = 6.4, z0c = zc - (3 * mz + 1.6) / 2, nr = Math.floor((X1 - sx - 5) / 6.1);
    for (let r = 0; r < nr; r++) {
      const xc = sx + 3.8 + r * 6.1;
      for (let m = 0; m < 3; m++) {
        const za = z0c + m * (mz + .8), zb = za + mz;
        bx(T, xc - 1.4, za - .1, xc + 1.4, zb + .1, HU, HU + .5, K.stack, K.stack, { flat: 1 });
        bx(T, xc - 1.3, za, xc + 1.3, zb, HU + .5, HU + 3.1, K.chiller, K.chillerTop, { flat: 1 });
        plate(T.flat, 'x', xc + 1.34, 1, za + .4, zb - .4, HU + .9, HU + 2.8, K.coil); plate(T.flat, 'x', xc - 1.34, -1, za + .4, zb - .4, HU + .9, HU + 2.8, K.coil);
        for (let fx = -1; fx <= 1; fx += 2) for (let k = 0; k < 3; k++) { const fz = za + (k + .5) * mz / 3; disc(T.flat, xc + fx * .65, HU + 3.13, fz, 1.0, 1.0, K.fanRing, 10); disc(T.flat, xc + fx * .65, HU + 3.16, fz, .8, .8, K.fan, 10); }
      }
    }
    (o.stacks || []).forEach(py => { const x = W(0, py)[0], zs = Z0 - 1.7;
      tube(T.flat, [x, .2, zs], [x, HU + 5.5, zs], .42, K.stack, 10); tube(T.flat, [x, 2, zs], [x, 6.6, zs], .75, K.muffler, 12);
      tube(T.flat, [x, HU - 2.2, zs], [x, HU - 2.2, Z0], .34, K.stack, 8); tube(T.flat, [x, HU + 5.5, zs], [x, HU + 5.9, zs], .6, K.fan, 10); });
    return [(X0 + X1) / 2, HU + 3.4, zc];
  }
  OH.forEach(p => { const c = hall(F, p); tag(p === P1H ? 'DATA HALL · PHASE 1' : 'DATA HALL BLDG', '#9fe0ea', p === P1H ? 22 : 18).position.set(c[0], c[1] + 3, c[2]); });
  OU.forEach(p => { const g = p === P1U, c = util(F, p, g ? { stacks: GEN } : {}); tag(g ? 'UTILITY BLDG · GENSET' : 'UTILITY BLDG', '#9fe0ea', g ? 22 : 16).position.set(c[0], c[1] + 3.5, c[2]); });
  hall(H, TH); const pu = util(H, TU, { stacks: PH == 2 ? GEN.map(y => y - DY) : GEN }); tag('UTILITY BLDG · GENSET', '#9fe0ea', 24).position.set(pu[0], 17.5, pu[2]);
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
    bx(F, X0 + 1.35, Z0 + 1.5, X0 + 1.65, Z1 - 1.5, 12.4, 12.7, K.pillar, K.pillar, { flat: 1 });          // คานโครงเหล็ก (gantry)
    const [a, b, c, d] = PR([1195, 235, 1232, 270]); bx(F, a, b, c, d, 0, 3.6, K.utWall, K.utRoof, { rf: 1 });
    tag('115 kV SUBSTATION', '#9fe0ea', 22).position.set((X0 + X1) / 2, 8, (Z0 + Z1) / 2); }

  /* ───────── รถเทรลเลอร์เครื่องปั่นไฟ (ตามตำแหน่งในแปลน) ───────── */
  const truck = (px, py, alongX, s) => {
    const [x, z] = W(px, py), q = (a0, a1, b0, b1, y0, y1, sd, tp) => alongX ? bx(F, x + s * a0, z + b0, x + s * a1, z + b1, y0, y1, sd, tp, { flat: tp !== K.trailerTop }) : bx(F, x + b0, z + s * a0, x + b1, z + s * a1, y0, y1, sd, tp, { flat: tp !== K.trailerTop });
    q(-6.5, 4, -1.3, 1.3, .95, 3.9, K.trailer, K.trailerTop); q(-6.5, 4.4, -1.1, 1.1, .45, .95, K.tyre, K.tyre); q(4.5, 7.4, -1.25, 1.25, .55, 3.2, K.cab, K.cab);
    [-5, -3.6, 5.5].forEach(a => q(a - .6, a + .6, -1.45, 1.45, 0, 1, K.tyre, K.tyre));
  };
  truck(150, 610, true, 1); truck(1290, 200, true, -1); truck(385, 755, false, -1); truck(745, 100, true, -1);

  /* ───────── เสาไฟส่องสว่าง (ตอนค่ำ: โคมสว่าง + ฮาโล + แสงตกพื้น) ───────── */
  const pole = (px, py, ax, az) => {
    const [x, z] = W(px, py), h = 8.5, L = Math.hypot(ax, az) || 1, hx_ = x + ax / L * 1.5, hz_ = z + az / L * 1.5;
    tube(F.flat, [x, -.4, z], [x, h, z], .09, K.pole, 6, false); tube(F.flat, [x, h, z], [hx_, h + .2, hz_], .05, K.pole, 5, false);
    bx(LT, hx_ - .5, hz_ - .22, hx_ + .5, hz_ + .22, h - .02, h + .2, [1, 1, 1], [1, 1, 1], { flat: 1 }); LAMP.push([hx_, h, hz_]);
  };
  for (let i = 0; i < 4; i++) {                                                  // เสาไฟตามถนนวนรอบไซต์ (แขนยื่นออกหาถนน)
    const p = LOOP[i], q = LOOP[(i + 1) % 4], n = Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 150);
    for (let k = 0; k < n; k++) { const t = (k + .5) / n, pt = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], pin = ins(pt, 18 / Math.hypot(cen[0] - pt[0], cen[1] - pt[1])), a = W(...pin), c = W(...cen); pole(pin[0], pin[1], a[0] - c[0], a[1] - c[1]); }
  }
  [[236, 100], [236, 165], [236, 228], [338, 100], [338, 165], [338, 228], [222, 500], [318, 504], [753, 100], [753, 215], [753, 322], [340, 150], [340, 330], [600, 420], [600, 440]].forEach(([a, b]) => pole(a, b, 0, 1));

  /* ───────── ต้นไม้: แถวไซเปรสริมรั้วด้านหน้า · ต้นกลมตามถนน/ลาน/สนาม (มีไม้ค้ำ) · ปาล์มหน้าอาคาร ───────── */
  flat(GG, PW([[-20, 846], [150, 822], [112, 1015], [-30, 1015]]), -.6, K.grass);   // สนามหญ้าข้างถนนทางเข้า
  const round = (px, py, s = 1) => {
    const [x, z] = W(px, py); s *= .85 + .35 * R_(); const g = GRN[(R_() * GRN.length) | 0];
    tube(TR, [x, 0, z], [x, 3.4 * s, z], .22 * s, K.trunk, 6, false);
    blob(TR, x, 4.9 * s, z, 2.7 * s, 2.5 * s, 2.7 * s, g, R_);                                                // เรือนยอดหลัก + ก้อนรอง 2 ก้อนให้รูปทรงไม่กลมเกินไป
    blob(TR, x + 1.3 * s, 4.3 * s, z + .7 * s, 1.8 * s, 1.6 * s, 1.8 * s, g, R_); blob(TR, x - 1.1 * s, 4.5 * s, z - .9 * s, 1.7 * s, 1.5 * s, 1.7 * s, g, R_);
    if (s < 1.2) for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283 + 1; tube(TR, [x + Math.cos(a) * 1.1, 0, z + Math.sin(a) * 1.1], [x + Math.cos(a) * .25, 2.3, z + Math.sin(a) * .25], .04, K.stake, 4, false); }   // ไม้ค้ำ 3 ขา (ต้นไม้ปลูกใหม่ตามภาพถ่าย)
  };
  const cyp = (px, py, s = 1) => { const [x, z] = W(px, py); s *= .9 + .3 * R_(); blob(TR, x, 3.3 * s, z, 1.0 * s, 3.4 * s, 1.0 * s, K.cyp, R_); };
  const palm = (px, py, s = 1) => {
    const [x, z] = W(px, py); s *= .85 + .3 * R_(); const h = (1.0 + .9 * R_()) * s, tp = [x + .1 * s, h, z];
    tube(TR, [x, 0, z], tp, .13 * s, K.palmTrunk, 6, false);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.283 + R_() * .4, L = (1.5 + .6 * R_()) * s, dx = Math.cos(a), dz = Math.sin(a), pc = PALM[(R_() * PALM.length) | 0].map(v => Math.min(1, v * (.85 + .3 * R_())));
      const P = [0, .33, .66, 1].map((t, j) => { const w = .34 * s * Math.sin(Math.PI * (t * .92 + .04)); return { c: [tp[0] + dx * L * t, tp[1] + L * (.75 * t - .95 * t * t), tp[2] + dz * L * t], w }; });
      for (let j = 0; j < 3; j++) { const A = P[j], B = P[j + 1], l0 = [A.c[0] - dz * A.w, A.c[1], A.c[2] + dx * A.w], r0 = [A.c[0] + dz * A.w, A.c[1], A.c[2] - dx * A.w], l1 = [B.c[0] - dz * B.w, B.c[1], B.c[2] + dx * B.w], r1 = [B.c[0] + dz * B.w, B.c[1], B.c[2] - dx * B.w];
        [[0, 1, 0], [0, -1, 0]].forEach(n => { triN(TR, [l0, r0, r1], [n, n, n], pc); triN(TR, [l0, r1, l1], [n, n, n], pc); }); }
    }
  };
  for (let px = 345; px <= 1185; px += 13) cyp(px, 802 + (1212 - px) / 1192 * 44 - 13);
  for (let py = 868; py <= 1000; py += 26) { round(40 - (py - 845) * .176 - 16, py, .9); round(120 - (py - 830) * .189 + 16, py, .9); }
  for (let px = 372; px <= 560; px += 26) round(px, 756, .8);
  [[215, 125], [215, 155], [232, 100], [213, 185], [222, 214], [262, 92], [170, 640], [190, 606], [225, 602], [255, 640], [250, 690], [185, 700], [215, 650], [150, 560], [160, 520], [122, 700], [262, 712], [48, 715], [95, 640], [70, 600], [296, 330], [300, 460]].forEach(([a, b]) => round(a, b, a == 215 && b == 650 ? 1.35 : 1));
  [[210, 570], [225, 575], [196, 572], [235, 573]].forEach(([a, b]) => { const [x, z] = W(a, b); blob(TR, x, .9, z, 1.2, .9, 1.2, GRN[2], R_, ICO0); });
  [PH == 2 ? TH : HALLS[0], P1H].forEach(([a, b, c, d]) => { for (let py = b + 8; py <= d - 8; py += 14) palm(a - 22, py, 1); });   // แถวปาล์มหน้าอาคารด้านยาว (ตามภาพถ่าย)
  [[222, 516], [230, 528], [306, 516], [314, 528], [198, 520], [326, 522]].forEach(([a, b]) => palm(a, b, 1.1));

  /* ───────── นอกรั้ว: เนินป่า · แนวต้นไม้ · เสาไฟฟ้าแรงสูง + สายไฟ (ตามภาพถ่ายมุมสูง) ───────── */
  const WS = SITE.map(p => W(...ins(p, -.3))), inS = (x, z) => { let s = 0; for (let i = 0; i < 4; i++) { const a = WS[i], b = WS[(i + 1) % 4], c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]); s += c > 0 ? 1 : -1; } return Math.abs(s) == 4; };
  const OG = [0x2e5030, 0x37603a, 0x2a4a2e, 0x3f6a3c, 0x4b7340].map(hex), noEnt = (x, z) => x > 30 && Math.abs(z - 82) < 26;
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + R_() * .5, r = 430 + R_() * 260; blob(OUT, CX + Math.cos(a) * r * .9, -.8, CZ + Math.sin(a) * r * 1.2, 90 + R_() * 90, 22 + R_() * 30, 90 + R_() * 90, OG[(R_() * OG.length) | 0].map(v => v * .92), R_, ICO2, .3); }
  for (let gi = 0, ng = 0; ng < 64 && gi < 1200; gi++) {                         // แนวต้นไม้นอกรั้วจัดเป็นกลุ่ม ๆ
    const a = R_() * 6.283, r = 70 + 380 * Math.pow(R_(), 1.2), gx = CX + Math.cos(a) * r * .85, gz = CZ + Math.sin(a) * r * 1.25;
    if (inS(gx, gz) || noEnt(gx, gz)) continue; ng++;
    for (let k = 0, m = 6 + (R_() * 8 | 0); k < m; k++) {
      const x = gx + (R_() - .5) * 46, z = gz + (R_() - .5) * 46; if (inS(x, z) || noEnt(x, z)) continue;
      const s = .8 + R_() * .7, cl = OG[(R_() * OG.length) | 0], ic = r > 200 ? ICO0 : ICO1, ry = (4 + 2.5 * R_()) * s;
      blob(OUT, x, ry * .95 + .6, z, (3.6 + 2 * R_()) * s, ry, (3.6 + 2 * R_()) * s, cl, R_, ic, .2); blob(OUT, x + (R_() - .5) * 4, ry * .7 + .4, z + (R_() - .5) * 4, 2.6 * s, ry * .7, 2.6 * s, cl, R_, ic, .2);
    }
  }
  const PWX = W(0, 20)[0] - 14, WIRE = [];
  for (let z = 70, k = 0; z > -190; z -= 42.5, k++) {
    tube(OUT, [PWX, -.8, z], [PWX, 11, z], .17, K.pole, 6, false); bx(OT, PWX - 1.9, z - .12, PWX + 1.9, z + .12, 10.2, 10.5, K.pole, K.pole, { flat: 1 });
    [-1.5, 0, 1.5].forEach(dx => tube(OUT, [PWX + dx, 10.5, z], [PWX + dx, 11, z], .07, K.porcelain, 5, false));
    if (z - 42.5 > -190) [-1.5, 0, 1.5].forEach(dx => { for (let s = 0; s < 8; s++) { const t0 = s / 8, t1 = (s + 1) / 8, y = t => 10.95 - 1.3 * 4 * t * (1 - t); WIRE.push(PWX + dx, y(t0), z - 42.5 * t0, PWX + dx, y(t1), z - 42.5 * t1); } });
  }

  /* ───────── ประกอบ mesh ───────── */
  const group = new THREE.Group(), shell = new THREE.Group(), near = new THREE.Group(), sky = new THREE.Group(), mats = [], texs = [];
  const mkTex = (w, h, draw, rep) => { if (typeof document == 'undefined') return null; const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, cfg.renderer && cfg.renderer.capabilities ? cfg.renderer.capabilities.getMaxAnisotropy() : 4); } texs.push(t); return t; };
  const ct = mkTex(128, 128, (g, w, h) => {                                      // ผนังแผงโลหะ: ตะเข็บแนวตั้ง
    g.fillStyle = '#eef0f3'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.045)' : 'rgba(255,255,255,.05)'; g.fillRect(i * 32, 0, 32, 128); g.fillStyle = 'rgba(15,20,30,.30)'; g.fillRect(i * 32, 0, 2, 128); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(i * 32 + 2, 0, 1, 128); }
    g.fillStyle = 'rgba(15,20,30,.14)'; g.fillRect(0, 0, 128, 1.5); g.fillStyle = 'rgba(15,20,30,.06)'; g.fillRect(0, 64, 128, 1);
    const r = rng(3); for (let i = 0; i < 220; i++) { g.fillStyle = r() > .5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.04)'; g.fillRect(r() * 128, r() * 128, 1 + r() * 2, 4 + r() * 18); } }, 1);
  const rt = mkTex(128, 128, (g, w, h) => {                                      // หลังคา standing-seam: สันแนวลาดทุก 0.6 ม.
    g.fillStyle = '#eceef1'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { const x = i * 25.6; g.fillStyle = 'rgba(15,20,30,.32)'; g.fillRect(x, 0, 2.5, h); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 2.5, 0, 1.5, h); }
    g.fillStyle = 'rgba(15,20,30,.18)'; g.fillRect(0, 0, w, 1.5);
    const r = rng(5); for (let i = 0; i < 160; i++) { g.fillStyle = r() > .5 ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.04)'; g.fillRect(r() * 128, r() * 128, 1 + r() * 3, 3 + r() * 14); } }, 1);
  const cot = mkTex(256, 256, (g, w, h) => {                                     // พื้นคอนกรีต: 2×2 แผ่น (ร่องต่อ + คราบ)
    const r = rng(7); for (let i = 0; i < 4; i++) { const v = 228 + (r() * 14 | 0); g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect((i % 2) * 128, (i >> 1) * 128, 128, 128); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = r() > .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.07)'; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
    for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h, rr = 14 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(60,55,45,.09)'); gr.addColorStop(1, 'rgba(60,55,45,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    g.fillStyle = 'rgba(40,44,50,.42)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, 127, w, 2); g.fillRect(127, 0, 2, h); }, 1);
  const gt = mkTex(256, 256, (g, w, h) => {                                      // หญ้า/ดิน: ลายใบหญ้า + ปื้นสีใหญ่
    const r = rng(9); g.fillStyle = '#e4e6df'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rr = 24 + r() * 50, gr = g.createRadialGradient(x, y, 0, x, y, rr), dk = r() > .5; gr.addColorStop(0, dk ? 'rgba(20,40,10,.10)' : 'rgba(255,255,220,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    for (let i = 0; i < 6500; i++) { const x = r() * w, y = r() * h, a = r() * 6.28, l = 2 + r() * 4; g.strokeStyle = r() > .5 ? 'rgba(10,30,5,.10)' : 'rgba(255,255,200,.12)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }, 1);
  const rad = mkTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, 0);
  const cloudT = mkTex(256, 128, (g, w, h) => { const r = rng(21);
    for (let i = 0; i < 26; i++) { const x = 40 + r() * 176, y = 66 + (r() - .5) * 26 - Math.abs(x - 128) * .1, rr = 18 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    g.globalCompositeOperation = 'source-atop'; const lg = g.createLinearGradient(0, 30, 0, 100); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(110,125,155,.55)'); g.fillStyle = lg; g.fillRect(0, 0, w, h); }, 0);
  const lam = o => { const m = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)); mats.push(m); return m; };
  const gnd = o => lam(Object.assign({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }, o));
  const mFlat = lam(), mClad = lam(ct ? { map: ct } : {}), mRoof = lam(rt ? { map: rt } : {}), mConc = gnd(cot ? { map: cot } : {}), mGrass = gnd(gt ? { map: gt } : {}), mOut = gnd(gt ? { map: gt } : {});
  const mGlow = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x2d4259 }), mLamp = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x8a8f96 }); mats.push(mGlow, mLamp);

  /* แสง/เงา: ใช้ light ที่ Hall ส่งมา (cfg.hemi/cfg.sun) ถ้าไม่มีจะสร้างเอง · shadow map ถ่ายครั้งเดียว (autoUpdate=false) แล้วสั่งถ่ายใหม่เฉพาะตอนเปลี่ยนเวลา/สลับเปลือก Phase 1 */
  const rd = cfg.renderer, SH = !!(rd && rd.shadowMap && cfg.shadows !== false);
  const hemi = cfg.hemi || new THREE.HemisphereLight(0xffffff, 0x444444, 1), sun = cfg.sun || new THREE.DirectionalLight(0xffffff, 1);
  if (!cfg.hemi) group.add(hemi); if (!cfg.sun) group.add(sun); group.add(sun.target);
  if (SH) {
    rd.shadowMap.enabled = true; rd.shadowMap.type = THREE.PCFSoftShadowMap; rd.shadowMap.autoUpdate = false;
    const sz = cfg.shadowSize || ((typeof innerWidth != 'undefined' && innerWidth < 700) ? 2048 : 4096), c = sun.shadow.camera;
    sun.castShadow = true; sun.shadow.mapSize.set(sz, sz); c.left = c.bottom = -170; c.right = c.top = 170; c.near = 10; c.far = 620; c.updateProjectionMatrix(); sun.shadow.bias = -.0005; sun.shadow.normalBias = .07;
  }
  const reShadow = () => { if (SH) rd.shadowMap.needsUpdate = true; };
  const mk = (g, m, into, cast, recv) => {
    if (!g.p.length) return; const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3));
    if (g.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2));
    const me = new THREE.Mesh(geo, m); me.castShadow = SH && !!cast; me.receiveShadow = SH && !!recv; into.add(me);
  };
  /* ผนังโปร่ง + เครื่องปั่นไฟ 4 ชุด ของ Utility Phase 1 (เห็นเมื่อซูมเข้า — ตอนถอยไกลจะกลายเป็นตัวอาคารทึบ) */
  { const [X0, Z0, X1, Z1] = PR(TU), N = { flat: GN, clad: GN };
    [[650, 510, 700, 525], [650, 555, 700, 570], [650, 600, 700, 615], [650, 645, 700, 660]].map(r => PH == 2 ? up(r) : r).forEach(r => { const [a, b, c, d] = PR(r); bx(N, a, b, c, d, 0, 3.5, K.genset, K.genset, { flat: 1 }); });
    const bg = new THREE.BoxGeometry(X1 - X0, 14, Z1 - Z0), ghost = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: 0x3b8e9c, transparent: true, opacity: .2, depthWrite: false }));
    ghost.position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); mats.push(ghost.material); near.add(ghost);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({ color: 0x5fb4ff, transparent: true, opacity: .3 })); ed.position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); near.add(ed); mats.push(ed.material); }
  mk(GO, mOut, group); mk(GG, mGrass, group, 0, 1); mk(GC, mConc, group, 0, 1);
  mk(F.flat, mFlat, group, 1, 1); mk(F.clad, mClad, group, 1, 1); mk(F.roof, mRoof, group, 1, 1); mk(F.glow, mGlow, group); mk(F.lamp, mLamp, group); mk(TR, mFlat, group, 1, 1); mk(OUT, mFlat, group);
  mk(H.flat, mFlat, shell, 1, 1); mk(H.clad, mClad, shell, 1, 1); mk(H.roof, mRoof, shell, 1, 1); mk(H.glow, mGlow, shell); mk(GN, mFlat, near);
  if (WIRE.length) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(WIRE, 3)); const wm = new THREE.LineBasicMaterial({ color: 0x1b1e24 }); mats.push(wm); group.add(new THREE.LineSegments(wg, wm)); }
  group.add(shell); group.add(near); shell.visible = false; group.position.set(OX, 0, OZ);

  /* แสงตกพื้นใต้เสาไฟ + ฮาโลรอบโคม */
  const pP = [], pU = [], rr = 9;
  LAMP.forEach(([x, , z]) => { [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, -1, 0, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([a, b, u, v]) => { pP.push(x + a * rr, -.02, z + b * rr); pU.push(u, v); }); });
  const poolG = new THREE.BufferGeometry(); poolG.setAttribute('position', new THREE.Float32BufferAttribute(pP, 3)); poolG.setAttribute('uv', new THREE.Float32BufferAttribute(pU, 2));
  const poolM = new THREE.MeshBasicMaterial({ map: rad, color: 0xffc77a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }), pool = new THREE.Mesh(poolG, poolM); pool.renderOrder = 2; group.add(pool);
  const haloG = new THREE.BufferGeometry(); haloG.setAttribute('position', new THREE.Float32BufferAttribute(LAMP.flat(), 3));
  const haloM = new THREE.PointsMaterial({ map: rad, color: 0xffd9a0, size: 3.4, sizeAttenuation: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), halo = new THREE.Points(haloG, haloM); halo.frustumCulled = false; group.add(halo);
  mats.push(poolM, haloM);

  /* ท้องฟ้า: ทรงกลมไล่สี + เทือกเขา 2 ชั้น + ดาว + ดวงอาทิตย์ + เมฆ — ติดตามกล้อง (S.update(d, mode, camera)) จึงอยู่ไกลเสมอ */
  const SR = 950, skyGeo = new THREE.SphereGeometry(SR, 32, 24);
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const skyM = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), skyMesh = new THREE.Mesh(skyGeo, skyM); skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; sky.add(skyMesh); mats.push(skyM);
  const ridge = (Rr, amp, seed, y0, order) => {
    const N = 200, P = [], I = [], s = Math.sin;
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, h = amp * Math.pow(Math.max(0, .5 + .28 * s(a * 3 + seed) + .2 * s(a * 8 + seed * 2.3) + .12 * s(a * 21 + seed * 1.7) + .08 * s(a * 47 + seed)), 1.5);
      P.push(Math.cos(a) * Rr, y0, Math.sin(a) * Rr, Math.cos(a) * Rr, h, Math.sin(a) * Rr); if (i < N) { const k = i * 2; I.push(k, k + 1, k + 3, k, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
    const m = new THREE.MeshBasicMaterial({ color: 0x8da6c6, side: THREE.DoubleSide, fog: false, depthWrite: false }), me = new THREE.Mesh(g, m); me.renderOrder = order; me.frustumCulled = false; sky.add(me); mats.push(m); return m;
  };
  const farM = ridge(900, 85, 1.3, -40, -9), nearM = ridge(820, 42, 4.1, -40, -8);
  const sp = []; for (let i = 0; i < 380; i++) { const a = R_() * 6.283, e = Math.asin(.05 + .95 * R_()); sp.push(Math.cos(a) * Math.cos(e) * 900, Math.sin(e) * 900, Math.sin(a) * Math.cos(e) * 900); }
  const stG = new THREE.BufferGeometry(); stG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(stG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); stars.renderOrder = -9.5; stars.frustumCulled = false; sky.add(stars); mats.push(stars.material);
  const sunSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rad, color: 0xfff1c8, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); sunSp.scale.set(300, 300, 1); sky.add(sunSp); mats.push(sunSp.material);
  const clouds = []; for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.283 + R_() * .4, e = .12 + .25 * R_(), m = new THREE.SpriteMaterial({ map: cloudT, transparent: true, depthWrite: false, fog: false, opacity: 0 }), s = new THREE.Sprite(m);
    s.position.set(Math.cos(a) * Math.cos(e) * 820, Math.sin(e) * 820, Math.sin(a) * Math.cos(e) * 820); s.scale.set(300 + R_() * 200, 100 + R_() * 60, 1); sky.add(s); clouds.push(m); mats.push(m);
  }
  group.add(sky);

  /* ช่วงเวลา: day | dusk | night  (hs/hg/hi = แสงฟ้า/พื้น · sun/si/sd = แสงอาทิตย์/จันทร์ · glass = สีกระจก/หน้าต่าง · pool/halo = แสงเสาไฟ) */
  const TOD = {
    day: { top: 0x3f78c8, mid: 0x80b2e8, hor: 0xd9e5ef, fog: 0xc9d9e6, fn: 240, ff: 900, hs: 0xe2eeff, hg: 0x9a9582, hi: .6, sun: 0xfff0d8, si: .78, sd: [-.45, .72, .5], glass: 0x58788f, lampC: 0x8a8f96, pool: 0, halo: 0, stars: 0, cloud: .95, cloudC: 0xffffff, mtn: 0x8da6c6, sunVis: 1 },
    dusk: { top: 0x0d1d42, mid: 0x2b4f8c, hor: 0x7f97bb, fog: 0x445a82, fn: 150, ff: 820, hs: 0xa4bcf0, hg: 0x2e3550, hi: .85, sun: 0xaabfff, si: .42, sd: [-.45, .6, .55], glass: 0xf0cf98, lampC: 0xffe2b0, pool: .5, halo: .8, stars: .45, cloud: .35, cloudC: 0x6e82a8, mtn: 0x2f4468, sunVis: 0 },
    night: { top: 0x02050f, mid: 0x071229, hor: 0x16253f, fog: 0x0b1429, fn: 120, ff: 780, hs: 0xb4ccff, hg: 0x101830, hi: .8, sun: 0xcfe0ff, si: .5, sd: [-.4, .8, .5], glass: 0xe6c48c, lampC: 0xffe2b0, pool: .55, halo: .9, stars: 1, cloud: 0, cloudC: 0x3a4a6a, mtn: 0x0d1830, sunVis: 0 }
  };
  let time = 'dusk'; const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color(), cd = new THREE.Color();
  function setTime(m) {
    const T = TOD[m] || TOD.dusk; time = TOD[m] ? m : 'dusk';
    ca.setHex(T.hor); cb.setHex(T.mid); cc.setHex(T.top);
    const pos = skyGeo.attributes.position, col = skyGeo.attributes.color;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / SR; if (y <= 0) cd.copy(ca); else { const k = Math.pow(Math.min(1, y), .55); if (k < .5) cd.copy(ca).lerp(cb, k / .5); else cd.copy(cb).lerp(cc, (k - .5) / .5); } col.setXYZ(i, cd.r, cd.g, cd.b); }
    col.needsUpdate = true;
    const sc = cfg.scene; if (sc) { if (!sc.fog) sc.fog = new THREE.Fog(T.fog, T.fn, T.ff); sc.fog.color.setHex(T.fog); sc.fog.near = T.fn; sc.fog.far = T.ff; if (sc.background && sc.background.isColor) sc.background.setHex(T.fog); }
    const d = nrm(T.sd); hemi.color.setHex(T.hs); hemi.groundColor.setHex(T.hg); hemi.intensity = T.hi;
    sun.color.setHex(T.sun); sun.intensity = T.si; sun.position.set(CX + OX + d[0] * 260, d[1] * 260, CZ + OZ + d[2] * 260); sun.target.position.set(CX + OX, 0, CZ + OZ); sun.target.updateMatrixWorld();
    mGlow.color.setHex(T.glass); mLamp.color.setHex(T.lampC); poolM.opacity = T.pool; haloM.opacity = T.halo; pool.visible = halo.visible = T.pool > 0;
    stars.material.opacity = T.stars; stars.visible = T.stars > 0; clouds.forEach(c => { c.opacity = T.cloud; c.color.setHex(T.cloudC); c.visible = T.cloud > 0; });
    farM.color.setHex(T.mtn).lerp(ca, .45); nearM.color.setHex(T.mtn).lerp(ca, .2);
    sunSp.visible = !!T.sunVis; sunSp.position.set(d[0] * 880, d[1] * 880, d[2] * 880);
    reShadow();
  }
  setTime(cfg.time || 'dusk');
  /* d = ระยะกล้อง: ไกล → เห็นอาคาร Phase 1 ทึบ (หลังคา+เปลือก) · ใกล้ → เห็นภายใน Hall/Rack · mode: auto|on|off · cam = กล้อง (ให้ท้องฟ้าตามกล้อง) */
  const update = (d, mode, cam) => {
    if (cam) sky.position.copy(cam.position).sub(group.position);
    const on = mode == 'on' || (mode != 'off' && d > 150); if (shell.visible == on) return 0; shell.visible = on; near.visible = !on; reShadow(); return 1;
  };
  const dispose = () => { group.traverse(o => { o.geometry && o.geometry.dispose(); }); mats.forEach(m => m.dispose()); texs.forEach(t => t.dispose()); if (SH) { sun.castShadow = false; sun.shadow.map && sun.shadow.map.dispose(); } };
  return { group, update, dispose, W, setTime, offset: [OX, OZ], phase: PH, get time() { return time; } };
};
})();
