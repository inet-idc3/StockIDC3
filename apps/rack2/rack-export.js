/* ════════════════════════════════════════════════════════════════
 *  Face Rack — Export (ส่วนเสริม)
 *  เพิ่มปุ่ม Excel / PDF ในหน้า #rack/<id> เพื่อ Export Face Rack ของ Rack นั้น
 *   - Excel : ชีต "Face Rack" วาดตู้ 42U เหมือนหน้าตาจริง + ชีต "รายการเครื่อง"
 *   - PDF   : รายงาน A4 (หน้า 1 ภาพตู้ + สรุป, หน้าถัดไปตารางเครื่อง)
 *  - ใช้ร่วมกันได้ทั้ง Phase 1 (rack/) และ Phase 2 (rack2/) — อ่านข้อมูลจาก R/byId/STL/imp ของหน้าหลัก
 *  - ไม่แก้ข้อมูล ไม่ยุ่งกับระบบแก้ไข · PDF วาดด้วย Canvas เอง (ไม่ต้องโหลดไลบรารีเพิ่ม)
 *  - ใส่ <script src="rack-export.js"></script> ต่อท้าย rack3d.js
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
if (window.__rackExport) return; window.__rackExport = 1;

const NU = 42;
const OFF_RE = /ไม่\s*ON/i;                       // Phase 1 = "ไม่ ON" · Phase 2 = "วางเครื่องไม่ ON"
const NOSRC = 'ไม่ได้เสียบ Source Power';

/* ───────────────────────── ข้อมูล (model) ───────────────────────── */
const kindOf = p => p === 'Single' ? 'S' : p === 'Dual' ? 'D' : OFF_RE.test(p || '') ? 'O' : 'X';
const natural = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });

function model(r) {
  const occ = new Array(NU + 2).fill(-1);
  const devs = (r.dv || []).map((v, i) => {
    let top = Math.min(NU, Math.max(1, +v[0] || NU)), bot = Math.max(1, +v[1] || top);   // เหมือนที่หน้าเว็บวาด
    if (bot > top) [top, bot] = [bot, top];
    const pw = String(v[3] == null ? '' : v[3]);
    return {
      i, name: String(v[2] == null ? '' : v[2]), pw, k: kindOf(pw), top, bot, size: top - bot + 1,
      ups: String(v[4] || '').split(',').map(s => s.trim()).filter(Boolean),
      rpp: String(v[11] || v[5] || '').trim(), vt: top, vb: bot, hidden: false, clip: false
    };
  });
  // กันเครื่องที่ช่อง U ซ้อนกัน (ข้อมูลเก่า) — แสดงเฉพาะส่วนที่ว่าง
  let overlap = 0;
  devs.map((d, i) => i).sort((a, b) => devs[b].top - devs[a].top || devs[a].bot - devs[b].bot || a - b).forEach(i => {
    const d = devs[i]; let best = null, cur = null;
    for (let u = d.top; u >= d.bot; u--) {
      if (occ[u] < 0) { if (!cur) cur = { t: u, b: u }; else cur.b = u; }
      else if (cur) { if (!best || cur.t - cur.b > best.t - best.b) best = cur; cur = null; }
    }
    if (cur && (!best || cur.t - cur.b > best.t - best.b)) best = cur;
    if (!best) { d.hidden = true; overlap++; return; }
    d.vt = best.t; d.vb = best.b; d.clip = best.t !== d.top || best.b !== d.bot; if (d.clip) overlap++;
    for (let u = d.vt; u >= d.vb; u--) occ[u] = i;
  });
  let used = 0; for (let u = 1; u <= NU; u++) if (occ[u] >= 0) used++;
  const runs = []; { let cur = null; for (let u = NU; u >= 1; u--) { if (occ[u] < 0) { if (!cur) cur = { t: u, b: u }; else cur.b = u; } else if (cur) { runs.push(cur); cur = null; } } if (cur) runs.push(cur); }
  const cnt = k => devs.filter(d => d.k === k).length;
  const feed = {}; let noSrc = 0;
  devs.forEach(d => { if (d.k !== 'S' && d.k !== 'D') return; if (!d.ups.length) { noSrc++; return; } d.ups.forEach(u => { (feed[u] ??= { S: 0, D: 0 })[d.k]++; }); });
  const sorted = devs.slice().sort((a, b) => b.top - a.top || b.bot - a.bot || a.i - b.i);

  let stLabel = '', stCls = '';
  try { const base = STL[r.st](r); stLabel = r.st === 'use' ? base : base + (r.sr && r.sr != base ? ' (' + r.sr + ')' : ''); } catch (_) { stLabel = r.st || ''; }
  try { stCls = r.st === 'use' ? imp(r) : r.st; } catch (_) { stCls = r.st || ''; }
  const now = new Date(), p2 = n => String(n).padStart(2, '0');
  const ymd = now.getFullYear() + p2(now.getMonth() + 1) + p2(now.getDate());
  const idTxt = String(r.id || r.name || 'RACK').replace(/[^A-Za-z0-9]+/g, '').slice(0, 12).toUpperCase() || 'RACK';
  return {
    r, devs, sorted, occ, runs, used, free: NU - used, overlap, nS: cnt('S'), nD: cnt('D'), nO: cnt('O'), nX: cnt('X'),
    feed, feedIds: Object.keys(feed).sort(natural), noSrc, stLabel, stCls,
    brand: (document.title || 'IDC3 Face Rack').replace(/\s*Face Rack\s*$/i, '').trim() || 'IDC3',
    when: now.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    docNo: 'FR-' + idTxt + '-' + ymd, ymd: now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate()),
    cust: (r.c && r.c !== 'Rack ว่าง' && r.c !== '(ไม่ระบุ)') ? String(r.c) : '-',
    zr: [r.zone, r.row].filter(Boolean).join(' / ') || '-',
    rackNo: r.n != null && r.n !== '' ? String(r.n) : '-', lb: r.lb ? String(r.lb) : '',
    note: String(r.note || '').trim()
  };
}
const uTxt = (t, b) => t === b ? 'U' + t : 'U' + b + '–' + t;
const pwLabel = d => d.k === 'S' ? 'Single' : d.k === 'D' ? 'Dual' : (d.pw || '-');
const upsTxt = d => d.ups.length ? d.ups.map(u => 'UPS-' + u).join(', ') : (d.k === 'S' || d.k === 'D') ? NOSRC : '-';
const upsShort = d => d.ups.length ? 'UPS-' + d.ups.join(', ') : (d.k === 'S' || d.k === 'D') ? NOSRC : '-';
const safeName = s => String(s || 'rack').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || 'rack';

/* สีสถานะ Rack (ใช้ในทั้ง Excel และ PDF) */
const ST = {
  r: { bg: 'FDE2E4', fg: 'B42318', dot: '#F2727B' }, y: { bg: 'FFF3C4', fg: '8A6100', dot: '#E8C766' },
  g: { bg: 'D9F5E8', fg: '0B6B47', dot: '#4CD6A0' }, nu: { bg: 'DCE6FF', fg: '1F3A8A', dot: '#7AA8FF' },
  empty: { bg: 'E9EDF6', fg: '4A5875', dot: '#9AA6C4' }, cage: { bg: 'E9EDF6', fg: '4A5875', dot: '#9AA6C4' },
  off: { bg: 'DCE6FF', fg: '1F3A8A', dot: '#7AA8FF' }
};
const stOf = m => ST[m.stCls] || ST.nu;

/* ───────────────────────── Excel ───────────────────────── */
const loadExcel = () => {
  try { if (typeof loadX === 'function') return loadX(); } catch (_) { /* ใช้ตัวโหลดสำรองด้านล่าง */ }
  return window.ExcelJS ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload = ok; s.onerror = () => no(new Error('โหลดตัวสร้าง Excel ไม่ได้ ตรวจสอบอินเทอร์เน็ต')); document.head.appendChild(s);
  });
};
const XF = 'Tahoma';
const xfill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c } });
const xfont = (sz, c, b) => ({ name: XF, size: sz, bold: !!b, color: { argb: 'FF' + c } });
const xb = (c, st = 'thin') => ({ style: st, color: { argb: 'FF' + c } });
const xbox = (c, st) => ({ top: xb(c, st), left: xb(c, st), bottom: xb(c, st), right: xb(c, st) });
/* เขียนค่า+สไตล์ที่เซลล์หลัก แล้วค่อย merge (ExcelJS จะคัดลอกสไตล์ไปทั้งช่วง) */
function blk(ws, r1, c1, r2, c2, value, o = {}) {
  const x = ws.getCell(r1, c1);
  x.value = value;
  if (o.bg) x.fill = xfill(o.bg);
  x.font = o.font || xfont(o.sz || 10, o.fg || '14213D', o.b);
  x.alignment = { vertical: o.v || 'middle', horizontal: o.h || 'left', wrapText: !!o.w, shrinkToFit: !!o.s, indent: o.ind || 0 };
  if (o.bd) x.border = o.bd;
  if (r2 > r1 || c2 > c1) ws.mergeCells(r1, c1, r2, c2);
  return x;
}

/* สีของเครื่องบนภาพตู้: base = ตัวเครื่อง · seg = ช่อง Power/UPS · ear = หูตู้ · fg = ตัวอักษร · sub = ตัวอักษรรอง */
const DEV = {
  D: { base: '1FA67A', seg: '188F69', ear: '0F6F51', fg: 'FFFFFF', sub: 'D5F7EA', line: '0A5A42' },
  S: { base: 'D6434F', seg: 'BE3743', ear: '9C2A35', fg: 'FFFFFF', sub: 'FFE0E3', line: '7E1F28' },
  O: { base: '16254F', seg: '16254F', ear: '0F1A3B', fg: 'B5CCFF', sub: '8DA9E6', line: '6C9FFF' },
  X: { base: '4B566F', seg: '404A62', ear: '30384B', fg: 'EEF2FB', sub: 'C3CCE0', line: '2B3345' }
};

function sheetFace(wb, m) {
  const r = m.r, S = stOf(m);
  const ws = wb.addWorksheet('Face Rack', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, horizontalCentered: true, margins: { left: .3, right: .3, top: .35, bottom: .35, header: .15, footer: .15 } }
  });
  [2.4, 5, 1.8, 44, 12, 15, 1.8, 5, 2.4].forEach((w, i) => ws.getColumn(i + 1).width = w);
  const NAVY = '0A1230', NAVY2 = '12306B', N = 9;
  // ── หัวรายงาน
  blk(ws, 1, 1, 1, N, r.name, { bg: NAVY, sz: 22, fg: 'FFFFFF', b: 1, ind: 1 }); ws.getRow(1).height = 42;
  const sub = [m.cust !== '-' ? m.cust : null, m.zr !== '-' ? m.zr : null, 'Rack ' + m.rackNo + (m.lb ? ' (' + m.lb + ')' : '')].filter(Boolean).join('   |   ');
  blk(ws, 2, 1, 2, N, sub, { bg: NAVY2, sz: 11, fg: 'FFFFFF', b: 1, ind: 1 }); ws.getRow(2).height = 22;
  blk(ws, 3, 1, 3, N, m.brand + ' · Face Rack (มุมมองด้านหน้า 42U) · สร้างเมื่อ ' + m.when, { bg: NAVY2, sz: 9, fg: 'A9B8DD', ind: 1 }); ws.getRow(3).height = 17;
  blk(ws, 4, 1, 4, N, 'สถานะ: ' + m.stLabel, { bg: S.bg, sz: 11, fg: S.fg, b: 1, ind: 1 }); ws.getRow(4).height = 24;
  const rt = (t, c) => ({ text: t, font: xfont(10, c, 1) }), tt = t => ({ text: t, font: xfont(10, 'DCE6FF') });
  blk(ws, 5, 1, 5, N, {
    richText: [rt('● ', 'DCE6FF'), tt('เครื่องทั้งหมด ' + m.devs.length + '     '), rt('● ', 'F2727B'), tt('Single ' + m.nS + '     '), rt('● ', '4CD6A0'), tt('Dual ' + m.nD + '     '),
      rt('● ', '7AA8FF'), tt('U ใช้งาน ' + m.used + '/' + NU + '     '), rt('● ', '9AA6C4'), tt('ว่าง ' + m.free + ' U')]
  }, { bg: '0F1A3A', ind: 1 }); ws.getRow(5).height = 24;
  ws.getRow(6).height = 8;
  // ── ตู้ Rack
  const CAP = '323A4D', R0 = 8, rowOf = u => R0 + (NU - u), END = R0 + NU;
  blk(ws, 7, 1, 7, N, 'FRONT VIEW  ·  ' + NU + 'U', { bg: CAP, sz: 8, fg: 'AEB9D3', b: 1, h: 'center', bd: { bottom: xb('0A0F1F', 'medium') } }); ws.getRow(7).height = 15;
  const EMP = '0E1320', GRID = '1B2336';
  for (let u = NU; u >= 1; u--) {
    const row = rowOf(u); ws.getRow(row).height = 19.5;
    const rail = { bg: '2A3040', sz: 7, fg: '7C88A3', h: 'center' };
    blk(ws, row, 1, row, 1, '•', { ...rail, bd: { bottom: xb('1B2030') } }); blk(ws, row, 9, row, 9, '•', { ...rail, bd: { bottom: xb('1B2030') } });
    const un = { bg: '161B28', sz: 8, fg: 'D5DEF3', b: 1, h: 'center', bd: { bottom: xb('0F1320') } };
    blk(ws, row, 2, row, 2, u, un); blk(ws, row, 8, row, 8, u, un);
    if (m.occ[u] < 0) {   // ช่องว่าง
      const run = m.runs.find(x => u <= x.t && u >= x.b), mid = run && run.t - run.b + 1 >= 3 && u === Math.floor((run.t + run.b) / 2);
      blk(ws, row, 3, row, 3, '', { bg: EMP, bd: { bottom: xb(GRID) } }); blk(ws, row, 7, row, 7, '', { bg: EMP, bd: { bottom: xb(GRID) } });
      blk(ws, row, 4, row, 6, mid ? 'ว่าง ' + (run.t - run.b + 1) + ' U' : '', { bg: EMP, sz: 8, fg: '56648A', h: 'center', bd: { bottom: xb(GRID) } });
    }
  }
  m.devs.forEach(d => {
    if (d.hidden) return;
    const c = DEV[d.k], r1 = rowOf(d.vt), r2 = rowOf(d.vb), tall = r2 > r1;
    const bd = d.k === 'O' ? xbox(c.line, 'dashed') : { top: xb(c.line), bottom: xb(c.line), left: xb(c.line), right: xb(c.line) };
    blk(ws, r1, 3, r2, 3, '', { bg: c.ear, bd }); blk(ws, r1, 7, r2, 7, '', { bg: c.ear, bd });
    const extra = tall ? '\n' + uTxt(d.vt, d.vb) + ' · ' + (d.vt - d.vb + 1) + 'U' + (d.clip ? ' (ซ้อนทับ)' : '') : '';
    const nameV = tall ? { richText: [{ text: d.name || '(ไม่มีชื่อ)', font: xfont(10, c.fg, 1) }, { text: extra, font: xfont(8, c.sub) }] } : (d.name || '(ไม่มีชื่อ)');
    blk(ws, r1, 4, r2, 4, nameV, { bg: c.base, sz: 9.5, fg: c.fg, b: 1, w: tall, s: !tall, ind: 1, bd });
    const led = d.k === 'S' || d.k === 'D' ? '● ' : '';
    blk(ws, r1, 5, r2, 5, led + pwLabel(d), { bg: c.seg, sz: 9, fg: c.fg, b: 1, h: 'center', s: true, bd });
    const ut = d.ups.length ? d.ups.map(u => 'UPS-' + u).join(tall ? '\n' : ' / ') : (d.k === 'S' || d.k === 'D') ? NOSRC : '–';
    blk(ws, r1, 6, r2, 6, ut, { bg: c.seg, sz: 8.5, fg: c.sub, h: 'center', w: tall, s: !tall, bd });
  });
  blk(ws, END, 1, END, N, '', { bg: CAP, bd: { top: xb('0A0F1F', 'medium') } }); ws.getRow(END).height = 12;
  ws.getRow(END + 1).height = 8;
  // ── คำอธิบายสี + หมายเหตุ
  const LG = END + 2; ws.getRow(LG).height = 22;
  const lgd = (c1, c2, t, k) => blk(ws, LG, c1, LG, c2, t, { bg: DEV[k].base, sz: 9, fg: DEV[k].fg, b: 1, h: 'center', s: true, bd: k === 'O' ? xbox(DEV.O.line, 'dashed') : xbox(DEV[k].line) });
  lgd(2, 4, '● Dual', 'D'); lgd(5, 5, '● Single', 'S'); lgd(6, 6, 'ไม่ ON', 'O'); blk(ws, LG, 7, LG, 9, 'ว่าง', { bg: EMP, sz: 8, fg: '8E9BC0', h: 'center', bd: xbox(GRID) });
  let nr = LG + 2;
  const note = (t, fg, bg) => { blk(ws, nr, 1, nr, N, t, { bg, sz: 9, fg, w: true, ind: 1, v: 'top' }); ws.getRow(nr).height = Math.max(18, 14 * Math.ceil(t.length / 78) + 6); nr++; };
  if (m.note) note('หมายเหตุ: ' + m.note, '4A5875', 'EEF2FB');
  if (m.overlap) note('⚠ พบเครื่องที่ช่อง U ซ้อนทับกัน ' + m.overlap + ' รายการ — ภาพแสดงเฉพาะส่วนที่ไม่ซ้อน (ดูตำแหน่งจริงในชีต "รายการเครื่อง")', '8A6100', 'FFF3C4');
  ws.pageSetup.printArea = 'A1:I' + (nr - 1);
}

function sheetList(wb, m) {
  const r = m.r, S = stOf(m);
  const ws = wb.addWorksheet('รายการเครื่อง', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .35, right: .35, top: .4, bottom: .4, header: .15, footer: .15 } }
  });
  [6, 13, 9, 46, 14, 26, 36].forEach((w, i) => ws.getColumn(i + 1).width = w);
  const N = 7, BD = xbox('C9D2E6'), HDR = { bg: '1F3A8A', fg: 'FFFFFF', b: 1, h: 'center', bd: BD, sz: 10 };
  blk(ws, 1, 1, 1, N, 'รายการเครื่องใน ' + r.name, { bg: '0A1230', sz: 16, fg: 'FFFFFF', b: 1, ind: 1 }); ws.getRow(1).height = 34;
  blk(ws, 2, 1, 2, N, m.brand + ' · Face Rack · สร้างเมื่อ ' + m.when + ' · เอกสารเลขที่ ' + m.docNo, { bg: '12306B', sz: 9, fg: 'A9B8DD', ind: 1 }); ws.getRow(2).height = 20;
  // สรุป Rack
  let row = 4;
  const kv = (k, v, o = {}) => { blk(ws, row, 1, row, 3, k, { bg: 'EEF2FB', b: 1, bd: BD, ind: 1, sz: 10 }); blk(ws, row, 4, row, 5, v, { bd: BD, ind: 1, sz: 10, ...o }); ws.getRow(row).height = 21; row++; };
  kv('ลูกค้า', m.cust, { b: 1 }); kv('Zone / Row', m.zr); kv('Rack', m.rackNo + (m.lb ? ' (' + m.lb + ')' : ''));
  kv('สถานะ', m.stLabel, { bg: S.bg, fg: S.fg, b: 1 });
  kv('เครื่องทั้งหมด', m.devs.length + ' เครื่อง', { b: 1 });
  kv('Single', m.nS, { fg: m.nS ? 'B42318' : '14213D', b: !!m.nS }); kv('Dual', m.nD, { fg: m.nD ? '0B6B47' : '14213D', b: !!m.nD });
  if (m.nO) kv('ไม่ ON', m.nO); if (m.nX) kv('อื่น ๆ', m.nX);
  kv('U ใช้งาน', m.used + ' / ' + NU + ' U (' + Math.round(m.used / NU * 100) + '%)'); kv('U ว่าง', m.free + ' U');
  if (m.note) { blk(ws, row, 1, row, 3, 'หมายเหตุ', { bg: 'EEF2FB', b: 1, bd: BD, ind: 1, sz: 10, v: 'top' }); blk(ws, row, 4, row, N, m.note, { bd: BD, ind: 1, sz: 10, w: true, v: 'top' }); ws.getRow(row).height = Math.max(21, 15 * Math.ceil(m.note.length / 85) + 6); row++; }
  row++;
  // ตารางเครื่อง
  blk(ws, row, 1, row, N, 'รายการเครื่อง (เรียงจาก U บนลงล่าง)', { bg: 'DCE6FF', fg: '1F3A8A', b: 1, sz: 12, ind: 1 }); ws.getRow(row).height = 26; row++;
  const hr = row; ['ลำดับ', 'ตำแหน่ง U', 'ขนาด (U)', 'ชื่อเครื่อง', 'Power', 'UPS (Source)', 'RPP / ปลั๊ก'].forEach((t, i) => blk(ws, hr, i + 1, hr, i + 1, t, HDR)); ws.getRow(hr).height = 26; row++;
  const PWC = { S: { bg: 'FDE2E4', fg: 'B42318' }, D: { bg: 'D9F5E8', fg: '0B6B47' }, O: { bg: 'DCE6FF', fg: '1F3A8A' }, X: { bg: 'EEF2FB', fg: '5B6C91' } };
  if (!m.sorted.length) { blk(ws, row, 1, row, N, 'ยังไม่มีเครื่องใน Rack นี้', { fg: '5B6C91', h: 'center', bd: BD }); ws.getRow(row).height = 24; row++; }
  m.sorted.forEach((d, i) => {
    const z = i % 2 ? 'F7F9FD' : 'FFFFFF', pc = PWC[d.k]; ws.getRow(row).height = 21;
    blk(ws, row, 1, row, 1, i + 1, { bg: z, bd: BD, h: 'center' });
    blk(ws, row, 2, row, 2, uTxt(d.top, d.bot), { bg: z, bd: BD, h: 'center', b: 1 });
    blk(ws, row, 3, row, 3, d.size, { bg: z, bd: BD, h: 'center' });
    blk(ws, row, 4, row, 4, d.name || '(ไม่มีชื่อ)', { bg: z, bd: BD, ind: 1, b: 1, w: true });
    blk(ws, row, 5, row, 5, pwLabel(d), { bg: pc.bg, fg: pc.fg, b: 1, bd: BD, h: 'center', s: true });
    blk(ws, row, 6, row, 6, upsTxt(d), { bg: z, bd: BD, ind: 1, s: true, fg: d.ups.length || (d.k !== 'S' && d.k !== 'D') ? '14213D' : '8A6100' });
    blk(ws, row, 7, row, 7, d.rpp || '-', { bg: z, bd: BD, ind: 1, w: true, fg: d.rpp ? '14213D' : '9AA6C4' });
    row++;
  });
  if (m.sorted.length) ws.autoFilter = { from: { row: hr, column: 1 }, to: { row: row - 1, column: N } };
  row++;
  // สรุปตาม UPS
  if (m.feedIds.length || m.noSrc) {
    blk(ws, row, 1, row, N, 'สรุปตามแหล่งไฟ UPS', { bg: 'DCE6FF', fg: '1F3A8A', b: 1, sz: 12, ind: 1 }); ws.getRow(row).height = 26; row++;
    blk(ws, row, 1, row, 3, 'UPS', HDR); blk(ws, row, 4, row, 4, 'จำนวนเครื่องทั้งหมด', HDR); blk(ws, row, 5, row, 5, 'Single', HDR); blk(ws, row, 6, row, 6, 'Dual', HDR); ws.getRow(row).height = 24; row++;
    m.feedIds.forEach(u => { const f = m.feed[u]; ws.getRow(row).height = 21;
      blk(ws, row, 1, row, 3, 'UPS-' + u, { bd: BD, b: 1, ind: 1 }); blk(ws, row, 4, row, 4, f.S + f.D, { bd: BD, h: 'center' });
      blk(ws, row, 5, row, 5, f.S, { bd: BD, h: 'center', fg: f.S ? 'B42318' : '14213D', b: !!f.S }); blk(ws, row, 6, row, 6, f.D, { bd: BD, h: 'center', fg: f.D ? '0B6B47' : '14213D', b: !!f.D }); row++; });
    if (m.noSrc) { ws.getRow(row).height = 21; blk(ws, row, 1, row, 3, NOSRC, { bd: BD, ind: 1, fg: '8A6100', b: 1, bg: 'FFF3C4', s: true }); blk(ws, row, 4, row, 4, m.noSrc, { bd: BD, h: 'center', bg: 'FFF3C4', fg: '8A6100', b: 1 }); blk(ws, row, 5, row, 6, '', { bd: BD, bg: 'FFF3C4' }); row++; }
  }
}

async function buildXlsx(m) {
  await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IDC3 Face Rack'; wb.created = new Date(); wb.title = 'Face Rack ' + m.r.name;
  sheetFace(wb, m); sheetList(wb, m);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/* ───────────────────────── PDF (วาดด้วย Canvas → JPEG → ประกอบเป็น PDF) ───────────────────────── */
const PW = 794, PH = 1123, SC = 2.5;                 // A4 @96dpi × 2.5 ≈ 240dpi
const TH = '"IBM Plex Sans Thai","Anuphan","Sarabun",Tahoma,"Noto Sans Thai",sans-serif';
const LA = '"Plus Jakarta Sans","IBM Plex Sans Thai",Tahoma,sans-serif';
const fnt = (w, s, f) => w + ' ' + s + 'px ' + (f || TH);

const gr = (() => { try { const sg = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); return s => [...sg.segment(s)].map(x => x.segment); } catch (_) { return s => Array.from(s); } })();
const wordSeg = (() => { try { const sg = new Intl.Segmenter('th', { granularity: 'word' }); return s => [...sg.segment(s)].map(x => x.segment); } catch (_) { return s => s.split(/(\s+)/).filter(Boolean); } })();

function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function lg(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function fitTxt(c, s, maxW) {
  s = String(s == null ? '' : s); if (c.measureText(s).width <= maxW) return s;
  const g = gr(s); let lo = 0, hi = g.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (c.measureText(g.slice(0, mid).join('') + '…').width <= maxW) lo = mid; else hi = mid - 1; }
  return g.slice(0, lo).join('').trimEnd() + '…';
}
/* วาดข้อความบรรทัดเดียว (ตัดด้วย … เมื่อยาวเกิน) */
function tx(c, s, x, y, o = {}) {
  c.save(); c.font = o.f || fnt(400, 12); c.fillStyle = o.c || '#14213D'; c.textAlign = o.a || 'left'; c.textBaseline = o.b || 'middle';
  if (o.al != null) c.globalAlpha = o.al;
  c.fillText(o.w ? fitTxt(c, s, o.w) : String(s == null ? '' : s), x, y); c.restore();
}
function tw(c, s, f) { c.save(); c.font = f; const w = c.measureText(String(s)).width; c.restore(); return w; }
function wrapLines(c, s, maxW, maxLines) {
  c.save(); c.font = c.font; const out = []; let cur = '';
  wordSeg(String(s).replace(/\s+/g, ' ')).forEach(w => {
    if (c.measureText(cur + w).width <= maxW || !cur) cur += w; else { out.push(cur.trim()); cur = w.trimStart(); }
  });
  if (cur.trim()) out.push(cur.trim());
  c.restore();
  if (out.length > maxLines) { const k = out.slice(0, maxLines); k[maxLines - 1] = fitTxt(c, out.slice(maxLines - 1).join(' ') + ' ', maxW - 4).replace(/…?$/, '…'); return k; }
  return out;
}
function card(c, x, y, w, h, o = {}) {
  c.save();
  if (o.sh !== false) { c.shadowColor = 'rgba(10,18,48,.10)'; c.shadowBlur = 14 * SC; c.shadowOffsetY = 4 * SC; }
  rr(c, x, y, w, h, o.r == null ? 12 : o.r); c.fillStyle = o.fill || '#FFFFFF'; c.fill(); c.restore();
  c.save(); c.lineWidth = 1; c.strokeStyle = o.stroke || '#DCE4F2'; rr(c, x + .5, y + .5, w - 1, h - 1, o.r == null ? 12 : o.r); c.stroke(); c.restore();
}
function grid(c, x, y, w, h, step, col) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = col; c.lineWidth = .6; c.beginPath();
  for (let gx = x + step; gx < x + w; gx += step) { c.moveTo(gx, y); c.lineTo(gx, y + h); }
  for (let gy = y + step; gy < y + h; gy += step) { c.moveTo(x, gy); c.lineTo(x + w, gy); }
  c.stroke(); c.restore();
}
function brandMark(c, x, y, s) {
  c.save(); rr(c, x, y, s, s, s * .28); c.fillStyle = lg(c, x, y, x + s, y + s, [[0, '#7FAAFF'], [1, '#2F5FDC']]); c.fill();
  c.fillStyle = '#fff'; const bw = s * .56, bx = x + (s - bw) / 2, bh = s * .17; rr(c, bx, y + s * .24, bw, bh, bh * .4); c.fill(); rr(c, bx, y + s * .59, bw, bh, bh * .4); c.fill();
  c.fillStyle = '#2F5FDC'; [y + s * .24 + bh / 2, y + s * .59 + bh / 2].forEach(cy => { c.beginPath(); c.arc(bx + bw * .16, cy, s * .035, 0, 7); c.fill(); }); c.restore();
}
const PK = { // สีบนหน้า PDF
  D: { a: '#43DBA8', b: '#16936D', ln: '#0B6B4E', fg: '#FFFFFF', sub: 'rgba(255,255,255,.82)', map: '#1FB584', pillBg: '#D9F5E8', pillFg: '#0B6B47' },
  S: { a: '#F68A92', b: '#CF3A47', ln: '#8E2A33', fg: '#FFFFFF', sub: 'rgba(255,255,255,.84)', map: '#E5484D', pillBg: '#FDE2E4', pillFg: '#B42318' },
  O: { a: 'rgba(108,159,255,.22)', b: 'rgba(108,159,255,.12)', ln: '#6C9FFF', fg: '#B5CCFF', sub: '#8DA9E6', map: '#8FB3FF', pillBg: '#DCE6FF', pillFg: '#1F3A8A' },
  X: { a: '#5D6A88', b: '#434E69', ln: '#2C3548', fg: '#EEF2FB', sub: '#C3CCE0', map: '#7A87A6', pillBg: '#EEF2FB', pillFg: '#5B6C91' }
};
const hexA = (h, a) => { const n = parseInt(h.replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

function pageFrame(c, m, pg, pgs) {
  c.fillStyle = '#F2F5FB'; c.fillRect(0, 0, PW, PH);
  c.strokeStyle = '#DCE4F2'; c.lineWidth = 1; c.beginPath(); c.moveTo(36, 1084.5); c.lineTo(PW - 36, 1084.5); c.stroke();
  tx(c, m.brand + ' · Face Rack', 36, 1100, { f: fnt(500, 9.5), c: '#6B7A99' });
  tx(c, m.docNo, PW / 2, 1100, { f: fnt(500, 9.5, LA), c: '#6B7A99', a: 'center' });
  tx(c, 'หน้า ' + pg + '/' + pgs, PW - 36, 1100, { f: fnt(500, 9.5), c: '#6B7A99', a: 'right' });
}

function headerBand(c, m, h, compact) {
  const g = lg(c, 0, 0, PW, h, [[0, '#07102A'], [.6, '#0E1F52'], [1, '#17387F']]);
  c.fillStyle = g; c.fillRect(0, 0, PW, h);
  grid(c, 0, 0, PW, h, 18, 'rgba(130,170,255,.07)');
  c.save(); c.beginPath(); c.rect(0, 0, PW, h); c.clip();
  const rg = c.createRadialGradient(PW - 80, -20, 10, PW - 80, -20, 360); rg.addColorStop(0, 'rgba(90,140,255,.38)'); rg.addColorStop(1, 'rgba(90,140,255,0)'); c.fillStyle = rg; c.fillRect(0, 0, PW, h);
  // ไม้บรรทัดสเกล (ติ๊กทุก 8.8px, ติ๊กยาวทุก 5 ช่อง) ตกแต่งขอบล่างหัวกระดาษ
  c.strokeStyle = 'rgba(150,185,255,.30)'; c.lineWidth = 1; c.beginPath();
  for (let i = 0, gx = 36; gx <= PW - 36; i++, gx += 8.8) { c.moveTo(gx, h - 4); c.lineTo(gx, h - (i % 5 === 0 ? 13 : 8)); }
  c.stroke();
  c.restore();
  c.fillStyle = lg(c, 0, 0, PW, 0, [[0, '#4D86FF'], [.55, '#4FD1E8'], [1, 'rgba(79,209,232,0)']]); c.fillRect(0, h - 3, PW, 3);
  brandMark(c, 36, 26, 30);
  tx(c, m.brand, 76, 35, { f: fnt(700, 14, LA), c: '#fff' });
  tx(c, compact ? 'รายการเครื่องใน Rack' : 'รายงาน Face Rack', 76, 54, { f: fnt(400, 11), c: '#9FB4E6' });
  tx(c, 'เอกสารเลขที่ ' + m.docNo, PW - 36, 35, { f: fnt(500, 10, LA), c: '#C9D6F5', a: 'right' });
  tx(c, m.when, PW - 36, 53, { f: fnt(400, 10.5), c: '#9FB4E6', a: 'right' });
}

function chip(c, text, x, y, h, kind, align) { // ป้ายสถานะ
  const col = ST[kind] || ST.nu; c.save(); c.font = fnt(600, 12.5); const w = c.measureText(text).width + 36; const x0 = align === 'right' ? x - w : x;
  rr(c, x0, y, w, h, h / 2); c.fillStyle = hexA(col.dot, .18); c.fill(); c.strokeStyle = hexA(col.dot, .7); c.lineWidth = 1; c.stroke();
  c.fillStyle = col.dot; c.shadowColor = col.dot; c.shadowBlur = 6 * SC; c.beginPath(); c.arc(x0 + 15, y + h / 2, 4, 0, 7); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(text, x0 + 27, y + h / 2 + .5); c.restore(); return w;
}

/* ภาพตู้ Rack 42U */
function drawRack(c, m, x, y, w) {
  const UH = 17.6, RAIL = 30, CAPH = 12, top = y + CAPH, ix = x + RAIL, iw = w - RAIL * 2, bodyH = NU * UH;
  // โครงตู้
  c.save(); rr(c, x, y, w, bodyH + CAPH * 2, 6); c.fillStyle = '#141A2B'; c.fill(); c.strokeStyle = '#46526F'; c.lineWidth = 1; c.stroke(); c.restore();
  [y, y + CAPH + bodyH].forEach((cy, i) => { c.save(); rr(c, x, cy, w, CAPH, 4); c.fillStyle = lg(c, 0, cy, 0, cy + CAPH, i ? [[0, '#2B344B'], [1, '#3A4663']] : [[0, '#3A4663'], [1, '#262E44']]); c.fill(); c.restore(); });
  // ในตู้ + ราง
  c.fillStyle = '#0A0F1F'; c.fillRect(ix, top, iw, bodyH);
  [[x, 0], [x + w - RAIL, 1]].forEach(([rx, right]) => { c.fillStyle = lg(c, rx, 0, rx + RAIL, 0, right ? [[0, '#1A2032'], [1, '#262E44']] : [[0, '#262E44'], [1, '#1A2032']]); c.fillRect(rx, top, RAIL, bodyH); });
  for (let u = NU; u >= 1; u--) {
    const yy = top + (NU - u) * UH, mid = yy + UH / 2;
    c.strokeStyle = 'rgba(255,255,255,.045)'; c.lineWidth = .6; c.beginPath(); c.moveTo(ix, yy + UH); c.lineTo(ix + iw, yy + UH); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(x, yy + UH); c.lineTo(x + RAIL, yy + UH); c.moveTo(x + w - RAIL, yy + UH); c.lineTo(x + w, yy + UH); c.stroke();
    const lab = { f: fnt(600, 7, LA), c: u % 5 === 0 || u === 1 ? '#C9D6F5' : '#8392B5' };
    tx(c, u, x + RAIL - 6, mid, { ...lab, a: 'right' }); tx(c, u, x + w - RAIL + 6, mid, { ...lab, a: 'left' });
    [[x + 8], [x + w - 8]].forEach(([hx]) => { c.fillStyle = '#05080F'; c.beginPath(); c.arc(hx, mid, 1.9, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = .6; c.stroke(); });
  }
  // ช่องว่าง: ป้ายบอกจำนวน U ว่าง (เฉพาะช่วงยาวตั้งแต่ 3U)
  m.runs.forEach(run => { const n = run.t - run.b + 1; if (n < 3) return; const cy = top + (NU - run.t) * UH + n * UH / 2; tx(c, 'ว่าง ' + n + ' U', ix + iw / 2, cy, { f: fnt(500, 9), c: '#8392B5', a: 'center', al: .75 }); });
  // เครื่อง
  m.devs.forEach(d => {
    if (d.hidden) return;
    const k = PK[d.k], yy = top + (NU - d.vt) * UH, h = (d.vt - d.vb + 1) * UH, n = d.vt - d.vb + 1;
    const ex = 7, bx = ix + ex, bw = iw - ex * 2, by = yy + 1, bh = h - 2;
    [[ix], [ix + iw - ex]].forEach(([ox]) => { c.fillStyle = lg(c, ox, 0, ox + ex, 0, [[0, '#39445E'], [1, '#232B40']]); c.fillRect(ox, yy + .5, ex, h - 1);
      for (let q = 0; q < Math.min(n, 2); q++) { const sy = q ? yy + h - UH / 2 : yy + UH / 2; c.fillStyle = '#0A0F1F'; c.beginPath(); c.arc(ox + ex / 2, sy, 1.5, 0, 7); c.fill(); } });
    c.save(); rr(c, bx, by, bw, bh, 3);
    if (d.k === 'O') { c.fillStyle = k.b; c.fill(); c.setLineDash([4, 3]); c.strokeStyle = k.ln; c.lineWidth = 1; c.stroke(); }
    else { c.fillStyle = lg(c, 0, by, 0, by + bh, [[0, k.a], [1, k.b]]); c.fill(); c.strokeStyle = k.ln; c.lineWidth = .8; c.stroke(); }
    c.restore();
    if (d.k !== 'O') { c.fillStyle = 'rgba(255,255,255,.30)'; c.fillRect(bx + 3, by + .8, bw - 6, .9); }
    const padX = 8, led = d.k === 'S' || d.k === 'D', pl = pwLabel(d), pf = fnt(700, 8, LA);
    const pwW = tw(c, pl, pf) + (led ? 12 : 0), nameMax = bw - padX * 2 - pwW - 8, nm = d.name || '(ไม่มีชื่อ)';
    if (n === 1) {
      tx(c, nm, bx + padX, by + bh / 2 + .3, { f: fnt(600, 9.3), c: k.fg, w: nameMax });
      if (led) { c.fillStyle = d.k === 'D' ? '#B6FFE6' : '#FFD0D4'; c.beginPath(); c.arc(bx + bw - padX - pwW + 3, by + bh / 2, 2.1, 0, 7); c.fill(); }
      tx(c, pl, bx + bw - padX, by + bh / 2 + .3, { f: pf, c: k.fg, a: 'right', w: 70 });
    } else {
      tx(c, nm, bx + padX, by + 9.5, { f: fnt(600, 10.4), c: k.fg, w: nameMax });
      const info = uTxt(d.vt, d.vb) + '  ·  ' + n + 'U' + (d.ups.length ? '  ·  UPS-' + d.ups.join(', ') : led ? '  ·  ' + NOSRC : '');
      tx(c, info, bx + padX, by + 22, { f: fnt(400, 8.3), c: k.sub, w: bw - padX * 2 });
      if (led) { c.fillStyle = d.k === 'D' ? '#B6FFE6' : '#FFD0D4'; c.beginPath(); c.arc(bx + bw - padX - pwW + 3, by + 9.5, 2.1, 0, 7); c.fill(); }
      tx(c, pl, bx + bw - padX, by + 9.8, { f: pf, c: k.fg, a: 'right', w: 70 });
    }
  });
  return bodyH + CAPH * 2;
}

function secTitle(c, t, x, y, right) {
  c.fillStyle = '#4D86FF'; rr(c, x, y - 7, 3, 14, 1.5); c.fill();
  tx(c, t, x + 11, y, { f: fnt(600, 12), c: '#0A1230' });
  if (right) tx(c, right, x + 0, y, { f: fnt(500, 10.5), c: '#6B7A99', a: 'right' });
}

function pageMain(c, m, pg, pgs) {
  const r = m.r; pageFrame(c, m, pg, pgs); headerBand(c, m, 184, false);
  // ชื่อ Rack + สถานะ
  let fs = 46; c.font = fnt(800, fs, LA); while (fs > 24 && c.measureText(r.name).width > 470) { fs -= 2; c.font = fnt(800, fs, LA); }
  tx(c, r.name, 36, 100, { f: fnt(800, fs, LA), c: '#fff' });
  chip(c, m.stLabel, PW - 36, 82, 28, m.stCls, 'right');
  // แถวข้อมูล (label/value)
  const f = [['ลูกค้า', m.cust, 3.2], ['โซน / แถว', m.zr, 2.2], ['Rack ที่', m.rackNo, 1]];
  if (m.lb) f.push(['ชื่อเรียก', m.lb, 1.3]);
  if (r.ups && r.ups.length) f.push(['UPS', r.ups.join(', '), 1.4]);
  const tot = f.reduce((a, b) => a + b[2], 0); let fx = 36;
  f.forEach(([lab, val, wt], i) => {
    const fw = 722 * wt / tot;
    if (i) { c.strokeStyle = 'rgba(160,190,255,.28)'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx - 10.5, 132); c.lineTo(fx - 10.5, 168); c.stroke(); }
    tx(c, lab, fx, 138, { f: fnt(400, 9.5), c: '#8FA6DA' });
    tx(c, val, fx, 156, { f: fnt(600, 14), c: '#fff', w: fw - 22 });
    fx += fw;
  });
  // ── ซ้าย: ภาพตู้
  const SX = 36, SY = 204, SW = 412, SH = 862;
  c.save(); rr(c, SX, SY, SW, SH, 16); c.fillStyle = lg(c, 0, SY, 0, SY + SH, [[0, '#0A1230'], [1, '#0F1D4A']]); c.shadowColor = 'rgba(10,18,48,.25)'; c.shadowBlur = 18 * SC; c.shadowOffsetY = 6 * SC; c.fill(); c.restore();
  grid(c, SX, SY, SW, SH, 16, 'rgba(130,170,255,.045)');
  c.save(); rr(c, SX + .5, SY + .5, SW - 1, SH - 1, 16); c.strokeStyle = 'rgba(130,170,255,.22)'; c.lineWidth = 1; c.stroke(); c.restore();
  tx(c, 'Front elevation', SX + 20, SY + 22, { f: fnt(700, 13, LA), c: '#fff' });
  tx(c, 'มุมมองด้านหน้า · ' + NU + 'U', SX + SW - 20, SY + 22, { f: fnt(400, 10.5), c: '#9FB4E6', a: 'right' });
  drawRack(c, m, SX + 16, SY + 40, SW - 32);
  // คำอธิบายสี
  const lgY = SY + SH - 22; let lx = SX + 22;
  [['Dual', 'D'], ['Single', 'S'], ['ไม่ ON', 'O'], ['อื่น ๆ', 'X']].forEach(([t, k]) => {
    const kk = PK[k]; c.save(); rr(c, lx, lgY - 5, 12, 10, 2.5); if (k === 'O') { c.fillStyle = kk.b; c.fill(); c.setLineDash([2, 2]); c.strokeStyle = kk.ln; c.lineWidth = 1; c.stroke(); } else { c.fillStyle = lg(c, 0, lgY - 5, 0, lgY + 5, [[0, kk.a], [1, kk.b]]); c.fill(); } c.restore();
    tx(c, t, lx + 18, lgY, { f: fnt(400, 9.5), c: '#B9C8EE' }); lx += 18 + tw(c, t, fnt(400, 9.5)) + 18;
  });
  // ── ขวา: สรุป
  const RX = 470, RW = 288; let cy = SY;
  const kp = (x, y, lab, val, unit, col, foot) => {
    card(c, x, y, 140, 88); tx(c, lab, x + 14, y + 20, { f: fnt(500, 10.5), c: '#6B7A99' });
    tx(c, val, x + 14, y + 54, { f: fnt(800, 32, LA), c: col }); const vw = tw(c, val, fnt(800, 32, LA)); if (unit) tx(c, unit, x + 18 + vw, y + 58, { f: fnt(500, 11), c: '#6B7A99' });
    tx(c, foot, x + 14, y + 77, { f: fnt(400, 9.5), c: '#8593B0', w: 114 });
  };
  kp(RX, cy, 'เครื่องทั้งหมด', String(m.devs.length), 'เครื่อง', '#0A1230', m.nO ? 'ไม่ ON ' + m.nO + ' เครื่อง' : 'ในตู้ Rack นี้');
  kp(RX + 148, cy, 'U ใช้งาน', String(m.used), '/ ' + NU + ' U', '#2F5FDC', 'ว่าง ' + m.free + ' U');
  cy += 96;
  kp(RX, cy, 'Single', String(m.nS), 'เครื่อง', m.nS ? '#CF3A47' : '#9AA6C4', 'เสียบไฟแหล่งเดียว');
  kp(RX + 148, cy, 'Dual', String(m.nD), 'เครื่อง', m.nD ? '#14906B' : '#9AA6C4', 'เสียบไฟ 2 แหล่ง');
  cy += 108;
  // การใช้พื้นที่ (U-map)
  card(c, RX, cy, RW, 86); secTitle(c, 'การใช้พื้นที่ใน Rack', RX + 14, cy + 22);
  tx(c, Math.round(m.used / NU * 100) + '%', RX + RW - 14, cy + 22, { f: fnt(800, 15, LA), c: '#2F5FDC', a: 'right' });
  const cw = (RW - 28) / NU;
  for (let u = NU; u >= 1; u--) { const i = NU - u, d = m.occ[u] >= 0 ? m.devs[m.occ[u]] : null; rr(c, RX + 14 + i * cw, cy + 36, cw - 1.3, 20, 1.6); c.fillStyle = d ? PK[d.k].map : '#E3E9F5'; c.fill(); }
  tx(c, 'U' + NU, RX + 14, cy + 68, { f: fnt(500, 8.5, LA), c: '#8593B0' }); tx(c, 'U1', RX + RW - 14, cy + 68, { f: fnt(500, 8.5, LA), c: '#8593B0', a: 'right' });
  tx(c, 'ใช้ ' + m.used + ' U · ว่าง ' + m.free + ' U', RX + RW / 2, cy + 68, { f: fnt(500, 9.5), c: '#6B7A99', a: 'center' });
  cy += 98;
  // แหล่งไฟ UPS
  const fr = m.feedIds.slice(0, 8), extraRow = m.noSrc ? 1 : 0, uh = 24 + 28 + (fr.length + extraRow || 1) * 22;
  card(c, RX, cy, RW, uh); secTitle(c, 'แหล่งไฟ UPS ที่เสียบ', RX + 14, cy + 22);
  if (!fr.length && !m.noSrc) tx(c, m.devs.length ? 'ไม่มีข้อมูล UPS ของเครื่องใน Rack นี้' : 'ยังไม่มีเครื่องใน Rack นี้', RX + 14, cy + 52, { f: fnt(400, 10.5), c: '#8593B0' });
  const mx = Math.max(1, ...fr.map(u => m.feed[u].S + m.feed[u].D));
  fr.forEach((u, i) => {
    const yy = cy + 50 + i * 22, f2 = m.feed[u], bw = 130, tot2 = f2.S + f2.D;
    tx(c, 'UPS-' + u, RX + 14, yy, { f: fnt(600, 10.5, LA), c: '#0A1230' });
    rr(c, RX + 72, yy - 5, bw, 10, 5); c.fillStyle = '#E8EDF7'; c.fill();
    const wD = bw * f2.D / mx, wS = bw * f2.S / mx; c.save(); rr(c, RX + 72, yy - 5, bw, 10, 5); c.clip();
    c.fillStyle = PK.D.map; c.fillRect(RX + 72, yy - 5, wD, 10); c.fillStyle = PK.S.map; c.fillRect(RX + 72 + wD, yy - 5, wS, 10); c.restore();
    tx(c, (f2.S ? 'S ' + f2.S : '') + (f2.S && f2.D ? '  ' : '') + (f2.D ? 'D ' + f2.D : ''), RX + RW - 14, yy, { f: fnt(600, 10, LA), c: '#4A5875', a: 'right' });
    if (tot2 === 0) return;
  });
  if (m.noSrc) { const yy = cy + 50 + fr.length * 22; rr(c, RX + 12, yy - 9, RW - 24, 18, 6); c.fillStyle = '#FFF3C4'; c.fill(); tx(c, NOSRC, RX + 20, yy + .5, { f: fnt(500, 10), c: '#8A6100' }); tx(c, m.noSrc + ' เครื่อง', RX + RW - 20, yy + .5, { f: fnt(700, 10), c: '#8A6100', a: 'right' }); }
  cy += uh + 12;
  // เครื่อง Single
  const sl = m.sorted.filter(d => d.k === 'S'), show = Math.min(sl.length, 6), sh = 24 + 28 + (sl.length ? show + (sl.length > show ? 1 : 0) : 1) * 28 - 4;
  if (m.devs.length) {
  card(c, RX, cy, RW, sh); secTitle(c, 'เครื่อง Single', RX + 14, cy + 22);
  tx(c, sl.length + ' เครื่อง', RX + RW - 14, cy + 22, { f: fnt(700, 11, LA), c: sl.length ? '#CF3A47' : '#14906B', a: 'right' });
  if (!sl.length) { rr(c, RX + 12, cy + 40, RW - 24, 22, 7); c.fillStyle = '#D9F5E8'; c.fill(); tx(c, 'ไม่มีเครื่อง Single ใน Rack นี้', RX + 22, cy + 51.5, { f: fnt(500, 10.5), c: '#0B6B47' }); }
  sl.slice(0, show).forEach((d, i) => {
    const yy = cy + 54 + i * 28; if (i) { c.strokeStyle = '#EDF1F9'; c.lineWidth = 1; c.beginPath(); c.moveTo(RX + 14, yy - 15); c.lineTo(RX + RW - 14, yy - 15); c.stroke(); }
    const u = uTxt(d.top, d.bot), uw = tw(c, u, fnt(700, 9.5, LA)) + 12; rr(c, RX + 14, yy - 8, uw, 16, 5); c.fillStyle = '#FDE2E4'; c.fill();
    tx(c, u, RX + 20, yy + .5, { f: fnt(700, 9.5, LA), c: '#B42318' });
    tx(c, d.name || '(ไม่มีชื่อ)', RX + 14 + uw + 8, yy - 4, { f: fnt(600, 10.5), c: '#0A1230', w: RW - 28 - uw - 8 });
    tx(c, upsShort(d), RX + 14 + uw + 8, yy + 8.5, { f: fnt(400, 8.8), c: d.ups.length ? '#6B7A99' : '#8A6100', w: RW - 28 - uw - 8 });
  });
  if (sl.length > show) tx(c, 'และอีก ' + (sl.length - show) + ' เครื่อง — ดูรายการเต็มหน้าถัดไป', RX + 14, cy + 54 + show * 28 - 6, { f: fnt(500, 10), c: '#6B7A99' });
  }
  cy += (m.devs.length ? sh + 12 : 0);
  // หมายเหตุ
  const noteTxt = m.note || '', warn = m.overlap ? 'พบเครื่องที่ช่อง U ซ้อนทับกัน ' + m.overlap + ' รายการ ภาพแสดงเฉพาะส่วนที่ไม่ซ้อน' : '';
  if ((noteTxt || warn) && cy < SY + SH - 40) {
    c.font = fnt(400, 10.5); const nl = noteTxt ? wrapLines(c, noteTxt, RW - 28, 3) : [], wl = warn ? wrapLines(c, '⚠ ' + warn, RW - 28, 2) : [], hh = 32 + nl.length * 15 + wl.length * 14 + 4;
    card(c, RX, cy, RW, hh); secTitle(c, 'หมายเหตุ', RX + 14, cy + 20);
    nl.forEach((t, i) => tx(c, t, RX + 14, cy + 40 + i * 15, { f: fnt(400, 10.5), c: '#4A5875' }));
    wl.forEach((t, i) => tx(c, t, RX + 14, cy + 42 + nl.length * 15 + i * 14, { f: fnt(500, 9.8), c: '#8A6100' }));
  }
}

const ROWS_PER_PAGE = 35;
function pageTable(c, m, rows, from, pg, pgs, first) {
  pageFrame(c, m, pg, pgs); headerBand(c, m, 112, true);
  tx(c, m.r.name, 36, 90, { f: fnt(800, 22, LA), c: '#fff' });
  tx(c, m.devs.length + ' เครื่อง', 36 + tw(c, m.r.name, fnt(800, 22, LA)) + 14, 91, { f: fnt(500, 12), c: '#9FB4E6' });
  chip(c, m.stLabel, PW - 36, 76, 26, m.stCls, 'right');
  const cols = [['ลำดับ', 36, 'c'], ['ตำแหน่ง U', 74, 'c'], ['ขนาด', 42, 'c'], ['ชื่อเครื่อง', 236, 'l'], ['Power', 76, 'c'], ['UPS (Source)', 112, 'l'], ['RPP / ปลั๊ก', 146, 'l']];
  const x0 = 36, y0 = 132, HH = 30, RH = 24.6; let y = y0;
  c.save(); rr(c, x0, y, 722, HH, 8); c.fillStyle = lg(c, x0, 0, x0 + 722, 0, [[0, '#0E1F52'], [1, '#1F3A8A']]); c.fill(); c.restore();
  let cx = x0; cols.forEach(([t, w, al]) => { tx(c, t, al === 'c' ? cx + w / 2 : cx + 10, y + HH / 2 + .5, { f: fnt(600, 10.5), c: '#fff', a: al === 'c' ? 'center' : 'left' }); cx += w; });
  y += HH + 4;
  card(c, x0, y - 2, 722, rows.length * RH + 4, { r: 8 });
  rows.forEach((d, i) => {
    const yy = y + i * RH, mid = yy + RH / 2;
    if (i % 2) { c.fillStyle = '#F6F8FD'; c.fillRect(x0 + 1, yy, 720, RH); }
    let x = x0;
    const cell = (w, fn) => { fn(x, w); x += w; };
    cell(36, (xx, w) => tx(c, from + i + 1, xx + w / 2, mid, { f: fnt(500, 10, LA), c: '#8593B0', a: 'center' }));
    cell(74, (xx, w) => tx(c, uTxt(d.top, d.bot), xx + w / 2, mid, { f: fnt(700, 10.5, LA), c: '#0A1230', a: 'center' }));
    cell(42, (xx, w) => tx(c, d.size + 'U', xx + w / 2, mid, { f: fnt(500, 10, LA), c: '#4A5875', a: 'center' }));
    cell(236, (xx, w) => tx(c, d.name || '(ไม่มีชื่อ)', xx + 10, mid, { f: fnt(600, 10.8), c: '#0A1230', w: w - 18 }));
    cell(76, (xx, w) => { const k = PK[d.k], t = pwLabel(d), pw2 = Math.min(w - 12, tw(c, t, fnt(700, 9.5, LA)) + 18); rr(c, xx + (w - pw2) / 2, mid - 8.5, pw2, 17, 8.5); c.fillStyle = k.pillBg; c.fill(); tx(c, t, xx + w / 2, mid + .3, { f: fnt(700, 9.5, LA), c: k.pillFg, a: 'center', w: w - 16 }); });
    cell(112, (xx, w) => tx(c, d.ups.length ? 'UPS-' + d.ups.join(', ') : (d.k === 'S' || d.k === 'D') ? 'ไม่ได้เสียบ Source' : '-', xx + 10, mid, { f: fnt(500, 10), c: d.ups.length || (d.k !== 'S' && d.k !== 'D') ? '#2B3A5C' : '#8A6100', w: w - 14 }));
    cell(146, (xx, w) => tx(c, d.rpp || '-', xx + 10, mid, { f: fnt(400, 9.6), c: d.rpp ? '#4A5875' : '#B3BDD3', w: w - 14 }));
  });
  if (!rows.length) tx(c, 'ยังไม่มีเครื่องใน Rack นี้', PW / 2, y + 20, { f: fnt(500, 12), c: '#8593B0', a: 'center' });
}

async function loadFonts() {
  try {
    const t = 'กขคAa0';
    await Promise.all([[400, TH], [500, TH], [600, TH], [600, LA], [700, LA], [800, LA]].map(([w, f]) => document.fonts.load(w + ' 14px ' + f, t)));
    await document.fonts.ready;
  } catch (_) { /* ใช้ฟอนต์สำรองของเครื่อง */ }
}

function pdfFromJpegs(pages, title) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const hex16 = s => { let h = 'FEFF'; for (const ch of String(s)) { const cp = ch.codePointAt(0); if (cp > 0xFFFF) { const v = cp - 0x10000; h += (0xD800 + (v >> 10)).toString(16).padStart(4, '0') + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, '0'); } else h += cp.toString(16).padStart(4, '0'); } return h.toUpperCase(); };
  push('%PDF-1.4\n'); push(new Uint8Array([37, 226, 227, 207, 211, 10]));
  const obj = (n, body) => { offs[n] = len; push(n + ' 0 obj\n'); push(body); push('\nendobj\n'); };
  const kids = pages.map((_, i) => (4 + i * 3) + ' 0 R').join(' '), W = 595.28, H = 841.89, d = new Date(), p2 = n => String(n).padStart(2, '0');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
  obj(3, '<< /Title <' + hex16(title) + '> /Producer (IDC3 Face Rack) /Creator (IDC3 Face Rack) /CreationDate (D:' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + ') >>');
  pages.forEach((p, i) => {
    const pg = 4 + i * 3, ct = pg + 1, im = pg + 2, cs = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
    obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ' + ct + ' 0 R >>');
    obj(ct, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
    offs[im] = len; push(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.bytes.length + ' >>\nstream\n'); push(p.bytes); push('\nendstream\nendobj\n');
  });
  const n = 4 + pages.length * 3, xr = len;
  push('xref\n0 ' + n + '\n0000000000 65535 f \n'); for (let i = 1; i < n; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size ' + n + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
  const out = new Uint8Array(len); let o = 0; parts.forEach(b => { out.set(b, o); o += b.length; }); return out;
}

async function buildPdf(m) {
  await loadFonts();
  const cv = document.createElement('canvas'); cv.width = Math.round(PW * SC); cv.height = Math.round(PH * SC);
  const c = cv.getContext('2d'); const tPages = Math.ceil(m.sorted.length / ROWS_PER_PAGE), total = 1 + (m.sorted.length ? tPages : 0), pages = [];
  const snap = async () => {
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', .93));
    if (!blob) throw new Error('สร้างภาพหน้า PDF ไม่ได้ (หน่วยความจำของเครื่องไม่พอ)');
    pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: cv.width, h: cv.height });
  };
  const fresh = () => { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.scale(SC, SC); c.textBaseline = 'middle'; };
  fresh(); pageMain(c, m, 1, total); await snap();
  for (let p = 0; p < (m.sorted.length ? tPages : 0); p++) { fresh(); pageTable(c, m, m.sorted.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE), p * ROWS_PER_PAGE, p + 2, total, p === 0); await snap(); }
  return pdfFromJpegs(pages, 'Face Rack ' + m.r.name);
}

/* ───────────────────────── ส่งไฟล์ให้ผู้ใช้ ───────────────────────── */
const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform == 'MacIntel' && navigator.maxTouchPoints > 1);
const MIME = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf' };
let tt;
function toast(msg, bad) {
  let t = document.getElementById('ts');
  if (!t) { t = document.createElement('div'); t.id = 'ts'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.className = bad ? 'bad on' : 'on';
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), bad ? 6500 : 3200);
}
async function deliver(file) {
  if (MOBILE && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; /* เครื่องไม่ให้แชร์ → ดาวน์โหลดแทน */ }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000); return 'saved';
}
async function make(kind, r) {
  const m = model(r), bytes = kind === 'pdf' ? await buildPdf(m) : await buildXlsx(m);
  return { file: new File([bytes], 'FaceRack_' + safeName(r.name) + '_' + m.ymd + '.' + kind, { type: MIME[kind] }), bytes, model: m };
}

/* ───────────────────────── ปุ่มบนหน้า Rack ───────────────────────── */
const ICON = {
  xlsx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9.5 12.5 4 5M13.5 12.5l-4 5"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 17v-4.5h1.4a1.3 1.3 0 0 1 0 2.6H9M13.5 17v-4.5h.9a2.2 2.2 0 0 1 0 4.5z"/></svg>'
};
const CSS = `
.rx-grp{display:inline-flex;align-items:center;gap:8px;margin-left:auto}
.rx-grp>.sub{font-size:12.5px;margin-right:2px}
.rx-b{display:inline-flex;align-items:center;gap:7px}
.rx-b svg{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.rx-b[data-x=xlsx] svg{color:var(--gr)}.rx-b[data-x=pdf] svg{color:var(--rd)}
.rx-b.busy{opacity:.75;pointer-events:none}
.rx-b.busy svg{animation:rxs 1s linear infinite;stroke-dasharray:14 40;color:var(--dual)}
@keyframes rxs{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.rx-b.busy svg{animation:none}}
@media(max-width:560px){.rx-grp{margin-left:0;width:100%}.rx-grp>.sub{display:none}.rx-b{flex:1;justify-content:center}}
`;
let busy = false;
async function run(kind, r, btn) {
  if (busy) return; busy = true; btn.classList.add('busy');
  const lab = kind === 'pdf' ? 'PDF' : 'Excel';
  toast('กำลังสร้างไฟล์ ' + lab + '…');
  try {
    const { file } = await make(kind, r), how = await deliver(file);
    if (how === 'cancel') toast('ยกเลิกการแชร์'); else toast((how === 'shared' ? 'แชร์ไฟล์ ' : 'ดาวน์โหลด ') + file.name + ' แล้ว');
  } catch (e) { toast('Export ' + lab + ' ไม่สำเร็จ: ' + (e && e.message || e), true); }
  busy = false; btn.classList.remove('busy');
}
function mount() {
  const bar = document.getElementById('rk-act'); if (!bar || bar.querySelector('.rx-grp')) return;
  const mm = /^#rack\/(.+)$/.exec(location.hash); if (!mm) return;
  let r; try { r = byId[decodeURIComponent(mm[1])]; } catch (_) { return; } if (!r) return;
  if (!document.getElementById('rx-css')) { const s = document.createElement('style'); s.id = 'rx-css'; s.textContent = CSS; document.head.appendChild(s); }
  bar.insertAdjacentHTML('beforeend', '<span class="rx-grp" role="group" aria-label="Export Face Rack"><span class="sub">Export</span>' +
    '<button type="button" class="bt rx-b" data-x="xlsx" title="ดาวน์โหลด Face Rack เป็น Excel (.xlsx)">' + ICON.xlsx + 'Excel</button>' +
    '<button type="button" class="bt rx-b" data-x="pdf" title="ดาวน์โหลด Face Rack เป็น PDF">' + ICON.pdf + 'PDF</button></span>');
  const grp = bar.querySelector('.rx-grp');
  grp.addEventListener('click', e => { const b = e.target.closest('.rx-b'); if (b) run(b.dataset.x, r, b); });
  const pre = () => loadExcel().catch(() => {});                       // โหลดตัวสร้าง Excel รอไว้ตอนเริ่มแตะ/ชี้
  grp.querySelector('[data-x=xlsx]').addEventListener('pointerenter', pre, { once: true });
  grp.querySelector('[data-x=xlsx]').addEventListener('touchstart', pre, { once: true, passive: true });
}
try { new MutationObserver(mount).observe(M, { childList: true }); mount(); } catch (_) { /* หน้าหลักยังไม่พร้อม */ }

window.RackExport = { model, make, xlsx: r => make('xlsx', r), pdf: r => make('pdf', r) };
})();
