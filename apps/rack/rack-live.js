/* ════════════════════════════════════════════════════════════════
 *  Face Rack — Live edition
 *  ต่อกับ GAS Rack API: โหลดข้อมูลสด, นำเครื่องเข้า/ออก/ย้าย/แก้ไข, ประวัติ, Undo (admin)
 *  ต้องโหลดหลัง script หลักใน index.html (ใช้ R, byId, C, build, render0, after0 ฯลฯ ร่วมกัน)
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const CFG = window.RACK_CONFIG || {};
const K_PORTAL = 'idc3_session_v4';        // session ของ Portal (sessionStorage, origin เดียวกัน)
const K_OWN = 'idc3_rack_session_v1';      // session กรณีเปิดหน้านี้เดี่ยว ๆ
const K_CACHE = 'idc3_rack_cache_v1';
const POLL_MS = 45000;

const ROLE = { admin: 'ผู้ดูแล', editor: 'ผู้แก้ไข', viewer: 'ดูอย่างเดียว', guest: 'ผู้เยี่ยมชม' };
const ACT = { device_in: 'นำเข้า', device_out: 'นำออก', device_move: 'ย้าย', device_edit: 'แก้ไข', rack_update: 'แก้ข้อมูล Rack', rack_on: 'ON Rack', rack_off: 'OFF Rack', undo: 'ย้อนกลับ' };
const PW = ['Single', 'Dual', 'ไม่ใช้ไฟ', 'ไม่ ON'];
const ST = [['use', 'ใช้งาน'], ['empty', 'ว่าง'], ['cage', 'กั้นกรง'], ['off', 'วางเครื่อง (ไม่ ON)']];
const OUT_REASONS = ['ปลดระวาง', 'ย้ายไปสถานที่อื่น', 'ส่งคืนลูกค้า', 'อื่น ๆ'];
const OFF_REASONS = ['บำรุงรักษา / ปรับปรุง Rack', 'ลูกค้าแจ้งปิด', 'ประหยัดไฟ', 'อื่น ๆ'];
const isP = p => p === 'Single' || p === 'Dual';

let TOKEN = '', SRC = '', ME = null, VER = 0, LASTOK = 0;
let ONLINE = true, BUSY = 0, PEND = false, SYNC = null;

class Err extends Error { constructor(m, quiet) { super(m); this.quiet = !!quiet; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const authCode = c => c === 'NO_TOKEN' || c === 'BAD_TOKEN' || c === 'TOKEN_EXPIRED';
const uTxt = (t, b) => t === b ? 'U' + t : 'U' + b + '-' + t;

// ───────────── token ─────────────
function b64j(s) {
  try {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(atob(s));
  } catch (_) { return null; }
}
function tokOK(t) {
  if (typeof t !== 'string') return false;
  const p = t.split('.');
  if (p.length !== 3) return false;
  const j = b64j(p[1]);
  return !!(j && j.exp > Date.now() / 1000 + 30);
}
function findToken() {
  for (const [k, src] of [[K_PORTAL, 'portal'], [K_OWN, 'own']]) {
    try {
      const p = JSON.parse(sessionStorage.getItem(k) || 'null');
      if (p && tokOK(p.token)) return { token: p.token, src };
    } catch (_) { /* ignore */ }
  }
  return null;
}

// ───────────── API ─────────────
async function post(url, body, timeout) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeout || 30000);
  let res;
  try { res = await fetch(url, { method: 'POST', body: JSON.stringify(body), signal: ctl.signal, redirect: 'follow' }); }
  catch (_) { throw new Err('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
  finally { clearTimeout(to); }
  try { return JSON.parse(await res.text()); }
  catch (_) { throw new Err('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (ตรวจสอบการ Deploy ของ GAS)'); }
}
function api(body, opt) {
  if (!CFG.RACK_GAS_URL) throw new Err('ยังไม่ได้ตั้งค่า RACK_GAS_URL ใน config.js');
  return post(CFG.RACK_GAS_URL, Object.assign({}, body, { token: TOKEN }), opt && opt.timeout);
}

// ───────────── UI helpers ─────────────
let tt;
function toast(m, bad) {
  let t = $('#ts');
  if (!t) { t = document.createElement('div'); t.id = 'ts'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = m; t.className = bad ? 'bad on' : 'on';
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), bad ? 6500 : 2800);
}
const modalOpen = () => !!($('#ov') || $('#ov2') || $('#lo'));

function sheetOpen(html, second) {
  const id = second ? 'ov2' : 'ov';
  const old = $('#' + id); if (old) old.remove();
  const o = document.createElement('div');
  o.id = id; o.className = 'ov';
  o.innerHTML = '<div class="sh" role="dialog" aria-modal="true">' + html + '</div>';
  if (!second) o.addEventListener('pointerdown', e => { if (e.target === o) sheetClose(); });
  document.body.appendChild(o); document.body.classList.add('lock');
  return o.firstElementChild;
}
function sheetClose(silent) {
  ['#ov2', '#ov'].forEach(s => { const e = $(s); if (e) e.remove(); });
  document.body.classList.remove('lock');
  if (!silent && PEND) check();
}
function ask(msgHtml, okLabel, danger) {
  return new Promise(res => {
    const s = sheetOpen('<p class="am">' + msgHtml + '</p><div class="fb"><button class="bt" data-x="0">ยกเลิก</button><button class="bt ' + (danger ? 'd' : 'p') + '" data-x="1">' + esc(okLabel || 'ตกลง') + '</button></div>', true);
    s.onclick = e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const o = $('#ov2'); if (o) o.remove();
      if (!$('#ov')) document.body.classList.remove('lock');
      res(b.dataset.x === '1');
    };
  });
}
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const o2 = $('#ov2');
  if (o2) { const b = o2.querySelector('[data-x="0"]'); if (b) b.click(); }
  else if ($('#ov')) sheetClose();
});

// ───────────── sync chip ─────────────
function chip() {
  const el = $('#sy'); if (!el) return;
  if (!ME) { el.innerHTML = ''; return; }
  const t = LASTOK ? new Date(LASTOK).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
  el.innerHTML = '<span class="dot ' + (ONLINE ? 'on' : 'off') + '"></span><span class="sn">' + esc(ME.name || ME.emp_id) + ' · ' + esc(ROLE[ME.role] || ME.role) + '</span>' +
    '<span>' + (ONLINE ? 'อัปเดต ' + t : 'ออฟไลน์ · ข้อมูลเมื่อ ' + t) + '</span>' +
    '<a href="#log" class="sl">ประวัติ</a><button id="syb" aria-label="รีเฟรชข้อมูล">รีเฟรช</button>' + (SRC === 'own' ? '<button id="syo">ออกจากระบบ</button>' : '');
}
document.addEventListener('click', e => {
  if (e.target.closest('#syb')) manualRefresh();
  else if (e.target.closest('#syo')) logout();
});

// ───────────── data load / sync ─────────────
function fillLists() {
  let h = $('#dls');
  if (!h) { h = document.createElement('div'); h.id = 'dls'; h.hidden = true; document.body.appendChild(h); }
  const cnt = new Map();
  R.forEach(r => r.dv.forEach(v => { if (v[2] && v[2].length <= 80) cnt.set(v[2], (cnt.get(v[2]) || 0) + 1); }));
  const names = [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 300).map(x => x[0]);
  h.innerHTML = '<datalist id="dl_racks">' + R.map(r => '<option value="' + esc(r.id) + '">' + esc(r.c) + '</option>').join('') + '</datalist>' +
    '<datalist id="dl_names">' + names.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
    '<datalist id="dl_cust">' + Object.keys(C).sort().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>';
}
function saveCache(j) {
  try { localStorage.setItem(K_CACHE, JSON.stringify({ emp: ME.emp_id, ts: Date.now(), version: j.version, me: j.me, data: j.data })); } catch (_) { /* เต็ม — ข้าม */ }
}
function readCache(emp) {
  try { const c = JSON.parse(localStorage.getItem(K_CACHE) || 'null'); return c && c.emp === emp && Array.isArray(c.data) ? c : null; }
  catch (_) { return null; }
}
function apply(j, fromCache) {
  ME = j.me; VER = j.version;
  CAN = ME.role === 'admin' || ME.role === 'editor';
  ADMIN = ME.role === 'admin';
  build(j.data); fillLists();
  if (fromCache) LASTOK = j.ts || 0; else { LASTOK = Date.now(); saveCache(j); }
  ONLINE = true; READY = true; chip();
}
function load() {
  if (SYNC) return SYNC;
  SYNC = (async () => {
    try {
      const j = await api({ action: 'get_data' });
      if (!j.ok) {
        if (authCode(j.code)) { needLogin(j.reason); return false; }
        throw new Err(j.reason || 'โหลดข้อมูลไม่สำเร็จ');
      }
      apply(j); return true;
    } finally { SYNC = null; }
  })();
  return SYNC;
}
function rerender() { const y = scrollY; render(); scrollTo(0, y); }

async function check() {
  PEND = false;
  if (!READY || BUSY || document.hidden) return;
  if (modalOpen()) { PEND = true; return; }
  try {
    const j = await api({ action: 'get_version' }, { timeout: 15000 });
    if (!j.ok) { if (authCode(j.code)) needLogin(j.reason); return; }
    ONLINE = true;
    const roleChanged = j.me && ME && j.me.role !== ME.role;
    if (j.version !== VER || roleChanged) { if (await load()) { rerender(); toast('ข้อมูลอัปเดตแล้ว'); } }
    else LASTOK = Date.now();
    chip();
  } catch (_) { ONLINE = false; chip(); }
}
async function manualRefresh() {
  try { if (await load()) { rerender(); toast('รีเฟรชแล้ว'); } }
  catch (e) { ONLINE = false; chip(); toast(e.message, true); }
}
async function afterWrite() {
  try { if (await load()) rerender(); }
  catch (_) { toast('บันทึกแล้ว แต่โหลดข้อมูลใหม่ไม่สำเร็จ กดรีเฟรชอีกครั้ง', true); }
}

// ───────────── write (จัดการ error ทุกรหัสในที่เดียว) ─────────────
async function write(body, opt) {
  opt = opt || {};
  BUSY++;
  try {
    for (let i = 0; ; i++) {
      let j;
      try { j = await api(body); }
      catch (e) {
        load().then(() => rerender()).catch(() => {});
        throw new Err('ไม่ทราบผลการบันทึก (' + e.message + ') กรุณาตรวจสอบรายการล่าสุดก่อนบันทึกซ้ำ');
      }
      if (j.ok) return j;
      if (j.code === 'BUSY' && i < 2) { await sleep(1500); continue; }
      if (authCode(j.code)) { needLogin(j.reason); throw new Err(j.reason, true); }
      if (j.code === 'U_OVERLAP' && !body.allow_overlap) {
        const o = j.overlap || {};
        if (await ask('ตำแหน่ง U ซ้อนกับ <b>' + esc(o.name) + '</b> (' + uTxt(o.u_top, o.u_bottom) + ')<br>ต้องการบันทึกซ้อนทับหรือไม่', 'บันทึกซ้อนทับ')) { body = Object.assign({}, body, { allow_overlap: true }); continue; }
        throw new Err('ยกเลิก', true);
      }
      if (j.code === 'CONFLICT' && opt.conflict !== 'reason') {
        sheetClose(true);
        await load().then(() => rerender()).catch(() => {});
        throw new Err('มีคนอื่นแก้ไขข้อมูลนี้ไปก่อนแล้ว ระบบโหลดข้อมูลล่าสุดให้แล้ว กรุณาตรวจสอบแล้วทำรายการใหม่');
      }
      throw new Err(j.reason || 'บันทึกไม่สำเร็จ');
    }
  } finally { BUSY--; }
}
async function run(btn, fn) {
  if (btn.disabled) return;
  btn.disabled = true;
  try { await fn(); }
  catch (e) { if (!e.quiet) { const er = $('#f_err'); if (er) er.textContent = e.message; else toast(e.message, true); } }
  finally { btn.disabled = false; }
}

// ───────────── login (กรณีไม่มี session จาก Portal) ─────────────
function needLogin(msg) {
  READY = false; ME = null; TOKEN = '';
  try { sessionStorage.removeItem(K_OWN); } catch (_) { /* ignore */ }
  sheetClose(true); chip();
  showLogin(msg || 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
}
function logout() {
  try { sessionStorage.removeItem(K_OWN); localStorage.removeItem(K_CACHE); } catch (_) { /* ignore */ }
  needLogin('ออกจากระบบแล้ว');
}
function showLogin(msg) {
  READY = false;
  M.innerHTML = '';
  let o = $('#lo');
  if (!o) { o = document.createElement('div'); o.id = 'lo'; document.body.appendChild(o); }
  o.innerHTML = '<form class="lc" id="lf"><h3>เข้าสู่ระบบ Face Rack</h3><p class="sub">ใช้รหัสพนักงานและรหัสผ่านเดียวกับ IDC3 Portal</p>' +
    '<div class="fl"><label for="l_id">รหัสพนักงาน</label><input id="l_id" autocomplete="username" autocapitalize="characters" required></div>' +
    '<div class="fl"><label for="l_pw">รหัสผ่าน</label><input id="l_pw" type="password" autocomplete="current-password" required></div>' +
    '<p class="er" id="l_er">' + esc(msg || '') + '</p><div class="fb"><button class="bt p" id="l_ok" type="submit">เข้าสู่ระบบ</button></div></form>';
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const er = $('#l_er'), btn = $('#l_ok');
    if (!CFG.STOCK_GAS_URL) { er.textContent = 'ยังไม่ได้ตั้งค่า STOCK_GAS_URL ใน config.js'; return; }
    btn.disabled = true; er.textContent = '';
    try {
      const j = await post(CFG.STOCK_GAS_URL, { action: 'login', emp_id: $('#l_id').value.trim().toUpperCase(), pin: $('#l_pw').value });
      if (!j.ok) throw new Err(j.reason || 'รหัสผ่านไม่ถูกต้อง');
      if (j.isFirst) throw new Err('บัญชีนี้ยังไม่ได้เปลี่ยนรหัสผ่านครั้งแรก กรุณาเข้า IDC3 Portal เพื่อเปลี่ยนรหัสผ่านก่อน');
      if (!j.token) throw new Err('เซิร์ฟเวอร์ยังไม่ออก token (ตรวจสอบว่าแพตช์ GAS Stock และ Deploy เวอร์ชันใหม่แล้ว)');
      sessionStorage.setItem(K_OWN, JSON.stringify({ token: j.token }));
      o.remove(); boot();
    } catch (x) { er.textContent = x.message; btn.disabled = false; }
  };
  setTimeout(() => { const i = $('#l_id'); if (i) i.focus(); }, 50);
}
function fatal(msg) {
  M.innerHTML = '<div class="box"><b>เปิดข้อมูล Face Rack ไม่ได้</b><p>' + esc(msg) + '</p><div class="ab"><button class="bt p" id="rt">ลองอีกครั้ง</button></div></div>';
  $('#rt').onclick = () => { M.innerHTML = '<p class="empty">กำลังโหลดข้อมูล…</p>'; boot(); };
}

// ───────────── U helpers ─────────────
function freeRanges(rid, ex) {
  const r = byId[rid]; if (!r) return [];
  const occ = new Array(43).fill(false);
  r.dv.forEach(v => { if (v[7] === ex) return; for (let u = Math.max(1, v[1]); u <= Math.min(42, v[0]); u++) occ[u] = true; });
  const out = []; let s = 0;
  for (let u = 1; u <= 42; u++) { if (!occ[u]) { if (!s) s = u; } else if (s) { out.push([s, u - 1]); s = 0; } }
  if (s) out.push([s, 42]);
  return out.reverse();
}
const overlapOf = (rid, t, b, ex) => { const r = byId[rid]; return r ? (r.dv.find(v => v[7] !== ex && v[1] <= t && v[0] >= b) || null) : null; };

// ───────────── ฟอร์มนำเข้า / แก้ไข / ย้าย ─────────────
function devForm(r, v) {
  const E = !!v, ex = E ? v[7] : null;
  const init = { name: E ? v[2] : '', top: E ? v[0] : '', bot: E ? v[1] : '', pw: E ? v[3] : 'Dual', ups: E && v[4] ? v[4].split(',') : [], rpp: E ? v[5] : '' };
  let pw = init.pw;
  const ups = new Set(init.ups);
  const s = sheetOpen('<h3>' + (E ? 'แก้ไข / ย้ายเครื่อง' : 'นำเครื่องเข้า Rack') + '</h3><p class="sub">' + esc(r.name) + ' / ' + esc(r.c) + '</p>' +
    (E ? '<div class="fl"><label for="f_rack">Rack (เปลี่ยนค่านี้เพื่อย้ายเครื่อง)</label><input id="f_rack" list="dl_racks" value="' + esc(r.id) + '" autocomplete="off"></div>' : '') +
    '<div class="fl"><label for="f_name">ชื่อ / รุ่นอุปกรณ์</label><input id="f_name" list="dl_names" value="' + esc(init.name) + '" maxlength="300" autocomplete="off" placeholder="เช่น Dell PowerEdge R650"></div>' +
    '<div class="fr"><div class="fl"><label for="f_top">U บน</label><input id="f_top" type="number" inputmode="numeric" min="1" max="42" value="' + esc(init.top) + '"></div>' +
    '<div class="fl"><label for="f_bot">U ล่าง</label><input id="f_bot" type="number" inputmode="numeric" min="1" max="42" value="' + esc(init.bot) + '"></div></div>' +
    '<div class="sub" id="f_free" style="margin-top:8px"></div><p class="wn" id="f_ov" hidden></p>' +
    '<div class="fl"><label>ชนิดไฟ</label><div class="sg" id="f_pw">' + PW.map(p => '<button type="button" data-p="' + esc(p) + '" class="' + (p === pw ? 'on' : '') + '">' + esc(p) + '</button>').join('') + '</div></div>' +
    '<div id="f_px"><div class="fl"><label>UPS ที่ต่อ</label><div class="sg" id="f_ups">' + UL.map(u => '<button type="button" data-u="' + u + '" class="' + (ups.has(u) ? 'on' : '') + '">' + u + '</button>').join('') + '</div><p class="sub" id="f_uh" style="margin-top:6px"></p></div>' +
    '<div class="fl"><label for="f_rpp">RPP / ปลั๊ก</label><input id="f_rpp" value="' + esc(init.rpp) + '" maxlength="300" placeholder="เช่น 13/RPP1-A5 / 2/RPP2-D5"></div></div>' +
    '<div class="fl"><label for="f_note">หมายเหตุ (บันทึกในประวัติ)</label><input id="f_note" maxlength="200"></div>' +
    '<p class="er" id="f_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="f_x">ยกเลิก</button><button type="button" class="bt p" id="f_ok">บันทึก</button></div>');

  const g = id => s.querySelector('#' + id);
  const rid = () => E ? g('f_rack').value.trim() : r.id;
  const num = el => { const t = el.value.trim(); return t === '' ? NaN : Number(t); };

  function refresh() {
    const id = rid(), rk = byId[id];
    const free = rk ? freeRanges(id, ex) : [];
    g('f_free').innerHTML = !rk ? '<span class="sub">ไม่พบ Rack "' + esc(id) + '"</span>' :
      'U ว่างใน Rack นี้: ' + (free.length ? '<span class="fu">' + free.map(f => '<button type="button" data-lo="' + f[0] + '" data-hi="' + f[1] + '">' + (f[0] === f[1] ? 'U' + f[0] : 'U' + f[0] + '-' + f[1]) + '</button>').join('') + '</span>' : 'ไม่มี (เต็ม)');
    const t = num(g('f_top')), b = num(g('f_bot')), w = g('f_ov');
    const ov = rk && Number.isInteger(t) && Number.isInteger(b) && t >= b ? overlapOf(id, t, b, ex) : null;
    w.hidden = !ov;
    if (ov) w.textContent = 'ตำแหน่งนี้ซ้อนกับ "' + ov[2] + '" (' + uTxt(ov[0], ov[1]) + ') ตอนบันทึกระบบจะขอให้ยืนยัน';
    const isP = pw === 'Single' || pw === 'Dual';
    g('f_px').hidden = !isP;
    const n = ups.size;
    g('f_uh').textContent = pw === 'Single' ? (n === 1 ? '' : 'Single ปกติต่อ UPS 1 ตัว (ไม่เลือก = ไม่ได้เสียบ Source Power)') : pw === 'Dual' ? (n >= 2 ? '' : 'Dual ปกติต่อ UPS ตั้งแต่ 2 ตัว') : '';
  }
  s.addEventListener('input', refresh);
  s.addEventListener('click', e => {
    const p = e.target.closest('[data-p]');
    if (p) { pw = p.dataset.p; s.querySelectorAll('#f_pw button').forEach(x => x.classList.toggle('on', x === p)); refresh(); return; }
    const u = e.target.closest('[data-u]');
    if (u) { const k = u.dataset.u; ups.has(k) ? ups.delete(k) : ups.add(k); u.classList.toggle('on', ups.has(k)); refresh(); return; }
    const f = e.target.closest('[data-hi]');
    if (f) {
      const hi = +f.dataset.hi, lo = +f.dataset.lo, t = num(g('f_top')), b = num(g('f_bot'));
      const h = Number.isInteger(t) && Number.isInteger(b) && t >= b ? t - b + 1 : 1;
      g('f_top').value = hi; g('f_bot').value = Math.max(lo, hi - h + 1); refresh();
    }
  });
  g('f_x').onclick = () => sheetClose();
  g('f_ok').onclick = ev => run(ev.currentTarget, async () => {
    const id = rid(), name = g('f_name').value.trim(), t = num(g('f_top')), b = num(g('f_bot'));
    const er = msg => { throw new Err(msg, false); };
    g('f_err').textContent = '';
    if (!byId[id]) er('ไม่พบ Rack "' + id + '"');
    if (!name) er('กรุณาระบุชื่อ / รุ่นอุปกรณ์');
    if (!Number.isInteger(t) || !Number.isInteger(b)) er('กรุณาระบุ U บน และ U ล่าง เป็นเลขจำนวนเต็ม');
    if (t < 1 || t > 42 || b < 1 || b > 42) er('U ต้องอยู่ระหว่าง 1-42');
    if (b > t) er('U ล่างต้องไม่มากกว่า U บน');
    const isP = pw === 'Single' || pw === 'Dual';
    const cur = { name, power: pw, ups: isP ? UL.filter(u => ups.has(u)).join(',') : '', rpp: isP ? g('f_rpp').value.trim() : '', u_top: t, u_bottom: b };
    const note = g('f_note').value.trim();
    if (!E) {
      await write(Object.assign({ action: 'device_in', rack_id: id, note }, cur));
      sheetClose(true); toast('นำเครื่องเข้า ' + id + ' แล้ว'); await afterWrite(); return;
    }
    const old = { name: v[2], power: v[3], ups: v[4], rpp: v[5], u_top: v[0], u_bottom: v[1] };
    const fields = {}; Object.keys(cur).forEach(k => { if (String(cur[k]) !== String(old[k])) fields[k] = cur[k]; });
    const moved = id !== r.id;
    if (!moved && !Object.keys(fields).length) { sheetClose(); toast('ไม่มีการเปลี่ยนแปลง'); return; }
    if (moved && !(await ask('ย้ายเครื่อง <b>' + esc(v[2]) + '</b><br>จาก ' + esc(r.id) + ' ไป ' + esc(id) + ' ใช่หรือไม่', 'ย้ายเครื่อง'))) throw new Err('ยกเลิก', true);
    const body = { action: 'device_edit', dev_id: v[7], rev: v[8], fields, note };
    if (moved) body.to_rack_id = id;
    await write(body);
    sheetClose(true); toast(moved ? 'ย้ายเครื่องไป ' + id + ' แล้ว' : 'บันทึกแล้ว'); await afterWrite();
  });
  refresh();
  setTimeout(() => g(E ? 'f_name' : 'f_name').focus(), 60);
}

// ───────────── จัดการเครื่อง (เลือกแก้ไข/ย้าย/นำออก) ─────────────
function manage(r, v) {
  const s = sheetOpen('<h3>' + esc(v[2]) + '</h3><p class="sub">' + esc(r.name) + ' / ' + esc(devSub(v)) + (v[5] ? ' / RPP ' + esc(v[5]) : '') + '</p>' +
    '<div class="mg"><button class="bt p" data-k="edit">แก้ไข / ย้าย Rack</button><button class="bt d" data-k="out">นำออกจาก Rack</button><button class="bt" data-k="hist">ประวัติเครื่องนี้</button><button class="bt" data-k="x">ปิด</button></div>');
  s.onclick = e => {
    const k = e.target.closest('[data-k]'); if (!k) return;
    if (k.dataset.k === 'edit') devForm(r, v);
    else if (k.dataset.k === 'out') bulkForm(r, v[7]);
    else if (k.dataset.k === 'hist') histSheet({ rack: r, dev: v });
    else sheetClose();
  };
}
function openDev(r, id) { const v = r.dv.find(x => x[7] === id); if (v) manage(r, v); }

// ───────────── แก้ข้อมูล Rack ─────────────
function rackForm(r) {
  const s = sheetOpen('<h3>ข้อมูล ' + esc(r.name) + '</h3><p class="sub">' + esc(r.zone) + ' ' + esc(r.row) + ' / Rack ' + r.n + ' / มีเครื่อง ' + r.dv.length + ' รายการ</p>' +
    '<div class="fl"><label for="k_c">ลูกค้า / กลุ่ม</label><input id="k_c" list="dl_cust" value="' + esc(r.c) + '" maxlength="100" autocomplete="off"></div>' +
    '<div class="fl"><label for="k_st">สถานะ</label><select id="k_st">' + ST.map(x => '<option value="' + x[0] + '"' + (x[0] === r.st ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select></div>' +
    '<div class="fl"><label for="k_note">หมายเหตุของ Rack</label><input id="k_note" value="' + esc(r.note || '') + '" maxlength="500"></div>' +
    '<p class="er" id="f_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="f_x">ยกเลิก</button><button type="button" class="bt p" id="f_ok">บันทึก</button></div>');
  s.querySelector('#f_x').onclick = () => sheetClose();
  s.querySelector('#f_ok').onclick = ev => run(ev.currentTarget, async () => {
    const c = s.querySelector('#k_c').value.trim(), st = s.querySelector('#k_st').value, note = s.querySelector('#k_note').value.trim();
    const fields = {};
    if (c !== r.c) { if (!c) throw new Err('กรุณาระบุชื่อลูกค้า / กลุ่ม'); fields.c = c; }
    if (st !== r.st) fields.st = st;
    if (note !== (r.note || '')) fields.note = note;
    if (!Object.keys(fields).length) { sheetClose(); toast('ไม่มีการเปลี่ยนแปลง'); return; }
    if (fields.st === 'empty' && r.dv.length && !(await ask('Rack นี้ยังมีเครื่อง <b>' + r.dv.length + '</b> รายการ<br>ต้องการตั้งสถานะเป็น "ว่าง" ใช่หรือไม่', 'ตั้งเป็นว่าง'))) throw new Err('ยกเลิก', true);
    await write({ action: 'rack_update', rack_id: r.id, fields });
    sheetClose(true); toast('บันทึกข้อมูล Rack แล้ว'); await afterWrite();
  });
}

// ───────────── ON / OFF ไฟทั้ง Rack ─────────────
const PWR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>';

function powerState(r) {
  let on = 0, off = 0;
  r.dv.forEach(v => { if (isP(v[3])) on++; else if (v[3] === 'ไม่ ON') off++; });
  return { on, off };
}

/** แผงปุ่ม ON/OFF: ปุ่มที่ใช้ไม่ได้จะเป็นสีเทา (disabled) พร้อมบอกเหตุผลใต้ปุ่ม */
function powerPanel(r) {
  if (!CAN || (r.st !== 'use' && r.st !== 'off') || !r.dv.length) return '';
  const p = powerState(r), off = !ONLINE;
  const onOk = !off && (p.off > 0 || r.st === 'off'), offOk = !off && p.on > 0;
  const capOn = off ? 'ออฟไลน์' : p.off ? 'เปิดไฟ ' + p.off + ' เครื่อง' : r.st === 'off' ? 'เปลี่ยนเป็นใช้งาน' : p.on ? 'ON อยู่แล้ว' : 'ไม่มีเครื่องรอ ON';
  const capOff = off ? 'ออฟไลน์' : p.on ? 'ปิดไฟ ' + p.on + ' เครื่อง' : p.off ? 'OFF อยู่แล้ว' : 'ไม่มีเครื่องที่ ON';
  return '<div class="pw"><div class="ph"><b>ไฟทั้ง Rack</b><div class="pn">' +
    (p.on ? '<i class="pon">ON ' + p.on + '</i>' : '') + (p.off ? '<i class="pof">ไม่ ON ' + p.off + '</i>' : '') + '</div></div>' +
    '<div class="pg"><button type="button" class="pbn pv-on" data-a="pon"' + (onOk ? '' : ' disabled') + '>' + PWR_ICON + '<b>ON Rack</b><small>' + capOn + '</small></button>' +
    '<button type="button" class="pbn pv-off" data-a="poff"' + (offOk ? '' : ' disabled') + '>' + PWR_ICON + '<b>OFF Rack</b><small>' + capOff + '</small></button></div></div>';
}

/** Rack สถานะ "วางเครื่อง (ไม่ ON)" ที่ไม่มีเครื่องชนิดไฟ "ไม่ ON" (เช่น ข้อมูลเดิมที่ตั้งสถานะระดับ Rack) → เปลี่ยนสถานะเป็น "ใช้งาน" โดยคงค่าไฟของแต่ละเครื่องไว้ */
function powerOnPlain(r) {
  const s = sheetOpen('<h3>ON Rack ทั้งหมด</h3><p class="sub">' + esc(r.name) + ' / ' + esc(r.c) + '</p>' +
    '<p class="am">Rack นี้ตั้งสถานะเป็น "วางเครื่อง (ไม่ ON)" มีอุปกรณ์ <b>' + r.dv.length + '</b> รายการ — ระบบจะเปลี่ยนสถานะ Rack เป็น "ใช้งาน" และคงค่า Single / Dual / UPS / RPP ของแต่ละเครื่องไว้ตามเดิม</p>' +
    '<div class="fl"><label for="f_note">หมายเหตุ (บันทึกในประวัติ)</label><input id="f_note" maxlength="200"></div>' +
    '<p class="er" id="f_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="f_x">ยกเลิก</button><button type="button" class="bt p" id="f_ok">ON Rack</button></div>');
  s.querySelector('#f_x').onclick = () => sheetClose();
  s.querySelector('#f_ok').onclick = ev => run(ev.currentTarget, async () => {
    await write({ action: 'rack_update', rack_id: r.id, fields: { st: 'use' }, note: 'ON Rack ' + s.querySelector('#f_note').value.trim() });
    sheetClose(true); toast('ON Rack ' + r.name + ' แล้ว'); await afterWrite();
  });
}

function powerOnForm(r) {
  const tg = r.dv.filter(v => v[3] === 'ไม่ ON');
  if (!tg.length) { if (r.st === 'off') powerOnPlain(r); return; }
  const PWO = ['Single', 'Dual', 'ไม่ใช้ไฟ'];
  const rows = tg.map(v => ({
    id: v[7], rev: v[8], name: v[2], u: uTxt(v[0], v[1]),
    pw: isP(v[9]) ? v[9] : '', ups: new Set(v[10] ? String(v[10]).split(',').filter(Boolean) : []),
    rpp: v[11] || '', known: isP(v[9]),
  }));
  const bulk = { pw: 'Dual', ups: new Set() };
  const rowHtml = (x, i) => '<div class="pr' + (x.pw ? '' : ' need') + '" data-i="' + i + '"><div class="pt"><b>' + esc(x.name) + '</b><span>' + esc(x.u) + '</span></div>' +
    '<div class="sg sm" data-g="pw">' + PWO.map(p => '<button type="button" data-p="' + esc(p) + '" class="' + (p === x.pw ? 'on' : '') + '">' + esc(p) + '</button>').join('') + '</div>' +
    '<div class="px"' + (isP(x.pw) ? '' : ' hidden') + '><div class="sg sm" data-g="ups">' + UL.map(u => '<button type="button" data-u="' + u + '" class="' + (x.ups.has(u) ? 'on' : '') + '">' + u + '</button>').join('') + '</div>' +
    '<input data-rpp value="' + esc(x.rpp) + '" maxlength="300" placeholder="RPP / ปลั๊ก (ถ้ามี)" aria-label="RPP"></div>' +
    (x.known ? '<div class="sub rm">เติมค่าเดิมก่อนปิดไฟให้แล้ว</div>' : '') + '</div>';
  const bulkHtml = tg.length > 1 ? '<div class="pbk"><div class="sub">ตั้งค่าให้ทุกเครื่องพร้อมกัน</div><div class="sg sm" id="b_pw">' +
    ['Single', 'Dual'].map(p => '<button type="button" data-bp="' + p + '" class="' + (p === bulk.pw ? 'on' : '') + '">' + p + '</button>').join('') + '</div>' +
    '<div class="sg sm" id="b_ups">' + UL.map(u => '<button type="button" data-bu="' + u + '">' + u + '</button>').join('') + '</div>' +
    '<button type="button" class="bt s" id="b_ap">ใช้กับทุกเครื่อง</button></div>' : '';
  const s = sheetOpen('<h3>ON Rack ทั้งหมด</h3><p class="sub">' + esc(r.name) + ' / ' + esc(r.c) + '</p>' +
    '<p class="am">เปิดไฟ <b>' + tg.length + '</b> เครื่องที่ยังไม่ ON — Rack จะเปลี่ยนเป็น "ใช้งาน" และนับรวมใน UPS / Dashboard</p>' + bulkHtml +
    '<div id="pl">' + rows.map(rowHtml).join('') + '</div>' +
    '<div class="fl"><label for="f_note">หมายเหตุ (บันทึกในประวัติ)</label><input id="f_note" maxlength="200"></div>' +
    '<p class="er" id="f_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="f_x">ยกเลิก</button><button type="button" class="bt p" id="f_ok">ON Rack</button></div>');
  const paint = i => { const el = s.querySelector('.pr[data-i="' + i + '"]'); if (el) el.outerHTML = rowHtml(rows[i], i); };
  s.addEventListener('click', e => {
    const bp = e.target.closest('[data-bp]');
    if (bp) { bulk.pw = bp.dataset.bp; s.querySelectorAll('#b_pw button').forEach(x => x.classList.toggle('on', x === bp)); return; }
    const bu = e.target.closest('[data-bu]');
    if (bu) { const k = bu.dataset.bu; bulk.ups.has(k) ? bulk.ups.delete(k) : bulk.ups.add(k); bu.classList.toggle('on', bulk.ups.has(k)); return; }
    if (e.target.closest('#b_ap')) { rows.forEach((x, i) => { x.pw = bulk.pw; x.ups = new Set(bulk.ups); paint(i); }); return; }
    const row = e.target.closest('.pr'); if (!row) return;
    const i = +row.dataset.i, x = rows[i];
    const p = e.target.closest('[data-p]');
    if (p) { x.pw = p.dataset.p; paint(i); return; }
    const u = e.target.closest('[data-u]');
    if (u) { const k = u.dataset.u; x.ups.has(k) ? x.ups.delete(k) : x.ups.add(k); u.classList.toggle('on', x.ups.has(k)); }
  });
  s.addEventListener('input', e => {
    if (!e.target.matches('[data-rpp]')) return;
    const row = e.target.closest('.pr'); if (row) rows[+row.dataset.i].rpp = e.target.value;
  });
  s.querySelector('#f_x').onclick = () => sheetClose();
  s.querySelector('#f_ok').onclick = ev => run(ev.currentTarget, async () => {
    s.querySelector('#f_err').textContent = '';
    const miss = rows.filter(x => !x.pw);
    if (miss.length) {
      const el = s.querySelector('.pr.need'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      throw new Err('กรุณาเลือกชนิดไฟให้ครบทุกเครื่อง (ยังเหลือ ' + miss.length + ' เครื่อง)');
    }
    const noUps = rows.filter(x => isP(x.pw) && !x.ups.size).length;
    if (noUps && !(await ask('มี <b>' + noUps + '</b> เครื่องที่ยังไม่ได้เลือก UPS<br>ระบบจะนับเป็น "ไม่ได้เสียบ Source Power" ต้องการ ON ต่อหรือไม่', 'ON ต่อ'))) throw new Err('ยกเลิก', true);
    const devices = rows.map(x => ({
      dev_id: x.id, rev: x.rev, power: x.pw,
      ups: isP(x.pw) ? UL.filter(u => x.ups.has(u)).join(',') : '', rpp: isP(x.pw) ? x.rpp.trim() : '',
    }));
    const j = await write({ action: 'rack_on', rack_id: r.id, devices, note: s.querySelector('#f_note').value.trim() });
    sheetClose(true); toast('ON Rack ' + r.name + ' แล้ว (' + (j.count || rows.length) + ' เครื่อง)'); await afterWrite();
  });
}

function powerOffForm(r) {
  const tg = r.dv.filter(v => isP(v[3]));
  if (!tg.length) return;
  const sN = tg.filter(v => v[3] === 'Single').length, dN = tg.length - sN;
  const ups = [...new Set(tg.flatMap(v => v[4] ? String(v[4]).split(',') : []))].sort();
  const names = tg.slice(0, 6).map(v => '<p>' + esc(uTxt(v[0], v[1])) + ' ' + esc(String(v[2]).slice(0, 38)) + '</p>').join('') + (tg.length > 6 ? '<p>และอีก ' + (tg.length - 6) + ' เครื่อง</p>' : '');
  const s = sheetOpen('<h3>OFF Rack ทั้งหมด</h3><p class="sub">' + esc(r.name) + ' / ' + esc(r.c) + '</p>' +
    '<div class="box r" style="margin:12px 0 0"><b>ปิดไฟ ' + tg.length + ' เครื่อง (Single ' + sN + ' · Dual ' + dN + ')</b>' +
    (ups.length ? '<p>UPS ที่เกี่ยวข้อง: UPS-' + esc(ups.join(', UPS-')) + '</p>' : '') + names + '</div>' +
    '<p class="sub" style="margin-top:10px">เครื่องจะเปลี่ยนเป็น "ไม่ ON" และ Rack เป็น "วางเครื่อง (ไม่ ON)" ระบบจำค่า UPS / RPP เดิมไว้ ตอน ON Rack จะเติมคืนให้อัตโนมัติ</p>' +
    '<div class="fl"><label for="o_why">เหตุผล</label><select id="o_why">' + OFF_REASONS.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></div>' +
    '<div class="fl"><label for="f_note">หมายเหตุเพิ่มเติม</label><input id="f_note" maxlength="200"></div>' +
    '<p class="er" id="f_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="f_x">ยกเลิก</button><button type="button" class="bt d" id="f_ok">OFF Rack</button></div>');
  s.querySelector('#f_x').onclick = () => sheetClose();
  s.querySelector('#f_ok').onclick = ev => run(ev.currentTarget, async () => {
    const extra = s.querySelector('#f_note').value.trim();
    const note = s.querySelector('#o_why').value + (extra ? ' — ' + extra : '');
    const j = await write({ action: 'rack_off', rack_id: r.id, devices: tg.map(v => ({ dev_id: v[7], rev: v[8] })), note });
    sheetClose(true); toast('OFF Rack ' + r.name + ' แล้ว (' + (j.count || tg.length) + ' เครื่อง)'); await afterWrite();
  });
}

// ───────────── ประวัติ / Undo ─────────────
function logRow(l, showRack) {
  const d = new Date(l.timestamp);
  const t = isNaN(d) ? l.timestamp : d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return '<div class="lr' + (l.undone ? ' un' : '') + '"><div class="lh"><b>' + esc(ACT[l.action] || l.action) + '</b> ' + esc(l.dev_name || '') +
    (showRack && l.rack_id ? ' <a class="sub" href="#rack/' + enc(l.rack_id) + '">' + esc(l.rack_id) + '</a>' : '') + '</div>' +
    '<div class="sub">' + esc(t) + ' · ' + esc(l.emp_name || l.emp_id) + (l.note ? ' · ' + esc(l.note) : '') + (l.undone ? ' · ถูกย้อนกลับแล้ว' : '') + '</div>' +
    (ADMIN && !l.undone && l.action !== 'undo' ? '<button class="bt s" data-undo="' + esc(l.log_id) + '">ย้อนกลับ</button>' : '') + '</div>';
}
async function fetchLogs(q) {
  const j = await api(Object.assign({ action: 'get_logs' }, q));
  if (!j.ok) { if (authCode(j.code)) { needLogin(j.reason); throw new Err(j.reason, true); } throw new Err(j.reason || 'โหลดประวัติไม่สำเร็จ'); }
  return j.logs;
}
function wireUndo(box, logs) {
  box.onclick = async e => {
    const b = e.target.closest('[data-undo]'); if (!b || b.disabled) return;
    const l = logs.find(x => x.log_id === b.dataset.undo); if (!l) return;
    if (!(await ask('ย้อนกลับรายการ <b>' + esc(ACT[l.action] || l.action) + ' ' + esc(l.dev_name || '') + '</b> ใช่หรือไม่', 'ย้อนกลับ', true))) return;
    b.disabled = true;
    try { await write({ action: 'undo', log_id: l.log_id }, { conflict: 'reason' }); sheetClose(true); toast('ย้อนกลับแล้ว'); await afterWrite(); }
    catch (x) { if (!x.quiet) toast(x.message, true); b.disabled = false; }
  };
}
async function histSheet(q) {
  const title = q.dev ? 'ประวัติ: ' + q.dev[2] : 'ประวัติ ' + q.rack.name;
  const s = sheetOpen('<h3>' + esc(title) + '</h3><div id="hl"><p class="empty">กำลังโหลด…</p></div><div class="fb"><button class="bt" id="f_x">ปิด</button></div>');
  s.querySelector('#f_x').onclick = () => sheetClose();
  try {
    const logs = await fetchLogs(q.dev ? { dev_id: q.dev[7], limit: 40 } : { rack_id: q.rack.id, limit: 40 });
    const box = s.querySelector('#hl'); if (!box) return;
    box.innerHTML = logs.length ? logs.map(l => logRow(l, false)).join('') : '<p class="empty">ยังไม่มีประวัติ</p>';
    wireUndo(box, logs);
  } catch (e) { const box = s.querySelector('#hl'); if (box && !e.quiet) box.innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
}
async function mountLog() {
  const box = $('#lgx'); if (!box) return;
  try {
    const logs = await fetchLogs({ limit: 80 });
    const b = $('#lgx'); if (!b) return;
    b.innerHTML = logs.length ? logs.map(l => logRow(l, true)).join('') : '<p class="empty">ยังไม่มีรายการ</p>';
    wireUndo(b, logs);
  } catch (e) { const b = $('#lgx'); if (b && !e.quiet) b.innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
}
V.log = () => '<a class="back" href="#dash">‹ กลับ</a><h2>ความเคลื่อนไหวล่าสุด</h2><div id="lgx"><p class="empty">กำลังโหลด…</p></div>';

// ───────────── จัดการหลายเครื่องพร้อมกัน (แก้ Source / ชนิดไฟ + นำออก) ─────────────
const upsSet = v => new Set(isP(v[3]) && v[4] ? String(v[4]).split(',').filter(Boolean) : []);
const upsKey = v => { const c = upsSet(v), a = UL.filter(u => c.has(u)); return a.length ? a.join(',') : '-'; };
const upsLbl = k => (!k || k === '-') ? 'ไม่ได้เสียบ Source' : k.split(',').map(x => 'UPS-' + x).join(' + ');
const bch = (attr, val, lbl, on) => '<button type="button" ' + attr + '="' + esc(val) + '" class="' + (on ? 'on' : '') + '">' + esc(lbl) + '</button>';

/** คำนวณค่าใหม่ของเครื่อง 1 เครื่อง — คืน null ถ้าข้าม (ไม่ใช่เครื่องใช้ไฟ และไม่ได้สั่งให้เปลี่ยนชนิดไฟ) */
function bulkPlan(v, mode, pwm, chosen) {
  const cur = upsSet(v);
  const nx = mode === 'add' ? new Set([...cur, ...chosen]) : mode === 'del' ? new Set([...cur].filter(u => !chosen.has(u))) : new Set(chosen);
  let p;
  if (pwm === 'auto') p = nx.size >= 2 ? 'Dual' : nx.size === 1 ? 'Single' : (isP(v[3]) ? v[3] : null);
  else if (pwm === 'keep') p = isP(v[3]) ? v[3] : null;
  else p = pwm;
  if (!p) return null;
  const ups = UL.filter(u => nx.has(u)).join(',');
  const old = UL.filter(u => cur.has(u)).join(',');
  return { p, ups, ch: p !== v[3] || ups !== old };
}

async function bulkOne(v, pl, note) {
  const body = pl.out
    ? { action: 'device_out', dev_id: v[7], rev: v[8], note }
    : { action: 'device_edit', dev_id: v[7], rev: v[8], fields: { power: pl.p, ups: pl.ups }, note };
  for (let t = 0; ; t++) {
    let j;
    try { j = await api(body); }
    catch (e) { const x = new Err('ไม่ทราบผลการบันทึก (' + e.message + ')'); x.fatal = true; throw x; }
    if (j.ok) return;
    if (j.code === 'BUSY' && t < 3) { await sleep(1500); continue; }
    if (authCode(j.code)) { needLogin(j.reason); const x = new Err(j.reason || 'Session หมดอายุ', true); x.fatal = true; throw x; }
    throw new Err(j.code === 'CONFLICT' ? 'มีคนอื่นแก้ไขเครื่องนี้ไปก่อน' : (j.reason || 'บันทึกไม่สำเร็จ'));
  }
}

/** ฟอร์มจัดการหลายเครื่อง: act = 'edit' (แก้ Source / ชนิดไฟ) หรือ 'out' (นำออก) — pre = dev_id ที่ติ๊กไว้ให้ (มาจากปุ่ม "นำออก" ของเครื่องเดียว) */
function bulkForm(r, pre) {
  const devs = r.dv.filter(v => v[7]).sort((a, b) => b[0] - a[0]);
  if (!devs.length) { toast('Rack นี้ไม่มีเครื่อง', true); return; }
  const canEdit = v => v[3] !== 'ไม่ ON';            // เครื่อง "ไม่ ON" แก้ Source ไม่ได้ (ใช้ปุ่ม ON Rack) แต่นำออกได้
  const preOk = !!pre && devs.some(v => v[7] === pre);
  let act = preOk || !devs.some(canEdit) ? 'out' : 'edit', mode = 'set', pwm = 'auto';
  const sel = new Set(preOk ? [pre] : act === 'edit' ? devs.filter(v => isP(v[3])).map(v => v[7]) : []);
  const chosen = new Set();
  const ACTS = [['edit', 'แก้ Source / ชนิดไฟ'], ['out', 'นำออกจาก Rack']];
  const MODES = [['set', 'แทนที่ทั้งหมด'], ['add', 'เพิ่ม Source'], ['del', 'เอา Source ออก']];
  const PWM = [['auto', 'ตามจำนวน Source'], ['keep', 'คงเดิม'], ['Single', 'Single'], ['Dual', 'Dual']];
  const combos = new Map();
  devs.filter(v => isP(v[3])).forEach(v => { const k = upsKey(v); combos.set(k, (combos.get(k) || 0) + 1); });
  const cnt = p => devs.filter(v => v[3] === p).length;

  const rows = devs.map(v => '<label class="bkr" data-d="' + esc(v[7]) + '"><input type="checkbox"><span><b>' + esc(uTxt(v[0], v[1]) + '  ' + String(v[2]).slice(0, 44)) + '</b><small></small></span></label>').join('');
  const s = sheetOpen('<h3>จัดการหลายเครื่อง</h3><p class="sub">' + esc(r.name) + ' / ' + esc(r.c) + ' / ' + devs.length + ' เครื่อง</p>' +
    '<div class="fl"><label>ต้องการทำอะไร</label><div class="sg sm" id="bk_a">' + ACTS.map(a => bch('data-act', a[0], a[1], a[0] === act)).join('') + '</div></div>' +
    '<div class="fl"><label>เลือกเครื่อง</label><div class="sg sm" id="bk_q">' +
      bch('data-q', 'all', 'ทั้งหมด (' + devs.length + ')') + bch('data-q', 'p', 'ทุกเครื่องใช้ไฟ (' + (cnt('Single') + cnt('Dual')) + ')') + bch('data-q', 'Single', 'Single (' + cnt('Single') + ')') + bch('data-q', 'Dual', 'Dual (' + cnt('Dual') + ')') + bch('data-q', 'none', 'ล้างที่เลือก') +
    '</div>' + (combos.size > 1 ? '<div class="sub" style="margin:8px 0 6px">หรือเลือกตาม Source ปัจจุบัน</div><div class="sg sm" id="bk_k">' + [...combos].map(([k, n]) => bch('data-k', k, upsLbl(k) + ' (' + n + ')')).join('') + '</div>' : '') + '</div>' +
    '<div class="bkl" id="bk_l">' + rows + '</div><p class="bks" id="bk_s"></p>' +
    '<div id="bk_pe"><div class="bkp"><div class="lb">Source (UPS) — เลือกได้กี่ตัวก็ได้</div><div class="sg sm" id="bk_u">' + UL.map(u => bch('data-u', u, u)).join('') + '</div>' +
      '<div class="lb">วิธีใช้กับเครื่องที่เลือก</div><div class="sg sm" id="bk_m">' + MODES.map(m => bch('data-m', m[0], m[1], m[0] === mode)).join('') + '</div>' +
      '<div class="lb">ชนิดไฟ</div><div class="sg sm" id="bk_w">' + PWM.map(m => bch('data-w', m[0], m[1], m[0] === pwm)).join('') + '</div>' +
      '<p class="sub" id="bk_h" style="margin-top:8px"></p></div></div>' +
    '<div id="bk_po"><div class="fl"><label for="o_why">เหตุผลที่นำออก</label><select id="o_why">' + OUT_REASONS.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></div></div>' +
    '<div class="fl"><label for="f_note">หมายเหตุเพิ่มเติม (บันทึกในประวัติ)</label><input id="f_note" maxlength="200"></div>' +
    '<p class="er" id="f_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="f_x">ยกเลิก</button><button type="button" class="bt p" id="bk_ok">บันทึก</button></div>');

  const el = new Map(); s.querySelectorAll('.bkr').forEach(x => el.set(x.dataset.d, x));
  // แผนต่อเครื่อง: โหมดนำออก = ทุกเครื่องที่เลือก / โหมดแก้ = ตาม bulkPlan (ข้ามเครื่อง "ไม่ ON")
  const plan = v => act === 'out' ? { out: true, ch: true } : chosen.size && canEdit(v) ? bulkPlan(v, mode, pwm, chosen) : null;
  const jobs = () => devs.filter(v => sel.has(v[7])).map(v => ({ v, pl: plan(v) })).filter(x => x.pl && x.pl.ch);

  function paint() {
    const out = act === 'out';
    let n = 0, sN = 0, dN = 0, m = 0;
    devs.forEach(v => {
      const on = sel.has(v[7]), row = el.get(v[7]), t = row.querySelector('small');
      row.classList.toggle('on', on); row.querySelector('input').checked = on;
      const base = v[3] + (isP(v[3]) ? ' · ' + upsLbl(upsKey(v)) : '');
      if (on) n++;
      if (!on || (!out && !chosen.size)) { t.textContent = base; return; }
      const pl = plan(v);
      if (!pl) t.textContent = base + ' · ข้าม (' + (canEdit(v) ? 'ไม่ใช่เครื่องใช้ไฟ' : 'ไม่ ON — ใช้ปุ่ม ON Rack') + ')';
      else if (!pl.ch) t.textContent = base + ' · ไม่เปลี่ยน';
      else { t.innerHTML = esc(base) + ' <span class="bka">→ ' + (pl.out ? 'นำออก' : esc(pl.p + ' · ' + upsLbl(pl.ups))) + '</span>'; m++; if (!pl.out) pl.p === 'Single' ? sN++ : dN++; }
    });
    s.querySelector('#bk_pe').hidden = out; s.querySelector('#bk_po').hidden = !out;
    s.querySelector('#bk_s').textContent = 'เลือก ' + n + ' เครื่อง' + (out ? ' · จะนำออก ' + m + ' เครื่อง' : chosen.size ? ' · จะเปลี่ยน ' + m + ' เครื่อง (Single ' + sN + ' · Dual ' + dN + ')' : ' · เลือก Source ด้านล่างเพื่อดูตัวอย่างผลลัพธ์');
    const ok = s.querySelector('#bk_ok');
    ok.textContent = m ? (out ? 'นำออก ' : 'บันทึก ') + m + ' เครื่อง' : out ? 'นำออก' : 'บันทึก';
    ok.classList.toggle('d', out); ok.classList.toggle('p', !out); ok.disabled = !m || !ONLINE;
    s.querySelector('#bk_h').textContent = (pwm === 'auto' ? 'ตามจำนวน Source: 1 ตัว = Single, ตั้งแต่ 2 ตัว = Dual' : pwm === 'keep' ? 'คงชนิดไฟเดิมของแต่ละเครื่อง' : 'ตั้งทุกเครื่องที่เลือกเป็น ' + pwm) + ' · RPP / ปลั๊ก ไม่ถูกแก้';
  }
  const tick = (box, attr, val) => s.querySelectorAll('#' + box + ' button').forEach(b => b.classList.toggle('on', b.getAttribute(attr) === val));

  s.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) {
      if (a.dataset.act !== act) {     // สลับโหมดแล้วรีเซ็ตที่เลือก กันนำออกพลาดจากค่าเริ่มต้นของโหมดแก้
        act = a.dataset.act; sel.clear();
        if (act === 'edit') devs.filter(v => isP(v[3])).forEach(v => sel.add(v[7]));
        tick('bk_a', 'data-act', act); paint();
      }
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) { const k = q.dataset.q; sel.clear(); if (k !== 'none') devs.filter(v => k === 'all' || (k === 'p' ? isP(v[3]) : v[3] === k)).forEach(v => sel.add(v[7])); paint(); return; }
    const k = e.target.closest('[data-k]');
    if (k) { sel.clear(); devs.filter(v => isP(v[3]) && upsKey(v) === k.dataset.k).forEach(v => sel.add(v[7])); paint(); return; }
    const u = e.target.closest('[data-u]');
    if (u) { const x = u.dataset.u; chosen.has(x) ? chosen.delete(x) : chosen.add(x); u.classList.toggle('on', chosen.has(x)); paint(); return; }
    const m = e.target.closest('[data-m]');
    if (m) { mode = m.dataset.m; tick('bk_m', 'data-m', mode); paint(); return; }
    const w = e.target.closest('[data-w]');
    if (w) { pwm = w.dataset.w; tick('bk_w', 'data-w', pwm); paint(); }
  });
  s.addEventListener('change', e => {
    const row = e.target.closest('.bkr'); if (!row || e.target.type !== 'checkbox') return;
    e.target.checked ? sel.add(row.dataset.d) : sel.delete(row.dataset.d); paint();
  });
  s.querySelector('#f_x').onclick = () => sheetClose();

  s.querySelector('#bk_ok').onclick = ev => { const b = ev.currentTarget; return run(b, async () => {
    s.querySelector('#f_err').textContent = '';
    const out = act === 'out';
    if (!out && !chosen.size) throw new Err('กรุณาเลือก Source (UPS) อย่างน้อย 1 ตัว');
    const js = jobs();
    if (!js.length) throw new Err(out ? 'กรุณาเลือกเครื่องที่ต้องการนำออก' : 'ไม่มีเครื่องที่ต้องเปลี่ยน');
    const why = s.querySelector('#o_why').value;
    const sN = js.filter(x => x.pl.p === 'Single').length, dN = js.length - sN;
    const msg = out
      ? 'นำออก <b>' + js.length + '</b> เครื่องจาก <b>' + esc(r.name) + '</b><br>' + js.slice(0, 6).map(x => esc(uTxt(x.v[0], x.v[1]) + ' ' + String(x.v[2]).slice(0, 36))).join('<br>') + (js.length > 6 ? '<br>และอีก ' + (js.length - 6) + ' เครื่อง' : '') + '<br>เหตุผล: ' + esc(why)
      : 'แก้ไข <b>' + js.length + '</b> เครื่องใน <b>' + esc(r.name) + '</b><br>' + MODES.find(x => x[0] === mode)[1] + ': ' + esc([...chosen].sort().map(x => 'UPS-' + x).join(', ')) + '<br>ผลลัพธ์: Single ' + sN + ' · Dual ' + dN;
    if (!(await ask(msg, (out ? 'นำออก ' : 'บันทึก ') + js.length + ' เครื่อง', out))) throw new Err('ยกเลิก', true);
    const extra = s.querySelector('#f_note').value.trim();
    const note = (out ? why : 'แก้หลายเครื่อง') + (extra ? ' — ' + extra : '');
    const okL = [], bad = []; let abort = '', done = 0;
    BUSY++;
    try {
      for (const { v, pl } of js) {
        b.textContent = (out ? 'กำลังนำออก ' : 'กำลังบันทึก ') + (done + 1) + '/' + js.length;
        try { await bulkOne(v, pl, note); okL.push(v); }
        catch (x) { if (x.fatal) { abort = x.message; break; } bad.push([v, x.message]); }
        done++;
      }
    } finally { BUSY--; }
    if (READY) await afterWrite();
    if (!bad.length && !abort) { sheetClose(true); toast((out ? 'นำออก ' : 'แก้ไข ') + okL.length + ' เครื่องแล้ว'); if (out) await offerEmpty(r.id); return; }
    sheetOpen('<h3>ทำรายการไม่ครบ</h3><p class="sub">' + esc(r.name) + '</p><p class="am">สำเร็จ <b>' + okL.length + '</b> เครื่อง · ไม่สำเร็จ <b>' + bad.length + '</b> เครื่อง' + (abort ? ' · หยุดกลางทาง ยังไม่ได้ทำ <b>' + (js.length - done) + '</b> เครื่อง' : '') + '</p>' +
      (abort ? '<p class="er">' + esc(abort) + '</p>' : '') +
      '<div id="hl">' + bad.map(([v, m]) => '<div class="lr"><div class="lh"><b>' + esc(uTxt(v[0], v[1]) + ' ' + String(v[2]).slice(0, 44)) + '</b></div><div class="sub">' + esc(m) + '</div></div>').join('') + '</div>' +
      '<p class="sub" style="margin-top:8px">ระบบโหลดข้อมูลล่าสุดให้แล้ว ตรวจสอบหน้า Rack แล้วทำรายการที่เหลือซ้ำได้</p><div class="fb"><button class="bt p" id="f_x">ปิด</button></div>').querySelector('#f_x').onclick = () => sheetClose();
  }); };
  paint();
}

// ───────────── Rack ไม่มีเครื่องเหลือ แต่สถานะยังเป็น "ใช้งาน" ─────────────
/** สถานะ Rack (st) เป็นค่าที่ตั้งแยกจากรายการเครื่อง — นำเครื่องออกครบแล้วสถานะยังเป็น use/off
 *  ตัวเลข "Rack ใช้งาน" และ "ใช้ x/y" บน Dashboard จึงไม่ลด จนกว่าจะตั้งเป็น "ว่าง" */
const stuckRack = r => !!r && !r.dv.length && (r.st === 'use' || r.st === 'off');
async function setRackEmpty(rid, why) {
  await write({ action: 'rack_update', rack_id: rid, fields: { st: 'empty' }, note: why || 'ไม่มีเครื่องเหลือใน Rack' });
  toast('ตั้ง ' + rid + ' เป็น Rack ว่างแล้ว'); await afterWrite();
}
async function offerEmpty(rid) {
  const r = byId[rid];
  if (!CAN || !stuckRack(r)) return;
  const yes = await ask('Rack <b>' + esc(r.name) + '</b> ไม่มีเครื่องเหลือแล้ว แต่สถานะยังเป็น "' + esc(STL[r.st](r)) + '"<br>ตั้งเป็น "ว่าง" ตอนนี้เลยหรือไม่ (ตัวเลข Rack ใช้งานบน Dashboard จะลดลง)', 'ตั้งเป็นว่าง');
  if (!yes) return;
  try { await setRackEmpty(rid, 'นำเครื่องออกครบทุกเครื่อง'); }
  catch (e) { if (!e.quiet) toast(e.message, true); }
}

// ───────────── hook เข้ากับ router เดิม ─────────────
function mountRack(r) {
  const sub = M.querySelector('p.sub'); if (!sub) return;
  sub.insertAdjacentHTML('afterend', '<div class="ab">' +
    (CAN ? '<button class="bt p" data-a="in"' + (ONLINE ? '' : ' disabled') + '>+ นำเครื่องเข้า</button>' + (r.dv.length ? '<button class="bt" data-a="bulk"' + (ONLINE ? '' : ' disabled') + '>จัดการหลายเครื่อง</button>' : '') + '<button class="bt" data-a="rack">ข้อมูล Rack</button>' : '') +
    '<button class="bt" data-a="hist">ประวัติ</button></div>');
  const ab = M.querySelector('.ab');
  ab.onclick = e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'in') devForm(r, null);
    else if (a.dataset.a === 'rack') rackForm(r);
    else if (a.dataset.a === 'bulk') bulkForm(r);
    else histSheet({ rack: r });
  };
  if (CAN && stuckRack(r)) {
    ab.insertAdjacentHTML('afterend', '<div class="box" style="margin:10px 0"><b>Rack นี้ไม่มีเครื่องแล้ว แต่สถานะยังเป็น "' + esc(STL[r.st](r)) + '"</b><p>ตัวเลข Rack ใช้งานบน Dashboard จึงยังนับ Rack นี้อยู่</p><div class="ab"><button class="bt p" data-e="1"' + (ONLINE ? '' : ' disabled') + '>ตั้งเป็น Rack ว่าง</button></div></div>');
    M.querySelector('[data-e="1"]').onclick = ev => run(ev.currentTarget, () => setRackEmpty(r.id, 'ไม่มีเครื่องเหลือใน Rack'));
  }
  const pp = powerPanel(r);
  if (pp) {
    ab.insertAdjacentHTML('afterend', pp);
    M.querySelector('.pw').onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      if (b.dataset.a === 'pon') powerOnForm(r); else powerOffForm(r);
    };
  }
  if (!CAN) return;
  const pick = e => { const b = e.target.closest('[data-m]'); if (b) openDev(r, b.dataset.m); };
  const dl = $('#dl'); if (dl) dl.addEventListener('click', pick);
  const inf = $('#inf'); if (inf) inf.addEventListener('click', pick);
  const ub = $('.ub');
  if (ub) ub.addEventListener('click', e => {      // ทำงานหลัง handler เดิม (ที่เติมข้อมูลลง #inf)
    const d = e.target.closest('.dv'); if (!d) return;
    const v = r.dv[d.dataset.i];
    if (v && v[7]) $('#inf').insertAdjacentHTML('beforeend', '<div class="ab"><button class="bt p" data-m="' + esc(v[7]) + '">จัดการเครื่องนี้</button></div>');
  });
}
/** หน้ารายการ "วางเครื่อง ไม่ ON": ใส่ปุ่ม ON Rack ใต้การ์ดของแต่ละ Rack */
function mountOffList() {
  if (!CAN) return;
  M.querySelectorAll('a.rb[href^="#rack/"]').forEach(a => {
    const r = byId[decodeURIComponent(a.getAttribute('href').slice(6))];
    if (!r || r.st !== 'off' || !r.dv.length) return;
    const w = document.createElement('div'); w.className = 'rbw';
    a.before(w); w.appendChild(a);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rbon'; b.innerHTML = PWR_ICON + 'ON Rack'; b.disabled = !ONLINE;
    b.onclick = () => powerOnForm(r);
    w.appendChild(b);
  });
}
window.render = function () { if (READY) render0(); };
window.after = function (a, p) {
  after0(a, p);
  if (a === 'rack' && byId[p]) mountRack(byId[p]);
  else if (a === 'st') mountOffList();
  else if (a === 'log') mountLog();
};

// ───────────── boot ─────────────
async function boot() {
  if (!CFG.RACK_GAS_URL) { fatal('ยังไม่ได้ตั้งค่า RACK_GAS_URL ใน config.js'); return; }
  const f = findToken();
  if (!f) { showLogin(); return; }
  TOKEN = f.token; SRC = f.src;
  const emp = (b64j(TOKEN.split('.')[1]) || {}).e;
  const c = readCache(emp);
  if (c) { try { apply(c, true); render(); } catch (_) { READY = false; } }
  try {
    const had = READY;
    if (await load()) { if (had) rerender(); else render(); }
  } catch (e) {
    if (READY) { ONLINE = false; chip(); toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังแสดงข้อมูลที่เก็บไว้ในเครื่อง', true); }
    else fatal(e.message || 'โหลดข้อมูลไม่สำเร็จ');
  }
}
setInterval(check, POLL_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
addEventListener('online', check);
addEventListener('offline', () => { ONLINE = false; chip(); });
boot();
})();
