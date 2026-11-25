/* ════════════════════════════════════════════════════════════════
 *  rack-daily.js — นำเข้าข้อมูลรายวัน (PUE / กำลังไฟ / น้ำมัน Gen) บันทึกอัตโนมัติลง GAS ของ Phase นั้น
 *  โหลดหลัง rack-live.js · ต้องมี window.RackAPI (ดูขั้นตอนติดตั้ง)
 *  Phase: ตั้ง RACK_CONFIG.PHASE = 1|2 ใน config.js หรือให้เดาจาก path (/rack2/ = Phase 2)
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const PH = Number((window.RACK_CONFIG || {}).PHASE) || (/rack2/i.test(location.pathname) ? 2 : 1);
const MDB_RE = PH === 1 ? /MDB Phase 1/i : /MDB Phase 2/i;
const CF = PH === 1
  ? { it: /^AMCP\.PDU-[12][A-D]#Real Energy#kWh$/, tot: /^MDB\.MDB-(1|2|R)#Real Energy#kWh$/, itk: /^AMCP\.PDU-[12][A-D]#Real Power#kW$/, totk: /^MDB\.MDB-(1|2|R)#Real Power#kW$/, itN: 8 }
  : { it: /^DC\.DC2-1-RPP\d-[AB]\d#Real Energy Into the Load#kWh$/, tot: /^Utility\.UT2-2-MDB-(1|2|R)_1#Real Energy Into the Load#kWh$/, itk: /^DC\.DC2-1-RPP\d-[AB]\d#Real Power#kW$/, totk: /^Utility\.UT2-2-MDB-(1|2|R)_1#Real Power#kW$/, itN: 16 };
// L/Hr คงที่ (จากชีท Generator แถว 3)
const RATE = PH === 1 ? { g1: 205, g2: 190, gr: 55 } : { g1: 120, g2: 100, gr: 60 };
const RATE_OFF = 19;
const FUEL = [['g1', 'Gen 1'], ['g2', 'Gen 2'], ['gr', 'Gen R'], ['ta', 'Tank A'], ['tb', 'Tank B']];

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 1) => x == null || isNaN(x) ? '–' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const dayOf = d => new Date(new Date(d + 'T00:00:00Z').getTime() - 864e5).toISOString().slice(0, 10);
const thDate = d => d.split('-').reverse().join('/');
const sp = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; };
const sum = (m, re) => { let t = 0, n = 0; for (const k in m) if (re.test(k)) { t += m[k]; n++; } return { t, n }; };

const S = { files: {}, hist: {}, day: null, rec: null, man: {}, status: '', saveT: 0, ok: false, tab: 'today' };
let el = null;

function parse(name, text) {
  const L = text.split(/\r?\n/).filter(Boolean); if (L.length < 2) return null;
  const h = sp(L[0]), v = sp(L[L.length - 1]), map = {};
  h.forEach((k, i) => { if (i > 0 && v[i] !== '' && !isNaN(+v[i])) map[k] = +v[i]; });
  return { name, map, date: (v[0] || '').slice(0, 10) };
}
function cumOf(m) {
  const a = sum(m, CF.it), b = sum(m, CF.tot), k = sum(m, CF.itk), q = sum(m, CF.totk);
  return { it: a.t, tot: b.t, itN: a.n, totN: b.n, itkW: k.t, totkW: q.t };
}
function loadJSZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = ok; s.onerror = () => no(new Error('โหลดตัวแตก ZIP ไม่ได้ ให้วางไฟล์ CSV ตรงๆ แทน')); document.head.appendChild(s); });
}
async function ingest(list) {
  const csvs = [];
  for (const f of list) {
    if (/\.zip$/i.test(f.name)) {
      await loadJSZip(); const z = await window.JSZip.loadAsync(f);
      for (const e of Object.values(z.files)) if (!e.dir && /\.csv$/i.test(e.name) && MDB_RE.test(e.name)) csvs.push([e.name.split('/').pop(), await e.async('string')]);
    } else if (MDB_RE.test(f.name)) csvs.push([f.name, await f.text()]);
  }
  for (const [n, t] of csvs) { const p = parse(n, t); if (p && p.date) S.files[p.date] = p; }
  if (!csvs.length) { S.status = 'ไม่พบไฟล์ MDB ของ Phase ' + PH + ' ในที่เลือก'; S.ok = false; return paint(); }
  await compute();
}
function prevCum(day) { const h = S.hist[dayOf(day)]; return h && h.cum ? h.cum : null; }
async function compute() {
  const dates = Object.keys(S.files).sort(), today = dates[dates.length - 1], day = dayOf(today);
  const cur = cumOf(S.files[today].map);
  let prev = null, src = '';
  if (dates.length > 1) { prev = cumOf(S.files[dates[dates.length - 2]].map); src = 'ไฟล์เมื่อวาน'; }
  else if (prevCum(day)) { prev = prevCum(day); src = 'ค่าที่บันทึกไว้เมื่อวาน'; }
  const d = prev ? { it: cur.it - prev.it, tot: cur.tot - prev.tot } : null;
  const pue = d && d.it > 0 ? d.tot / d.it : null;
  S.day = day; S.rec = { cur, prev, src, d, pue, today };
  S.man = Object.assign(latestManual(), (S.hist[day] || {}).manual || {});
  paint();
  // บันทึกอัตโนมัติ: ค่าสะสมของทุกวันที่อยู่ในไฟล์ (วันก่อนหน้าใช้เป็นฐานให้ PUE) + ผลของวันล่าสุด
  const q = [];
  for (const dt of dates) {
    const c = cumOf(S.files[dt].map), key = dayOf(dt);
    const data = { cum: { it: c.it, tot: c.tot }, kw: { it: c.itkW, tot: c.totkW }, src: S.files[dt].name };
    if (dt === today) Object.assign(data, { day: d, pue: pue });
    q.push(save(key, data));
  }
  await Promise.all(q);
}
function latestManual() {
  const ks = Object.keys(S.hist).sort(); let m = {};
  for (const k of ks) if (S.hist[k].manual && (!S.day || k <= S.day)) m = S.hist[k].manual;
  return Object.assign({}, m);
}
async function save(date, data) {
  try {
    const j = await window.RackAPI.api({ action: 'save_daily', date, phase: PH, data });
    if (!j.ok) throw new Error(j.reason || 'บันทึกไม่สำเร็จ');
    S.hist[date] = Object.assign({}, S.hist[date], data);
    S.ok = true; S.status = 'บันทึกแล้ว ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { S.ok = false; S.status = 'บันทึกไม่สำเร็จ: ' + (e.message || e); }
  paintStatus();
}
function manChanged() {
  const m = {};
  el.querySelectorAll('[data-m]').forEach(i => { if (i.value !== '') m[i.dataset.m] = Number(i.value); });
  S.man = m; hours(); S.status = 'กำลังบันทึก…'; paintStatus();
  clearTimeout(S.saveT); S.saveT = setTimeout(() => save(S.day, { manual: m }), 800);
}
function hours() {
  el.querySelectorAll('[data-h]').forEach(s => { const r = s.dataset.h === 'off' ? RATE_OFF : RATE[s.dataset.h], v = S.man[s.dataset.h === 'off' ? 'off_l' : s.dataset.h];
    s.textContent = v != null && r ? 'เดินได้ประมาณ ' + fmt(v / r) + ' ชม.' : ''; });
}

// ───────── ประวัติ / สรุป ─────────
function derive(k) {
  const h = S.hist[k] || {}; if (h.day && h.pue != null) return { d: h.day, pue: h.pue, kw: h.kw };
  const p = S.hist[dayOf(k)];
  if (h.cum && p && p.cum && h.cum.it > p.cum.it) { const d = { it: h.cum.it - p.cum.it, tot: h.cum.tot - p.cum.tot }; return { d, pue: d.tot / d.it, kw: h.kw }; }
  return { d: null, pue: null, kw: h.kw };
}
function chart(pts) {
  if (pts.length < 2) return '<div class="m">ยังมีข้อมูลไม่พอทำกราฟ (ต้องมีอย่างน้อย 2 วัน)</div>';
  const W = 700, H = 170, L = 36, B = 22, vs = pts.map(p => p.v), lo = Math.floor(Math.min(...vs) * 20) / 20, hi = Math.ceil(Math.max(...vs) * 20) / 20 || lo + .1, rg = hi - lo || .1;
  const x = i => L + i * (W - L - 8) / (pts.length - 1), y = v => 8 + (H - B - 8) * (1 - (v - lo) / rg);
  const ln = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
  const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".15"/><text x="${L - 4}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="currentColor" opacity=".7">${v.toFixed(2)}</text>`).join('');
  const lab = [0, Math.floor(pts.length / 2), pts.length - 1].map(i => `<text x="${x(i)}" y="${H - 6}" font-size="11" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}" fill="currentColor" opacity=".7">${pts[i].d.slice(5).split('-').reverse().join('/')}</text>`).join('');
  return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:480px;height:auto">${grid}${lab}<path d="${ln}" fill="none" stroke="#2455e6" stroke-width="2.2"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3" fill="#2455e6"><title>${thDate(p.d)}: ${p.v.toFixed(3)}</title></circle>`).join('')}</svg></div>`;
}
function histHtml() {
  const ks = Object.keys(S.hist).sort(), rows = ks.map(k => Object.assign({ k }, S.hist[k], { dv: derive(k) }));
  const ok = rows.filter(r => r.dv.pue != null), avg = a => a.length ? a.reduce((t, r) => t + r.dv.pue, 0) / a.length : null;
  const last = ok[ok.length - 1], a7 = avg(ok.slice(-7)), a30 = avg(ok);
  const mn = ok.length ? Math.min(...ok.map(r => r.dv.pue)) : null, mx = ok.length ? Math.max(...ok.map(r => r.dv.pue)) : null;
  const tile = (t, v, s) => `<div><div class="m">${t}</div><div style="font-size:26px;font-weight:600">${v == null ? '–' : v.toFixed(2)}</div><small>${s || ''}</small></div>`;
  const tr = rows.slice(-14).reverse().map(r => { const m = r.manual || {};
    return `<tr><td>${thDate(r.k)}</td><td><b>${r.dv.pue == null ? '–' : r.dv.pue.toFixed(2)}</b></td><td>${r.dv.d ? fmt(r.dv.d.it, 0) : '–'}</td><td>${r.dv.d ? fmt(r.dv.d.tot, 0) : '–'}</td><td>${r.dv.d ? fmt(r.dv.d.tot - r.dv.d.it, 0) : '–'}</td><td>${r.dv.kw ? fmt(r.dv.kw.it) : '–'}</td><td>${m.g1 != null ? fmt(m.g1, 0) + ' / ' + fmt(m.g2, 0) + ' / ' + fmt(m.gr, 0) : '–'}</td></tr>`; }).join('');
  return `<div class="c"><div class="g">${tile('PUE ล่าสุด', last && last.dv.pue, last ? thDate(last.k) : '')}${tile('เฉลี่ย 7 วัน', a7)}${tile('เฉลี่ย ' + ok.length + ' วันที่มี', a30)}${tile('ต่ำสุด – สูงสุด', null, mn == null ? '' : mn.toFixed(2) + ' – ' + mx.toFixed(2))}</div></div>
<div class="c"><b>PUE รายวัน</b><div style="margin-top:8px">${chart(ok.map(r => ({ d: r.k, v: r.dv.pue })))}</div></div>
<div class="c"><b>14 วันล่าสุด</b><div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap"><thead><tr style="text-align:left;opacity:.7"><th>วันที่ข้อมูล</th><th>PUE</th><th>IT kWh</th><th>Total kWh</th><th>Facility kWh</th><th>IT kW</th><th>Gen 1/2/R (ลิตร)</th></tr></thead><tbody>${tr || '<tr><td colspan="7" class="m">ยังไม่มีข้อมูล</td></tr>'}</tbody></table></div></div>
<div class="c"><b>นำเข้าประวัติย้อนหลัง</b><div class="m">ใช้ครั้งเดียวตอนเริ่มระบบ: เลือกไฟล์ backfill-phase${PH}.json (สร้างจากชีท “ข้อมูลดิบ” ของ Layout) แล้วระบบจะเติมค่าสะสมย้อนหลังให้ PUE คำนวณได้ทันที</div>
<div style="margin-top:10px"><button id="dlyi">เลือกไฟล์ประวัติ</button> <span id="dlyp" class="m"></span></div><input type="file" id="dlyj" accept=".json" hidden></div>`;
}
async function backfill(file) {
  const p = el.querySelector('#dlyp');
  try {
    const j = JSON.parse(await file.text());
    if (Number(j.phase) !== PH) throw new Error('ไฟล์นี้เป็นของ Phase ' + j.phase + ' แต่ตอนนี้อยู่ Phase ' + PH);
    const it = (j.items || []).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date));
    for (let i = 0; i < it.length; i++) { p.textContent = 'กำลังนำเข้า ' + (i + 1) + '/' + it.length + '…'; await save(it[i].date, it[i].data); if (!S.ok) throw new Error(S.status); }
    p.textContent = 'นำเข้าแล้ว ' + it.length + ' วัน'; S.man = latestManual(); paint();
  } catch (e) { p.textContent = 'นำเข้าไม่สำเร็จ: ' + (e.message || e); p.className = 'bad'; }
}
function tabs() { return `<div style="display:flex;gap:8px;margin-top:12px">${[['today', 'วันนี้'], ['hist', 'ประวัติ / สรุป']].map(([k, t]) => `<button data-tab="${k}" style="${S.tab === k ? '' : 'background:none;color:inherit;border:1px solid color-mix(in srgb,CanvasText 24%,transparent)'}">${t}</button>`).join('')}</div>`; }
function css() {
  if (document.getElementById('dly-css')) return;
  const s = document.createElement('style'); s.id = 'dly-css';
  s.textContent = `#dly{position:fixed;inset:0;z-index:9999;background:Canvas;color:CanvasText;overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 40px;font:15px/1.55 system-ui,"Noto Sans Thai",sans-serif}
#dly .w{max-width:900px;margin:0 auto}#dly h2{margin:0;font-size:20px}#dly .m{opacity:.65;font-size:13px}
#dly .c{border:1px solid color-mix(in srgb,CanvasText 16%,transparent);border-radius:14px;padding:16px;margin:14px 0}
#dly .dz{border:2px dashed color-mix(in srgb,CanvasText 28%,transparent);border-radius:12px;padding:24px;text-align:center;cursor:pointer}
#dly .dz.on{border-color:#2455e6;background:color-mix(in srgb,#2455e6 12%,transparent)}
#dly .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
#dly .pue{font-size:44px;font-weight:600;line-height:1.1}#dly label{font-size:13px;opacity:.85;display:block}
#dly input[type=number],#dly input[type=text]{width:100%;margin-top:3px;padding:9px;border-radius:9px;border:1px solid color-mix(in srgb,CanvasText 24%,transparent);background:Canvas;color:CanvasText;font:inherit}
#dly button{font:inherit;border:0;border-radius:10px;padding:9px 14px;background:#2455e6;color:#fff;font-weight:600;cursor:pointer}
#dly .bad{color:#c62828}#dly .ok{color:#1b8a52}#dly .warn{background:color-mix(in srgb,#f0a500 22%,transparent);border-radius:10px;padding:8px 12px;font-size:13px;margin-top:10px}
#dly small{display:block;opacity:.65;font-size:12px;margin-top:2px}
#dlyb{margin-left:auto;font:inherit;font-size:13px;padding:6px 12px;border-radius:99px;border:1px solid currentColor;background:none;color:inherit;cursor:pointer}`;
  document.head.appendChild(s);
}
function paintStatus() { const n = el && el.querySelector('#dlys'); if (n) { n.textContent = S.status; n.className = S.ok ? 'ok' : (S.status.startsWith('บันทึกไม่') ? 'bad' : 'm'); } }
function paint() {
  const r = S.rec, fuel = FUEL.map(([k, t]) => `<label>${t} (ลิตร)<input type="number" data-m="${k}" value="${S.man[k] == null ? '' : S.man[k]}" inputmode="decimal">${RATE[k] ? `<small data-h="${k}"></small>` : ''}</label>`).join('');
  const off = PH === 1 ? `<label>Gen Office (ลิตร)<input type="number" data-m="off_l" value="${S.man.off_l == null ? '' : S.man.off_l}" inputmode="decimal"><small data-h="off"></small></label>
<label>Office (MDB-UT) kWh สะสม<input type="number" data-m="off_kwh" value="${S.man.off_kwh == null ? '' : S.man.off_kwh}" inputmode="decimal"></label>` : '';
  const res = !r ? '' : `<div class="g"><div><div class="m">PUE รายวัน · ข้อมูลวันที่ ${thDate(S.day)}</div><div class="pue">${r.pue == null ? '–' : r.pue.toFixed(2)}</div>
<small>${r.d ? 'เทียบจาก' + r.src : 'ยังไม่มีค่าสะสมของเมื่อวาน — วางไฟล์ MDB ของเมื่อวานเพิ่ม'}</small></div>
<div>IT ตอนนี้<b style="display:block">${fmt(r.cur.itkW)} kW</b><small>ใช้ทั้งวัน ${r.d ? fmt(r.d.it, 0) : '–'} kWh</small></div>
<div>รวมทั้งหมดตอนนี้<b style="display:block">${fmt(r.cur.totkW)} kW</b><small>ใช้ทั้งวัน ${r.d ? fmt(r.d.tot, 0) : '–'} kWh</small></div>
<div>Facility (รวม − IT)<b style="display:block">${r.d ? fmt(r.d.tot - r.d.it, 0) : '–'} kWh</b></div></div>
${r.cur.itN !== CF.itN || r.cur.totN !== 3 ? `<div class="warn">คอลัมน์ไม่ครบ (IT ${r.cur.itN}/${CF.itN}, Total ${r.cur.totN}/3) ตรวจไฟล์ก่อนใช้ตัวเลขนี้</div>` : ''}
${r.pue != null && (r.pue < 1.2 || r.pue > 2.5) ? '<div class="warn">PUE อยู่นอกช่วง 1.2–2.5 ตรวจไฟล์เมื่อวานและวันนี้ว่าเป็นคู่ที่ถูกต้อง</div>' : ''}`;
  el.innerHTML = `<div class="w"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><h2>นำเข้าข้อมูลรายวัน · Phase ${PH}</h2><span id="dlys" class="m"></span><button id="dlyx" style="margin-left:auto">ปิด</button></div>${tabs()}
${S.tab === 'hist' ? histHtml() : `<div class="c"><div class="dz" id="dlyz"><b>ลากไฟล์ CSV หรือ ZIP ที่ดึงมาวางที่นี่</b><div class="m">ใช้เฉพาะไฟล์ MDB ของ Phase ${PH} · บันทึกให้อัตโนมัติ · วางไฟล์เมื่อวานด้วยได้ถ้ายังไม่เคยบันทึก</div></div><input type="file" id="dlyf" multiple accept=".csv,.zip" hidden></div>
${r ? `<div class="c">${res}</div><div class="c"><b>น้ำมัน${PH === 1 ? ' และ Office' : ''} (กรอกมือ)</b><div class="m">ค่าเริ่มต้นคือค่าล่าสุดที่เคยบันทึก · ค่า Tank A ที่เซ็นเซอร์สวิง ให้ใช้ค่าเดิมถ้าค่าใหม่สูงกว่า (ตามหมายเหตุในชีท)</div><div class="g" style="margin-top:10px">${off}${fuel}</div></div>` : ''}`}</div>`;
  el.querySelector('#dlyx').onclick = () => { el.remove(); el = null; };
  el.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { S.tab = b.dataset.tab; paint(); }; });
  const dz = el.querySelector('#dlyz'), fi = el.querySelector('#dlyf');
  if (dz) {
    dz.onclick = () => fi.click(); fi.onchange = e => run([...e.target.files]);
    ['dragover', 'dragenter'].forEach(v => dz.addEventListener(v, e => { e.preventDefault(); dz.classList.add('on'); }));
    ['dragleave', 'drop'].forEach(v => dz.addEventListener(v, e => { e.preventDefault(); dz.classList.remove('on'); }));
    dz.addEventListener('drop', e => run([...e.dataTransfer.files]));
  }
  const bi = el.querySelector('#dlyi'), bj = el.querySelector('#dlyj');
  if (bi) { bi.onclick = () => bj.click(); bj.onchange = e => backfill(e.target.files[0]); }
  el.querySelectorAll('[data-m]').forEach(i => i.addEventListener('input', manChanged));
  hours(); paintStatus();
}
async function run(f) { try { await ingest(f); } catch (e) { S.status = 'บันทึกไม่สำเร็จ: ' + (e.message || e); S.ok = false; paintStatus(); } }
async function open() {
  const api = window.RackAPI, me = api && api.me();
  css(); if (el) el.remove(); el = document.createElement('div'); el.id = 'dly'; document.body.appendChild(el);
  if (!me || (me.role !== 'admin' && me.role !== 'editor')) { el.innerHTML = '<div class="w"><h2>นำเข้าข้อมูลรายวัน</h2><p>ต้องเข้าสู่ระบบด้วยบัญชีผู้แก้ไข (editor/admin) ก่อน</p><button id="dlyx">ปิด</button></div>'; el.querySelector('#dlyx').onclick = () => { el.remove(); el = null; }; return; }
  el.innerHTML = '<div class="w"><p class="m">กำลังโหลดประวัติ…</p></div>';
  try { const j = await api.api({ action: 'get_daily', limit: 45 }); if (!j.ok) throw new Error(j.reason); S.hist = {}; j.days.forEach(d => { S.hist[d.date] = d.data; }); S.status = ''; }
  catch (e) { S.status = 'โหลดประวัติไม่ได้: ' + (e.message || e) + ' (GAS ติดตั้ง DailyLog แล้วหรือยัง)'; S.ok = false; }
  S.files = {}; S.rec = null; S.day = null; S.tab = 'today'; S.man = latestManual(); paint();
}
function mount() {
  const h = document.querySelector('header'); if (!h || document.getElementById('dlyb')) return;
  const b = document.createElement('button'); b.id = 'dlyb'; b.textContent = 'นำเข้ารายวัน'; b.onclick = open; h.appendChild(b);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
