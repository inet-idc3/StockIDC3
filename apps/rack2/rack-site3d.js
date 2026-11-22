/* ════════════════════════════════════════════════════════════════
 *  Hall 3D — Site context (บริบทรอบ Hall) ตามแปลนจริง · v2 "สมจริงขึ้น" (อ้างอิงภาพถ่ายหน้างาน)
 *  อาคาร Data Hall (หลังคาลาดเอียง + ครีบกระจกดำด้านยาว + ผนังหัวอาคารสีแชมเปญ) · Utility (ชิลเลอร์บนหลังคา)
 *  Admin · Security · รั้วคอนกรีตสีอ่อน · ต้นไม้/ปาล์ม · ถนนคอนกรีต · ลานจอดรถมีหลังคา · Substation · ถังน้ำมัน · รถเทรลเลอร์เครื่องปั่นไฟ
 *  ใหม่ใน v2:
 *   · ท้องฟ้า (ไล่สี + เมฆ + ดวงอาทิตย์/ดาว) · เทือกเขา/เนินป่า/ทุ่งนอกรั้ว · หมอกตามบรรยากาศ
 *   · เวลา 3 แบบ: day | dusk | night  → S.setTime('day'|'dusk'|'night')  (night/dusk = ไฟหน้าต่าง + เสาไฟ + แสงตกพื้น)
 *   · เงาจริงจาก Directional light — shadow map แบบ "ถ่ายครั้งเดียว" (autoUpdate=false) จึงไม่เพิ่มภาระตอนลาก/ซูม
 *   · พื้นผิวคอนกรีต/หญ้า/ผนัง/หลังคา standing-seam · ขอบถนน · ปาล์ม · ไม้ค้ำต้นไม้ · เสาไฟฟ้าแรงสูงนอกรั้ว
 *  ยังคง: BufferGeometry + vertex color ไม่กี่ก้อน (draw call น้อย) · ไม่ต้องโหลดไฟล์ภายนอก · ไม่มี animation loop
 *  Phase 2: เหมือน Phase 1 ทุกอย่าง (ต้นไม้จริง/ถนน/ฉากรอบไซต์) แต่ Hall ที่ "โปร่งให้เห็น Rack" คือตึกซ้ายบน (Phase 2) ส่วน Phase 1 กลายเป็นอาคารทึบ — ส่ง cfg.phase = 2
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
const ICO0 = ICO(0), ICO1 = ICO(1), ICO2 = ICO(2), ICO3 = ICO(3);
function blob(g, cx, cy, cz, rx, ry, rz, rgb, R_, ico = ICO1, vr = .3) {
  const nz = ico.v.map(q => 1 + .1 * Math.sin(q[0] * 9.1 + q[1] * 5.3 + q[2] * 7.7 + cx * 3.1 + cz));
  ico.f.forEach(f => {
    const V = f.map(i => [cx + ico.v[i][0] * rx * nz[i], cy + ico.v[i][1] * ry * nz[i], cz + ico.v[i][2] * rz * nz[i]]);
    const N = f.map(i => nrm([ico.v[i][0] / rx, ico.v[i][1] / ry, ico.v[i][2] / rz]));
    const k = (1 - vr / 2 + vr * R_()) * (.74 + .34 * ((N[0][1] + N[1][1] + N[2][1]) / 3 * .5 + .5));
    triN(g, V, N, rgb.map(q => Math.min(1, q * k)));
  });
}


/* ── เส้นทาง (polyline) → ถนน/ขอบทาง/เส้นจราจร: fillet มุมโค้ง · mkPath/atPath ตามระยะทาง · strip = แถบแบนขนานแนวเส้นทาง · kerb = ขอบคันหิน ── */
function fillet(P, r, closed, n = 8) {
  const N = P.length, out = [];
  for (let i = 0; i < N; i++) {
    if (!closed && (i == 0 || i == N - 1)) { out.push(P[i]); continue; }
    const A = P[(i - 1 + N) % N], B = P[i], C = P[(i + 1) % N], la = Math.hypot(A[0] - B[0], A[1] - B[1]), lc = Math.hypot(C[0] - B[0], C[1] - B[1]), rr = Math.min(r, la * .48, lc * .48);
    const p0 = [B[0] + (A[0] - B[0]) / la * rr, B[1] + (A[1] - B[1]) / la * rr], p1 = [B[0] + (C[0] - B[0]) / lc * rr, B[1] + (C[1] - B[1]) / lc * rr];
    for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * B[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * B[1] + t * t * p1[1]]); }
  }
  if (closed) out.push(out[0]);
  return out;
}
const bez = (a, c, b, n = 14) => Array.from({ length: n + 1 }, (_, k) => { const t = k / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
function mkPath(P) { const s = [0]; for (let i = 1; i < P.length; i++) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return { P, s, L: s[s.length - 1] }; }
function atPath(Q, d) {                                   // → [x, z, tx, tz]
  d = Math.max(0, Math.min(Q.L, d)); let lo = 1, hi = Q.s.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (Q.s[m] < d) lo = m + 1; else hi = m; }
  const a = Q.P[lo - 1], b = Q.P[lo], seg = (Q.s[lo] - Q.s[lo - 1]) || 1, t = (d - Q.s[lo - 1]) / seg;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
}
function nearD(Q, p) { let bd = 0, bm = 1e9; for (let d = 0; d <= Q.L; d += 1) { const q = atPath(Q, d), m = Math.hypot(q[0] - p[0], q[1] - p[1]); if (m < bm) { bm = m; bd = d; } } return bd; }
const inGap = (d, gaps) => gaps && gaps.some(([a, b]) => d >= a && d <= b);
/* แถบแบนขนานเส้นทาง: ช่วง d0..d1 · ระยะห่างจากแนวกลาง off · กว้าง w · สูง y · o.uv='across' → u=ข้ามแถบ,v=ตามแถบ (ใช้กับ decal นุ่ม ๆ) · o.step ความละเอียด */
function strip(g, Q, d0, d1, off, w, y, rgb, o = {}) {
  if (d1 - d0 < .02) return; const n = Math.max(1, Math.ceil((d1 - d0) / (o.step || 2.4))), L = [], Rr = [];
  for (let i = 0; i <= n; i++) { const d = d0 + (d1 - d0) * i / n, [x, z, tx, tz] = atPath(Q, d), nx = -tz, nz = tx; L.push([x + nx * (off + w / 2), z + nz * (off + w / 2), d]); Rr.push([x + nx * (off - w / 2), z + nz * (off - w / 2), d]); }
  const pv = (p, side) => { g.p.push(p[0], y, p[1]); g.n.push(0, 1, 0); g.c.push(rgb[0], rgb[1], rgb[2]); if (g.u) { if (o.uv) g.u.push(side, p[2] / (o.vs || 4)); else g.u.push(p[0] / g.s, p[1] / g.s); } };
  const T3 = (a, b, c, sa, sb, sc) => { if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 0) { pv(a, sa); pv(b, sb); pv(c, sc); } else { pv(a, sa); pv(c, sc); pv(b, sb); } };
  for (let i = 0; i < n; i++) { T3(L[i], L[i + 1], Rr[i + 1], 0, 0, 1); T3(L[i], Rr[i + 1], Rr[i], 0, 1, 1); }
}
/* ขอบคันหิน: กล่องต่อเนื่องตามเส้นทาง (หน้าบน + ผนังสองข้าง) */
function kerb(g, Q, d0, d1, off, w, y0, y1, rgb, step = 2.2) {
  if (d1 - d0 < .05) return; const n = Math.max(1, Math.ceil((d1 - d0) / step)), pt = (d, k) => { const [x, z, tx, tz] = atPath(Q, d); return [x - tz * (off + k * w / 2), z + tx * (off + k * w / 2)]; };
  for (let i = 0; i < n; i++) {
    const da = d0 + (d1 - d0) * i / n, db = d0 + (d1 - d0) * (i + 1) / n, a0 = pt(da, -1), a1 = pt(da, 1), b0 = pt(db, -1), b1 = pt(db, 1), ctr = [(a0[0] + b1[0]) / 2, (y0 + y1) / 2, (a0[1] + b1[1]) / 2], V = (p, y) => [p[0], y, p[1]];
    quad(g, V(a0, y1), V(a1, y1), V(b1, y1), V(b0, y1), rgb, ctr); quad(g, V(a0, y0), V(b0, y0), V(b0, y1), V(a0, y1), rgb, ctr); quad(g, V(a1, y0), V(b1, y0), V(b1, y1), V(a1, y1), rgb, ctr);
  }
}

/* ═════ ต้นไม้จริง: ลำต้น/กิ่งเรียวโค้ง + ใบเป็นการ์ดโปร่งแสง (alpha-test) · ปาล์มมีทางใบจริง · สร้างเป็นแม่แบบ แล้ว InstancedMesh ซ้ำได้ ═════ */
const TILE = { A: [0, 0], B: [1, 0], C: [0, 1], D: [1, 1] };                       // A=ใบกว้าง · B=ใบย่อยขนนก (จามจุรี) · C=ทางปาล์ม · D=พุ่มใบเล็กทึบ
const tuv = k => { const [c, r] = TILE[k], e = .01; return [c * .5 + e, .5 - r * .5 + e, c * .5 + .5 - e, 1 - r * .5 - e]; };
function drawLeafAtlas(g) {
  const r = rng(77), pick = a => a[(r() * a.length) | 0], hsl = (h, s, l) => `hsl(${h | 0},${s | 0}%,${l | 0}%)`;
  const leaf = (x, y, len, wd, ang, col, rib) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * .2, -wd * .95, len * .72, -wd * .75, len, 0); g.bezierCurveTo(len * .72, wd * .75, len * .2, wd * .95, 0, 0); g.fill();
    if (rib) { g.strokeStyle = rib; g.lineWidth = .8; g.beginPath(); g.moveTo(len * .05, 0); g.lineTo(len * .88, 0); g.stroke(); } g.restore(); };
  const tile = (c, rw, fn) => { g.save(); g.translate(c * 256, rw * 256); g.beginPath(); g.rect(0, 0, 256, 256); g.clip(); fn(); g.restore(); };
  /* A: กลุ่มใบกว้าง (มะม่วง/ประดู่/ลีลาวดี) — 3 ชั้น มืด→สว่าง ให้ดูมีมิติ */
  tile(0, 0, () => { [[60, 15, 23], [80, 25, 34], [50, 36, 49]].forEach(([n, l0, l1], pass) => { for (let i = 0; i < n; i++) {
    const rr = Math.sqrt(r()) * 70, th = r() * 6.283, x = 128 + Math.cos(th) * rr, y = 128 + Math.sin(th) * rr, ang = Math.atan2(y - 128, x - 128) + (r() - .5) * 2.4, l = 30 + r() * 20 - pass * 3, w = 9 + r() * 6;
    leaf(x, y, l, w, ang, hsl(88 + r() * 26, 42 + r() * 18, l0 + r() * (l1 - l0)), pass > 0 ? 'rgba(225,240,170,.28)' : 'rgba(10,25,5,.25)'); } }); });
  /* B: ใบย่อยขนนก (ก้ามปู/จามจุรี/หางนกยูง) */
  tile(1, 0, () => { for (let i = 0; i < 38; i++) {
    const a = r() * 6.283, rr = r() * 26, x0 = 128 + Math.cos(a) * rr, y0 = 128 + Math.sin(a) * rr, dir = a + (r() - .5) * 1.6, L = 52 + r() * 34, cv = (r() - .5) * 1.1, dark = i < 14;
    const P = t => [x0 + Math.cos(dir) * L * t - Math.sin(dir) * cv * L * t * t * .5, y0 + Math.sin(dir) * L * t + Math.cos(dir) * cv * L * t * t * .5];
    g.strokeStyle = 'rgba(60,70,30,.8)'; g.lineWidth = 1.1; g.beginPath(); let p = P(0); g.moveTo(p[0], p[1]); for (let k = 1; k <= 12; k++) { p = P(k / 12); g.lineTo(p[0], p[1]); } g.stroke();
    for (let t = .06; t < 1; t += .055) { const q = P(t), ta = dir + cv * t; for (const sd of [-1, 1]) leaf(q[0], q[1], 17 - 6 * t, 3.6, ta + sd * 1.05, hsl(92 + r() * 22, 46 + r() * 14, dark ? 20 + r() * 8 : 30 + r() * 20)); } } });
  /* C: ทางปาล์ม (แกนกลาง + ใบย่อยทั้งสองข้างโค้งตกปลายชี้ไปทางปลายทาง) */
  tile(0, 1, () => { g.lineCap = 'round'; for (let pass = 0; pass < 2; pass++) { const n = pass ? 62 : 48;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), x = 14 + t * 222 + (pass ? 2.4 : 0), yc = 128 + t * t * 5, len = (70 * Math.sin(Math.PI * Math.min(1, t * .9 + .07)) * (1 - .28 * t) + 8) * (pass ? .86 : 1);
      for (const sd of [-1, 1]) { g.strokeStyle = hsl(92 + r() * 24, 46 + r() * 16, (pass ? 26 : 17) + r() * 15); g.lineWidth = (3.6 - 1.5 * t) * (pass ? .9 : 1.05); g.beginPath(); g.moveTo(x, yc); g.quadraticCurveTo(x + 8 + 8 * t, yc + sd * len * .55, x + 20 + 9 * t, yc + sd * len); g.stroke(); } } }
    g.strokeStyle = '#7a7d3c'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(6, 128); g.lineTo(246, 133); g.stroke(); });
  /* D: พุ่มใบเล็กทึบ (ไซเปรส/ไม้พุ่ม) */
  tile(1, 1, () => { [[130, 15, 24], [150, 24, 34], [90, 34, 46]].forEach(([n, l0, l1]) => { for (let i = 0; i < n; i++) {
    const rr = Math.sqrt(r()) * 86, th = r() * 6.283, x = 128 + Math.cos(th) * rr, y = 128 + Math.sin(th) * rr; leaf(x, y, 15 + r() * 11, 5.5 + r() * 3.5, r() * 6.283, hsl(96 + r() * 22, 40 + r() * 20, l0 + r() * (l1 - l0)), null); } }); });
}
function drawBark(g, w, h) {
  const r = rng(88); g.fillStyle = '#85735f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) { const x = r() * w, y0 = r() * h, len = 40 + r() * 110, wd = .8 + r() * 3.4, a = .2 + r() * .4, ph = r() * 6, lt = r() > .72;
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.strokeStyle = lt ? `rgba(210,190,160,${a * .5})` : `rgba(28,20,14,${a})`; g.lineWidth = wd; g.beginPath(); g.moveTo(x + dx, y0 + dy); for (let k = 1; k <= 7; k++) g.lineTo(x + dx + Math.sin(k * 1.1 + ph) * 3, y0 + dy + k * len / 7); g.stroke(); } }
  for (let i = 0; i < 1800; i++) { g.fillStyle = r() > .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,240,210,.07)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 3); }
}
function drawPalmBark(g, w, h) {
  const r = rng(99); g.fillStyle = '#9a8c76'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(60,48,34,${.05 + r() * .12})`; g.fillRect(x, 0, 1 + r() * 2, h); }
  for (let y = 0; y < h; y += 11) { g.fillStyle = 'rgba(48,38,26,.62)'; g.fillRect(0, y, w, 2.4); g.fillStyle = 'rgba(255,244,220,.2)'; g.fillRect(0, y + 3, w, 2); g.fillStyle = 'rgba(40,30,20,.14)'; g.fillRect(0, y + 5, w, 4); }
  for (let i = 0; i < 700; i++) { g.fillStyle = r() > .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,240,210,.07)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
}
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mulv = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
function card(g, c, u, v, hw, hh, n, rgb, t) {
  const [u0, v0, u1, v1] = tuv(t), P = [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]].map(([a, b, tu, tv]) => [c[0] + u[0] * a * hw + v[0] * b * hh, c[1] + u[1] * a * hw + v[1] * b * hh, c[2] + u[2] * a * hw + v[2] * b * hh, tu, tv]);
  [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]].forEach(tr => tr.forEach(i => { const q = P[i]; g.p.push(q[0], q[1], q[2]); g.n.push(n[0], n[1], n[2]); g.c.push(rgb[0], rgb[1], rgb[2]); g.u.push(q[3], q[4]); }));
}
function limb(g, pts, rad, seg, rgb, vs, vr) {
  const N = pts.length, fr = []; let u = null;
  for (let i = 0; i < N; i++) { const t = nrm(sub(pts[Math.min(N - 1, i + 1)], pts[Math.max(0, i - 1)]));
    if (!u) u = nrm(crs(t, Math.abs(t[1]) < .9 ? [0, 1, 0] : [1, 0, 0])); else { const d = dot(u, t); u = nrm([u[0] - t[0] * d, u[1] - t[1] * d, u[2] - t[2] * d]); } fr.push([t, u, crs(t, u)]); }
  const ring = i => { const [, u, v] = fr[i], P = pts[i], r = rad[i], R = []; for (let k = 0; k <= seg; k++) { const a = k / seg * 6.2832, d = [Math.cos(a) * u[0] + Math.sin(a) * v[0], Math.cos(a) * u[1] + Math.sin(a) * v[1], Math.cos(a) * u[2] + Math.sin(a) * v[2]]; R.push({ p: [P[0] + d[0] * r, P[1] + d[1] * r, P[2] + d[2] * r], n: d, u: k / seg * (vr || 2) }); } return R; };
  let prev = ring(0), pv = 0, len = 0;
  for (let i = 1; i < N; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); const cur = ring(i), cv = len / vs;
    for (let k = 0; k < seg; k++) { const A = prev[k], B = prev[k + 1], C = cur[k + 1], D = cur[k]; [[A, pv], [B, pv], [C, cv], [A, pv], [C, cv], [D, cv]].forEach(([q, vv]) => { g.p.push(q.p[0], q.p[1], q.p[2]); g.n.push(q.n[0], q.n[1], q.n[2]); g.c.push(rgb[0], rgb[1], rgb[2]); g.u.push(q.u, vv); }); }
    prev = cur; pv = cv; }
}
/* กลุ่มใบ: n การ์ดกระจายในทรงรี c0±rad · crown = {c,r,b,t} ใช้คำนวณแสง (ยอดสว่าง/โคนมืด/ด้านในมืด) */
function foliage(g, R_, c0, rad, n, size, tile, crown, tint) {
  for (let i = 0; i < n; i++) {
    let d; do { d = [R_() * 2 - 1, R_() * 2 - 1, R_() * 2 - 1]; } while (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] > 1);
    const c = [c0[0] + d[0] * rad[0], c0[1] + d[1] * rad[1], c0[2] + d[2] * rad[2]], q = [(c[0] - crown.c[0]) / crown.r[0], (c[1] - crown.c[1]) / crown.r[1], (c[2] - crown.c[2]) / crown.r[2]], out = nrm([q[0], q[1] + .22, q[2]]);
    const N = nrm([out[0] * .8 + (R_() - .5) * 1.5, out[1] * .8 + (R_() - .5) * 1.5 + .25, out[2] * .8 + (R_() - .5) * 1.5]), u0 = nrm(crs(N, Math.abs(N[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), v0 = crs(N, u0), a = R_() * 6.283, ca = Math.cos(a), sa = Math.sin(a);
    const u = [u0[0] * ca + v0[0] * sa, u0[1] * ca + v0[1] * sa, u0[2] * ca + v0[2] * sa], v = [-u0[0] * sa + v0[0] * ca, -u0[1] * sa + v0[1] * ca, -u0[2] * sa + v0[2] * ca], s = size * (.78 + .44 * R_()) / 2;
    const hh = Math.max(0, Math.min(1, (c[1] - crown.b) / Math.max(.1, crown.t - crown.b))), rho = Math.min(1, Math.hypot(q[0], q[1], q[2])), k = (.6 + .5 * hh) * (.76 + .24 * rho) * (.9 + .2 * R_());
    card(g, c, u, v, s, s, out, tint.map(x => Math.min(1.15, x * k)), tile);
  }
}
/* ทางปาล์ม: แถบ 3 คอลัมน์พับเป็นร่อง V โค้งตกปลาย */
function frond(g, base, a, pitch, L, wd, rgb, nv) {
  const dx = Math.cos(a), dz = Math.sin(a), cp = Math.cos(pitch), sp = Math.sin(pitch), n = 5, side = [-dz, 0, dx], [u0, v0, u1, v1] = tuv('C'), vm = (v0 + v1) / 2;
  const pos = t => [base[0] + dx * L * t * cp, base[1] + L * t * sp - L * .62 * t * t, base[2] + dz * L * t * cp], col = (P, s, lift) => [P[0] + side[0] * s, P[1] + lift, P[2] + side[2] * s];
  for (let j = 0; j < n; j++) { const t0 = j / n, t1 = (j + 1) / n, A = pos(t0), B = pos(t1), w0 = wd * (1 - .25 * t0), w1 = wd * (1 - .25 * t1), uA = u0 + (u1 - u0) * t0, uB = u0 + (u1 - u0) * t1;
    const C = [[col(A, -w0, -w0 * .32), uA, v0], [col(A, 0, 0), uA, vm], [col(A, w0, -w0 * .32), uA, v1], [col(B, -w1, -w1 * .32), uB, v0], [col(B, 0, 0), uB, vm], [col(B, w1, -w1 * .32), uB, v1]];
    [[0, 1, 4], [0, 4, 3], [1, 2, 5], [1, 5, 4], [0, 4, 1], [0, 3, 4], [1, 5, 2], [1, 4, 5]].forEach(tr => tr.forEach(i => { const q = C[i]; g.p.push(q[0][0], q[0][1], q[0][2]); g.n.push(nv[0], nv[1], nv[2]); g.c.push(rgb[0], rgb[1], rgb[2]); g.u.push(q[1], q[2]); })); }
}
function buildTree(kind, seed, lod) {
  const R_ = rng(seed), B = G(1, 1), Lf = G(1, 1), U = (a, b) => a + (b - a) * R_(), kq = lod ? .42 : 1, fol = (g, R, c0, rad, n, size, tile, crown, tint) => foliage(g, R, c0, rad, n, size * (lod ? 1.25 : 1), tile, crown, tint), bk = () => { const k = .82 + .2 * R_(); return [k, k * .96, k * .92]; };
  let H = 6, rad = 3;
  const lim = (pts, rr, seg = 6, vs = 1.4) => limb(B, pts, rr, lod ? Math.max(4, seg - 2) : seg, bk(), vs, 2);
  if (kind == 'rain') {                                                       // ก้ามปู/จามจุรี: เรือนยอดกว้างทรงร่ม
    H = U(11, 14); const ht = H * U(.3, .38), lean = [U(-.7, .7), U(-.7, .7)], top = [lean[0], ht, lean[1]], W = H * U(1.05, 1.3), tint = [.95, 1, .9];
    lim([[0, 0, 0], [lean[0] * .3, ht * .35, lean[1] * .3], [lean[0] * .7, ht * .7, lean[1] * .7], top], [.62, .44, .38, .34], 9);
    const crown = { c: [top[0], ht + H * .3, top[2]], r: [W / 2, H * .3, W / 2], b: ht, t: ht + H * .6 }, tips = [];
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + U(-.3, .3), ca = Math.cos(a), sa = Math.sin(a), len = W * U(.36, .46);
      const p1 = [top[0] + ca * len * .22, ht + len * .3, top[2] + sa * len * .22], p2 = [top[0] + ca * len * .58, ht + len * .56, top[2] + sa * len * .58], p3 = [top[0] + ca * len, ht + len * .66 + H * .06, top[2] + sa * len];
      lim([top, p1, p2, p3], [.27, .21, .14, .07]); tips.push(p3);
      for (let j = 0; j < 2; j++) { const a2 = a + U(-.9, .9), l2 = len * U(.3, .42), q = [p2[0] + Math.cos(a2) * l2, p2[1] + l2 * .55 + U(0, .8), p2[2] + Math.sin(a2) * l2]; lim([p2, [(p2[0] + q[0]) / 2, (p2[1] + q[1]) / 2 + .35, (p2[2] + q[2]) / 2], q], [.09, .06, .03], 5, 1); tips.push(q); } }
    tips.forEach(t => fol(Lf, R_, t, [W * .19, H * .12, W * .19], Math.round(7 * kq), 3.4, 'B', crown, tint)); fol(Lf, R_, crown.c, [W * .42, H * .22, W * .42], Math.round(34 * kq), 3.6, 'B', crown, tint); rad = W / 2;
  } else if (kind == 'ovoid') {                                              // ต้นไม้ร่มเงาทรงไข่ (มะม่วง/ประดู่/ตะแบก)
    H = U(7, 10); const ht = H * U(.28, .34), lean = [U(-.3, .3), U(-.3, .3)], top = [lean[0], ht, lean[1]], W = H * U(.62, .78), tint = [.96, 1, .92];
    lim([[0, 0, 0], [lean[0] * .4, ht * .4, lean[1] * .4], [lean[0] * .8, ht * .75, lean[1] * .8], top], [.42, .3, .25, .22], 8);
    const crown = { c: [top[0], ht + H * .36, top[2]], r: [W / 2, H * .38, W / 2], b: ht - .5, t: ht + H * .74 }, tips = [];
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + U(-.4, .4), ca = Math.cos(a), sa = Math.sin(a), len = W * U(.3, .42), hgt = H * U(.38, .5);
      const p1 = [top[0] + ca * len * .3, ht + hgt * .35, top[2] + sa * len * .3], p2 = [top[0] + ca * len * .75, ht + hgt * .7, top[2] + sa * len * .75], p3 = [top[0] + ca * len, ht + hgt, top[2] + sa * len];
      lim([top, p1, p2, p3], [.19, .15, .1, .05]); tips.push(p2, p3); }
    tips.forEach(t => fol(Lf, R_, t, [W * .22, H * .14, W * .22], Math.round(6 * kq), 2.3, 'A', crown, tint)); fol(Lf, R_, crown.c, [W * .38, H * .3, W * .38], Math.round(24 * kq), 2.5, 'A', crown, tint); rad = W / 2;
  } else if (kind == 'frang') {                                              // ลีลาวดี: ลำต้นอวบ กิ่งป้านแตกเป็นง่าม ใบกระจุกปลายกิ่ง
    H = U(3.4, 4.8); const ht = H * .36, W = H * 1.0, tint = [1, 1, .95];
    lim([[0, 0, 0], [.1, ht * .5, 0], [.15, ht, .05]], [.3, .24, .21], 8);
    const crown = { c: [0, ht + H * .3, 0], r: [W / 2, H * .33, W / 2], b: ht, t: ht + H * .7 }, top = [.15, ht, .05];
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + U(-.4, .4), ca = Math.cos(a), sa = Math.sin(a), l1 = U(.9, 1.3), m = [top[0] + ca * l1 * .7, ht + l1 * .8, top[2] + sa * l1 * .7];
      lim([top, [(top[0] + m[0]) / 2, (top[1] + m[1]) / 2, (top[2] + m[2]) / 2], m], [.13, .11, .09], 6); 
      for (let j = 0; j < 2; j++) { const a2 = a + (j ? .8 : -.8) + U(-.2, .2), l2 = U(.8, 1.2), q = [m[0] + Math.cos(a2) * l2 * .8, m[1] + l2 * .7, m[2] + Math.sin(a2) * l2 * .8]; lim([m, [(m[0] + q[0]) / 2, (m[1] + q[1]) / 2 + .1, (m[2] + q[2]) / 2], q], [.085, .07, .055], 5, 1); fol(Lf, R_, q, [.55, .35, .55], Math.round(6 * kq), 1.5, 'A', crown, tint); } }
    rad = W / 2;
  } else if (kind == 'cyp') {                                                // ไซเปรส/สนฉัตร ทรงกระบอกแหลม
    H = U(5.2, 6.8); const Rr = U(.85, 1.1), N = Math.round(54 * kq), crown = { c: [0, H * .45, 0], r: [Rr, H * .5, Rr], b: 0, t: H }, tint = [.84, .98, .84];
    lim([[0, 0, 0], [0, 1.2, 0], [0, 2.6, 0]], [.1, .08, .05], 5, 1);
    for (let i = 0; i < N; i++) { const t = Math.pow(i / N, .85), y = .25 + (H - .5) * t, rr = Rr * Math.pow(1 - t, .5) + .15, a = R_() * 6.283, d = rr * (.35 + .65 * R_());
      fol(Lf, R_, [Math.cos(a) * d * .5, y, Math.sin(a) * d * .5], [rr * .5 + .15, .25, rr * .5 + .15], 1, 1.5 + (1 - t) * .5, 'D', crown, tint); } rad = Rr;
  } else if (kind == 'shrub') {                                              // พุ่มไม้เตี้ย
    const Rr = U(.65, 1.0); H = Rr * 1.1; const crown = { c: [0, Rr * .5, 0], r: [Rr, Rr * .6, Rr], b: 0, t: Rr * 1.1 }, tint = [.95, 1, .9];
    fol(Lf, R_, [0, Rr * .5, 0], [Rr * .85, Rr * .5, Rr * .85], Math.round(16 * kq), Rr * 1.05, R_() > .45 ? 'D' : 'A', crown, tint); rad = Rr;
  } else if (kind == 'palm' || kind == 'palmS') {                            // มะพร้าว/ปาล์ม: ลำต้นโค้งมีข้อ + ทางใบ 14-16 ทาง + ลูกมะพร้าว
    const sm = kind == 'palmS'; H = sm ? U(1.3, 2.4) : U(8, 11.5); const lean = [U(-1.2, 1.2) * (sm ? .1 : 1), U(-1.2, 1.2) * (sm ? .1 : 1)], N = 6, pts = [], rr = [];
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push([lean[0] * t * t, H * t, lean[1] * t * t]); rr.push((sm ? .075 : .27) * (1 - .22 * t) * (i == 0 ? 1.35 : 1)); }
    const BP = G(1, 1); limb(BP, pts, rr, sm ? 6 : 8, [.95, .93, .9], sm ? 1 : 2.2, 2); B.palm = BP;
    const top = pts[N], nF = Math.round((sm ? 11 : 20) * (lod ? .75 : 1)), Lh = sm ? U(1.25, 1.7) : U(3.4, 4.5), wd = sm ? .4 : 1.0, crown = { c: top, r: [Lh, Lh * .5, Lh], b: top[1] - 1, t: top[1] + 2 };
    for (let i = 0; i < nF; i++) { const a = i / nF * 6.283 + U(-.15, .15), old = i % 3 == 0, pitch = old ? U(-.25, .1) : U(.25, .95), k = .85 + .3 * R_();
      frond(Lf, [top[0], top[1] - .05, top[2]], a, pitch, Lh * (old ? 1.05 : .95), wd, [k, k, k * .92], nrm([Math.cos(a) * .2, 1, Math.sin(a) * .2])); }
    if (!sm) { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const c = [top[0] + Math.cos(a) * .28, top[1] - .55 - .1 * R_(), top[2] + Math.sin(a) * .28]; blob(B, c[0], c[1], c[2], .17, .2, .17, [.42, .5, .2], R_, ICO0, .2); } }
    rad = Lh;
  }
  return { B, Lf, H, rad };
}

window.H3Site2 = function (THREE, cfg) {
  const R_ = rng(11), tag0 = cfg.tag || (() => ({ position: { set() { } } })), SOLAR = cfg.solar === true;
  /* ป้ายชื่อเป็นของ scene (ไม่ได้อยู่ใน group) → ชดเชย offset ของไซต์ให้ตรงกับอาคาร */
  const tag = (...a) => { const s = tag0(...a), p = s.position, set = p.set.bind(p); p.set = (x, y, z) => set(x + OX, y, z + OZ); return s; };
  const HQ = !!(cfg.renderer && (cfg.quality === 'high' || (cfg.quality !== 'low' && !(typeof innerWidth != 'undefined' && innerWidth < 700))) && THREE.PMREMGenerator && typeof document != 'undefined'), envMats = [];   // HQ = วัสดุ PBR + สะท้อนท้องฟ้า · cfg.quality: 'high' บังคับเปิด · 'low' ปิด (Lambert เบา) · ไม่ระบุ = เปิดบนเดสก์ท็อป ปิดบนจอ <700px
  const W = (px, py) => [(py - 582.5) * .2, 2 - (px - 467.5) * .2];            // แปลน(px,py) → โลก [x,z]
  const PW = a => a.map(([px, py]) => W(px, py));
  const PR = ([x0, y0, x1, y1]) => { const a = W(x0, y0), b = W(x1, y1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }; // → [X0,Z0,X1,Z1]
  const rc = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  /* F=ถาวร · H=เปลือกอาคาร Phase 1 (เห็นเมื่อถอยไกล) · GN=ผนังโปร่ง+เครื่องปั่นไฟ (เห็นเมื่อซูมเข้า)
     roof = หลังคา (texture standing-seam) · glow = กระจก/ช่องแสง (สว่างตอนค่ำ) · lamp = โคมไฟเสา
     GC/GG/GO = พื้นคอนกรีต/หญ้า/นอกไซต์ (มี texture รับเงาอย่างเดียว) · OUT = เนินเขา/แนวป่า/เสาไฟฟ้านอกรั้ว */
  const F = { flat: G(), clad: G(1), roof: G(1), glow: G(), lamp: G() }, H = { flat: G(), clad: G(1), roof: G(1), glow: G() }, GN = G(), TR = G(), OUT = G();
  const GC = G(1, 12), GG = G(1, 10), GO = G(1, 16), GA = G(1, 8), GP = G(1, 2.4), GM = G(), GW = G(1), GAO = G(1), GAH = G(1), OT = { flat: OUT, clad: OUT, roof: OUT }, LT = { flat: F.lamp, clad: F.lamp };
  /* พาเลตสีอ้างอิงจากภาพถ่ายหน้างาน: หลังคาเทาเงิน · ผนังหัวอาคารสีแชมเปญ · ครีบกระจกดำน้ำเงิน · รั้วคอนกรีตสีอ่อน · ถนนคอนกรีตสว่าง */
  const K = Object.fromEntries(Object.entries({
    field: 0x76804a, grass: 0x768548, lawn: 0x859350, road: 0x93969a, apron: 0xa3a6a9, park: 0x8f9296, walk: 0xb2b5b8, rust: 0x8a6a52, gravel: 0x8c8f92, line: 0xeceff2, curb: 0xc0c3c6,
    hallWall: 0xb9bdc4, endWall: 0xb4a07c, hallRoof: 0xaeb2b9, rim: 0xd6d9de, fin: 0x2b323d, plinth: 0x6e727a, louver: 0x2a2f37, door: 0x2a2e35, solar: 0x1b3a78,
    utWall: 0x9ca3ac, utTan: 0x9d8d72, utRoof: 0xa2a7ae, chiller: 0xc8cdd4, chillerTop: 0xd6dade, coil: 0x4a5058, fanRing: 0x8a9099, fan: 0x1a1c21, stack: 0x575c63, muffler: 0x6b7078,
    admDark: 0x5a4a3e, admMid: 0x85745f, admRoof: 0xc9cdd2, canopy: 0xc4c8cd,
    secWall: 0x6b7480, secRoof: 0xb4b9bf, gate: 0x2c3036, pillar: 0x6a707a, stone: 0xa0a5ab,
    fence: 0xcdd0d3, cap: 0x8f949b, post: 0xb4b8bd, cab: 0xd2a526, trailer: 0x7d8895, trailerTop: 0x98a2ad, tyre: 0x1a1c20,
    trunk: 0x5a4332, cyp: 0x1f5e30, tank: 0xc1c6cc, trafo: 0x56725f, porcelain: 0x9a6b3a, genset: 0xcfd8f0,
    pole: 0x5b6068, palmTrunk: 0x6b5a45, stake: 0x8a6a45, carGlass: 0x2a3947, wood: 0x4a4038,
    asph: 0x4f5257, paverR: 0xb9735a, paverG: 0xc9cac7, vent: 0xa4aab0, ventCap: 0x6d737a, hatch: 0x8b9298, rail: 0xe0b43c, pipeG: 0x80858b, pipeB: 0x3d6f9e, mull: 0x24282d, mkW: 0xeeeeea, mkY: 0xf5c21a, mkB: 0x16171a, grate: 0x2b2d31
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
  { const N = 72, C = 36, o = -N * C / 2, y = -.8, push = (x, z) => { GO.p.push(x, y, z); GO.n.push(0, 1, 0); const n = vn(x / 190, z / 190) * .6 + vn(x / 64, z / 64) * .4, c = [.84 + .3 * n, .9 + .2 * n, .8 + .3 * n]; GO.c.push(c[0], c[1], c[2]); GO.u.push(x / 320, z / 320); };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x0 = o + i * C, z0 = o + j * C, x1 = x0 + C, z1 = z0 + C; [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]].forEach(([x, z]) => push(x, z)); } }
  flat(GG, PW(SITE.map(p => ins(p, -.022))), -.7, K.grass); flat(GG, PW(SITE), -.6, K.grass);   // สนามหญ้าตัดเรียบรอบรั้ว
  flat(GC, PW(LOOP), -.45, K.road);
  [[305, 85, 1165, 385], [305, 440, 1165, 745]].forEach(r => { flat(GG, PW(rc(...r)), -.3, K.lawn);
    const P = PW(rc(...r)); for (let i = 0; i < 4; i++) hx(F, SG(P[i], P[(i + 1) % 4], .4), -.45, -.17, K.curb, K.curb, { flat: 1 }); });   // ขอบคันหินรอบสนามหญ้า
  const HALLS = [[355, 105, 580, 368], [930, 105, 1150, 368], [930, 450, 1150, 715]], UTILS = [[610, 100, 730, 368], [775, 100, 890, 368], [775, 455, 890, 715]];
  const P1H = [350, 445, 585, 720], P1U = [610, 450, 730, 715];
  /* PH = เฟสที่ "โปร่งให้เห็น Rack" · Phase 2 = ตึกซ้ายบน (ขนาดเท่า Phase 1 เลื่อนขึ้น DY พิกเซลแปลน) · Phase 1 กลายเป็นอาคารทึบ */
  const PH = cfg.phase == 2 ? 2 : 1, DY = 345, up = r => [r[0], r[1] - DY, r[2], r[3] - DY];
  const TH = PH == 2 ? up(P1H) : P1H, TU = PH == 2 ? up(P1U) : P1U, OH = PH == 2 ? HALLS.slice(1).concat([P1H]) : HALLS, OU = PH == 2 ? UTILS.slice(1).concat([P1U]) : UTILS;
  const GEN = [517, 562, 607, 652], ctrOf = r => { const [a, b, c, d] = PR(r); return [(a + c) / 2, (b + d) / 2]; }, c0 = ctrOf(P1H), c1 = ctrOf(TH), OX = c0[0] - c1[0], OZ = c0[1] - c1[1];   // OX/OZ = ระยะเลื่อนไซต์ให้ตึกเป้าหมายอยู่ที่จุดกำเนิด
  OH.concat(OU, [TH, TU]).forEach(([a, b, c, d]) => flat(GC, PW(rc(a - 18, b - 18, c + 18, d + 18)), -.22, K.apron));   // ลานคอนกรีตรอบอาคาร
  flat(GP, PW(rc(300, 400, 1135, 420)), -.12, K.paverR); flat(GP, PW(rc(540, 420, 556, 450)), -.12, K.paverR);   // ทางเดินระหว่างแถวอาคาร (ปูอิฐ)
  flat(GG, PW(rc(1170, 110, 1240, 280)), -.15, K.gravel);                            // ลาน 115 kV (กรวด)
  [[215, 650, 55, 55], [218, 573, 44, 20]].forEach(([px, py, rx, ry]) => { const [x, z] = W(px, py); disc(GG, x, -.12, z, ry * .2, rx * .2, K.lawn, 28); });
  /* ทางเดินจาก Security ไป Admin */
  const WALK = PW([[112, 745], [150, 702], [196, 690], [242, 652], [262, 590], [262, 500]]);
  for (let i = 0; i < WALK.length - 1; i++) flat(GP, SG(WALK[i], WALK[i + 1], 3.4), -.08, K.paverG);

  /* ───────── ระบบถนน: ถนนวนรอบไซต์ · ถนนทางเข้า · ซอยบริการ · ลานจอดรถ — แอสฟัลต์ + ขอบคันหิน + เส้นจราจร + ทางม้าลาย + ฝาท่อ/ตะแกรงระบายน้ำ ───────── */
  const MW = K.mkW, MY = K.mkY, MB = K.mkB, YR = -.16, YM = -.135;
  const mkR = (pts, w, o) => Object.assign({ Q: mkPath(pts), w, gaps: [], ends: [0, 0] }, o);
  const RING = mkR(fillet(PW([[200, 68], [1317, 68], [1180, 733], [153, 778]]), 12, true), 6.6, { ring: 1, line: 1 });
  const ENTRY = mkR(PW([[42, 1080], [80, 846]]).concat(bez(W(80, 846), W(80, 780), W(175, 779), 18).slice(1)), 7.2, { line: 1 });
  const lane = (a, b, c, d, w, o) => mkR(PW([[a, b], [c, d]]), w, o);
  const L1 = lane(753, 66, 753, 752, 6, { line: 1 }), L2 = lane(910, 66, 910, 745, 6, { line: 1 }), CPK = lane(286, 66, 286, 236, 8.8, {}), SPUR = lane(169, 535, 330, 535, 6, { line: 1 }), SSUB = lane(1291, 195, 1242, 195, 6, { line: 1 });
  const PUB = mkR(fillet(PW([[-2600, 1034], [-300, 1076], [1600, 1096], [3800, 1040]]), 110, false), 8.6, { line: 1, nokerb: 1 });   // ถนนสาธารณะหน้าโครงการ
  const ROADS = [RING, ENTRY, PUB, L1, L2, CPK, SPUR, SSUB];
  { const d = nearD(PUB.Q, ENTRY.Q.P[0]); PUB.gaps.push([d - ENTRY.w / 2 - 1.3, d + ENTRY.w / 2 + 1.3]); ENTRY.ends[0] = ENTRY.w / 2 + 2.2; }
  [[L1, 0], [L1, 1], [L2, 0], [L2, 1], [CPK, 0], [SPUR, 0], [SSUB, 0], [ENTRY, 1]].forEach(([R, e]) => {       // ปลายซอยที่ชนถนนวน: เว้นขอบทาง/เส้นข้างตรงปากซอย
    const p = e ? R.Q.P[R.Q.P.length - 1] : R.Q.P[0], d = nearD(RING.Q, p); RING.gaps.push([d - R.w / 2 - 1.4, d + R.w / 2 + 1.4]); R.ends[e] = R.w / 2 + 1.6; });
  const freeIv = (R, a, b) => { const g = R.gaps.filter(([x, y]) => y > a && x < b).sort((p, q) => p[0] - q[0]), out = []; let c = a; g.forEach(([x, y]) => { if (x > c) out.push([c, Math.min(x, b)]); c = Math.max(c, y); }); if (c < b) out.push([c, b]); return out; };
  ROADS.forEach(R => {
    const { Q, w } = R, a = R.ends[0], b = Q.L - R.ends[1];
    strip(GA, Q, 0, Q.L, 0, w, YR, K.asph, { step: 2 });
    freeIv(R, a, b).forEach(([x, y]) => { [-1, 1].forEach(sd => { strip(GM, Q, x, y, sd * (w / 2 - .42), .14, YM, MW, { step: 3 }); if (!R.nokerb) kerb(F.flat, Q, x, y, sd * (w / 2 + .14), .3, -.4, -.02, K.curb); }); });
    if (R.nokerb) strip(GG, Q, 0, Q.L, 0, w + 4.4, -.5, [.78, .72, .52], { step: 6 });                  // ไหล่ทางดิน/หญ้าแห้ง
    if (R.line) freeIv(R, a + 1, b - 1).forEach(([x, y]) => { for (let d = x + 1; d + 3 < y; d += 9) strip(GM, Q, d, d + 3, 0, .13, YM, MY, { step: 1.5 }); });
    if (w >= 6 && R.line) [-1, 1].forEach(sd => [-1, 1].forEach(t => strip(GW, Q, 0, Q.L, sd * w / 4 + t * .85, .8, YR + .01, [0, 0, 0], { uv: 1, step: 3 })));   // รอยล้อรถ
    for (let d = 14; d < Q.L - 10; d += 31) { const [x, z, tx, tz] = atPath(Q, d), sd = R.ring ? 1 : (Math.round(d / 31) % 2 ? 1 : -1), o = sd * (w / 2 - .5); if (inGap(d, R.gaps) || (R.ring && !(d % 2 < 3))) continue;   // ตะแกรงระบายน้ำริมขอบทาง
      const px = x - tz * o, pz = z + tx * o; flat(GM, [[px - tx * .55 - (-tz) * .2 * sd, pz - tz * .55 - tx * .2 * sd], [px + tx * .55 - (-tz) * .2 * sd, pz + tz * .55 - tx * .2 * sd], [px + tx * .55 + (-tz) * .2 * sd, pz + tz * .55 + tx * .2 * sd], [px - tx * .55 + (-tz) * .2 * sd, pz - tz * .55 + tx * .2 * sd]], YM + .005, K.grate); }
  });
  /* ลานจอดรถ: ช่องจอด 2 ฝั่ง (แอสฟัลต์) ต่อกับทางเดินรถกลาง */
  [[240, 100, 266, 232], [306, 100, 332, 232]].forEach(r => flat(GA, PW(rc(...r)), YR + .005, K.asph));
  /* ทางม้าลาย / ลูกระนาด / ลูกศร / เส้นหยุด */
  const zebra = (R, d, along, n, pitch, wd) => { for (let i = 0; i < n; i++) strip(GM, R.Q, d - along / 2, d + along / 2, (i - (n - 1) / 2) * pitch, wd, YM + .003, MW, { step: 1.5 }); };
  zebra(L1, (410 - 66) * .2, 4.4, 7, .85, .45); zebra(L2, (410 - 66) * .2, 4.4, 7, .85, .45); zebra(SPUR, (262 - 169) * .2, 3.2, 7, .85, .45);
  const gateD = Math.hypot(38, 234) * .2;                                                   // ระยะถึงแนวประตูรั้ว
  for (let k = 0; k < 7; k++) { strip(GM, ENTRY.Q, gateD + 7 + k * .5, gateD + 7.5 + k * .5, 0, 6.6, YM + .004, k % 2 ? MB : MY, { step: 3 }); strip(GM, ENTRY.Q, gateD - 11 + k * .5, gateD - 10.5 + k * .5, 0, 6.6, YM + .004, k % 2 ? MB : MY, { step: 3 }); }   // ลูกระนาด
  strip(GM, ENTRY.Q, gateD - 6, gateD - 5.6, -ENTRY.w / 4, ENTRY.w / 2 - .6, YM + .004, MW, { step: 3 });
  const arrow = (R, d, off, L) => { const [x, z, tx, tz] = atPath(R.Q, d), nx = -tz, nz = tx, P = (a, b) => [x + tx * a + nx * (off + b), z + tz * a + nz * (off + b)];
    flat(GM, [P(0, -.14), P(L * .6, -.14), P(L * .6, .14), P(0, .14)], YM + .004, MW); flat(GM, [P(L * .6, -.5), P(L, 0), P(L * .6, .5)], YM + .004, MW); };
  arrow(ENTRY, gateD - 17, -ENTRY.w / 4, 3.4); arrow(ENTRY, gateD - 27, -ENTRY.w / 4, 3.4); arrow(ENTRY, gateD + 20, -ENTRY.w / 4, 3.4);
  [[RING, 120], [RING, 330], [L1, 30], [L2, 40], [CPK, 20]].forEach(([R, d]) => { const [x, z] = atPath(R.Q, d); disc(GM, x, YM + .004, z, .42, .42, K.grate, 14); disc(GM, x, YM + .008, z, .3, .3, [.38, .38, .4], 14); });   // ฝาท่อ


  /* เงาแนบพื้นรอบอาคาร (ambient occlusion หลอก): แถบไล่โทนมืด→โปร่งใสรอบฐานอาคาร */
  const aoRect = (x0, z0, x1, z1, w, y = -.19, GG_ = GAO) => [[x0, z0, x1, z0, 0, -1], [x1, z0, x1, z1, 1, 0], [x1, z1, x0, z1, 0, 1], [x0, z1, x0, z0, -1, 0]].forEach(([ax, az, bx, bz, nx, nz]) => {
    const Pp = [[ax, az, 0], [bx, bz, 0], [bx + nx * w, bz + nz * w, 1], [ax + nx * w, az + nz * w, 1]], pv = p => { GG_.p.push(p[0], y, p[1]); GG_.n.push(0, 1, 0); GG_.c.push(0, 0, 0); GG_.u.push(p[2], .5); };
    [[0, 1, 2], [0, 2, 3]].forEach(t => { const [a, b, c] = t.map(i => Pp[i]); if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 0) { pv(a); pv(b); pv(c); } else { pv(a); pv(c); pv(b); } }); });
  OH.concat(OU, [[190, 392, 320, 490], [205, 255, 300, 392], [70, 742, 132, 772]]).forEach(r => { const [a, b, c, d] = PR(r); aoRect(a, b, c, d, 3.2); });
  [TH, TU].forEach(r => { const [a, b, c, d] = PR(r); aoRect(a, b, c, d, 3.2, -.19, GAH); });

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
    const leaf = (f, t) => { const L = Math.hypot(t[0] - f[0], t[1] - f[1]), d = [(t[0] - f[0]) / L, (t[1] - f[1]) / L], Pt = (u, y) => [f[0] + d[0] * u, y, f[1] + d[1] * u];   // ประตูเลื่อนเหล็กดัด เปิดค้างไว้ให้รถผ่าน
      tube(F.flat, Pt(0, .32), Pt(L, .32), .05, K.gate, 5, true); tube(F.flat, Pt(0, 2.15), Pt(L, 2.15), .05, K.gate, 5, true); tube(F.flat, Pt(0, 1.2), Pt(L, 1.2), .035, K.gate, 4, true);
      for (let u = .08; u < L; u += .2) tube(F.flat, Pt(u, .3), Pt(u, 2.3), .028, K.gate, 4, false); };
    const lerp2 = k => [gA[0] + (gB[0] - gA[0]) * k, gA[1] + (gB[1] - gA[1]) * k]; leaf(lerp2(.05), lerp2(.3)); leaf(lerp2(.7), lerp2(.95));
  }

  /* ───────── Security gatehouse + กำแพงโค้ง ───────── */
  { const [X0, Z0, X1, Z1] = PR([70, 742, 132, 772]);
    bx(F, X0, Z0, X1, Z1, 0, 3.8, K.secWall, null); bx(F, X0 - .9, Z0 - .9, X1 + .9, Z1 + .9, 3.8, 4.15, K.secRoof, K.secRoof, { flat: 1 });
    for (let s = Z0 + 1; s + 1.6 < Z1; s += 2.4) { plate(F.glow, 'x', X1 + .05, 1, s, s + 1.6, 1.2, 3.0, lit()); plate(F.glow, 'x', X0 - .05, -1, s, s + 1.6, 1.2, 3.0, lit()); }
    const c = W(101, 757), r = 13, arc = [], a0 = -.9, a1 = 1.0;
    for (let i = 0; i <= 10; i++) { const t = a0 + (a1 - a0) * i / 10; arc.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t) * 1.2]); }
    for (let i = 0; i < 10; i++) { if (i >= 4 && i <= 7) continue; hx(F, SG(arc[i], arc[i + 1], .8), 0, 2.5, K.stone, K.cap); }   // เว้นช่องกำแพงโค้งให้ถนนทางเข้าผ่าน
    tag('SECURITY BLDG', '#9fe0ea', 17).position.set((X0 + X1) / 2, 7, (Z0 + Z1) / 2); }
  { const [x, z, tx, tz] = atPath(ENTRY.Q, gateD + 14), nx = -tz, nz = tx, o = ENTRY.w / 2 + .9, bx0 = x + nx * o, bz0 = z + nz * o;   // ไม้กั้นรถ (boom barrier) + ตู้ควบคุม
    bx(F, bx0 - .25, bz0 - .25, bx0 + .25, bz0 + .25, 0, 1.15, K.stripe || [.9, .9, .9], [.9, .9, .9], { flat: 1 });
    for (let k = 0; k < 6; k++) { const a = [bx0 - nx * (.4 + k * .6), 1.05, bz0 - nz * (.4 + k * .6)], b = [bx0 - nx * (1 + k * .6), 1.05, bz0 - nz * (1 + k * .6)]; tube(F.flat, a, b, .05, k % 2 ? [.85, .12, .1] : [.95, .95, .95], 5, true); } }

  /* ───────── Admin (2 ชั้น กระจก+แผงสีบรอนซ์เข้ม หลังคาขาว มีหลังคาคลุมทางเข้า) ───────── */
  { const A = PR([190, 392, 320, 490]), B = PR([205, 255, 300, 392]);
    const glaze = ([X0, Z0, X1, Z1], lv) => lv.forEach(([y0, y1]) => {
      for (let s = X0 + 1.5; s + 2.3 < X1 - 1; s += 2.7) { plate(F.glow, 'z', Z0 - .06, -1, s, s + 2.3, y0, y1, lit()); plate(F.glow, 'z', Z1 + .06, 1, s, s + 2.3, y0, y1, lit()); }
      for (let s = Z0 + 1.5; s + 2.3 < Z1 - 1; s += 2.7) { plate(F.glow, 'x', X0 - .06, -1, s, s + 2.3, y0, y1, lit()); plate(F.glow, 'x', X1 + .06, 1, s, s + 2.3, y0, y1, lit()); } });
    const frames = ([X0, Z0, X1, Z1], lv) => lv.forEach(([y0, y1]) => {           // โครงอลูมิเนียม: เสาตั้ง (mullion) + คานนอน (transom) รอบกระจกทุกช่อง
      const bar = (a, b, c, d, ya, yb) => bx(F, a, b, c, d, ya, yb, K.mull, K.mull, { flat: 1 });
      for (let s = X0 + 1.5; s + 2.3 < X1 - 1; s += 2.7) [Z0 - .1, Z1].forEach((z, k) => { const zz = k ? Z1 + .02 : Z0 - .1; bar(s - .06, zz, s + .06, zz + .1, y0 - .06, y1 + .06); bar(s + 2.24, zz, s + 2.36, zz + .1, y0 - .06, y1 + .06); bar(s - .06, zz, s + 2.36, zz + .1, y0 - .08, y0 + .05); bar(s - .06, zz, s + 2.36, zz + .1, y1 - .05, y1 + .08); bar(s - .06, zz, s + 2.36, zz + .1, (y0 + y1) / 2 - .03, (y0 + y1) / 2 + .03); });
      for (let s = Z0 + 1.5; s + 2.3 < Z1 - 1; s += 2.7) [X0 - .1, X1 + .02].forEach(xx => { bar(xx, s - .06, xx + .1, s + .06, y0 - .06, y1 + .06); bar(xx, s + 2.24, xx + .1, s + 2.36, y0 - .06, y1 + .06); bar(xx, s - .06, xx + .1, s + 2.36, y0 - .08, y0 + .05); bar(xx, s - .06, xx + .1, s + 2.36, y1 - .05, y1 + .08); }); });
    hx(F, R(...A), 0, 8.4, K.admDark, K.admRoof, { rf: 1 }); glaze(A, [[.9, 3.6], [4.6, 7.4]]); frames(A, [[.9, 3.6], [4.6, 7.4]]);
    hx(F, R(...B), 0, 7.2, K.admMid, K.admRoof, { rf: 1 }); glaze(B, [[.9, 3.4], [4.0, 6.4]]); frames(B, [[.9, 3.4], [4.0, 6.4]]);
    bx(F, A[0] - .15, A[1] - .15, A[2] + .15, A[3] + .15, 4.0, 4.25, K.admRoof, K.rim, { flat: 1 });      // แถบพื้นชั้น 2
    bx(F, B[0] - .15, B[1] - .15, B[2] + .15, B[3] + .15, 3.55, 3.8, K.admRoof, K.rim, { flat: 1 });
    [A, B].forEach(([X0, Z0, X1, Z1], i) => { const h = i ? 7.2 : 8.4; bx(F, X0, Z0, X1, Z0 + .3, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X0, Z1 - .3, X1, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X0, Z0, X0 + .3, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); bx(F, X1 - .3, Z0, X1, Z1, h, h + .6, K.admRoof, K.rim, { flat: 1 }); });
    bx(F, A[0] + 3, A[1] + 5, A[0] + 7, A[1] + 12, 9, 10.6, K.utWall, K.utRoof, { flat: 1 });
    [[A[0] + 10, A[1] + 7], [A[0] + 10, A[1] + 11], [A[0] + 10, A[1] + 15]].forEach(([x, z]) => { disc(F.flat, x, 9.05, z, 1.1, 1.1, K.fanRing, 10); disc(F.flat, x, 9.08, z, .85, .85, K.fan, 10); });
    const [C0, D0, C1, D1] = PR([235, 490, 300, 512]);   // หลังคาคลุมทางเข้า
    bx(F, C0, D0, C1, D1, 3.6, 3.95, K.canopy, K.canopy, { flat: 1 }); [[C0 + .4, D0 + .4], [C0 + .4, D1 - .4], [C1 - .4, D0 + .4], [C1 - .4, D1 - .4]].forEach(([x, z]) => bx(F, x - .18, z - .18, x + .18, z + .18, 0, 3.6, K.canopy, K.canopy, { flat: 1 }));
    plate(F.glow, 'x', A[2] + .09, 1, D0 + 4, D1 - 4, 0, 3.1, [1.25, 1.25, 1.25]); bx(F, A[2], D0 + 4 - .1, A[2] + .13, D0 + 4 + .1, 0, 3.2, K.mull, K.mull, { flat: 1 }); bx(F, A[2], D1 - 4 - .1, A[2] + .13, D1 - 4 + .1, 0, 3.2, K.mull, K.mull, { flat: 1 }); bx(F, A[2], (D0 + D1) / 2 - .05, A[2] + .13, (D0 + D1) / 2 + .05, 0, 3.1, K.mull, K.mull, { flat: 1 });
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
    /* รายละเอียดจริง: ปล่องระบายอากาศ · ช่องขึ้นหลังคา · เสาล่อฟ้า · ราวกันตก · ท่อน้ำฝน · เสากันชน · โคมไฟหน้าประตู */
    const ryh = z => HL + (z - Z0) / (Z1 - Z0) * (HH - HL);
    for (let x = X0 + 10; x < X1 - 6; x += 12) [.3, .66].forEach(f => { const z = Z0 + (Z1 - Z0) * f, y = ryh(z); tube(T.flat, [x, y, z], [x, y + 1.05, z], .4, K.vent, 8, false); disc(T.flat, x, y + 1.1, z, .74, .74, K.ventCap, 10); });
    [[X0 + 7, .5], [X1 - 8, .5], [X0 + 20, .84]].forEach(([x, f]) => { const z = Z0 + (Z1 - Z0) * f, y = ryh(z) - .2; bx(T, x - 1, z - .9, x + 1, z + .9, y, y + 1.1, K.hatch, K.hatch, { flat: 1 }); bx(T, x - .9, z - .8, x + .9, z + .8, y + 1.1, y + 1.2, K.ventCap, K.ventCap, { flat: 1 }); });
    [[X0 + 1.4, Z0 + 1.4], [X1 - 1.4, Z0 + 1.4], [X0 + 1.4, Z1 - 1.4], [X1 - 1.4, Z1 - 1.4]].forEach(([x, z]) => tube(T.flat, [x, ryh(z), z], [x, ryh(z) + 3.4, z], .035, K.pole, 4, false));
    for (let x = X0 + 1; x <= X1 - 1; x += 3) tube(T.flat, [x, HL + .5, Z0 + .9], [x, HL + 1.55, Z0 + .9], .04, K.rail, 4, false);
    tube(T.flat, [X0 + 1, HL + 1.55, Z0 + .9], [X1 - 1, HL + 1.55, Z0 + .9], .04, K.rail, 4, false); tube(T.flat, [X0 + 1, HL + 1.05, Z0 + .9], [X1 - 1, HL + 1.05, Z0 + .9], .03, K.rail, 4, false);
    [[X0 + 1.1, Z0 - .16, HL], [X1 - 1.1, Z0 - .16, HL], [X0 + 1.1, Z1 + .16, HH], [X1 - 1.1, Z1 + .16, HH]].forEach(([x, z, h]) => { tube(T.flat, [x, .55, z], [x, h - .2, z], .1, K.pipeG, 6, false); tube(T.flat, [x, h - .2, z], [x, h + .1, z + Math.sign(z - (Z0 + Z1) / 2) * -.35], .1, K.pipeG, 6, false); });
    [Z0 + 11, Z1 - 11].forEach(z => { [-3.5, 3.5].forEach(d => { tube(T.flat, [X1 + 2.7, 0, z + d], [X1 + 2.7, 1.05, z + d], .11, K.cab, 6, true); }); [-2.7, 2.7].forEach(d => bx(LT, X1 + .02, z + d - .2, X1 + .32, z + d + .2, 4.2, 4.5, [1, 1, 1], [1, 1, 1], { flat: 1 })); });
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
    [Z0 + .95, Z1 - .95].forEach((z, i) => { tube(T.flat, [sx + 1.5, HU + 1.35, z], [X1 - 1.5, HU + 1.35, z], .17, i ? K.pipeB : K.pipeG, 8, true); for (let x = sx + 3; x < X1 - 2; x += 7) bx(T, x - .15, z - .15, x + .15, z + .15, HU + .8, HU + 1.2, K.pipeG, K.pipeG, { flat: 1 }); });
    [[X0 + .9, Z0 - .15], [X1 - .9, Z0 - .15], [X0 + .9, Z1 + .15], [X1 - .9, Z1 + .15]].forEach(([x, z]) => tube(T.flat, [x, .5, z], [x, HU - .1, z], .1, K.pipeG, 6, false));
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
  const poleW = (x, z, ax, az) => { const h = 8.5, L = Math.hypot(ax, az) || 1, hx_ = x + ax / L * 1.7, hz_ = z + az / L * 1.7;
    tube(F.flat, [x, -.4, z], [x, h, z], .09, K.pole, 6, false); tube(F.flat, [x, h, z], [hx_, h + .2, hz_], .05, K.pole, 5, false);
    bx(LT, hx_ - .5, hz_ - .22, hx_ + .5, hz_ + .22, h - .02, h + .2, [1, 1, 1], [1, 1, 1], { flat: 1 }); LAMP.push([hx_, h, hz_]); };
  const pole = (px, py, ax, az) => {
    const [x, z] = W(px, py), h = 8.5, L = Math.hypot(ax, az) || 1, hx_ = x + ax / L * 1.5, hz_ = z + az / L * 1.5;
    tube(F.flat, [x, -.4, z], [x, h, z], .09, K.pole, 6, false); tube(F.flat, [x, h, z], [hx_, h + .2, hz_], .05, K.pole, 5, false);
    bx(LT, hx_ - .5, hz_ - .22, hx_ + .5, hz_ + .22, h - .02, h + .2, [1, 1, 1], [1, 1, 1], { flat: 1 }); LAMP.push([hx_, h, hz_]);
  };
  const lampAlong = (R, step, side, d0 = 10) => { for (let d = d0; d < R.Q.L - 6; d += step) { if (inGap(d, R.gaps)) continue; const [x, z, tx, tz] = atPath(R.Q, d); let sd = side || 1; if (R.ring) { const o = R.w / 2 + 1.6, a = [x - tz * o, z + tx * o]; sd = Math.hypot(a[0] - CX, a[1] - CZ) > Math.hypot(x - CX, z - CZ) ? 1 : -1; } else if (!side) sd = Math.round(d / step) % 2 ? 1 : -1;
      const o = sd * (R.w / 2 + 1.5); poleW(x - tz * o, z + tx * o, -(-tz) * sd, -tx * sd); } };
  [[236, 100], [236, 165], [236, 228], [338, 100], [338, 165], [338, 228], [222, 500], [318, 504], [340, 150], [340, 330], [600, 420], [600, 440]].forEach(([a, b]) => pole(a, b, 0, 1));
  lampAlong(RING, 34, 0, 16); lampAlong(ENTRY, 30, 0, 8); [L1, L2].forEach(R => lampAlong(R, 40, 0, 18)); lampAlong(SPUR, 34, -1, 10);

  /* ───────── ต้นไม้จริง (InstancedMesh · ใบ alpha-test): ก้ามปู · ประดู่/มะม่วง · ลีลาวดี · ไซเปรส · มะพร้าว/ปาล์มประดับ · ไม้พุ่ม ───────── */
  flat(GG, PW([[-20, 846], [150, 822], [112, 1015], [-30, 1015]]), -.6, K.grass);   // สนามหญ้าข้างถนนทางเข้า
  const segD = (Q, x, z) => { let m = 1e9; for (let i = 1; i < Q.P.length; i++) { const a = Q.P[i - 1], b = Q.P[i], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return m; };
  const roadDist = (x, z) => ROADS.reduce((m, R) => Math.min(m, segD(R.Q, x, z) - R.w / 2), 1e9);
  const MOB = typeof innerWidth != 'undefined' && innerWidth < 700, TPLS = new Map(), NV = { rain: 3, ovoid: 4, frang: 3, cyp: 2, shrub: 3, palm: 3, palmS: 3 };
  const plant = (kind, x, z, s = 1, o = {}) => {
    if (typeof document == 'undefined' || roadDist(x, z) < (o.clr || 1.6)) return;
    const lod = !!o.lod, key = kind + (lod ? 'L' : '') + ((R_() * NV[kind]) | 0); let t = TPLS.get(key);
    if (!t) { t = Object.assign(buildTree(kind, 1000 + TPLS.size * 37, lod), { inst: [] }); TPLS.set(key, t); }
    t.inst.push([x, o.y == null ? -.4 : o.y, z, R_() * 6.283, s * (.88 + .24 * R_()), .9 + .16 * R_(), .93 + .12 * R_(), .88 + .2 * R_()]);
  };
  const cyp = (px, py, s = 1) => { const [x, z] = W(px, py); plant('cyp', x, z, s, { lod: 1, clr: .8 }); };
  const palm = (px, py, s = 1) => { const [x, z] = W(px, py); plant('palmS', x, z, s, { clr: .8 }); };
  const round = (px, py, s = 1) => { const [x, z] = W(px, py); plant(R_() > .45 ? 'ovoid' : 'frang', x, z, s); };
  for (let px = 345; px <= 1185; px += 13) cyp(px, 802 + (1212 - px) / 1192 * 44 - 13);                  // แถวไซเปรสริมรั้วด้านหน้า
  [[215, 125], [215, 155], [232, 100], [213, 185], [222, 214], [262, 92], [170, 640], [190, 606], [225, 602], [255, 640], [250, 690], [185, 700], [150, 560], [160, 520], [122, 700], [262, 712], [48, 715], [95, 640], [70, 600], [296, 330], [300, 460]].forEach(([a, b]) => round(a, b, 1));
  { const [x, z] = W(215, 650); plant('rain', x, z, 1); }                                              // ต้นไม้ใหญ่กลางสวนหน้า Admin
  for (let px = 372; px <= 560; px += 26) { const [x, z] = W(px, 800 - .0438 * (px - 470)); plant('frang', x, z, .95); }
  for (let d = 8; d < ENTRY.Q.L - 14; d += 11) [-1, 1].forEach(sd => { if (d > gateD - 3 && d < gateD + 12) return; const [x, z, tx, tz] = atPath(ENTRY.Q, d), o = sd * (ENTRY.w / 2 + 4.6); const k = Math.round(d / 11) % 3; plant(k == 1 ? 'palm' : k == 2 ? 'frang' : 'ovoid', x - tz * o, z + tx * o, k == 1 ? .75 : .9); });
  for (let d = 33; d < RING.Q.L - 8; d += 34) { if (inGap(d, RING.gaps)) continue; const [x, z, tx, tz] = atPath(RING.Q, d), A = [x - tz * 6.4, z + tx * 6.4], B = [x + tz * 6.4, z - tx * 6.4], p = Math.hypot(A[0] - CX, A[1] - CZ) > Math.hypot(B[0] - CX, B[1] - CZ) ? A : B; plant(R_() > .35 ? 'ovoid' : 'rain', p[0], p[1], .9); }   // แถวต้นไม้ริมถนนวนด้านนอก
  [[120, 150], [95, 250], [100, 330], [80, 420], [78, 520], [62, 610], [140, 120]].forEach(([a, b]) => { const [x, z] = W(a, b); plant('rain', x, z, .9); });
  [[210, 570], [225, 575], [196, 572], [235, 573]].forEach(([a, b]) => { const [x, z] = W(a, b); plant('shrub', x, z, .85); });
  [PH == 2 ? TH : HALLS[0], P1H].forEach(([a, b, c, d]) => { for (let py = b + 8; py <= d - 8; py += 14) palm(a - 22, py, 1); });   // แถวปาล์มหน้าอาคารด้านยาว (ตามภาพถ่าย)
  [[222, 516], [230, 528], [306, 516], [314, 528], [198, 520], [326, 522]].forEach(([a, b]) => palm(a, b, 1.1));

  /* ───────── นอกรั้ว: เนินป่า · แนวต้นไม้ · เสาไฟฟ้าแรงสูง + สายไฟ (ตามภาพถ่ายมุมสูง) ───────── */
  const WS = SITE.map(p => W(...ins(p, -.3))), inS = (x, z) => { let s = 0; for (let i = 0; i < 4; i++) { const a = WS[i], b = WS[(i + 1) % 4], c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]); s += c > 0 ? 1 : -1; } return Math.abs(s) == 4; };
  const OG = [0x2e5030, 0x37603a, 0x2a4a2e, 0x3f6a3c, 0x4b7340].map(hex), noEnt = (x, z) => x > 30 && Math.abs(z - 82) < 26;
  const hill = (cx, cy, cz, rx, ry, rz, base, sd) => {                              // เนินป่า: ผิวเรียบ + สีเรือนยอดไม้ไล่เฉด (ไม่เป็นเหลี่ยม)
    const V = ICO3.v.map(q => { const m = 1 + .3 * (vn(q[0] * 2.2 + sd, q[2] * 2.2 + sd * .7) - .5) + .12 * (vn(q[0] * 6 + sd, q[2] * 6) - .5), e = Math.max(0, q[1]); return [cx + q[0] * rx * m, cy + (q[1] < 0 ? q[1] * .3 : q[1]) * ry * m * (.8 + .4 * vn(q[0] * 3 + sd, q[2] * 3)), cz + q[2] * rz * m]; });
    const C = V.map(p => { const k = .62 + .62 * vn(p[0] / 26 + sd, p[2] / 26) + .22 * vn(p[0] / 8, p[2] / 8) - .18 * Math.max(0, 1 - (p[1] - cy) / ry * 2.2); return base.map(c => Math.min(1, c * k)); });
    const N = ICO3.v.map((q, i) => nrm([q[0] / rx, Math.max(q[1], .05) / ry * 1.4, q[2] / rz]));
    ICO3.f.forEach(f => f.forEach(i => { OUT.p.push(V[i][0], V[i][1], V[i][2]); OUT.n.push(N[i][0], N[i][1], N[i][2]); OUT.c.push(C[i][0], C[i][1], C[i][2]); }));
  };
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + R_() * .5, r = 430 + R_() * 260; hill(CX + Math.cos(a) * r * .9, -.8, CZ + Math.sin(a) * r * 1.2, 90 + R_() * 90, 22 + R_() * 30, 90 + R_() * 90, OG[(R_() * OG.length) | 0], i * 3.7); }
  for (let gi = 0, ng = 0; ng < (MOB ? 24 : 46) && gi < 1400; gi++) {                         // แนวต้นไม้นอกรั้วจัดเป็นกลุ่ม ๆ
    const a = R_() * 6.283, r = 70 + 380 * Math.pow(R_(), 1.2), gx = CX + Math.cos(a) * r * .85, gz = CZ + Math.sin(a) * r * 1.25;
    if (inS(gx, gz) || noEnt(gx, gz)) continue; ng++;
    for (let k = 0, m = 4 + (R_() * 6 | 0); k < m; k++) {
      const x = gx + (R_() - .5) * 46, z = gz + (R_() - .5) * 46; if (inS(x, z) || noEnt(x, z)) continue;
      const u = R_(); if (u < .5) plant('ovoid', x, z, 1 + R_() * .5, { lod: 1, y: -.8 }); else if (u < .72) plant('rain', x, z, .9 + R_() * .35, { lod: 1, y: -.8 }); else if (u < .9) plant('palm', x, z, .85 + R_() * .3, { lod: 1, y: -.8 }); else plant('shrub', x, z, 1.4, { lod: 1, y: -.8 });
    }
  }
  const PWX = W(0, 20)[0] - 14, WIRE = [];
  for (let z = 70, k = 0; z > -190; z -= 42.5, k++) {
    tube(OUT, [PWX, -.8, z], [PWX, 11, z], .17, K.pole, 6, false); bx(OT, PWX - 1.9, z - .12, PWX + 1.9, z + .12, 10.2, 10.5, K.pole, K.pole, { flat: 1 });
    [-1.5, 0, 1.5].forEach(dx => tube(OUT, [PWX + dx, 10.5, z], [PWX + dx, 11, z], .07, K.porcelain, 5, false));
    if (z - 42.5 > -190) [-1.5, 0, 1.5].forEach(dx => { for (let s = 0; s < 8; s++) { const t0 = s / 8, t1 = (s + 1) / 8, y = t => 10.95 - 1.3 * 4 * t * (1 - t); WIRE.push(PWX + dx, y(t0), z - 42.5 * t0, PWX + dx, y(t1), z - 42.5 * t1); } });
  }

  /* ───────── บริบทรอบไซต์: เสาไฟฟ้าริมถนนสาธารณะ · บ้าน/ตึกแถว/โกดังข้างทางและกลางทุ่ง ───────── */
  for (let d = 30; d < PUB.Q.L - 30; d += 38) { const [x, z, tx, tz] = atPath(PUB.Q, d), nx = -tz, nz = tx, o = -8.2, px = x + nx * o, pz = z + nz * o;
    if (Math.hypot(px - CX, pz - CZ) > 420) continue;
    tube(OUT, [px, -.6, pz], [px, 9.6, pz], .14, [.6, .6, .58], 6, false); tube(OUT, [px - tx * 0 - nx * 1.1, 9.1, pz - nz * 1.1], [px + nx * 1.1, 9.1, pz + nz * 1.1], .06, K.pole, 5, true);
    [-1, 0, 1].forEach(k => { tube(OUT, [px + nx * k, 9.1, pz + nz * k], [px + nx * k, 9.45, pz + nz * k], .05, K.porcelain, 5, false);
      const [x2, z2, tx2, tz2] = atPath(PUB.Q, d + 38), qx = x2 + (-tz2) * o + (-tz2) * k, qz = z2 + tx2 * o + tx2 * k; if (d + 38 < PUB.Q.L - 30) for (let sg = 0; sg < 8; sg++) { const t0 = sg / 8, t1 = (sg + 1) / 8, yy = t => 9.4 - 1.1 * 4 * t * (1 - t), ax = px + nx * k, az = pz + nz * k; WIRE.push(ax + (qx - ax) * t0, yy(t0), az + (qz - az) * t0, ax + (qx - ax) * t1, yy(t1), az + (qz - az) * t1); } }); }
  const dwell = (x, z, w, dd, h, rot, wallC, roofC, kind) => {
    const c = Math.cos(rot), sn = Math.sin(rot), P = (lx, ly, lz) => [x + lx * c - lz * sn, ly, z + lx * sn + lz * c], ctr = [x, h / 2, z], rh = kind == 'wh' ? 1.3 : Math.min(dd, 9) * .3, ov = kind == 'wh' ? .4 : .75, hw = w / 2, hd = dd / 2;
    [[-hw, -hd, hw, -hd], [hw, -hd, hw, hd], [hw, hd, -hw, hd], [-hw, hd, -hw, -hd]].forEach(([a, b, c2, d2]) => quad(OUT, P(a, 0, b), P(c2, 0, d2), P(c2, h, d2), P(a, h, b), wallC, ctr));
    quad(OUT, P(-hw - ov, h - .2, -hd - ov), P(hw + ov, h - .2, -hd - ov), P(hw + ov, h + rh, 0), P(-hw - ov, h + rh, 0), roofC, [x, h - 3, z]); quad(OUT, P(-hw - ov, h - .2, hd + ov), P(hw + ov, h - .2, hd + ov), P(hw + ov, h + rh, 0), P(-hw - ov, h + rh, 0), roofC.map(v => v * .9), [x, h - 3, z]);
    [-1, 1].forEach(sd => quad(OUT, P(sd * hw, h, -hd), P(sd * hw, h, hd), P(sd * hw, h + rh * .86, 0), P(sd * hw, h + rh * .86, 0), wallC.map(v => v * .94), ctr));
    const wc = [.2, .28, .34], nWin = Math.max(1, Math.floor(w / 3.6)); for (let k = 0; k < nWin; k++) { const a = -hw + (k + .5) * w / nWin - .55; [[-hd - .03, 1], [hd + .03, 1]].forEach(([zz]) => { for (let fl = 0; fl < (h > 5 ? 2 : 1); fl++) quad(OUT, P(a, 1.0 + fl * 3, zz), P(a + 1.1, 1.0 + fl * 3, zz), P(a + 1.1, 2.3 + fl * 3, zz), P(a, 2.3 + fl * 3, zz), wc, ctr); }); }
    if (kind != 'wh') bx(OT, x - 1.1, z - 1.1, x + 1.1, z + 1.1, 0, 0, wallC, wallC, { flat: 1 });
  };
  [[124, 88, 9, 7.5, 3.2, .1, 0], [126, 56, 8, 8, 6.4, -.05, 1], [124, 24, 14, 9, 3.6, .04, 2], [128, -8, 8, 8, 6.4, 0, 1], [126, -40, 10, 8, 3.2, .08, 0], [127, -72, 36, 20, 7, 0, 3], [124, -118, 9, 7.5, 3.4, -.1, 2], [129, -150, 8, 8, 6.4, .03, 1], [125, -190, 12, 8, 3.4, .05, 0]].forEach(([x, z, w, dd, h, rot, k]) => {
    const WALL = [[.92, .88, .76], [.93, .93, .9], [.74, .84, .9], [.78, .88, .78]][k % 4], ROOF = [[.58, .27, .16], [.46, .52, .55], [.34, .48, .62], [.5, .2, .18]][(k + (x | 0)) % 4];
    dwell(x, z, w, dd, h, rot, k == 3 ? [.62, .74, .66] : WALL, k == 3 ? [.48, .56, .6] : ROOF, k == 3 ? 'wh' : 'h'); });
  for (let i = 0, n = 0; i < 400 && n < (MOB ? 5 : 10); i++) { const a = R_() * 6.283, r = 120 + R_() * 300, hx_ = CX + Math.cos(a) * r * .85, hz_ = CZ + Math.sin(a) * r * 1.25;
    if (inS(hx_, hz_) || roadDist(hx_, hz_) < 26 || hx_ > 90) continue; n++;
    const tall = R_() > .6, ROOF = [[.58, .27, .16], [.46, .52, .55], [.5, .2, .18], [.34, .48, .62]][(R_() * 4) | 0], WALL = [[.92, .88, .76], [.93, .93, .9], [.74, .84, .9]][(R_() * 3) | 0];
    dwell(hx_, hz_, 8 + R_() * 4, 7 + R_() * 2, tall ? 6.4 : 3.2, R_() * 3.14, WALL, ROOF, 'h');
    for (let k = 0; k < 4; k++) plant(k < 2 ? 'palm' : 'ovoid', hx_ + (R_() - .5) * 26, hz_ + (R_() - .5) * 26, k < 2 ? .8 : .9, { lod: 1, y: -.8 }); }

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
  const wrapDraw = (w, h, x, y, r, fn) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) fn(x + dx, y + dy); };
  const asT = mkTex(256, 256, (g, w, h) => {                                     // แอสฟัลต์: เม็ดหิน + ปื้นสีไม่สม่ำเสมอ + รอยร้าว
    const r = rng(31); g.fillStyle = '#d2d2d4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { const x = r() * w, y = r() * h, rr = 26 + r() * 60, dk = r() > .45; wrapDraw(w, h, x, y, rr, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, dk ? 'rgba(25,25,30,.22)' : 'rgba(255,255,255,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X - rr, Y - rr, rr * 2, rr * 2); }); }
    const id = g.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const k = (r() - .5) * 50 + (r() > .96 ? 30 + r() * 45 : 0); d[i] = Math.max(0, Math.min(255, d[i] + k)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + k)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + k * 1.04)); }
    g.putImageData(id, 0, 0); g.lineCap = 'round';
    for (let c = 0; c < 4; c++) { let x = 20 + r() * (w - 40), y = 20 + r() * (h - 40), a = r() * 6.28; g.strokeStyle = 'rgba(15,15,18,.42)'; g.lineWidth = .9; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (r() - .5) * 1.1; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); } g.stroke(); } }, 1);
  const pvT = mkTex(256, 256, (g, w, h) => {                                     // บล็อกปูพื้น (running bond)
    const r = rng(41); g.fillStyle = '#7d7d7d'; g.fillRect(0, 0, w, h); const bh = 16, bw = 32;
    for (let row = 0; row < h / bh; row++) for (let c = -1; c < w / bw + 1; c++) { const x = c * bw + (row % 2 ? bw / 2 : 0), v = 205 + (r() * 40 | 0); g.fillStyle = `rgb(${v},${v - 2},${v - 4})`; g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2); }
    for (let i = 0; i < 2400; i++) { g.fillStyle = r() > .5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, 1);
  const aoT = mkTex(64, 8, g => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 8); }, 0);
  const softT = mkTex(64, 8, g => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 8); }, 0);
  const fixAlpha = c => { const W_ = c.width, H_ = c.height, d = c.getContext('2d').getImageData(0, 0, W_, H_).data, o = new Uint8Array(d.length);   // เติมสีเขียวให้พิกเซลโปร่งใส (กันขอบดำตอน mipmap) + กลับแถวให้ตรงกับ UV
    for (let y = 0; y < H_; y++) for (let x = 0; x < W_; x++) { const i = (y * W_ + x) * 4, j = ((H_ - 1 - y) * W_ + x) * 4, a = d[i + 3], t = a < 28; o[j] = t ? 62 : d[i]; o[j + 1] = t ? 98 : d[i + 1]; o[j + 2] = t ? 40 : d[i + 2]; o[j + 3] = a; }
    const t = new THREE.DataTexture(o, W_, H_, THREE.RGBAFormat); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true; texs.push(t); return t; };
  const leafT = typeof document == 'undefined' ? null : (() => { const c = document.createElement('canvas'); c.width = c.height = 512; drawLeafAtlas(c.getContext('2d')); return fixAlpha(c); })();
  const barkT = mkTex(128, 256, drawBark, 1), palmBT = mkTex(128, 128, drawPalmBark, 1);
  const fieldT = mkTex(1024, 1024, (g, w, h) => {                                // ทุ่งนา/สวน/ดินไถ มองจากที่สูง (1 tile = 320 ม.)
    const r = rng(123), cols = [['#6e8a48', 4], ['#7d9852', 4], ['#8aa05a', 3], ['#98a465', 2], ['#8b8660', 1], ['#7d7050', 1], ['#7b9288', .5], ['#5f7d43', 4]];
    g.fillStyle = '#7d9650'; g.fillRect(0, 0, w, h); const tot = cols.reduce((a, c) => a + c[1], 0), pickC = () => { let k = r() * tot; for (const c of cols) { k -= c[1]; if (k <= 0) return c[0]; } return cols[0][0]; };
    const cw = 96, ang = -.18;                                                       // แปลงนา เอียงตามแนวคลองส่งน้ำ
    g.save(); g.translate(w / 2, h / 2); g.rotate(ang); for (let i = -9; i < 9; i++) for (let j = -9; j < 9; j++) { const x = i * cw + (r() - .5) * 20, y = j * cw * .8 + (r() - .5) * 20, ww = cw * (.8 + r() * .5), hh = cw * .8 * (.7 + r() * .5);
      g.fillStyle = pickC(); g.fillRect(x, y, ww, hh);
      g.strokeStyle = 'rgba(40,50,20,.16)'; g.lineWidth = 1; const st = 4 + r() * 3; for (let k = 0; k < ww; k += st) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k, y + hh); g.stroke(); }   // แถวต้นข้าว
      g.strokeStyle = 'rgba(190,184,130,.4)'; g.lineWidth = 1.6; g.strokeRect(x, y, ww, hh); }                               // คันนา
    g.restore(); g.fillStyle = 'rgba(112,134,74,.28)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, rr = 10 + r() * 26; wrapDraw(w, h, x, y, rr, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, 'rgba(38,66,30,.5)'); gr.addColorStop(1, 'rgba(34,70,28,0)'); g.fillStyle = gr; g.fillRect(X - rr, Y - rr, rr * 2, rr * 2); }); }   // กอไม้/แนวต้นไม้
    const id = g.getImageData(0, 0, w, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const k = (r() - .5) * 18; d[i] += k; d[i + 1] += k; d[i + 2] += k * .8; } g.putImageData(id, 0, 0); }, 1);
  const lam = o => { const m = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)); mats.push(m); return m; };
  const gnd = o => lam(Object.assign({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }, o));
  const mAsph = gnd(asT ? { map: asT } : {}), mPave = gnd(pvT ? { map: pvT } : {}), mMark = lam({ polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const mWear = new THREE.MeshBasicMaterial({ map: softT, color: 0x000000, transparent: true, opacity: .17, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); mats.push(mWear);
  const mLeaf = lam(leafT ? { map: leafT, alphaTest: .42 } : {}), mBark = lam(barkT ? { map: barkT } : {}), mPalmB = lam(palmBT ? { map: palmBT } : {});
  const mLeafD = leafT ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafT, alphaTest: .42 }) : null; if (mLeafD) mats.push(mLeafD);
  const std = (o, st) => { const m = HQ ? new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true }, o, st)) : new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)); mats.push(m); if (HQ) envMats.push(m); return m; };
  const mAO = new THREE.MeshBasicMaterial({ map: aoT, color: 0x000000, transparent: true, opacity: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 }); mats.push(mAO);
  const mFlat = std({}, { roughness: .82, metalness: .03, envMapIntensity: .22 }), mClad = std(ct ? { map: ct } : {}, Object.assign({ roughness: .62, metalness: .25, envMapIntensity: .32 }, ct ? { bumpMap: ct, bumpScale: .18 } : {})), mRoof = std(rt ? { map: rt } : {}, Object.assign({ roughness: .68, metalness: .18, envMapIntensity: .3 })), mConc = gnd(cot ? { map: cot } : {}), mGrass = gnd(gt ? { map: gt } : {}), mOut = gnd(fieldT ? { map: fieldT } : {});
  const mGlow = HQ ? std({}, { roughness: .07, metalness: .86, envMapIntensity: 1.25 }) : new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x2d4259 }), mLamp = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x8a8f96 }); mats.push(mLamp); if (!HQ) mats.push(mGlow);
  const mGlowO = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xf0cf98, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); mats.push(mGlowO);

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
  mk(GO, mOut, group); mk(GG, mGrass, group, 0, 1); mk(GC, mConc, group, 0, 1); mk(GA, mAsph, group, 0, 1); mk(GP, mPave, group, 0, 1); mk(GM, mMark, group, 0, 1); mk(GW, mWear, group);
  mk(F.flat, mFlat, group, 1, 1); mk(F.clad, mClad, group, 1, 1); mk(F.roof, mRoof, group, 1, 1); mk(F.glow, mGlow, group); if (HQ) mk(F.glow, mGlowO, group); mk(F.lamp, mLamp, group); mk(GAO, mAO, group); mk(GAH, mAO, shell); mk(TR, mFlat, group, 1, 1); mk(OUT, mFlat, group);
  mk(H.flat, mFlat, shell, 1, 1); mk(H.clad, mClad, shell, 1, 1); mk(H.roof, mRoof, shell, 1, 1); mk(H.glow, mGlow, shell); if (HQ) mk(H.glow, mGlowO, shell); mk(GN, mFlat, near);
  { const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), YA = new THREE.Vector3(0, 1, 0), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), CC = new THREE.Color();
    TPLS.forEach(t => { const n = t.inst.length;
      [[t.Lf, mLeaf, 1], [t.B, mBark, 0], [t.B.palm, mPalmB, 0]].forEach(([g, m, isLeaf]) => { if (!g || !g.p.length) return;
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2));
        const im = new THREE.InstancedMesh(geo, m, n);
        t.inst.forEach(([x, y, z, ry, sc, cr, cg, cb], i) => { Q4.setFromAxisAngle(YA, ry); M4.compose(P3.set(x, y, z), Q4, S3.set(sc, sc, sc)); im.setMatrixAt(i, M4); im.setColorAt(i, CC.setRGB(cr, cg, cb)); });
        im.frustumCulled = false; im.castShadow = SH; im.receiveShadow = SH; if (isLeaf && SH && mLeafD) im.customDepthMaterial = mLeafD; group.add(im); }); }); }
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
    day: { top: 0x3f78c8, mid: 0x80b2e8, hor: 0xd9e5ef, fog: 0xc9d9e6, fn: 240, ff: 900, hs: 0xe2eeff, hg: 0x9a9582, hi: .6, sun: 0xfff0d8, si: .78, sd: [-.45, .72, .5], glass: 0x58788f, gc: 0xbfd0e2, go: 0, lampC: 0x8a8f96, pool: 0, halo: 0, stars: 0, cloud: .95, cloudC: 0xffffff, mtn: 0x8da6c6, sunVis: 1 },
    dusk: { top: 0x0d1d42, mid: 0x2b4f8c, hor: 0x7f97bb, fog: 0x445a82, fn: 150, ff: 820, hs: 0xa4bcf0, hg: 0x2e3550, hi: .85, sun: 0xaabfff, si: .42, sd: [-.45, .6, .55], glass: 0xf0cf98, gc: 0x222c40, go: .85, lampC: 0xffe2b0, pool: .5, halo: .8, stars: .45, cloud: .35, cloudC: 0x6e82a8, mtn: 0x2f4468, sunVis: 0 },
    night: { top: 0x02050f, mid: 0x071229, hor: 0x16253f, fog: 0x0b1429, fn: 120, ff: 780, hs: 0xb4ccff, hg: 0x101830, hi: .8, sun: 0xcfe0ff, si: .5, sd: [-.4, .8, .5], glass: 0xe6c48c, gc: 0x141c2c, go: 1, lampC: 0xffe2b0, pool: .55, halo: .9, stars: 1, cloud: 0, cloudC: 0x3a4a6a, mtn: 0x0d1830, sunVis: 0 }
  };
  let envRT = null; const pmrem = HQ ? new THREE.PMREMGenerator(cfg.renderer) : null, css = h => '#' + new THREE.Color(h).getHexString();
  const setEnv = (T, d) => {                                                      // แผนที่สะท้อน: ท้องฟ้าไล่สี + ดวงอาทิตย์ (ให้กระจก/หลังคาโลหะสะท้อนฟ้า)
    try { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, css(T.top)); gr.addColorStop(.28, css(T.mid)); gr.addColorStop(.49, css(T.hor)); gr.addColorStop(.51, css(T.hg)); gr.addColorStop(1, css(T.hg)); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      if (T.sunVis) { const u = (Math.atan2(d[2], d[0]) / (Math.PI * 2) + .5) * 256, v = (.5 - Math.asin(d[1]) / Math.PI) * 128, sg = g.createRadialGradient(u, v, 0, u, v, 22); sg.addColorStop(0, 'rgba(255,248,225,1)'); sg.addColorStop(.35, 'rgba(255,240,200,.55)'); sg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = sg; g.fillRect(u - 22, v - 22, 44, 44); }
      const tx = new THREE.CanvasTexture(c); tx.mapping = THREE.EquirectangularReflectionMapping; const old = cfg.renderer.getRenderTarget(), rt = pmrem.fromEquirectangular(tx); cfg.renderer.setRenderTarget(old); tx.dispose();
      if (envRT) envRT.dispose(); envRT = rt; envMats.forEach(m => { m.envMap = rt.texture; m.needsUpdate = true; }); } catch (e) { }
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
    if (HQ) { mGlow.color.setHex(T.gc); mGlowO.color.setHex(T.glass); mGlowO.opacity = T.go; setEnv(T, d); } else mGlow.color.setHex(T.glass);
    mLamp.color.setHex(T.lampC); poolM.opacity = T.pool; haloM.opacity = T.halo; pool.visible = halo.visible = T.pool > 0;
    stars.material.opacity = T.stars; stars.visible = T.stars > 0; clouds.forEach(c => { c.opacity = T.cloud; c.color.setHex(T.cloudC); c.visible = T.cloud > 0; });
    farM.color.setHex(T.mtn).lerp(ca, .45); nearM.color.setHex(T.mtn).lerp(ca, .2);
    sunSp.visible = !!T.sunVis; sunSp.position.set(d[0] * 880, d[1] * 880, d[2] * 880);
    reShadow();
  }
  setTime(cfg.time || 'dusk');
  /* d = ระยะกล้อง: ไกล → เห็นอาคาร Phase 1 ทึบ (หลังคา+เปลือก) · ใกล้ → เห็นภายใน Hall/Rack · mode: auto|on|off · cam = กล้อง (ให้ท้องฟ้าตามกล้อง) */
  const update = (d, mode, cam) => {
    if (cam) sky.position.copy(cam.position);
    const on = mode == 'on' || (mode != 'off' && d > 150); if (shell.visible == on) return 0; shell.visible = on; near.visible = !on; reShadow(); return 1;
  };
  const dispose = () => { group.traverse(o => { o.geometry && o.geometry.dispose(); }); mats.forEach(m => m.dispose()); envRT && envRT.dispose(); pmrem && pmrem.dispose(); texs.forEach(t => t.dispose()); if (SH) { sun.castShadow = false; sun.shadow.map && sun.shadow.map.dispose(); } };
  return { group, update, dispose, W, setTime, offset: [OX, OZ], phase: PH, get time() { return time; } };
};
})();
