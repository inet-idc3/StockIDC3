/* ════════════════════════════════════════════════════════════════
 *  rack-source.js — ล็อก Source ตาม Rack + สลับ Source  (โหลดหลัง rack-live.js / rack-powermap.js)
 *  1) ฟอร์ม "นำเครื่องเข้า / แก้ไข": ช่อง RPP / ปลั๊ก เดิม → แสดง Source ที่ผูกกับ Rack (ล็อก) กรอกได้แค่ปลั๊ก P.X (ไม่บังคับ)
 *     ผลลัพธ์ยังลงช่อง #f_rpp เดิมในรูป Phase 2 "EFU1-1A1-1(3)(P.2) / EFU1-1B1-1(3)" → ระบบบันทึก/อ่านค่าแบบเดิมได้ทุกจุด
 *  2) "สลับ Source": เปลี่ยน Source ของ Rack หรือสลับกับ Rack อื่น → ระบบแก้ RPP ของทุกเครื่องในนั้น (คงเลขปลั๊กไว้) ให้อัตโนมัติ
 *  ต้องการ GAS action ใหม่ 1 ตัว: rack_cb_set  (ดู rack-cb-set.gs.txt)
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FC = { A: '#c4372b', B: '#2368c4' }, ID_RE = /^\d{1,2}\/EFU\d+-\d[AB]\d-\d+$/;
const PM = () => window.PowerMap, API = () => window.RackAPI, getR = () => (typeof R !== 'undefined' ? R : []);
const canEdit = () => { try { const m = API().me(); return !!m && (m.role === 'admin' || m.role === 'editor'); } catch (_) { return false; } };
/* Source ของ Phase 2 = "เลข CB/แผง" เช่น 3/EFU1-1A1-1 (ตรงกับคอลัมน์ cb_layout ของชีต RackCB) · ฝั่ง A/B อยู่ในชื่อแผง (…-1A1-1 / …-1B1-1)
   ที่ช่อง rpp ของเครื่องเขียนเป็น EFU1-1A1-1(3)(P.2) · รับได้ทั้ง 3/EFU1-1A1-1 · EFU1-1A1-1(3) · DC2-EFU1-1A1-1_cb03 */
const PNL = 'EFU\\d+-\\d[AB]\\d-\\d+';
const normId = s => { s = String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g, ''); let m;
  if ((m = new RegExp('^(?:DC2-)?(\\d+)/(' + PNL + ')$').exec(s))) return +m[1] + '/' + m[2];
  if ((m = new RegExp('^(?:DC2-)?(' + PNL + ')\\((\\d+)\\)$').exec(s))) return +m[2] + '/' + m[1];
  if ((m = new RegExp('^(?:DC2-)?(' + PNL + ')_CB(\\d+)$').exec(s))) return +m[2] + '/' + m[1];
  return ''; };
/* Source ที่ผูกกับ Rack ใน Phase 2 อยู่ในชีต RackCB และมากับ get_power (window.RackPower.cached().racks[id].src / .miss) — ไม่ได้อยู่ในช่อง rpp ของ Rack
   ลำดับความสำคัญ: ค่าที่เพิ่งบันทึกในเครื่องนี้ (RACK_CB) → ข้อมูล get_power → ช่อง rpp ของ Rack (กรณีเก่า) */
const PWR = () => { try { return (window.RackPower && window.RackPower.cached && window.RackPower.cached()) || null; } catch (_) { return null; } };
const sortSrc = l => l.filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => { const fx = fam(x), fy = fam(y); return fx < fy ? -1 : fx > fy ? 1 : x < y ? -1 : x > y ? 1 : 0; });
const fromPower = r => { const d = PWR(), o = d && d.racks && d.racks[r.id]; return o ? sortSrc((o.src || []).map(b => normId(b.id)).concat((o.miss || []).map(normId)).filter(Boolean)) : []; };
const bound = r => { const k = ((window.RACK_CB || {})[r.id] || []).map(normId).filter(Boolean); if (k.length) return k;
  const p = fromPower(r); if (p.length) return p;
  return entries(r.rpp).map(x => x.id); };
const fam = id => { const m = /-\d([AB])\d-/.exec(id); return m ? m[1] : 'A'; };
const toDev = (id, plug) => { const p = id.split('/'); return p[1] + '(' + p[0] + ')' + (plug ? '(P.' + plug + ')' : ''); };
/* "EFU1-1B1-1(3)(P.2) / EFU1-1A1-1(3) P.5,6" → [{id:'3/EFU1-1B1-1',plug:'2'}, …] */
const entries = s => { s = String(s || ''); const re = /EFU\d+-\d[AB]\d-\d+\s*\(\s*\d+\s*\)/g, ms = []; let m;
  while ((m = re.exec(s))) ms.push({ t: m[0], at: m.index, end: re.lastIndex });
  return ms.map((x, i) => { const tail = s.slice(x.end, i + 1 < ms.length ? ms[i + 1].at : s.length), pm = /P\.?\s*(\d+(?:\s*,\s*\d+)*)/i.exec(tail);
    return { id: normId(x.t), plug: pm ? pm[1].replace(/\s+/g, '') : '' }; }).filter(x => x.id); };
const fmtE = e => e.map(x => toDev(x.id, x.plug)).join(' / ');
const isP = v => v[3] === 'Single' || v[3] === 'Dual';
async function refreshPower(ids) {
  try { const j = await API().api({ action: 'get_power' }), d = PWR();
    if (j && j.ok) { if (d) { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, j); } ids.forEach(id => { if (window.RACK_CB) delete window.RACK_CB[id]; }); }
  } catch (_) { /* ใช้ค่าที่เพิ่งบันทึก (RACK_CB) แทนจนกว่าจะโหลดใหม่ */ }
}
function toast(m, bad) { const d = document.createElement('div'); d.className = 'rs-toast' + (bad ? ' bad' : ''); d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), bad ? 6000 : 2600); }

/* ───────── 1) ฟอร์มนำเครื่องเข้า: Source ล็อก + ปลั๊ก ───────── */
function enhanceForm(inp) {
  inp.dataset.rs = '1';
  const sh = inp.closest('.sh'), fl = inp.closest('.fl'); if (!sh || !fl) return;
  const PX = inp.id === 'a_rpp' ? 'a' : 'f', rk = sh.querySelector('#f_rack'), box = document.createElement('div');
  box.className = 'fl rs-box'; fl.after(box);
  let r = null, sel = new Map(), manual = false, legacy = '', loaded = false;
  const rackOf = () => { const rs = getR(); if (rk) return rs.find(x => x.id === rk.value.trim()) || null; const t = (sh.querySelector('p.sub') || {}).textContent || ''; return rs.find(x => t.indexOf(x.name + ' /') === 0) || null; };
  const pwNow = () => { const b = sh.querySelector('#' + PX + '_pw .on'); return b ? b.dataset.p : 'Dual'; };
  const auto = b => { const n = pwNow() === 'Single' ? 1 : 2, out = [];
    ['A', 'B'].forEach(f => { const x = b.find(i => fam(i) === f); if (x && out.length < n) out.push(x); });
    b.forEach(i => { if (out.length < n && out.indexOf(i) < 0) out.push(i); }); return out; };
  const sync = () => { inp.value = bound(r).filter(i => sel.has(i)).map(i => toDev(i, sel.get(i))).join(' / '); inp.dispatchEvent(new Event('input', { bubbles: true })); };
  const setAuto = () => { sel = new Map(auto(bound(r)).map(i => [i, ''])); legacy = ''; manual = false; };
  function paint() {
    const b = r ? bound(r) : [];
    if (!r) { box.innerHTML = ''; fl.hidden = false; return; }
    if (!b.length) { fl.hidden = false; box.innerHTML = '<p class="rs-n">Rack นี้ยังไม่ได้ผูก Source — กรอก RPP เอง หรือ <a data-rs="' + esc(r.id) + '">ผูก Source ให้ Rack ›</a></p>'; return; }
    fl.hidden = true;
    box.innerHTML = '<label>Source ของ Rack <span class="rs-lk">🔒 ล็อกตามที่ผูกไว้</span></label>' +
      (legacy ? '<p class="rs-n warn">ค่าเดิม “' + esc(legacy) + '” ไม่ตรงกับ Source ที่ผูก <a data-rsfix="1">ใช้ Source ของ Rack</a></p>' : '') +
      b.map(id => { const on = sel.has(id); return '<div class="rs-r' + (on ? ' on' : '') + '"><button type="button" class="rs-t" data-t="' + id + '" aria-pressed="' + on + '"><i style="background:' + FC[fam(id)] + '"></i><b>' + id + '</b><span>' + (on ? 'ใช้' : 'ไม่ใช้') + '</span></button>' +
        '<input class="rs-p" data-pl="' + id + '" inputmode="numeric" maxlength="8" placeholder="P.X" value="' + esc(sel.get(id) || '') + '"' + (on ? '' : ' disabled') + ' aria-label="ปลั๊กของ ' + id + '"></div>'; }).join('') +
      '<p class="rs-n">ใส่เลขปลั๊กหรือไม่ใส่ก็ได้' + (PX === 'a' ? ' (จำนวน > 1 จะได้ปลั๊กเดียวกันทุกเครื่อง แก้ทีหลังได้)' : '') + ' · <a data-rs="' + esc(r.id) + '">สลับ Source ของ Rack ›</a></p>';
  }
  function init() {
    r = rackOf(); const b = r ? bound(r) : [], cur = entries(inp.value);
    sel = new Map(); legacy = '';
    if (cur.length && !cur.every(x => b.indexOf(x.id) >= 0)) legacy = inp.value; else cur.forEach(x => sel.set(x.id, x.plug));
    paint(); if (r && b.length && !legacy && !sel.size) { setAuto(); paint(); sync(); }
    if (r && !b.length && !loaded && window.RackPower && window.RackPower.ensure) { loaded = true; window.RackPower.ensure().then(() => { if (!manual && r === rackOf()) init(); }); }
  }
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-t]'), f = e.target.closest('[data-rsfix]');
    if (f) { setAuto(); paint(); sync(); return; }
    if (!t) return; const id = t.dataset.t; manual = true; legacy = '';
    if (sel.has(id)) sel.delete(id); else { if (pwNow() === 'Single') sel.clear(); sel.set(id, ''); }
    paint(); sync();
  });
  box.addEventListener('input', e => { const p = e.target.closest('[data-pl]'); if (!p) return; manual = true; sel.set(p.dataset.pl, p.value.replace(/[^\d,]/g, '')); sync(); });
  const pwb = sh.querySelector('#' + PX + '_pw');
  if (pwb) pwb.addEventListener('click', () => setTimeout(() => { if (!r || !bound(r).length) return; if (!manual) setAuto(); else if (pwNow() === 'Single' && sel.size > 1) { const k = [...sel][0]; sel = new Map([k]); } paint(); sync(); }, 0));
  if (rk) rk.addEventListener('change', () => { r = rackOf(); loaded = false; if (r && bound(r).length) { setAuto(); paint(); sync(); } else { sel = new Map(); paint(); } });
  /* ฟอร์มเพิ่มหลายรายการ: เพิ่มเข้ารายการแล้วช่องชื่อถูกล้าง → เก็บ Source ไว้ แต่ล้างเลขปลั๊ก (ปลั๊กต่างกันทุกเครื่อง) */
  if (PX === 'a') sh.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.id === 'a_pw' || b.closest('.rs-box') || !/เพิ่มเข้ารายการ/.test(b.textContent)) return;
    setTimeout(() => { const n = sh.querySelector('#a_name'); if (n && !n.value && r && sel.size) { sel.forEach((v, k) => sel.set(k, '')); paint(); sync(); } }, 60); });
  init();
}

/* ───────── 2) สลับ Source ───────── */
function openSwap(r) {
  const old = document.getElementById('ov2'); if (old) old.remove();
  const o = document.createElement('div'); o.id = 'ov2'; o.className = 'ov'; o.innerHTML = '<div class="sh" role="dialog" aria-modal="true"></div>'; document.body.appendChild(o);
  const sh = o.firstElementChild, all = getR(), close = () => { o.remove(); document.removeEventListener('keydown', esc2); }, esc2 = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc2); o.addEventListener('pointerdown', e => { if (e.target === o) close(); });
  const own = {}, amps = {}; all.forEach(x => bound(x).forEach(i => (own[i] = own[i] || []).push(x)));
  { const d = PWR(); if (d && d.racks) Object.keys(d.racks).forEach(k => (d.racks[k].src || []).forEach(b => { const n = normId(b.id); if (n && b.a != null) amps[n] = b.a; })); }
  const known = Object.keys(own).concat(Object.keys(amps)).filter((v, i, a) => a.indexOf(v) === i).sort();
  let mode = 'rep', S = bound(r).slice(), other = null;
  const norm = v => normId(v) || String(v || '').trim().toUpperCase();
  const stat = id => { if (!ID_RE.test(id)) return ['bad', 'รูปแบบไม่ถูก (เช่น 3/EFU1-1A1-1)'];
    const u = (own[id] || []).filter(x => x.id !== r.id && (!other || x.id !== other.id)), a = amps[id] != null ? ' · ตอนนี้ ' + amps[id].toFixed(1) + ' A' : '';
    return u.length ? ['shr', 'ใช้ร่วมกับ ' + u.map(x => x.name).join(', ') + a] : known.indexOf(id) >= 0 ? ['ok', 'ว่าง ไม่มี Rack อื่นใช้' + a] : ['new', 'Source ใหม่ ยังไม่มีในระบบ']; };
  const plan = () => { const cur = bound(r); if (mode === 'rep') return [{ r, from: cur, to: S.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) }].filter(c => c.from.join() !== c.to.join());
    return other ? [{ r, from: cur, to: bound(other) }, { r: other, from: bound(other), to: cur }].filter(c => c.from.join() !== c.to.join()) : []; };
  const devPlan = c => { const m = {}; c.from.forEach((id, i) => { if (id !== c.to[i]) m[id] = c.to[i] || null; });
    return c.r.dv.filter(v => isP(v) && v[5]).map(v => { const e = entries(v[5]); if (!e.some(x => x.id in m)) return null;
      return { v, to: fmtE(e.map(x => (x.id in m ? { id: m[x.id], plug: x.plug } : x)).filter(x => x.id)) }; }).filter(Boolean); };
  function head() {
    sh.innerHTML = '<h3>สลับ Source</h3><p class="sub">' + esc(r.name) + (r.c ? ' / ' + esc(r.c) : '') + '</p>' +
      '<div class="sg" id="rs_m"><button type="button" data-m="rep" class="' + (mode === 'rep' ? 'on' : '') + '">เปลี่ยน Source</button><button type="button" data-m="swp" class="' + (mode === 'swp' ? 'on' : '') + '">สลับกับ Rack อื่น</button></div>' +
      '<datalist id="rs_dl">' + known.map(i => '<option value="' + i + '">').join('') + '</datalist><datalist id="rs_rk">' + all.filter(x => x.id !== r.id).map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join('') + '</datalist>' +
      '<div id="rs_in">' + (mode === 'rep' ?
        S.map((id, i) => '<div class="rs-sw"><span class="rs-old">' + esc(bound(r)[i] || 'ใหม่') + '</span><span>→</span><input class="rs-i" list="rs_dl" data-i="' + i + '" value="' + esc(id) + '" autocapitalize="characters" spellcheck="false" aria-label="Source ใหม่ ช่อง ' + (i + 1) + '"><button type="button" class="bt s" data-rm="' + i + '" aria-label="ถอด">✕</button></div>').join('') + '<button type="button" class="bt s" data-add="1">+ เพิ่ม Source</button>'
        : '<div class="fl"><label for="rs_o">Rack ที่จะสลับ Source ด้วย</label><input id="rs_o" list="rs_rk" value="' + esc(other ? other.id : '') + '" autocomplete="off" placeholder="เช่น ' + esc((all.find(x => x.id !== r.id) || {}).id || '') + '"></div><p class="sub">สลับ Source ทั้งชุดระหว่าง 2 Rack (ลำดับต่อลำดับ) · ใช้ตอนต่อสายสลับตู้กัน</p>') + '</div>' +
      '<div id="rs_pv"></div><div class="fl"><label for="rs_note">หมายเหตุ (บันทึกในประวัติ)</label><input id="rs_note" maxlength="200"></div><p class="er" id="rs_err" role="alert"></p><div class="fb"><button type="button" class="bt" id="rs_x">ยกเลิก</button><button type="button" class="bt p" id="rs_ok">บันทึกการสลับ</button></div>';
    pv();
  }
  function pv() {
    const ch = plan(), bad = mode === 'rep' ? S.some(v => !ID_RE.test(v)) || !S.filter(Boolean).length : false; let h = '', n = 0;
    if (mode === 'rep') h += S.map((id, i) => { const s = id ? stat(id).slice() : ['bad', 'ว่างอยู่']; const o = bound(r)[i]; if (id && o && ID_RE.test(id) && ID_RE.test(o) && fam(id) !== fam(o)) s[1] += ' · ⚠ เปลี่ยนฝั่ง ' + fam(o) + ' → ' + fam(id); return '<p class="rs-st ' + s[0] + '">' + esc(id || '—') + ' · ' + s[1] + '</p>'; }).join('');
    if (mode === 'swp' && other) h += '<p class="rs-st ok">' + esc(r.name) + ' ⇄ ' + esc(other.name) + '</p>';
    ch.forEach(c => { const d = devPlan(c); n += d.length;
      h += '<div class="rs-pv"><b>' + esc(c.r.name) + '</b><div>' + (c.from.join(', ') || '—') + ' → ' + (c.to.join(', ') || '—') + '</div>' + (d.length ? '<div class="sub">แก้ RPP ' + d.length + ' เครื่องอัตโนมัติ (คงเลขปลั๊กเดิม)</div>' + d.slice(0, 6).map(x => '<div class="rs-d">' + esc(x.v[2]) + ': ' + esc(x.v[5]) + ' → <b>' + esc(x.to) + '</b></div>').join('') + (d.length > 6 ? '<div class="sub">และอีก ' + (d.length - 6) + ' เครื่อง</div>' : '') : '<div class="sub">ไม่มีเครื่องที่ต้องแก้ RPP</div>') + '</div>'; });
    if (!ch.length) h += '<p class="rs-n">' + (mode === 'swp' && !other ? 'เลือก Rack ที่จะสลับด้วย' : 'ยังไม่มีการเปลี่ยนแปลง') + '</p>';
    sh.querySelector('#rs_pv').innerHTML = h; sh.querySelector('#rs_ok').disabled = !ch.length || bad || !canEdit();
  }
  sh.addEventListener('click', e => {
    const m = e.target.closest('[data-m]'), a = e.target.closest('[data-add]'), x = e.target.closest('[data-rm]');
    if (m && m.dataset.m !== mode) { mode = m.dataset.m; head(); }
    else if (a) { S.push(''); head(); } else if (x) { S.splice(+x.dataset.rm, 1); head(); }
    else if (e.target.id === 'rs_x') close(); else if (e.target.id === 'rs_ok') save(e.target);
  });
  sh.addEventListener('input', e => {
    if (e.target.classList.contains('rs-i')) { S[+e.target.dataset.i] = norm(e.target.value); pv(); }
    else if (e.target.id === 'rs_o') { other = all.find(x => x.id === e.target.value.trim() && x.id !== r.id) || null; pv(); }
  });
  async function save(btn) {
    const ch = plan(), note = 'สลับ Source ' + sh.querySelector('#rs_note').value.trim(), er = sh.querySelector('#rs_err'); er.textContent = ''; btn.disabled = true;
    try {
      for (const c of ch) {
        const j = await API().api({ action: 'rack_cb_set', rack_id: c.r.id, sources: c.to, note });
        if (!j || !j.ok) throw new Error(j && /action|unknown|ไม่รองรับ/i.test((j.code || '') + (j.reason || '')) ? 'GAS ยังไม่รองรับ rack_cb_set — เพิ่มโค้ดจากไฟล์ rack-cb-set.gs.txt แล้ว Deploy ใหม่' : ((j && (j.reason || j.code)) || 'บันทึกไม่สำเร็จ'));
        window.RACK_CB = window.RACK_CB || {}; window.RACK_CB[c.r.id] = c.to.slice(); if (entries(c.r.rpp).length) c.r.rpp = c.to.map(i => toDev(i)).join(' / ');
      }
      let fail = 0;
      for (const c of ch) for (const d of devPlan(c)) {
        const j = await API().api({ action: 'device_edit', dev_id: d.v[7], rev: d.v[8], fields: { rpp: d.to }, note });
        if (j && j.ok) d.v[5] = d.to; else fail++;
      }
      await refreshPower(ch.map(c => c.r.id));
      close(); if (typeof window.render === 'function') window.render();
      document.dispatchEvent(new Event('visibilitychange'));
      toast(fail ? 'สลับ Source แล้ว แต่แก้ RPP ไม่สำเร็จ ' + fail + ' เครื่อง — ตรวจในหน้า Rack' : 'สลับ Source แล้ว', !!fail);
    } catch (err) { er.textContent = err.message; btn.disabled = false; }
  }
  head();
}

/* ───────── ฝังเข้าหน้าเดิม ───────── */
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-rs]'); if (!a || !a.dataset.rs || a.dataset.rs === '1') return;
  const r = getR().find(x => x.id === a.dataset.rs); if (r && canEdit()) { e.preventDefault(); const rp = window.RackPower; if (rp && rp.ensure && !PWR()) rp.ensure().then(() => openSwap(r), () => openSwap(r)); else openSwap(r); } });
function scan() {
  document.querySelectorAll('#f_rpp:not([data-rs]),#a_rpp:not([data-rs])').forEach(enhanceForm);
  document.querySelectorAll('.pwx-f:not([data-rs])').forEach(f => { f.dataset.rs = '1'; const k = f.querySelector('[data-prk]'); if (!k || !canEdit()) return;
    const a = document.createElement('a'); a.className = 'pwr-lk'; a.dataset.rs = k.dataset.prk; a.textContent = 'สลับ Source'; k.after(a); });
}
let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.body, { childList: true, subtree: true });
const st = document.createElement('style'); st.textContent = `
.rs-lk{font-size:11.5px;color:var(--dual);font-weight:600;margin-left:6px}
.rs-r{display:grid;grid-template-columns:1fr 84px;gap:8px;margin:6px 0}
.rs-t{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px 0 0;border:1px solid var(--line);border-radius:10px;background:var(--card2);color:var(--mut);font:inherit;cursor:pointer;text-align:left;overflow:hidden}
.rs-t i{align-self:stretch;width:5px}.rs-t b{flex:1;font-size:14px;color:var(--ink)}.rs-t span{font-size:12px}
.rs-r.on .rs-t{border-color:var(--dual);background:var(--dualbg);color:var(--dual)}
.rs-p,.rs-i,#rs_o{min-width:0}.rs-p{text-align:center}
.rs-n{font-size:12.5px;color:var(--mut);margin:6px 0}.rs-n.warn{color:var(--yl)}.rs-n a,.rs-box a{color:var(--dual);text-decoration:underline;cursor:pointer}
.rs-sw{display:grid;grid-template-columns:96px 14px 1fr 38px;gap:6px;align-items:center;margin:6px 0;font-size:12.5px}.rs-old{color:var(--mut);overflow:hidden;text-overflow:ellipsis}
.rs-st{font-size:12.5px;margin:4px 0}.rs-st.ok{color:var(--gr)}.rs-st.shr,.rs-st.new{color:var(--yl)}.rs-st.bad{color:var(--rd)}
.rs-pv{border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13px;background:var(--card2)}.rs-d{font-size:12px;margin-top:3px;word-break:break-word}
.rs-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99999;background:var(--ink);color:var(--card);padding:10px 16px;border-radius:10px;font-size:14px;max-width:90vw}.rs-toast.bad{background:var(--rd);color:#fff}
`; document.head.appendChild(st);
scan();
window.RackSource = { bound, entries, openSwap };
})();
