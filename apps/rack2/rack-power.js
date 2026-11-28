/* ════════════════════════════════════════════════════════════════
 *  rack-power.js (Phase 2) — กระแส/กำลังไฟรายเช้า (ต้องโหลดหลัง rack-live.js · ใช้ window.RackAPI)
 *  ปุ่ม ⚡ มุมขวาล่าง → สรุปไฟฟ้า · รายเบรกเกอร์ · ทุก Rack · อัปโหลดไฟล์ชุดเช้า (กระแส/kW/kWh ฝั่ง A+B + PUE)
 *  การอ่านไฟล์/คำนวณ/โยง Rack (RackCB) ทำที่ GAS (Power2.gs) ที่เดียว
 *  เกณฑ์ = kW ที่ใช้จริง ÷ quota_kw ของ Rack
 *  API ภายนอก:  RackPower.open()  ·  RackPower.badge(rackId) → HTML ชิปสั้น ๆ สำหรับแปะในหน้า Rack
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const S = { d: null, tab: 'sum', q: '', up: null, busy: false, hist: null, err: '', ok: '', sel: null, onlyHot: false };
let root = null;

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 1) => x == null || isNaN(x) ? '–' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const api = b => window.RackAPI.api(b);
const canEdit = () => { const m = window.RackAPI.me && window.RackAPI.me(); return !!m && (m.role === 'admin' || m.role === 'editor'); };
const lim = () => (S.d && S.d.limits) || { warn: 80, crit: 100 };
const lvlCls = pct => pct == null ? '' : pct >= lim().crit ? 'rd' : pct >= lim().warn ? 'yl' : 'gr';
const thTs = ts => { const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/.exec(ts || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ' น.' : '–'; };
const rn = id => (S.d && S.d.names && S.d.names[id]) || id;
const cu = id => { const c = S.d && S.d.cust && S.d.cust[id]; return c && c !== '(ไม่ระบุ)' ? c : ''; };

const CSS = `
#rpw-btn{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:60;border:1px solid var(--line,#fff3);background:var(--cardsolid,#13224a);color:var(--ink,#fff);border-radius:999px;padding:10px 16px;font:600 14px/1 inherit;cursor:pointer;box-shadow:0 6px 20px var(--sh,#0008)}
#rpw{position:fixed;inset:0;z-index:90;background:var(--bg1,#07102a);color:var(--ink,#eaf1ff);overflow:auto;padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(30px + env(safe-area-inset-bottom,0px));font:14px/1.45 "IBM Plex Sans Thai",system-ui,sans-serif}
#rpw .w{max-width:980px;margin:0 auto}
#rpw h2{margin:0 0 4px;font-size:20px} #rpw h3{margin:18px 0 8px;font-size:15px}
#rpw .top{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#rpw .mut{color:var(--mut,#94a6cc);font-size:12.5px}
#rpw .tabs{display:flex;gap:6px;margin:12px 0}
#rpw button{font:inherit;color:inherit;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:8px 12px;cursor:pointer}
#rpw button.on{background:var(--dualbg);border-color:var(--dual)} #rpw button:disabled{opacity:.5}
#rpw .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
#rpw .card{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:12px}
#rpw .big{font-size:26px;font-weight:700} #rpw .bar{height:7px;border-radius:5px;background:var(--card2);margin-top:8px;overflow:hidden}
#rpw .bar i{display:block;height:100%;background:var(--dual)}
#rpw .gr{color:var(--gr)} #rpw .yl{color:var(--yl)} #rpw .rd{color:var(--rd)}
#rpw .pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;border:1px solid var(--line)}
#rpw .pill.rd{background:var(--rdbg);border-color:var(--rdf)} #rpw .pill.yl{background:var(--ylbg);border-color:var(--ylf)} #rpw .pill.gr{background:var(--grbg);border-color:var(--grf)}
#rpw table{width:100%;border-collapse:collapse;font-size:13px} #rpw th,#rpw td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
#rpw th:first-child,#rpw td:first-child{text-align:left} #rpw tr.cl{cursor:pointer} #rpw tr.cl:hover{background:var(--card)}
#rpw .sc{overflow-x:auto} #rpw input[type=search]{width:100%;max-width:320px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--card2);color:inherit}
#rpw .drop{border:2px dashed var(--line);border-radius:14px;padding:26px;text-align:center}
#rpw .err{border:1px solid var(--rdf);background:var(--rdbg);border-radius:12px;padding:10px;margin:10px 0}
#rpw .warn{border:1px solid var(--ylf);background:var(--ylbg);border-radius:12px;padding:10px;margin:10px 0}
#rpw details{margin:8px 0} #rpw summary{cursor:pointer}`;

function mount() {
  if (root) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const b = document.createElement('button'); b.id = 'rpw-btn'; b.textContent = '⚡ ไฟฟ้า'; b.onclick = open; document.body.appendChild(b);
  const dot = async () => {                                   // เตือนที่ปุ่ม: เกิน 08:00 แล้วข้อมูลยังไม่ใช่ของวันนี้
    try {
      const d = await window.RackPower.ensure(); if (!d) return;
      const now = new Date(Date.now() + 7 * 36e5), today = now.toISOString().slice(0, 10);   // เวลาไทย (UTC+7) อ่านด้วย getUTC*
      const late = d.empty || (String(d.ts).slice(0, 10) < today && now.getUTCHours() >= 8);
      b.textContent = late ? '⚡ ไฟฟ้า · รออัปเดตเช้านี้' : '⚡ ไฟฟ้า'; b.style.borderColor = late ? 'var(--yl)' : '';
    } catch (e) { /* ยังไม่ login */ }
  };
  setTimeout(dot, 4000); setInterval(() => { S.d = null; dot(); }, 30 * 60 * 1000);
}

async function load() {
  S.busy = true; S.err = ''; paint();
  try { const j = await api({ action: 'get_power' }); if (!j.ok) throw new Error(j.reason || 'โหลดไม่สำเร็จ'); S.d = j; }
  catch (e) { S.err = e.message || String(e); }
  S.busy = false; paint();
}

function open() {
  if (!root) { root = document.createElement('div'); root.id = 'rpw'; document.body.appendChild(root); root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
    root.addEventListener('dragover', e => { if (e.target.closest('.drop')) e.preventDefault(); });
    root.addEventListener('drop', e => { const z = e.target.closest('.drop'); if (!z) return; e.preventDefault(); if (e.dataTransfer.files.length) check(e.dataTransfer.files); }); }
  root.hidden = false; document.body.style.overflow = 'hidden'; load();
}
function close() { root.hidden = true; document.body.style.overflow = ''; }

// ───────────────────────── views ─────────────────────────
function head() {
  const d = S.d, age = d && !d.empty ? (d.stale ? '<span class="pill rd">ข้อมูลเก่า ' + fmt(d.age_h, 0) + ' ชม.</span>' : '<span class="pill gr">ล่าสุด</span>') : '';
  return '<div class="top"><div><h2>⚡ กระแส / กำลังไฟ · Phase 2</h2><div class="mut">' + (d && !d.empty ? 'ข้อมูล ณ ' + thTs(d.ts) + ' ' + age : 'ยังไม่มีข้อมูล') + '</div></div>' +
    '<button data-a="close">ปิด ✕</button></div>' +
    '<div class="tabs">' + [['sum', 'สรุป'], ['brk', 'รายเบรกเกอร์'], ['racks', 'ทุก Rack'], ['up', 'อัปโหลดไฟล์']].map(t => '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
    (S.ok ? '<div class="warn" style="border-color:var(--grf);background:var(--grbg)">✓ ' + esc(S.ok) + '</div>' : '') +
    (S.err ? '<div class="err">' + esc(S.err) + '</div>' : '');
}

const pctPill = pct => pct == null ? '–' : '<span class="pill ' + lvlCls(pct) + '">' + fmt(pct, 0) + '%</span>';
const bar = pct => '<div class="bar" style="min-width:60px;margin:0"><i style="width:' + Math.min(Math.max(pct || 0, 0), 100) + '%"></i></div>';
const rackLinks = ids => ids && ids.length ? esc(ids.map(rn).join(', ')) : '<span class="mut">ไม่มี Rack อ้างถึง</span>';
const side = s => '<span class="pill">' + esc(s || '–') + '</span>';
const emptyMsg = '<div class="card">ยังไม่มีข้อมูลไฟฟ้า — ไปที่แท็บ "อัปโหลดไฟล์" เพื่ออัปไฟล์ชุดเช้าของวันนี้</div>';

function vSum() {
  const d = S.d; if (!d || d.empty) return emptyMsg + (d && d.reason ? '<div class="err">' + esc(d.reason) + '</div>' : '');
  const un = d.unassigned, ov = d.over || [], nCrit = ov.filter(x => x.lvl === 'crit').length, use = d.site.cap > 0 ? d.site.use_kw / d.site.cap * 100 : null;
  const top = Object.keys(d.racks).sort((a, b) => d.racks[b].kw - d.racks[a].kw).slice(0, 5)
    .map(id => { const o = d.racks[id]; return '<tr class="cl" data-rack="' + esc(id) + '"><td>' + esc(rn(id)) + '</td><td>' + fmt(o.kw, 2) + '</td><td>' + fmt(o.cap, 1) + '</td><td>' + pctPill(o.pct) + '</td><td>' + fmt(o.A, 2) + ' / ' + fmt(o.B, 2) + '</td></tr>'; }).join('');
  const hot = (d.breakers || []).slice(0, 10)
    .map(b => '<tr class="cl" data-src="' + esc(b.id) + '"><td>' + esc(b.id) + '</td><td>' + side(b.phase) + '</td><td>' + fmt(b.a, 2) + '</td><td>' + fmt(b.kw, 2) + '</td><td>' + pctPill(b.pct) + '</td><td style="text-align:left">' + rackLinks(b.racks) + '</td></tr>').join('');
  const cv = d.coverage;
  return '<div class="grid">' +
    '<div class="card"><div class="mut">รวมทั้งไซต์ (ทุกเบรกเกอร์ A+B)</div><div class="big">' + fmt(d.site.kw) + ' kW</div><div>' + fmt(d.site.a, 0) + ' A · ' + d.n_sources + ' เบรกเกอร์</div></div>' +
    '<div class="card"><div class="mut">ใช้ไป เทียบ Quota รวมของ Rack ที่ใช้งาน/วางเครื่อง</div><div class="big ' + lvlCls(use) + '">' + (use == null ? '–' : fmt(use, 0) + '%') + '</div><div class="mut">' + fmt(d.site.use_kw, 0) + ' / ' + fmt(d.site.cap, 0) + ' kW</div><div class="bar"><i style="width:' + Math.min(use || 0, 100) + '%"></i></div></div>' +
    '<div class="card"><div class="mut">Rack ที่ใช้ไฟเกิน Quota</div><div class="big ' + (nCrit ? 'rd' : ov.length ? 'yl' : 'gr') + '">' + nCrit + ' เกิน · ' + (ov.length - nCrit) + ' ใกล้</div><div class="mut">เตือนที่ ≥' + lim().warn + '% ของ quota_kw</div></div></div>' +
    overBlk(ov) +
    '<h3>เบรกเกอร์โหลดสูงสุด 10 อันดับ</h3><div class="card sc"><table><tr><th>Source</th><th>ฝั่ง</th><th>A</th><th>kW</th><th>% Quota Rack</th><th style="text-align:left">Rack</th></tr>' + hot + '</table><p class="mut" style="margin:8px 0 0">กดแถวเพื่อดูแนวโน้ม (กระแสของฝั่งนั้น) · ดูครบที่แท็บ "รายเบรกเกอร์"</p></div>' +
    '<h3>Top 5 Rack (kW)</h3><div class="card sc"><table><tr><th>Rack</th><th>kW</th><th>Quota</th><th>% Quota</th><th>kW ฝั่ง A / B</th></tr>' + top + '</table></div>' +
    '<h3>ความครบถ้วนของข้อมูล</h3><div class="grid">' +
    '<div class="card"><div class="mut">Rack ที่มีข้อมูลไฟ</div><div class="big">' + cv.racks_with_power + ' / ' + cv.racks_total + '</div><div class="mut">Rack ที่ใช้งาน/วางเครื่อง ' + cv.racks_on + '</div></div>' +
    '<div class="card"><div class="mut">โหลดที่ไม่มี Rack (ไม่อยู่ใน RackCB)</div><div class="big ' + (un.kw > d.site.kw * 0.05 ? 'yl' : '') + '">' + fmt(un.kw) + ' kW</div><div>' + un.n + ' เบรกเกอร์</div></div>' +
    '<div class="card"><div class="mut">ต้องตรวจ</div><div>สถานะ Rack ไม่ตรงกับโหลดจริง <b>' + d.mismatch.length + '</b></div><div>เบรกเกอร์ใน RackCB ที่ไม่มีค่า <b>' + d.unknown.length + '</b></div><div>Rack ใช้งานแต่ไม่มีเบรกเกอร์ <b>' + cv.racks_no_source.length + '</b></div></div></div>' +
    '<h3>รายการที่ต้องตรวจ</h3>' + audit(d) + pueBlk(d);
}

function overBlk(ov) {
  if (!ov.length) return '';
  return '<h3>Rack ที่ใช้เกิน/ใกล้เกิน Quota (' + ov.length + ')</h3><div class="card sc"><table><tr><th>Rack</th><th>kW</th><th>Quota</th><th>% Quota</th><th>kW ฝั่ง A / B</th></tr>' +
    ov.slice(0, 20).map(x => '<tr class="cl" data-rack="' + esc(x.rack_id) + '"><td>' + esc(rn(x.rack_id)) + (cu(x.rack_id) ? ' <span class="mut">' + esc(cu(x.rack_id)) + '</span>' : '') + '</td><td>' + fmt(x.kw, 2) + '</td><td>' + fmt(x.cap, 1) + '</td><td>' + pctPill(x.pct) + '</td><td>' + fmt(x.A, 2) + ' / ' + fmt(x.B, 2) + '</td></tr>').join('') +
    (ov.length > 20 ? '<tr><td colspan="5" class="mut">… อีก ' + (ov.length - 20) + ' รายการ (ดูครบที่แท็บ "ทุก Rack")</td></tr>' : '') + '</table></div>';
}

function audit(d) {
  const li = (arr, f, n) => arr.slice(0, 40).map(f).join('') + (arr.length > 40 ? '<tr><td colspan="' + n + '" class="mut">… อีก ' + (arr.length - 40) + ' รายการ</td></tr>' : '');
  const blk = (t, n, body) => n ? '<details><summary>' + t + ' <b>' + n + '</b></summary><div class="card sc"><table>' + body + '</table></div></details>' : '';
  return blk('สถานะ Rack ใน DB ไม่ตรงกับโหลดจริง', d.mismatch.length,
      '<tr><th>Rack</th><th>kW</th><th style="text-align:left">เหตุ</th></tr>' + li(d.mismatch, x => '<tr class="cl" data-rack="' + esc(x.rack_id) + '"><td>' + esc(rn(x.rack_id)) + '</td><td>' + fmt(x.kw, 2) + '</td><td style="text-align:left">' + esc(x.why) + '</td></tr>', 3)) +
    blk('เบรกเกอร์ใน RackCB ที่ไม่มีค่าในไฟล์ (ช่องว่าง/ไม่มีคอลัมน์)', d.unknown.length,
      '<tr><th>Source</th><th>Rack</th></tr>' + li(d.unknown, x => '<tr><td>' + esc(x.source_id) + '</td><td>' + esc(x.racks.map(rn).join(', ')) + '</td></tr>', 2)) +
    blk('เบรกเกอร์ที่มีโหลดแต่ไม่อยู่ใน RackCB (15 อันดับแรก)', d.unassigned.n,
      '<tr><th>Source</th><th>kW</th><th>A</th></tr>' + d.unassigned.top.map(x => '<tr><td>' + esc(x.source_id) + '</td><td>' + fmt(x.kw, 2) + '</td><td>' + fmt(x.a) + '</td></tr>').join('')) +
    blk('Rack สถานะ "ใช้งาน" แต่ไม่มีเบรกเกอร์ใน RackCB', d.coverage.racks_no_source.length, '<tr><th>Rack</th></tr>' + li(d.coverage.racks_no_source, x => '<tr><td>' + esc(rn(x)) + '</td></tr>', 1));
}

function pueBlk(d) {
  if (!d.pue || !d.pue.length) return '';
  return '<h3>มิเตอร์ระดับไซต์ (PUE) — kWh สะสม</h3><div class="card sc"><table><tr><th>มิเตอร์</th><th>kWh สะสม</th><th>ใช้ไปจากครั้งก่อน</th></tr>' +
    d.pue.map(x => '<tr><td>' + esc(x.id) + '</td><td>' + fmt(x.kwh, 0) + '</td><td>' + (x.used == null ? '–' : fmt(x.used, 0)) + '</td></tr>').join('') +
    '</table><p class="mut" style="margin:8px 0 0">ยังไม่คำนวณค่า PUE — ต้องกำหนดก่อนว่ามิเตอร์ตัวไหนคือ IT / Total / Cooling</p></div>';
}

function vBrk() {
  const d = S.d; if (!d || d.empty) return '';
  const q = S.q.trim().toLowerCase();
  let ls = (d.breakers || []).filter(b => (!q || b.id.toLowerCase().includes(q) || b.racks.some(r => rn(r).toLowerCase().includes(q))) && (!S.onlyHot || (b.pct != null && b.pct >= lim().warn)));
  const n = ls.length; ls = ls.slice(0, 300);
  const rows = ls.map(b => '<tr class="cl" data-src="' + esc(b.id) + '"><td>' + esc(b.id) + '</td><td>' + side(b.phase) + '</td><td>' + fmt(b.a, 2) + '</td><td>' + fmt(b.kw, 2) + '</td><td>' + pctPill(b.pct) + '</td><td style="min-width:70px">' + bar(b.pct) + '</td><td style="text-align:left">' + rackLinks(b.racks) + '</td></tr>').join('');
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="search" data-q placeholder="ค้นหาเบรกเกอร์ (เช่น EFU9-2B3) หรือ Rack" value="' + esc(S.q) + '">' +
    '<label class="mut"><input type="checkbox" data-hot ' + (S.onlyHot ? 'checked' : '') + '> เฉพาะ ≥' + lim().warn + '% ของ Quota</label></div>' +
    '<p class="mut">' + n + ' เบรกเกอร์ที่มีโหลด (แสดงสูงสุด 300) · เรียงจาก kW มาก→น้อย · % = kW ของเบรกเกอร์เทียบ quota_kw ของ Rack · กดแถวเพื่อดูแนวโน้ม</p>' +
    '<div class="card sc"><table><tr><th>Source</th><th>ฝั่ง</th><th>A</th><th>kW</th><th>% Quota</th><th></th><th style="text-align:left">Rack</th></tr>' + rows + '</table></div>' + (S.hist ? vHist() : '');
}

function vRacks() {
  const d = S.d; if (!d || d.empty) return '';
  const q = S.q.trim().toLowerCase();
  const ids = Object.keys(d.racks).filter(id => !q || id.toLowerCase().includes(q) || rn(id).toLowerCase().includes(q) || cu(id).toLowerCase().includes(q)).sort((a, b) => d.racks[b].kw - d.racks[a].kw);
  const rows = ids.slice(0, 500).map(id => { const o = d.racks[id];
    return '<tr class="cl" data-rack="' + esc(id) + '"><td>' + esc(rn(id)) + '</td><td style="text-align:left">' + esc(cu(id)) + '</td><td>' + fmt(o.kw, 2) + '</td><td>' + fmt(o.A, 2) + '</td><td>' + fmt(o.B, 2) + '</td><td>' + fmt(o.cap, 1) + '</td><td class="' + lvlCls(o.pct) + '">' + (o.pct == null ? '–' : fmt(o.pct, 0) + '%') + '</td><td>' + (o.kwh == null ? '–' : fmt(o.kwh, 1)) + '</td><td>' + o.n + (o.miss.length ? ' <span class="pill yl" title="' + esc(o.miss.join(', ')) + '">ขาด ' + o.miss.length + '</span>' : '') + '</td></tr>'; }).join('');
  return '<input type="search" data-q placeholder="ค้นหา Rack หรือลูกค้า" value="' + esc(S.q) + '"><p class="mut">' + ids.length + ' Rack (แสดงสูงสุด 500) · กดที่แถวเพื่อดูรายเบรกเกอร์และแนวโน้ม · kWh = ใช้ไประหว่างไฟล์ล่าสุดกับครั้งก่อน (' + thTs(d.prev_ts) + ')</p>' +
    '<div class="card sc"><table><tr><th>Rack</th><th style="text-align:left">ลูกค้า</th><th>kW รวม</th><th>kW A</th><th>kW B</th><th>Quota</th><th>% Quota</th><th>kWh</th><th>เบรกเกอร์</th></tr>' + rows + '</table></div>' + (S.sel ? vRackBrk() : '') + (S.hist ? vHist() : '');
}

function vRackBrk() {
  const o = S.d.racks[S.sel]; if (!o) return '';
  return '<h3>เบรกเกอร์ของ ' + esc(rn(S.sel)) + ' (' + o.src.length + ')</h3><div class="card sc"><table><tr><th>Source</th><th>ฝั่ง</th><th>A</th><th>kW</th><th>% Quota</th></tr>' +
    o.src.map(b => '<tr class="cl" data-src="' + esc(b.id) + '"><td>' + esc(b.id) + '</td><td>' + side(b.phase) + '</td><td>' + fmt(b.a, 2) + '</td><td>' + fmt(b.kw, 2) + '</td><td>' + pctPill(b.pct) + '</td></tr>').join('') +
    (o.miss.length ? '<tr><td colspan="5" class="mut">ไม่มีค่าในไฟล์: ' + esc(o.miss.join(', ')) + '</td></tr>' : '') + '</table></div>';
}

function vHist() {
  const h = S.hist, r = h.rows; if (!r.length) return '<div class="card">ยังไม่มีประวัติ (เริ่มสะสมเมื่ออัปโหลดไฟล์รายวัน)</div>';
  const W = 600, H = 90, u = h.unit || 'kW', cap = u === 'kW' ? h.cap : 0, mx = Math.max.apply(null, r.map(x => x.v).concat([0.001, cap > 0 && Math.max.apply(null, r.map(x => x.v)) >= cap * 0.7 ? cap : 0]));
  const y = v => (H - v / mx * (H - 8) - 4).toFixed(1);
  const pts = r.map((x, i) => (r.length < 2 ? W / 2 : i / (r.length - 1) * W).toFixed(1) + ',' + y(x.v)).join(' ');
  const line = cap > 0 && cap <= mx ? '<line x1="0" x2="' + W + '" y1="' + y(cap) + '" y2="' + y(cap) + '" stroke="var(--rd)" stroke-dasharray="4 4"/>' : '';
  const vs = r.map(x => x.v), title = h.source_id ? esc(h.source_id) + ' (ฝั่ง ' + esc(h.side || '–') + ' ของ ' + esc(rn(h.rack_id)) + ')' : esc(rn(h.rack_id));
  return '<h3>แนวโน้ม (' + u + ') — ' + title + ' (' + r.length + ' วัน)</h3><div class="card"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="90" role="img" aria-label="แนวโน้ม">' + line + '<polyline fill="none" stroke="var(--dual)" stroke-width="2" points="' + pts + '"/></svg>' +
    '<div class="mut">' + esc(r[0].date) + ' → ' + esc(r[r.length - 1].date) + ' · ต่ำสุด ' + fmt(Math.min.apply(null, vs), 2) + ' · สูงสุด ' + fmt(Math.max.apply(null, vs), 2) + ' · ล่าสุด ' + fmt(vs[vs.length - 1], 2) + ' ' + u + (cap > 0 ? ' · เส้นประ = Quota ' + fmt(cap, 1) + ' kW' : '') + '</div></div>';
}

const KIND = { cur: 'กระแส (A)', kw: 'กำลัง (kW)', kwh: 'พลังงาน (kWh)', pue: 'PUE (kWh)' };

function vUp() {
  if (!canEdit()) return '<div class="card">บัญชีนี้ไม่มีสิทธิ์อัปโหลด (ต้องเป็น editor / admin)</div>';
  const u = S.up;
  let h = '<div class="drop"><p><b>ลากไฟล์ชุดเช้านี้มาวางที่นี่ (เลือกได้หลายไฟล์ หรือ .zip)</b></p><input type="file" multiple accept=".csv,.zip,text/csv" data-file><p class="mut">ต้องมี 6 ไฟล์: กระแส (A) · กำลัง (kW) · พลังงาน (kWh) × Source-A และ Source-B (+ PUE(KWH) ถ้ามี)<br>ระบบแยกชนิดไฟล์จากหัวคอลัมน์ ไม่ดูชื่อไฟล์ · ตรวจให้ดูก่อน ยังไม่บันทึกจนกว่าจะกดยืนยัน · อัปซ้ำวันเดิมได้ (เขียนทับของวันนั้น)</p></div>';
  if (!u) return h;
  if (u.error) return h + '<div class="err">' + esc(u.error) + '</div>';
  const s = u.summary, p = s.prev_site, dl = p && p.kw > 0 ? (s.site.kw - p.kw) / p.kw * 100 : null;
  h += '<h3>ผลตรวจ ' + s.files.length + ' ไฟล์</h3><div class="card sc"><table><tr><th>ไฟล์</th><th>ชนิด</th><th>ฝั่ง</th><th>คอลัมน์</th><th>ช่องว่าง</th></tr>' +
    s.files.map(f => '<tr><td>' + esc(f.name) + '</td><td>' + esc(KIND[f.kind] || f.kind) + '</td><td>' + esc(f.side || '–') + '</td><td>' + f.n + '</td><td>' + (f.nulls || '–') + '</td></tr>').join('') + '</table></div>' +
    '<div class="grid" style="margin-top:10px">' +
    '<div class="card"><div class="mut">เวลาในไฟล์</div><div class="big" style="font-size:18px">' + thTs(s.ts) + '</div><div class="mut">ครั้งก่อน ' + thTs(s.prev_ts) + '</div></div>' +
    '<div class="card"><div class="mut">รวมทั้งไซต์</div><div class="big">' + fmt(s.site.kw) + ' kW</div><div>' + fmt(s.site.a, 0) + ' A · ' + s.n_sources + ' เบรกเกอร์' + (dl == null ? '' : ' · <span class="' + (Math.abs(dl) > 15 ? 'yl' : '') + '">' + (dl > 0 ? '+' : '') + fmt(dl) + '% จากครั้งก่อน</span>') + '</div></div>' +
    '<div class="card"><div class="mut">Rack โหลดสูงสุด</div>' + (s.top_racks || []).map(x => '<div>' + esc(x.rack_id) + ' <b>' + fmt(x.kw, 2) + ' kW</b> ' + pctPill(x.pct) + '</div>').join('') + '<div class="mut">Rack ที่โยงได้ ' + s.racks_with_power + ' · โหลดไม่มี Rack ' + fmt(s.unassigned.kw) + ' kW</div></div></div>';
  if (s.over_crit || s.over_warn) h += '<div class="' + (s.over_crit ? 'err' : 'warn') + '"><b>Rack เกินเกณฑ์ Quota:</b> ' + s.over_crit + ' เกิน · ' + s.over_warn + ' ใกล้เกิน' + (s.over_top && s.over_top.length ? '<br>' + s.over_top.map(x => esc(x.rack_id) + ' ' + fmt(x.kw, 2) + ' / ' + fmt(x.cap, 1) + ' kW (' + fmt(x.pct, 0) + '%)').join(' · ') : '') + '</div>';
  if (s.n_mismatch) h += '<p class="mut">สถานะ Rack ใน DB ไม่ตรงกับโหลด ' + s.n_mismatch + ' Rack (ดูรายละเอียดที่แท็บ "สรุป" หลังบันทึก)</p>';
  if (s.warn.length) h += '<div class="warn">' + s.warn.map(esc).join('<br>') + '</div>';
  if (s.problems.length) h += '<div class="err"><b>พบปัญหา</b><br>' + s.problems.map(esc).join('<br>') + '</div>';
  return h + '<p><button data-a="save" ' + (S.busy ? 'disabled' : '') + '>' + (s.problems.length ? 'บันทึกต่อ (ยืนยันว่าถูกต้อง)' : 'บันทึก') + '</button></p>';
}

function paint() {
  if (!root || root.hidden) return;
  root.innerHTML = '<div class="w">' + head() + (S.busy && !S.d ? '<div class="card">กำลังโหลด…</div>' : S.tab === 'sum' ? vSum() : S.tab === 'brk' ? vBrk() : S.tab === 'racks' ? vRacks() : vUp()) + '</div>';
}

// ───────────────────────── events ─────────────────────────
function onClick(e) {
  const t = e.target.closest('[data-a],[data-tab],[data-rack],[data-src]'); if (!t) return;
  if (t.dataset.a === 'close') return close();
  if (t.dataset.a === 'save') return save();
  if (t.dataset.tab) { S.tab = t.dataset.tab; S.hist = null; S.sel = null; return paint(); }
  if (t.dataset.src) { S.tab = 'brk'; S.sel = null; return hist({ source_id: t.dataset.src }); }
  if (t.dataset.rack) { S.tab = 'racks'; S.sel = t.dataset.rack; hist({ rack_id: t.dataset.rack }); }
}
function onInput(e) { if (e.target.matches('[data-q]')) { S.q = e.target.value; const p = e.target.selectionStart; paint(); const i = root.querySelector('[data-q]'); if (i) { i.focus(); i.setSelectionRange(p, p); } } }
function onChange(e) {
  if (e.target.matches('[data-file]') && e.target.files.length) check(e.target.files);
  if (e.target.matches('[data-hot]')) { S.onlyHot = e.target.checked; paint(); }
}

async function hist(sel) {
  S.hist = null; paint();
  try { const j = await api(Object.assign({ action: 'get_power_hist', days: 60 }, sel)); S.hist = j.ok ? j : null; } catch (e) { S.hist = null; }
  paint(); const h = root.querySelector('h3 + .card svg'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'center' });
}

function loadJSZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; sc.onload = ok; sc.onerror = () => no(new Error('โหลดตัวแตก ZIP ไม่ได้ — ให้เลือกไฟล์ .csv ตรง ๆ แทน')); document.head.appendChild(sc); });
}

/** ไฟล์ CSV มีส่วน "แถวกว้าง" (บรรทัด 1-2) ซ้ำกับรายการด้านล่าง — ส่งเฉพาะ 2 บรรทัดแรก (เล็กลง ~20 เท่า) */
const headOf = t => String(t).split(/\r?\n/).filter(l => l.replace(/[,\s"]/g, '') !== '').slice(0, 2).join('\n');

/** รวบรวมไฟล์ .csv จากที่เลือก (csv ตรง ๆ / อยู่ใน zip) */
async function pickCsv(list) {
  const out = [];
  for (const f of Array.from(list)) {
    if (/\.zip$/i.test(f.name)) {
      await loadJSZip();
      const z = await window.JSZip.loadAsync(f);
      for (const e of Object.values(z.files)) if (!e.dir && /\.csv$/i.test(e.name)) out.push({ name: e.name.split('/').pop(), text: headOf(await e.async('string')) });
    } else if (/\.csv$/i.test(f.name)) out.push({ name: f.name, text: headOf(await f.text()) });
  }
  if (!out.length) throw new Error('ไม่พบไฟล์ .csv ในที่เลือก');
  if (out.length > 12) throw new Error('เลือกไฟล์มากเกินไป (' + out.length + ') — ต้องการเฉพาะชุดไฟฟ้าของเช้านี้');
  return out;
}

async function check(list) {
  S.busy = true; S.up = null; S.err = ''; S.ok = ''; paint();
  try {
    const files = await pickCsv(list);
    const j = await api({ action: 'save_power', files, dry_run: true });
    S.up = j.ok ? { files, summary: j.summary } : { error: j.reason || 'ตรวจไฟล์ไม่ผ่าน' };
  } catch (e) { S.up = { error: e.message || String(e) }; }
  S.busy = false; paint();
}

async function save() {
  const u = S.up; if (!u || !u.summary) return;
  S.busy = true; paint();
  try {
    const j = await api({ action: 'save_power', files: u.files, force: u.summary.problems.length > 0 });
    if (!j.ok) throw new Error(j.reason || 'บันทึกไม่สำเร็จ');
    S.up = null; S.hist = null; S.sel = null; S.tab = 'sum'; S.d = null; await load(); S.ok = 'บันทึกข้อมูล ณ ' + thTs(j.summary && j.summary.ts) + ' เรียบร้อย'; paint();
  } catch (e) { S.up = Object.assign({}, u, { summary: u.summary }); S.err = e.message || String(e); S.busy = false; paint(); }
}

// ───────────────────────── API สำหรับแปะในหน้า Rack ─────────────────────────
window.RackPower = {
  open,
  cached: () => S.d,
  openSrc(id) { S.tab = 'brk'; S.q = id; S.sel = null; open(); hist({ source_id: id }); },
  openRack(id) { S.tab = 'racks'; S.q = ''; S.sel = id; open(); hist({ rack_id: id }); },
  badge(rackId) {
    const o = S.d && S.d.racks && S.d.racks[rackId];
    if (!o) return '';
    return '<span class="pill ' + lvlCls(o.pct) + '" title="' + esc(o.src.map(b => b.id + ' ' + fmt(b.kw, 2) + ' kW').join(' · ')) + '">⚡ ' + fmt(o.kw, 2) + ' / ' + fmt(o.cap, 1) + ' kW (' + fmt(o.pct, 0) + '%)</span>';
  },
  ensure: async () => { if (!S.d) { try { const j = await api({ action: 'get_power' }); if (j.ok) S.d = j; } catch (e) { /* ignore */ } } return S.d; },
};

let tries = 0;
(function wait() { if (window.RackAPI) mount(); else if (tries++ < 100) setTimeout(wait, 100); })();
})();
