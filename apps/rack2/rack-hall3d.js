/* ════════════════════════════════════════════════════════════════
 *  Face Rack Phase 2 — Hall 3D (สวิตช์เปิด-ปิดในหน้า Dashboard) · พอร์ตจาก Phase 1 ให้ฟังก์ชันเหมือนกันทุกอย่าง
 *  ผังห้อง DC แบบ 3 มิติ ใช้ข้อมูล R ชุดเดียวกับทั้งแอป (ไม่แก้ข้อมูล)
 *  ประหยัดทรัพยากร: ไม่มี animation loop — วาดเฉพาะตอนลาก/ซูม/เปลี่ยนมุม
 *  · InstancedMesh (Rack ทั้งห้อง = 1 draw call) · ไม่มีเงา/post-processing
 *  · โหลด three.js เมื่อเปิดแท็บนี้ครั้งแรกเท่านั้น · ปิดแท็บ = คืน GPU ทันที
 *  Lens: Power / Customer / UPS / Density · แตะ Rack เพื่อดูเครื่องข้างใน
 *  ใส่ <script src="rack-hall3d.js"></script> ต่อท้าย rack3d.js
 *  Phase 2: ผังแถว/จำนวน Rack ปรับตามข้อมูลจริงอัตโนมัติ · UPS 4 ชุด (1A,1B,2A,2B) · ตึก Phase 2 = ตึกซ้ายบนของไซต์ (Phase 1 เป็นอาคารทึบ)
 *  อาคารรอบไซต์ (Data Hall/Utility/Admin/Security/รั้ว/ต้นไม้) อยู่ใน rack-site3d.js — วางไฟล์ไว้โฟลเดอร์เดียวกัน โหลดให้เองตอนเปิดแท็บ 3D
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
if (window.__h3d2) return; window.__h3d2 = 1;
const LK = 'h3d2Lens', TK = 'h3d2Time', ES = s => esc(s), TL = r => /TEL/.test(r.id);   // key แยกจาก Phase 1 (ใช้ origin เดียวกันได้)
const css = `
.h3-st{display:flex;flex-direction:column;height:min(62dvh,640px);min-height:420px;border-radius:22px;overflow:hidden;background:linear-gradient(180deg,#071230,#030816);border:1px solid rgba(120,160,255,.28);box-shadow:0 22px 44px -18px var(--sh)}
.h3-st.fs{position:fixed;inset:0;z-index:50;height:auto;border-radius:0}
.h3-cv{position:relative;flex:1;min-height:0}.h3-cv canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;outline:0}
.h3-cv::before,.h3-cv::after{content:"";position:absolute;width:22px;height:22px;pointer-events:none;border:2px solid rgba(95,180,255,.7)}
.h3-cv::before{left:10px;top:10px;border-right:0;border-bottom:0}.h3-cv::after{right:10px;bottom:10px;border-left:0;border-top:0}
.h3-hud{position:absolute;left:16px;top:14px;font:600 11px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.8px;color:#9fd0ff;pointer-events:none;text-shadow:0 0 8px #000}
.h3-hud b{color:#fff}.h3-fs{position:absolute;right:12px;top:10px;font:600 12px sans-serif;padding:5px 11px;border-radius:99px;border:1px solid var(--line);background:rgba(8,16,42,.7);color:#e8f0ff;cursor:pointer}
.h3-card{position:absolute;left:10px;right:10px;bottom:10px;max-width:420px;padding:11px 13px;border-radius:16px;background:rgba(8,16,42,.86);border:1px solid rgba(120,170,255,.35);backdrop-filter:blur(12px);color:#e8f0ff;display:none;gap:12px;font-size:13px}
.h3-card.on{display:flex}.h3-card>div{flex:1;min-width:0}.h3-card small{color:#94a6cc}.h3-card .h3-bt{display:inline-block;margin:8px 6px 0 0;padding:6px 13px;border-radius:99px;border:1px solid rgba(150,190,255,.6);background:#2f5fdc;color:#fff;font:600 12.5px/1.2 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;-webkit-appearance:none;appearance:none;box-shadow:none;text-shadow:none}
.h3-ub{display:grid;gap:1px;height:14px;margin-top:9px}.h3-ub i{border-radius:2px;background:rgba(130,170,255,.14)}.h3-ub i.Dual{background:#2fe3a0}.h3-ub i.Single{background:#ff5468}.h3-ub i.o{background:#94a6cc}
.h3-ct{padding:9px 10px 11px;display:grid;gap:8px;background:rgba(6,12,32,.9);border-top:1px solid var(--line)}
.h3-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.h3-row button{flex:none;font:600 12px/1 "Plus Jakarta Sans",system-ui,sans-serif;padding:7px 12px;border-radius:99px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:#cfe0ff;cursor:pointer;display:flex;gap:6px;align-items:center}
.h3-row button i{width:8px;height:8px;border-radius:3px}.h3-row button.on{color:#fff;border-color:#6c9fff;background:linear-gradient(160deg,#4f86ff,#2f5fdc);box-shadow:0 6px 14px -5px rgba(60,110,255,.8)}
.h3-row.v button{font-size:11px;padding:5px 10px}
#h3w{margin-bottom:12px}.h3-sw{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 14px;margin-bottom:10px;border-radius:18px;background:linear-gradient(180deg,var(--card),var(--card2));border:1px solid var(--line);box-shadow:inset 0 1px 0 var(--hi)}
.h3-sw b{display:block;font-size:15px}.h3-sw .sub{font-size:12px}
#h3b{flex:none;position:relative;width:58px;height:32px;border-radius:99px;border:1px solid var(--line);background:rgba(120,130,160,.35);cursor:pointer;transition:background .25s,box-shadow .25s}
#h3b i{position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#dfe6f7;box-shadow:0 2px 6px #0006;transition:transform .25s}
#h3b.on{background:linear-gradient(160deg,#4cd6a0,#17956a);box-shadow:0 0 16px -2px rgba(76,214,160,.8)}#h3b.on i{transform:translateX(26px);background:#fff}`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

let T3, cur = null;
const load3 = () => T3 || (T3 = window.THREE ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = ok; s.onerror = () => { T3 = 0; no(); }; document.head.appendChild(s); }));
/* บริบทรอบไซต์ (rack-site3d.js) โหลดตามหลัง three.js เมื่อเปิดแท็บ 3D ครั้งแรก · ถ้าโหลดไม่ได้ Hall ยังใช้งานได้ตามปกติ (แค่ไม่มีอาคารรอบข้าง) */
const SITE_SRC = (() => { try { return new URL('rack-site3d.js', document.currentScript.src).href; } catch (_) { return 'rack-site3d.js'; } })();
let S3;
const loadSite = () => window.H3Site2 ? Promise.resolve() : S3 || (S3 = new Promise(ok => { const s = document.createElement('script'); s.src = SITE_SRC; s.onload = ok; s.onerror = () => { S3 = 0; ok(); }; document.head.appendChild(s); }));
const ON = 'h3d2On', sw = () => { try { return localStorage.getItem(ON) == '1'; } catch (_) { return false; } };
const odash = V.dash;
V.dash = function (...a) {
  const on = sw();
  return `<div id="h3w"><div class="h3-sw"><div><b>Hall 3D · Phase 2</b><span class="sub">ผังห้อง 3 มิติ · ระบุเลข Rack · เปิดเมื่อต้องการดู</span></div><button id="h3b" role="switch" aria-label="เปิด/ปิด 3D" aria-checked="${on}" class="${on ? 'on' : ''}"><i></i></button></div><div id="h3">${on ? '<p class="empty">กำลังโหลด 3D…</p>' : ''}</div></div>` + odash.apply(this, a);
};
new MutationObserver(() => {
  const w = document.getElementById('h3w');
  if (w && !w.dataset.m) {
    w.dataset.m = 1; cur && cur.dispose(); cur = null;
    const b = w.querySelector('#h3b'), h = w.querySelector('#h3');
    b.onclick = () => {
      const on = b.getAttribute('aria-checked') != 'true'; b.setAttribute('aria-checked', on); b.classList.toggle('on', on);
      try { localStorage.setItem(ON, on ? '1' : '0'); } catch (_) { }
      if (on) { h.innerHTML = '<p class="empty">กำลังโหลด 3D…</p>'; mount(h); } else { cur && cur.dispose(); cur = null; h.innerHTML = ''; }
    };
    if (sw()) mount(h);
  } else if (!w && cur) { cur.dispose(); cur = null; }
}).observe(M, { childList: true });

async function mount(h) {
  if (!R.length) { h.innerHTML = '<p class="empty">ยังไม่มีข้อมูล</p>'; return; }
  try { await load3(); } catch (_) { h.innerHTML = '<p class="empty">โหลด three.js ไม่ได้ (ต้องต่อเน็ต)</p>'; return; }
  await loadSite();
  if (h.isConnected && sw()) cur = build(h);
}

function build(h) {
  const THREE = window.THREE, AISLE = 1.6, RH = 2.1; let PITCH = .8, CX = 2.9;
  /* ── จัดลำดับแถว/ตำแหน่งในแถว (ไม่แก้ R เดิม) ── */
  const L = new Map();
  ['Zone1', 'Zone2'].forEach(z => { const rs = R.filter(r => r.zone == z), ros = [...new Set(rs.map(r => +r.ro))].sort((a, b) => a - b); rs.forEach(r => L.set(r.id, { ro: ros.indexOf(+r.ro) + 1, n: +r.n })); });
  ['Network', 'Telecom'].forEach(g => {
    const rs = R.filter(r => r.zone == NT && (g == 'Telecom') == TL(r)).sort((a, b) => a.id < b.id ? -1 : 1), ros = [...new Set(rs.map(r => r.ro))].sort((a, b) => a - b);
    let A, B; if (ros.length >= 2) { A = rs.filter(r => r.ro == ros[0]); B = rs.filter(r => r.ro != ros[0]); } else { const k = Math.ceil(rs.length / 2); A = rs.slice(0, k); B = rs.slice(k); }
    A.forEach((r, i) => L.set(r.id, { ro: 1, n: i + 1 })); B.forEach((r, i) => L.set(r.id, { ro: 2, n: i + 1 }));
  });
  /* ผัง Phase 2: จำนวนแถว/จำนวน Rack ต่อแถวปรับอัตโนมัติให้พอดีกับห้อง (Phase 1 = 12 แถว × 19 Rack → ค่าเดิม CX 2.9 / PITCH .8) */
  const NR = Math.max(1, ...['Zone1', 'Zone2'].map(z => new Set(R.filter(r => r.zone == z).map(r => +r.ro)).size)), RC = (NR + 1) / 2, MXN = Math.max(1, ...R.filter(r => r.zone == 'Zone1' || r.zone == 'Zone2').map(r => +r.n || 1));
  CX = NR > 1 ? Math.min(2.9, 37 / (NR - 1)) : 2.9; PITCH = MXN > 1 ? Math.max(.72, Math.min(.8, 14.4 / (MXN - 1))) : .8;
  const RK = R.filter(r => L.has(r.id)), GM = {};
  RK.forEach(r => { if (r.zone == NT) { const k = TL(r) + '-' + L.get(r.id).ro; GM[k] = Math.max(GM[k] || 0, L.get(r.id).n); } });
  const need = t => Math.max(0, ...Object.keys(GM).filter(k => k.startsWith(t)).map(k => (GM[k] - 1) * .9 + 2 - 8)), DN = Math.min(9.5, need('false')), DT = Math.min(5, need('true'));
  const pos = r => {
    const { ro, n } = L.get(r.id);
    if (r.zone == 'Zone1') return [(ro - RC) * CX, -(AISLE + (n - 1) * PITCH)];
    if (r.zone == 'Zone2') return [(ro - RC) * CX, AISLE + (n - 1) * PITCH];
    const isNet = !TL(r), m = GM[(!isNet) + '-' + ro] || 1, Ld = 8 + (isNet ? DN : DT), per = Math.min(m, Math.floor((Ld - 2) / .9) + 1), cols = Math.ceil(m / per), col = Math.floor((n - 1) / per), k = (n - 1) % per, pitch = per > 1 ? Math.min(.96, (Ld - 2) / (per - 1)) : 0;
    return [(ro == 1 ? -23.8 : 23.8) + (col - (cols - 1) / 2) * 1.8, (isNet ? -DN / 2 : 8 + DT / 2) + (k - (per - 1) / 2) * pitch];
  };
  const P = RK.map(pos), N = RK.length;

  /* ── สถานะ / สี / ข้อมูลประกอบ ── */
  const imp = r => r.st != 'use' ? r.st : r.s > 0 ? (r.d > 0 ? 'risk' : 'single') : r.d > 0 ? 'dual' : 'nu';
  const COL = { dual: 0x2fe3a0, risk: 0xffc83d, single: 0xff5468, nu: 0x5b8cff, empty: 0x46526f, cage: 0x9a7bff, off: 0x62d6ff };
  const LBL = { dual: 'Dual ล้วน', risk: 'Dual + Single', single: 'Single ล้วน', nu: 'ใช้งาน', empty: 'ว่าง', cage: 'กั้นกรง', off: 'วางเครื่อง ไม่ ON' };
  const fed = {}; UL.forEach(u => fed[u] = new Set());
  RK.forEach(r => r.dv.forEach(x => { if (x[3] == 'Single' || x[3] == 'Dual') String(x[4]).split(',').forEach(u => fed[u.trim().toUpperCase()]?.add(r.id)); }));
  const cc = {}; RK.forEach(r => { if (r.c && r.c != EMP && r.c[0] != '(') cc[r.c] = (cc[r.c] || 0) + 1; });
  const CUST = Object.entries(cc).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), CI = {}; CUST.forEach(([n], i) => CI[n] = i);
  const ccol = n => `hsl(${(CI[n] * 137.5) % 360 | 0},${CI[n] % 2 ? 62 : 80}%,${CI[n] % 3 == 1 ? 46 : 60}%)`;
  const MX = Math.max(1, ...RK.map(r => r.s + r.d));

  /* ── DOM ── */
  h.innerHTML = `<div class="h3-st"><div class="h3-cv"><canvas tabindex="0"></canvas><div class="h3-hud"></div><button class="h3-fs">⛶ เต็มจอ</button><div class="h3-card"></div></div><div class="h3-ct"><div class="h3-row" data-r="lens"></div><div class="h3-row" data-r="sub"></div><div class="h3-row v" data-r="view"></div></div></div>`;
  const st = h.firstChild, cv = st.querySelector('canvas'), wrap = st.querySelector('.h3-cv'), hud = st.querySelector('.h3-hud'), card = st.querySelector('.h3-card'), rLens = st.querySelector('[data-r=lens]'), rSub = st.querySelector('[data-r=sub]'), rView = st.querySelector('[data-r=view]');

  /* ── Three.js ── */
  const rd = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'low-power' });
  rd.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x050a18); sc.fog = new THREE.Fog(0x050a18, 280, 760);
  const cam = new THREE.PerspectiveCamera(40, 1, .5, 1100);
  const hemi = new THREE.HemisphereLight(0xbcd2ff, 0x101830, .95), dl = new THREE.DirectionalLight(0xffffff, .8); sc.add(hemi); dl.position.set(-20, 40, 25); sc.add(dl);
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#0a1226'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(95,160,255,.28)'; g.strokeRect(.5, .5, 63, 63); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(56, 46); return t; })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(56, 46), new THREE.MeshBasicMaterial({ map: floorTex })); floor.rotation.x = -Math.PI / 2; floor.position.z = 2; sc.add(floor);

  /* ห้องตามแปลน: [ชื่อ,x0,x1,z0,z1,สี] */
  const ROOMS = [['ELECTRICAL', -27, -20.2, -19.5, -11 - DN / 2, 0xffb347], ['PRE-INSTALL', -27, -20.2, -11 - DN / 2, -4 - DN, 0x8aa0c8], ['NETWORK-1', -27, -20.2, -4 - DN, 4, 0x3f8cff], ['TELECOM-1', -27, -20.2, 4, 12 + DT, 0x5fe0ff], ['CORRIDOR', -27, -20.2, 12 + DT, 19.5, 0x6b7da8],
    ['RECEPTION', 20.2, 27, -19.5, -11 - DN / 2, 0x8aa0c8], ['CONTROL', 20.2, 27, -11 - DN / 2, -4 - DN, 0x8aa0c8], ['NETWORK-2', 20.2, 27, -4 - DN, 4, 0x3f8cff], ['TELECOM-2', 20.2, 27, 4, 12 + DT, 0x5fe0ff], ['CORRIDOR', 20.2, 27, 12 + DT, 19.5, 0x6b7da8],
    ['CRAH ROOM 1-8', -20.2, 11, -19.5, -16.8, 0x2fd0ff], ['CORRIDOR', 11, 20.2, -19.5, -16.8, 0x6b7da8], ['CRAH ROOM 9-16', -20.2, 20.2, 16.8, 19.5, 0x2fd0ff], ['DATA CENTER HALL', -20.2, 20.2, -16.8, 16.8, 0x2fe3a0], ['CORRIDOR', -27, 27, 19.5, 21.5, 0x6b7da8], ['FIRE PROTECTION', -27, 27, 21.5, 23.5, 0xff6a5a]];
  const lp = [], lc = [], cl3 = new THREE.Color(), wl = new Map(), WH = 2.6;
  ROOMS.forEach(([n, x0, x1, z0, z1, c]) => {
    [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]].forEach(([a, b, d, e]) => { lp.push(a, .03, b, d, .03, e, a, WH, b, d, WH, e); cl3.set(c); lc.push(cl3.r, cl3.g, cl3.b, cl3.r, cl3.g, cl3.b, cl3.r, cl3.g, cl3.b, cl3.r, cl3.g, cl3.b); const k = (a < d || (a == d && b < e) ? [a, b, d, e] : [d, e, a, b]).map(q => q.toFixed(1)).join(); if (!wl.has(k) || n == 'DATA CENTER HALL') wl.set(k, [a, b, d, e, c]); });
    const t = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: n == 'DATA CENTER HALL' ? .035 : .12, depthWrite: false })); t.rotation.x = -Math.PI / 2; t.position.set((x0 + x1) / 2, .02, (z0 + z1) / 2); sc.add(t);
    if (n) { const c2 = document.createElement('canvas'); c2.width = 256; c2.height = 40; const g = c2.getContext('2d'); g.font = '600 22px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillStyle = '#' + new THREE.Color(c).getHexString(); g.fillText(n, 128, 28);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c2), transparent: true, depthWrite: false, fog: false })); s.scale.set(Math.min(7, x1 - x0 - .4), 1.1, 1); s.position.set((x0 + x1) / 2, .5, (z0 + z1) / 2 + (n == 'DATA CENTER HALL' ? 0 : 0)); sc.add(s); }
  });
  const ol = new THREE.BufferGeometry(); ol.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); ol.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  sc.add(new THREE.LineSegments(ol, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .75 })));
  const crah = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 2.4, 1), new THREE.MeshLambertMaterial({ color: 0x2a5a8a }), 16), tm = new THREE.Object3D();
  [-18, 18].forEach((z, a) => { for (let i = 0; i < 8; i++) { tm.position.set(a ? (i - 3.5) * 4.6 : -16.5 + i * 3.6, 1.2, z); tm.updateMatrix(); crah.setMatrixAt(a * 8 + i, tm.matrix); } }); sc.add(crah);
  /* ผนังกั้นห้อง: แผ่นโปร่งแสงสูง 2.6 ม. ย้อมสีตามห้อง (InstancedMesh ตัวเดียว) + เส้นขอบบน/ล่าง */
  const wls = [...wl.values()], walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .26, depthWrite: false }), wls.length);
  wls.forEach(([a, b, d, e, c], i) => { const hz = b == e; tm.position.set((a + d) / 2, WH / 2, (b + e) / 2); tm.scale.set(hz ? Math.abs(d - a) : .22, WH, hz ? .22 : Math.abs(e - b)); tm.updateMatrix(); walls.setMatrixAt(i, tm.matrix); walls.setColorAt(i, cl3.set(c)); });
  tm.scale.set(1, 1, 1); sc.add(walls);

  /* Rack: InstancedMesh ตัวเดียว + กรอบเรืองแสงรวมเป็นเส้นเดียว */
  const bg = new THREE.BoxGeometry(.9, RH, .7), body = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ color: 0xffffff }), N); sc.add(body);
  const ea = new THREE.EdgesGeometry(bg).attributes.position.array, ep = new Float32Array(N * ea.length);
  P.forEach(([x, z], i) => { for (let k = 0; k < ea.length; k += 3) { const o = i * ea.length + k; ep[o] = ea[k] + x; ep[o + 1] = ea[k + 1] + RH / 2; ep[o + 2] = ea[k + 2] + z; } });
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: .35 })); sc.add(edges);
  const RN2 = RK.map((r, i) => [r, i]).filter(([r]) => imp(r) == 'risk' || imp(r) == 'single'), rg = new THREE.CircleGeometry(.78, 20); rg.rotateX(-Math.PI / 2);
  const rings = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }), Math.max(1, RN2.length));
  RN2.forEach(([r, i], k) => { tm.position.set(P[i][0], .04, P[i][1]); tm.scale.set(1, 1, 1); tm.updateMatrix(); rings.setMatrixAt(k, tm.matrix); rings.setColorAt(k, cl3.set(COL[imp(r)])); }); rings.count = RN2.length; sc.add(rings);
  const sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.15, RH + .3, .95)), new THREE.LineBasicMaterial({ color: 0xffffff })); sel.visible = false; sc.add(sel);

  /* ป้ายเลข Rack: ชื่อแถวแสดงตลอด · เลข Rack (และชื่อเรียก) แสดงเมื่อซูมเข้า — ใช้สไปรต์ 320 ตัวสลับซ้ำ เลือกเฉพาะ Rack ที่อยู่ในกรอบจอ */
  const SY = new Array(N).fill(1), tc = new Map();
  const ltex = (t, u) => { const k = t + '|' + u; let m = tc.get(k); if (!m) { const c = document.createElement('canvas'); c.width = 192; c.height = 96; const g = c.getContext('2d'); g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#050a18'; let f = 54; do { g.font = `700 ${f}px ui-monospace,Menlo,monospace`; f -= 4; } while (g.measureText(t).width > 176 && f > 20); g.fillStyle = '#fff'; g.strokeText(t, 96, u ? 52 : 66); g.fillText(t, 96, u ? 52 : 66); if (u) { g.font = '600 28px ui-monospace,Menlo,monospace'; g.fillStyle = '#9fd0ff'; g.strokeText(u, 96, 88); g.fillText(u, 96, 88); } m = new THREE.CanvasTexture(c); tc.set(k, m); } return m; };
  const spr = (m, w, hg, dt = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: m, transparent: true, depthWrite: false, depthTest: dt, fog: false })); s.scale.set(w, hg, 1); sc.add(s); return s; };
  ['Zone1', 'Zone2'].forEach((z, zi) => { const seen = {}; RK.forEach(r => { const ro = L.get(r.id).ro; if (r.zone == z && !seen[ro]) { seen[ro] = 1; spr(ltex(String(r.row || 'R' + ro), ''), 1.9, .95).position.set((ro - RC) * CX, .7, (zi ? 1 : -1) * .6); } }); });
  const POOL = 320, pv = new THREE.Vector3(), pool = Array.from({ length: POOL }, () => { const s = spr(ltex('', ''), .9, .45, false); s.renderOrder = 10; s.visible = false; return s; });
  function labels() {
    let k = 0;
    if (v.d < 34) {
      const a = []; RK.forEach((r, i) => { pv.set(P[i][0], RH * SY[i] / 2, P[i][1]).project(cam); if (Math.abs(pv.x) < 1.04 && Math.abs(pv.y) < 1.04 && pv.z < 1) a.push([pv.z, i]); });
      a.sort((p, q) => p[0] - q[0]);
      for (; k < POOL && k < a.length; k++) { const i = a[k][1], r = RK[i], s = pool[k]; s.material.map = ltex(String(r.n), r.lb || ''); s.position.set(P[i][0], RH * SY[i] + .5, P[i][1]); s.visible = true; }
    }
    for (; k < POOL; k++) pool[k].visible = false;
  }

  /* บริบทรอบ Hall: ผังไซต์จริง (แปลง 1 พิกเซลแปลน = 0.2 ม.) สร้างโดย rack-site3d.js → H3Site
     Data Hall (หลังคาลาด+โซลาร์) · Utility (ชิลเลอร์บนหลังคา) · Admin · Security · รั้ว · ต้นไม้ · ถนน · Substation
     ทั้งหมดรวมเป็น BufferGeometry ไม่กี่ก้อน (draw call น้อย) · อาคาร Phase 1 จะทึบเมื่อถอยกล้องไกล และโปร่งให้เห็น Rack เมื่อซูมเข้า */
  const tag = (t, col, w) => { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d'); let f = 54; do { g.font = `700 ${f}px ui-monospace,Menlo,monospace`; f -= 3; } while (g.measureText(t).width > 490 && f > 18); g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = '#050a18'; g.strokeText(t, 256, 66); g.fillStyle = col; g.fillText(t, 256, 66); return spr(new THREE.CanvasTexture(c), w, w * 96 / 512); };
  let tod = 'dusk'; try { tod = localStorage.getItem(TK) || 'dusk'; } catch (_) { }
  const SITE = window.H3Site2 ? window.H3Site2(THREE, { tag, scene: sc, renderer: rd, hemi, sun: dl, time: tod, phase: 2 }) : null; if (SITE) { sc.add(SITE.group); tod = SITE.time; }
  sc.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-28.5, -21], [28.5, -21], [28.5, 25], [-28.5, 25]].map(([x, z]) => new THREE.Vector3(x, .08, z))), new THREE.LineBasicMaterial({ color: 0xff4d4d })));
  tag('IDC3 · DATA HALL PHASE 2', '#ff6a5a', 24).position.set(14, 5.4, 27);

  /* ── Lens ── */
  let lens = 'power', foc = '', pick = -1; try { lens = localStorage.getItem(LK) || 'power'; } catch (_) { }
  const LENS = [['power', 'Power'], ['cust', 'Customer'], ['ups', 'UPS'], ['dens', 'Density']];
  const base = r => {
    const k = imp(r);
    if (lens == 'power') return [COL[k], !foc || foc == k, 1];
    if (lens == 'cust') return [r.c in CI ? cl3.set(ccol(r.c)).getHex() : COL[k], !foc || r.c == foc, 1];
    if (lens == 'ups') return [foc ? 0x62d6ff : 0x5b8cff, !foc || fed[foc].has(r.id), 1];
    const t = (r.s + r.d) / MX; return [cl3.setHSL(.62 - .62 * t, .85, .5).getHex(), true, .15 + .85 * t];
  };
  const dim = new THREE.Color();
  function paint() {
    RK.forEach((r, i) => { const [c, on, sy] = base(r); SY[i] = sy; dim.set(c); if (!on) dim.multiplyScalar(.12); body.setColorAt(i, dim);
      tm.position.set(P[i][0], RH * sy / 2, P[i][1]); tm.scale.set(1, sy, 1); tm.updateMatrix(); body.setMatrixAt(i, tm.matrix); });
    body.instanceColor.needsUpdate = body.instanceMatrix.needsUpdate = true; tm.scale.set(1, 1, 1);
    edges.visible = lens != 'dens'; rings.visible = lens == 'power'; req();
  }
  const bt = (k, t, on, c) => `<button data-k="${ES(k)}" class="${on ? 'on' : ''}">${c ? `<i style="background:${c}"></i>` : ''}${ES(t)}</button>`;
  const hx = c => '#' + new THREE.Color(c).getHexString();
  function ui() {
    rLens.innerHTML = LENS.map(([k, t]) => bt('L' + k, t, lens == k)).join('');
    rSub.style.cssText = lens == 'cust' ? 'flex-wrap:wrap;max-height:98px;overflow-y:auto' : '';
    rSub.innerHTML = lens == 'power' ? [['', 'ทั้งหมด'], ['dual', 'Dual'], ['risk', 'Dual+Single'], ['single', 'Single'], ['nu', 'ใช้งาน'], ['empty', 'ว่าง']].map(([k, t]) => bt('F' + k, t, foc == k, k ? hx(COL[k]) : '')).join('')
      : lens == 'cust' ? bt('F', 'ทั้งหมด · ' + CUST.length + ' ราย', !foc) + CUST.map(([c, n]) => bt('F' + c, c + ' · ' + n, foc == c, ccol(c))).join('')
      : lens == 'ups' ? bt('F', 'ทุก UPS', !foc) + UL.map(u => bt('F' + u, 'UPS ' + u + ' (' + u + '1∥' + u + '2) · ' + fed[u].size, foc == u)).join('')
      : '<span class="sub" style="color:#94a6cc;padding:6px 2px">ความสูง + สี (น้ำเงิน → แดง) = จำนวนเครื่องใน Rack</span>';
  }
  const dvTxt = r => { const s = r.dv.filter(x => x[3] == 'Single').length, d = r.dv.filter(x => x[3] == 'Dual').length; return `Dual ${d} · Single ${s}`; };
  function select(i) {
    pick = i; if (i < 0) { sel.visible = false; card.classList.remove('on'); req(); return; }
    const r = RK[i]; sel.position.set(P[i][0], RH / 2, P[i][1]); sel.visible = true;
    const UH = Math.max(42, ...r.dv.map(x => x[0])), cells = Array(UH).fill('');
    r.dv.forEach(x => { for (let u = x[1]; u <= x[0]; u++) cells[u - 1] = x[3] == 'Dual' || x[3] == 'Single' ? x[3] : 'o'; });
    const used = cells.filter(Boolean).length;
    card.innerHTML = `<div><b>${ES(r.name)}</b> <small>เลข ${ES(r.n)}${r.lb ? ' (' + ES(r.lb) + ')' : ''}</small><br><small>${ES(r.c)} · ${LBL[imp(r)]}</small><br>${r.dv.length} เครื่อง · ${dvTxt(r)}<div class="h3-ub" style="grid-template-columns:repeat(${UH},1fr)">${cells.map(c => `<i class="${c}"></i>`).join('')}</div><small>ใช้ ${used}/${UH}U · ว่าง ${UH - used}U</small><br><button class="h3-bt" data-a="open">เปิดหน้า Rack ›</button><button class="h3-bt" data-a="zoom">โฟกัส</button></div>`;
    card.classList.add('on'); req();
  }
  card.onclick = e => { const a = e.target.dataset.a; if (a == 'open') location.hash = '#rack/' + enc(RK[pick].id); if (a == 'zoom') go({ tx: P[pick][0], tz: P[pick][1], d: 9, el: .5 }); };
  st.querySelector('.h3-ct').onclick = e => {
    const k = e.target.closest('button')?.dataset.k; if (k == null) return;
    if (k[0] == 'T') { tod = k.slice(1); SITE && SITE.setTime(tod); try { localStorage.setItem(TK, tod); } catch (_) { } rView.querySelectorAll('[data-k^=T]').forEach(b => b.classList.toggle('on', b.dataset.k == 'T' + tod)); req(); return; }
    if (k[0] == 'L') { lens = k.slice(1); foc = ''; try { localStorage.setItem(LK, lens); } catch (_) { } } else if (k[0] == 'F') foc = foc == k.slice(1) ? '' : k.slice(1); else if (k[0] == 'V') go(VW[k.slice(1)]());
    if (k[0] != 'V') { ui(); paint(); }
  };

  /* ── กล้อง (orbit เอง) · วาดเมื่อจำเป็นเท่านั้น ── */
  const asp = () => cv.clientWidth / Math.max(1, cv.clientHeight), fit = () => asp() < 1 ? 105 : 66;
  const SO = SITE ? SITE.offset : [0, 0], VW = { site: () => ({ az: 1, el: .7, d: 330, tx: -12 + SO[0], tz: -40 + SO[1] }), iso: () => ({ az: .55, el: .62, d: fit(), tx: 0, tz: 2 }), top: () => ({ az: Math.PI / 2, el: 1.5, d: fit() * .95, tx: 0, tz: 2 }), z1: () => ({ az: 0, el: .5, d: 20, tx: 0, tz: -9 }), z2: () => ({ az: Math.PI, el: .5, d: 20, tx: 0, tz: 10 }), nl: () => ({ az: -1.2, el: .55, d: 20, tx: -23.6, tz: 0 }), nr: () => ({ az: 1.2, el: .55, d: 20, tx: 23.6, tz: 0 }) };
  rView.innerHTML = [['iso', 'ภาพรวม'], ['top', 'มุมบน'], ['site', 'ทั้งไซต์'], ['z1', 'Zone 1'], ['z2', 'Zone 2'], ['nl', 'Net/Tele ซ้าย'], ['nr', 'Net/Tele ขวา']].map(([k, t]) => bt('V' + k, t)).join('')
    + (SITE ? '<span style="flex:none;width:1px;margin:2px 3px;background:rgba(150,190,255,.3)"></span>' + [['day', '☀ กลางวัน'], ['dusk', '◐ ค่ำ'], ['night', '☾ กลางคืน']].map(([k, t]) => bt('T' + k, t, tod == k)).join('') : '');
  const v = VW.iso(), iv = { a: 0, e: 0 }, cl = x => Math.min(1.52, Math.max(.12, x)), REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, tw = null, alive = true, drag = 0;
  const go = to => { to = Object.assign({}, to); if (REDUCE) { Object.assign(v, to); return req(); } tw = { t0: performance.now(), from: Object.assign({}, v), to }; req(); };
  const moving = () => tw || (!drag && (Math.abs(iv.a) > 1e-4 || Math.abs(iv.e) > 1e-4));
  function draw() {
    raf = 0; if (!alive) return;
    if (tw) { const k = Math.min(1, (performance.now() - tw.t0) / 450), e = 1 - Math.pow(1 - k, 3); for (const p in tw.to) v[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e; if (k >= 1) tw = null; }
    else if (!drag && moving()) { v.az += iv.a; v.el = cl(v.el + iv.e); iv.a *= .92; iv.e *= .92; }
    cam.position.set(v.tx + v.d * Math.cos(v.el) * Math.sin(v.az), v.d * Math.sin(v.el), v.tz + v.d * Math.cos(v.el) * Math.cos(v.az)); cam.lookAt(v.tx, 0, v.tz);
    cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); SITE && SITE.update(v.d, 'auto', cam); labels(); rd.render(sc, cam);
    hud.innerHTML = `<b>IDC3 · PHASE 2 · HALL</b><br>RACK ${N} · D+S ${RN2.filter(([r]) => imp(r) == 'risk').length} · SINGLE ${RN2.filter(([r]) => imp(r) == 'single').length}<br>AZ ${((v.az * 57.3 % 360 + 360) % 360 | 0)}° · EL ${v.el * 57.3 | 0}°${v.d < 34 ? '' : '<br>ซูมเข้า → เห็นเลข RACK'}`;
    if (moving()) req();
  }
  const req = () => { if (!raf && alive) raf = requestAnimationFrame(draw); };
  const fitSize = () => { const w = wrap.clientWidth, hh = wrap.clientHeight; if (!w || !hh) return; rd.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); req(); };
  const ro = new ResizeObserver(fitSize); ro.observe(wrap);

  /* ── ลาก/ซูม/แตะ ── */
  const ps = new Map(); let moved = 0, ld = 0, lc2 = [0, 0];
  const pd = () => { const a = [...ps.values()]; return Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1; }, pc = () => { const a = [...ps.values()]; return [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ps.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; drag = 1; iv.a = iv.e = 0; tw = null; if (ps.size == 2) { ld = pd(); lc2 = pc(); } });
  cv.addEventListener('pointermove', e => {
    const o = ps.get(e.pointerId); if (!o) return; const dx = e.clientX - o[0], dy = e.clientY - o[1]; ps.set(e.pointerId, [e.clientX, e.clientY]); moved += Math.abs(dx) + Math.abs(dy);
    if (ps.size == 1) { iv.a = -dx * .006; iv.e = dy * .006; v.az += iv.a; v.el = cl(v.el + iv.e); }
    else { const d = pd(), c = pc(), s = v.d * .0012; v.d = Math.min(380, Math.max(8, v.d * ld / d)); ld = d; v.tx += (-(c[0] - lc2[0]) * Math.cos(v.az) - (c[1] - lc2[1]) * Math.sin(v.az)) * s; v.tz += ((c[0] - lc2[0]) * Math.sin(v.az) - (c[1] - lc2[1]) * Math.cos(v.az)) * s; lc2 = c; }
    req();
  });
  const up = e => { const one = ps.size == 1; ps.delete(e.pointerId); if (!ps.size) drag = 0; if (one && moved < 6 && e.type == 'pointerup') hit(e); req(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); v.d = Math.min(380, Math.max(8, v.d * (1 + Math.sign(e.deltaY) * .1))); req(); }, { passive: false });
  const ray = new THREE.Raycaster(), nd = new THREE.Vector2();
  function hit(e) {
    const b = cv.getBoundingClientRect(); nd.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(nd, cam);
    const x = SITE && v.d > 150 ? 0 : ray.intersectObject(body)[0]; select(x ? x.instanceId : -1);   // ถอยไกล = อาคาร Phase 1 ทึบ → ไม่ให้แตะทะลุไปเลือก Rack ข้างใน
  }
  st.querySelector('.h3-fs').onclick = () => {
    const on = st.classList.toggle('fs');
    if (on) { st._ph = document.createComment(''); st.before(st._ph); document.body.append(st); document.body.style.overflow = 'hidden'; } else { st._ph.replaceWith(st); document.body.style.overflow = ''; }
  };

  ui(); paint(); fitSize(); req();
  return { dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); SITE && SITE.dispose(); if (st.parentNode == document.body) st.remove(); document.body.style.overflow = ''; rd.dispose(); rd.forceContextLoss && rd.forceContextLoss(); } };
}
})();
