/* ════════════════════════════════════════════════════════════════
 *  rack-power.js — กระแส/กำลังไฟรายเช้า (ต้องโหลดหลัง rack-live.js · ใช้ window.RackAPI)
 *  ปุ่ม ⚡ มุมขวาล่าง → สรุปไฟฟ้า · ตาราง Rack · อัปโหลดไฟล์ RPP_ALL_*.csv (ดูผลตรวจก่อนบันทึก)
 *  การอ่านไฟล์/คำนวณทำที่ GAS (Power.gs) ที่เดียว → อัปมือกับ Trigger อัตโนมัติได้ผลตรงกัน
 *  API ภายนอก:  RackPower.open()  ·  RackPower.badge(rackId) → HTML ชิปสั้น ๆ สำหรับแปะในหน้า Rack
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const S = { d: null, tab: 'sum', q: '', up: null, busy: false, hist: null, err: '', ok: '', sel: null, onlyHot: false };   // sel = Rack ที่เปิดดูรายเบรกเกอร์
let root = null;

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 1) => x == null || isNaN(x) ? '–' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const api = b => window.RackAPI.api(b);
const canEdit = () => { const m = window.RackAPI.me && window.RackAPI.me(); return !!m && (m.role === 'admin' || m.role === 'editor'); };
const lim = () => (S.d && S.d.limits) || { limit: 14.4, warn: 80, crit: 100 };
const lvlCls = pct => pct == null ? '' : pct >= lim().crit ? 'rd' : pct >= lim().warn ? 'yl' : 'gr';
const thTs = ts => { const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/.exec(ts || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ' น.' : '–'; };
const rn = id => (S.d && S.d.names && S.d.names[id]) || id;

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
  return '<div class="top"><div><h2>⚡ กระแส / กำลังไฟ</h2><div class="mut">' + (d && !d.empty ? 'ข้อมูล ณ ' + thTs(d.ts) + ' ' + age : 'ยังไม่มีข้อมูล') + '</div></div>' +
    '<button data-a="close">ปิด ✕</button></div>' +
    '<div class="tabs">' + [['sum', 'สรุป'], ['brk', 'รายเบรกเกอร์'], ['racks', 'ทุก Rack'], ['up', 'อัปโหลดไฟล์']].map(t => '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
    (S.ok ? '<div class="warn" style="border-color:var(--grf);background:var(--grbg)">✓ ' + esc(S.ok) + '</div>' : '') +
    (S.err ? '<div class="err">' + esc(S.err) + '</div>' : '');
}

const pctPill = pct => '<span class="pill ' + lvlCls(pct) + '">' + fmt(pct) + '%</span>';
const bar = pct => '<div class="bar" style="min-width:60px;margin:0"><i style="width:' + Math.min(Math.max(pct, 0), 100) + '%"></i></div>';
const rackLinks = ids => ids && ids.length ? esc(ids.map(rn).join(', ')) : '<span class="mut">ไม่มี Rack อ้างถึง</span>';

function vSum() {
  const d = S.d; if (!d || d.empty) return '<div class="card">ยังไม่มีข้อมูลไฟฟ้า — ไปที่แท็บ "อัปโหลดไฟล์" เพื่ออัปไฟล์ RPP_ALL ของวันนี้</div>';
  const un = d.unassigned, ov = d.over || [], nCrit = ov.filter(x => x.lvl === 'crit').length, use = d.site.cap > 0 ? d.site.a / d.site.cap * 100 : null;
  const top = Object.keys(d.racks).sort((a, b) => d.racks[b].kw - d.racks[a].kw).slice(0, 5)
    .map(id => '<tr class="cl" data-rack="' + esc(id) + '"><td>' + esc(rn(id)) + '</td><td>' + fmt(d.racks[id].kw, 2) + '</td><td>' + fmt(d.racks[id].a) + '</td><td>' + (d.racks[id].max ? esc(d.racks[id].max.source_id) + ' ' + pctPill(d.racks[id].max.pct) : '–') + '</td></tr>').join('');
  const hot = (d.breakers || []).slice(0, 10)
    .map(b => '<tr class="cl" data-src="' + esc(b.id) + '"><td>' + esc(b.id) + '</td><td>' + fmt(b.a, 2) + '</td><td>' + pctPill(b.pct) + '</td><td>' + fmt(b.kw, 2) + '</td><td style="text-align:left">' + rackLinks(b.racks) + '</td></tr>').join('');
  const cv = d.coverage, noSrc = cv.racks_no_source;
  return '<div class="grid">' +
    '<div class="card"><div class="mut">รวมทั้งไซต์ (ทุกเบรกเกอร์)</div><div class="big">' + fmt(d.site.kw) + ' kW</div><div>' + fmt(d.site.a) + ' A · ' + d.n_sources + ' เบรกเกอร์</div></div>' +
    '<div class="card"><div class="mut">ใช้ไป เทียบ Design ' + lim().limit + ' A ต่อเบรกเกอร์ที่ใช้งานอยู่</div><div class="big ' + lvlCls(use) + '">' + (use == null ? '–' : fmt(use, 0) + '%') + '</div><div class="mut">' + fmt(d.site.a, 0) + ' / ' + fmt(d.site.cap, 0) + ' A</div><div class="bar"><i style="width:' + Math.min(use || 0, 100) + '%"></i></div></div>' +
    '<div class="card"><div class="mut">เบรกเกอร์เกิน Design ' + lim().limit + ' A (breaker ' + (d.limits ? d.limits.breaker : 32) + ' A)</div><div class="big ' + (nCrit ? 'rd' : ov.length ? 'yl' : 'gr') + '">' + nCrit + ' เกิน · ' + (ov.length - nCrit) + ' ใกล้</div><div class="mut">เตือนที่ ≥' + lim().warn + '% (' + fmt(lim().limit * lim().warn / 100, 2) + ' A)</div></div></div>' +
    '<h3>เบรกเกอร์โหลดสูงสุด 10 อันดับ</h3><div class="card sc"><table><tr><th>Source</th><th>A</th><th>% ของ ' + lim().limit + ' A</th><th>kW</th><th style="text-align:left">Rack</th></tr>' + hot + '</table><p class="mut" style="margin:8px 0 0">กดแถวเพื่อดูแนวโน้มของเบรกเกอร์นั้น · ดูครบทุกตัวที่แท็บ "รายเบรกเกอร์"</p></div>' +
    '<h3>ความครบถ้วนของข้อมูล</h3><div class="grid">' +
    '<div class="card"><div class="mut">Rack ที่โยงกับ source ได้</div><div class="big">' + cv.racks_with_power + ' / ' + cv.racks_on + '</div><div class="mut">Rack ที่มีเครื่อง ON</div></div>' +
    '<div class="card"><div class="mut">โหลดที่ไม่มีเจ้าของ (ไม่มี Rack อ้างถึงเบรกเกอร์)</div><div class="big ' + (un.kw > d.site.kw * 0.05 ? 'yl' : '') + '">' + fmt(un.kw) + ' kW</div><div>' + fmt(un.a) + ' A · ' + un.n + ' เบรกเกอร์</div></div>' +
    '<div class="card"><div class="mut">ต้องตรวจ</div><div>เครื่อง ON ที่อ่านช่อง RPP ไม่ได้ <b>' + d.unparsed.length + '</b></div><div>เบรกเกอร์ที่อ้างถึงแต่ไม่มีในไฟล์ <b>' + d.unknown.length + '</b></div><div>เบรกเกอร์ที่หลาย Rack อ้างร่วม <b>' + d.shared.length + '</b></div></div></div>' +
    overBlk(ov) + '<h3>Top 5 Rack (kW)</h3><div class="card sc"><table><tr><th>Rack</th><th>kW</th><th>A รวม</th><th>เบรกเกอร์สูงสุด</th></tr>' + top + '</table></div>' +
    '<h3>รายการที่ต้องตรวจ</h3>' + audit(d, noSrc);
}

function overBlk(ov) {
  if (!ov.length) return '';
  return '<h3>เบรกเกอร์ที่ใช้เกิน/ใกล้เกิน Design (' + ov.length + ')</h3><div class="card sc"><table><tr><th>Source</th><th>A</th><th>% ของ ' + lim().limit + ' A</th><th>kW</th><th style="text-align:left">Rack</th></tr>' +
    ov.slice(0, 20).map(x => '<tr class="cl" data-src="' + esc(x.source_id) + '"><td>' + esc(x.source_id) + '</td><td>' + fmt(x.a, 2) + '</td><td>' + pctPill(x.pct) + '</td><td>' + fmt(x.kw, 2) + '</td><td style="text-align:left">' + rackLinks(x.racks) + '</td></tr>').join('') +
    (ov.length > 20 ? '<tr><td colspan="5" class="mut">… อีก ' + (ov.length - 20) + ' รายการ</td></tr>' : '') + '</table></div>';
}

function audit(d, noSrc) {
  const li = (arr, f) => arr.slice(0, 40).map(f).join('') + (arr.length > 40 ? '<tr><td colspan="3" class="mut">… อีก ' + (arr.length - 40) + ' รายการ</td></tr>' : '');
  const blk = (t, n, body) => n ? '<details><summary>' + t + ' <b>' + n + '</b></summary><div class="card sc"><table>' + body + '</table></div></details>' : '';
  return blk('เครื่อง ON ที่อ่านช่อง "RPP / ปลั๊ก" ไม่ได้ (แก้ให้อยู่ในรูป 13/RPP1-A5)', d.unparsed.length,
      '<tr><th>Rack</th><th>เครื่อง</th><th>ค่าที่กรอก</th></tr>' + li(d.unparsed, x => '<tr><td>' + esc(rn(x.rack_id)) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.rpp || '(ว่าง)') + '</td></tr>')) +
    blk('เบรกเกอร์ที่เครื่องอ้างถึงแต่ไม่มีในไฟล์ไฟฟ้า (พิมพ์ผิด/RPP ไม่อยู่ในไฟล์)', d.unknown.length,
      '<tr><th>Source</th><th>Rack</th></tr>' + li(d.unknown, x => '<tr><td>' + esc(x.source_id) + '</td><td>' + esc(x.racks.map(rn).join(', ')) + '</td></tr>')) +
    blk('เบรกเกอร์ที่หลาย Rack อ้างร่วม (ระบบแบ่งโหลดเท่า ๆ กัน)', d.shared.length,
      '<tr><th>Source</th><th>Rack</th></tr>' + li(d.shared, x => '<tr><td>' + esc(x.source_id) + '</td><td>' + esc(x.racks.map(rn).join(', ')) + '</td></tr>')) +
    blk('เบรกเกอร์ที่มีโหลดแต่ไม่มี Rack ไหนอ้างถึง (15 อันดับแรก)', d.unassigned.n,
      '<tr><th>Source</th><th>kW</th><th>A</th></tr>' + d.unassigned.top.map(x => '<tr><td>' + esc(x.source_id) + '</td><td>' + fmt(x.kw, 2) + '</td><td>' + fmt(x.a) + '</td></tr>').join('')) +
    blk('Rack ที่มีเครื่อง ON แต่ไม่มี source เลย', noSrc.length, '<tr><th>Rack</th></tr>' + li(noSrc, x => '<tr><td>' + esc(rn(x)) + '</td></tr>'));
}

function vBrk() {
  const d = S.d; if (!d || d.empty) return '';
  const q = S.q.trim().toLowerCase();
  let ls = (d.breakers || []).filter(b => (!q || b.id.toLowerCase().includes(q) || b.racks.some(r => rn(r).toLowerCase().includes(q))) && (!S.onlyHot || b.pct >= lim().warn));
  const n = ls.length; ls = ls.slice(0, 300);
  const rows = ls.map(b => '<tr class="cl" data-src="' + esc(b.id) + '"><td>' + esc(b.id) + '</td><td>' + b.phase + '</td><td>' + fmt(b.a, 2) + '</td><td>' + pctPill(b.pct) + '</td><td style="min-width:70px">' + bar(b.pct) + '</td><td>' + fmt(b.kw, 2) + '</td><td style="text-align:left">' + rackLinks(b.racks) + '</td></tr>').join('');
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="search" data-q placeholder="ค้นหาเบรกเกอร์ (เช่น RPP1-A5) หรือ Rack" value="' + esc(S.q) + '">' +
    '<label class="mut"><input type="checkbox" data-hot ' + (S.onlyHot ? 'checked' : '') + '> เฉพาะ ≥' + lim().warn + '% ของ Design</label></div>' +
    '<p class="mut">' + n + ' เบรกเกอร์ (แสดงสูงสุด 300) · เรียงจากกระแสมาก→น้อย · % = กระแสเทียบ ' + lim().limit + ' A · เฟสเป็นแค่ข้อมูลประกอบ ไม่ได้นำมารวม · กดแถวเพื่อดูแนวโน้ม</p>' +
    '<div class="card sc"><table><tr><th>Source</th><th>เฟส</th><th>A</th><th>% Design</th><th></th><th>kW</th><th style="text-align:left">Rack</th></tr>' + rows + '</table></div>' + (S.hist ? vHist() : '');
}

const util = o => { const u = o.cap > 0 ? o.a / o.cap * 100 : null, m = o.max;
  return '<td class="' + lvlCls(u) + '">' + (u == null ? '–' : fmt(u, 0) + '%') + '</td><td>' + (m ? esc(m.source_id) + ' ' + pctPill(m.pct) : '–') + '</td>'; };

function vRacks() {
  const d = S.d; if (!d || d.empty) return '';
  const q = S.q.trim().toLowerCase();
  const ids = Object.keys(d.racks).filter(id => !q || id.toLowerCase().includes(q) || rn(id).toLowerCase().includes(q)).sort((a, b) => d.racks[b].kw - d.racks[a].kw);
  const rows = ids.map(id => { const o = d.racks[id];
    return '<tr class="cl" data-rack="' + esc(id) + '"><td>' + esc(rn(id)) + '</td><td>' + fmt(o.kw, 2) + '</td><td>' + fmt(o.a) + '</td>' + util(o) + '<td>' + fmt(o.kwh, 1) + '</td><td>' + o.n + (o.miss.length ? ' <span class="pill yl" title="' + esc(o.miss.join(', ')) + '">ขาด ' + o.miss.length + '</span>' : '') + '</td></tr>'; }).join('');
  return '<input type="search" data-q placeholder="ค้นหา Rack" value="' + esc(S.q) + '"><p class="mut">กดที่แถวเพื่อดูรายเบรกเกอร์ของ Rack และแนวโน้ม · kWh = ใช้ไประหว่างไฟล์ล่าสุดกับครั้งก่อน (' + thTs(d.prev_ts) + ')</p>' +
    '<div class="card sc"><table><tr><th>Rack</th><th>kW</th><th>A รวม</th><th>ใช้ % ของ Design</th><th>เบรกเกอร์สูงสุด</th><th>kWh</th><th>เบรกเกอร์</th></tr>' + rows + '</table></div>' + (S.sel ? vRackBrk() : '') + (S.hist ? vHist() : '');
}

function vRackBrk() {
  const o = S.d.racks[S.sel]; if (!o) return '';
  return '<h3>เบรกเกอร์ของ ' + esc(rn(S.sel)) + ' (' + o.src.length + ')</h3><div class="card sc"><table><tr><th>Source</th><th>เฟส</th><th>A</th><th>% Design</th><th>kW</th><th>สัดส่วนที่ Rack นี้ใช้</th></tr>' +
    o.src.map(b => '<tr class="cl" data-src="' + esc(b.id) + '"><td>' + esc(b.id) + '</td><td>' + b.phase + '</td><td>' + fmt(b.a, 2) + '</td><td>' + pctPill(b.pct) + '</td><td>' + fmt(b.kw, 2) + '</td><td>' + (b.k < 1 ? '<span class="pill yl" title="หลาย Rack อ้างเบรกเกอร์นี้ร่วมกัน">' + fmt(b.k * 100, 0) + '%</span>' : '100%') + '</td></tr>').join('') +
    (o.miss.length ? '<tr><td colspan="6" class="mut">ไม่มีในไฟล์: ' + esc(o.miss.join(', ')) + '</td></tr>' : '') + '</table></div>';
}

function vHist() {
  const h = S.hist, r = h.rows; if (!r.length) return '<div class="card">ยังไม่มีประวัติ</div>';
  const W = 600, H = 90, mx = Math.max(...r.map(x => x.a), 0.001);
  const pts = r.map((x, i) => (r.length < 2 ? W / 2 : i / (r.length - 1) * W).toFixed(1) + ',' + (H - x.a / mx * (H - 8) - 4).toFixed(1)).join(' ');
  const lim_ = h.source_id ? '<line x1="0" x2="' + W + '" y1="' + (H - lim().limit / mx * (H - 8) - 4).toFixed(1) + '" y2="' + (H - lim().limit / mx * (H - 8) - 4).toFixed(1) + '" stroke="var(--rd)" stroke-dasharray="4 4"/>' : '';
  return '<h3>แนวโน้มกระแส (A) — ' + esc(h.source_id || rn(h.rack_id)) + ' (' + r.length + ' วัน)</h3><div class="card"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="90" role="img" aria-label="แนวโน้มกระแส">' + (mx >= lim().limit * 0.7 ? lim_ : '') + '<polyline fill="none" stroke="var(--dual)" stroke-width="2" points="' + pts + '"/></svg>' +
    '<div class="mut">' + r[0].date + ' → ' + r[r.length - 1].date + ' · ต่ำสุด ' + fmt(Math.min(...r.map(x => x.a)), 2) + ' · สูงสุด ' + fmt(mx, 2) + ' · ล่าสุด ' + fmt(r[r.length - 1].a, 2) + ' A (' + fmt(r[r.length - 1].kw, 2) + ' kW)' + (h.source_id ? ' · เส้นประ = Design ' + lim().limit + ' A' : '') + '</div></div>';
}

function vUp() {
  if (!canEdit()) return '<div class="card">บัญชีนี้ไม่มีสิทธิ์อัปโหลด (ต้องเป็น editor / admin)</div>';
  const u = S.up;
  let h = '<div class="drop"><p><b>ลากไฟล์มาวางที่นี่ หรือเลือกไฟล์ของเช้านี้</b></p><input type="file" multiple accept=".csv,.zip,text/csv" data-file><p class="mut">ใช้ไฟล์ RPP_ALL_….csv ได้เลย หรือเลือก .zip / เลือกหลายไฟล์ (เช่น รวมไฟล์ MDB) ระบบหยิบเฉพาะ RPP_ALL ให้<br>ตรวจให้ดูก่อน ยังไม่บันทึกจนกว่าจะกดยืนยัน · อัปซ้ำวันเดิมได้ (เขียนทับของวันนั้น)</p></div>';
  if (!u) return h;
  if (u.error) return h + '<div class="err">' + esc(u.error) + '</div>';
  const s = u.summary, p = s.prev_site, dl = p && p.kw > 0 ? (s.site.kw - p.kw) / p.kw * 100 : null;
  h += '<h3>ผลตรวจไฟล์ ' + esc(u.name) + '</h3><div class="grid">' +
    '<div class="card"><div class="mut">เวลาในไฟล์</div><div class="big" style="font-size:18px">' + thTs(s.ts) + '</div><div class="mut">ครั้งก่อน ' + thTs(s.prev_ts) + '</div></div>' +
    '<div class="card"><div class="mut">รวมทั้งไซต์</div><div class="big">' + fmt(s.site.kw) + ' kW</div><div>' + fmt(s.site.a) + ' A · ' + s.n_sources + ' เบรกเกอร์' + (dl == null ? '' : ' · <span class="' + (Math.abs(dl) > 15 ? 'yl' : '') + '">' + (dl > 0 ? '+' : '') + fmt(dl) + '% จากครั้งก่อน</span>') + '</div></div>' +
    '<div class="card"><div class="mut">เบรกเกอร์โหลดสูงสุด</div>' + (s.top_breakers || []).slice(0, 3).map(x => '<div>' + esc(x.source_id) + ' <b>' + fmt(x.a, 2) + ' A</b> ' + pctPill(x.pct) + '</div>').join('') + '<div class="mut">Rack ที่โยงได้ ' + s.racks_with_power + ' · โหลดไม่มีเจ้าของ ' + fmt(s.unassigned.kw) + ' kW</div></div></div>';
  if (s.over_crit || s.over_warn) h += '<div class="' + (s.over_crit ? 'err' : 'warn') + '"><b>เบรกเกอร์เกินเกณฑ์ Design:</b> ' + s.over_crit + ' เกิน · ' + s.over_warn + ' ใกล้เกิน' + (s.over_top && s.over_top.length ? '<br>' + s.over_top.map(x => esc(x.source_id) + ' ' + fmt(x.a, 2) + ' A (' + fmt(x.pct, 0) + '%)').join(' · ') : '') + '</div>';
  if (s.skipped.length) h += '<p class="mut">ข้ามอุปกรณ์ที่ไม่มีข้อมูลเลย: ' + esc(s.skipped.join(', ')) + '</p>';
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

/** หยิบไฟล์ RPP_ALL จากสิ่งที่เลือก (csv ตรง ๆ / อยู่ใน zip / ปนกับไฟล์อื่น) */
async function pickCsv(list) {
  const fs = Array.from(list);
  for (const f of fs) {
    if (/\.zip$/i.test(f.name)) {
      await loadJSZip();
      const z = await window.JSZip.loadAsync(f), e = Object.values(z.files).find(x => !x.dir && /RPP_ALL.*\.csv$/i.test(x.name));
      if (e) return { name: e.name.split('/').pop(), text: await e.async('string') };
    } else if (/RPP_ALL.*\.csv$/i.test(f.name)) return { name: f.name, text: await f.text() };
  }
  const one = fs.length === 1 && /\.csv$/i.test(fs[0].name) ? fs[0] : null;     // ชื่อไฟล์ถูกเปลี่ยน แต่เลือกมาไฟล์เดียว → ลองอ่านดู
  if (one) return { name: one.name, text: await one.text() };
  throw new Error('ไม่พบไฟล์ RPP_ALL_*.csv ในที่เลือก');
}

async function check(list) {
  S.busy = true; S.up = null; S.err = ''; S.ok = ''; paint();
  try {
    const f = await pickCsv(list);
    if (f.text.length > 8e6) throw new Error('ไฟล์ใหญ่เกินไป (' + Math.round(f.text.length / 1e6) + ' MB) — ใช่ไฟล์ RPP_ALL หรือไม่?');
    const j = await api({ action: 'save_power', csv: f.text, dry_run: true });
    S.up = j.ok ? { name: f.name, csv: f.text, summary: j.summary } : { error: j.reason || 'ตรวจไฟล์ไม่ผ่าน' };
  } catch (e) { S.up = { error: e.message || String(e) }; }
  S.busy = false; paint();
}

async function save() {
  const u = S.up; if (!u || !u.summary) return;
  S.busy = true; paint();
  try {
    const j = await api({ action: 'save_power', csv: u.csv, filename: u.name, force: u.summary.problems.length > 0 });
    if (!j.ok) throw new Error(j.reason || 'บันทึกไม่สำเร็จ');
    S.up = null; S.hist = null; S.sel = null; S.tab = 'sum'; S.d = null; await load(); S.ok = 'บันทึกข้อมูล ณ ' + thTs(j.summary && j.summary.ts) + ' เรียบร้อย'; paint();
  } catch (e) { S.up = Object.assign({}, u, { summary: u.summary }); S.err = e.message || String(e); S.busy = false; paint(); }
}

// ───────────────────────── API สำหรับแปะในหน้า Rack ─────────────────────────
window.RackPower = {
  open,
  badge(rackId) {
    const o = S.d && S.d.racks && S.d.racks[rackId];
    if (!o) return '';
    return '<span class="pill ' + lvlCls(o.max && o.max.pct) + '" title="' + o.src.map(b => b.id + ' ' + fmt(b.a, 2) + ' A').join(' · ') + '">⚡ ' + fmt(o.kw, 2) + ' kW · ' + fmt(o.a) + ' A</span>';
  },
  ensure: async () => { if (!S.d) { try { const j = await api({ action: 'get_power' }); if (j.ok) S.d = j; } catch (e) { /* ignore */ } } return S.d; },
};

let tries = 0;
(function wait() { if (window.RackAPI) mount(); else if (tries++ < 100) setTimeout(wait, 100); })();
})();
