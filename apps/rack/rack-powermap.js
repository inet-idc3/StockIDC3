/* ════════════════════════════════════════════════════════════════
 *  rack-powermap.js — "โหมดไฟฟ้า" ของหน้า Face Rack (โหลดหลัง rack-power.js)
 *  โหมดปกติ = ผังเดิม (Dual/Single)  ·  โหมดไฟฟ้า = สีตามกระแส + ตัวเลข A ในทุก Rack
 *  - ผูก Rack → Source จากช่อง "RPP / ปลั๊ก" ของเครื่องทุกเครื่อง (รวม "ไม่ ON") จึงเห็น Source ได้แม้กระแสเป็น 0 A
 *  - จุดที่ฝังเข้ากับของเดิม: ปุ่มสลับโหมด (hseg) · ผังห้อง (fcell) · รายการแถว (hall0) · หน้า Rack · ผลค้นหา
 *  - แตะ Source → แนวโน้มกระแสใน ⚡ ไฟฟ้า · แตะ Rack → หน้า Rack
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const KEY = 'fr_pmode';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 2) => x == null || isNaN(x) ? '–' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const P = { map: {}, bySrc: {}, ok: false, loading: false, f: 'all', lim: { limit: 14.4, warn: 80, crit: 100 }, V: 230, chk: null, ts: '',
  mode: (() => { try { return localStorage.getItem(KEY) === 'p'; } catch (_) { return false; } })() };
const getR = () => (typeof R !== 'undefined' ? R : []);
/* kW ใช้ค่าดิบจากระบบ (power_kw) · kwOf = ประมาณ kW จากกระแส ใช้เฉพาะเกณฑ์ Design (W/A เฉลี่ยจริงของไซต์ ถ้ายังไม่มีใช้ V) */
const kwOf = a => (a == null ? 0 : a * ((P.chk && P.chk.eff) || P.V) / 1000);

/* "13/RPP1-A5(P.2) / 3/RPP2-D7" · "11/RPP2- D2" · "19/RPP2B3 (P20)" · "RPP1-D2-16" → ['RPP1-A5-13', ...] */
function parseRpp(s) {
  s = String(s || ''); const out = new Set(); let m;
  const a = /(\d+)\s*\/\s*RPP\s*([12])\s*-?\s*([A-D])\s*(\d)/gi, b = /RPP\s*([12])\s*-\s*([A-D])(\d)\s*-\s*(\d+)/gi;
  while ((m = a.exec(s))) out.add('RPP' + m[2] + '-' + m[3].toUpperCase() + m[4] + '-' + String(+m[1]).padStart(2, '0'));
  while ((m = b.exec(s))) out.add('RPP' + m[1] + '-' + m[2].toUpperCase() + m[3] + '-' + String(+m[4]).padStart(2, '0'));
  return [...out];
}
const pct = a => a == null ? null : a / P.lim.limit * 100;
const lvl = a => a == null ? 'na' : a < 0.05 ? 'z' : pct(a) >= P.lim.crit ? 'rd' : pct(a) >= P.lim.warn ? 'yl' : 'gr';

function build(RR, d) {
  const cur = {}; (d.breakers || []).forEach(b => { cur[b.id] = b; });
  const unk = new Set((d.unknown || []).map(u => u.source_id || u));
  if (d.limits) P.lim = Object.assign({}, P.lim, d.limits); P.ts = d.ts || '';
  { let sk = 0, sa = 0, n = 0; (d.breakers || []).forEach(b => { if (b.a >= 0.5 && b.kw != null) { sk += b.kw; sa += b.a; n++; } });
    P.chk = { n, eff: sa ? sk / sa * 1000 : null }; }
  P.map = {}; P.bySrc = {};
  RR.forEach(r => { const ids = new Set(), gh = new Set();
    (r.dv || []).forEach(v => { if (v[3] === 'ไม่ใช้ไฟ') return; const live = parseRpp(v[5]);
      if (live.length) live.forEach(i => ids.add(i)); else parseRpp(v[11]).forEach(i => gh.add(i)); });
    const gl = [...gh].filter(i => !ids.has(i)).sort(), rl = parseRpp(r.rpp), cl0 = rl.length ? rl : (window.RACK_CB && window.RACK_CB[r.id]) || [];
    P.map[r.id] = { ids: [...ids].sort(), gids: gl, lids: ids.size || gl.length ? [] : cl0 }; ids.forEach(i => (P.bySrc[i] = P.bySrc[i] || []).push(r.id)); });
  RR.forEach(r => { const p = P.map[r.id];
    p.src = p.ids.map(id => { const b = cur[id], n = P.bySrc[id].length, a = b ? b.a : (unk.has(id) ? null : 0);
      return { id, fam: id.split('-')[1][0], a, kw: b ? b.kw : 0, n, k: 1 / n, lv: lvl(a) }; })
      .concat(p.gids.map(id => ({ id, fam: id.split('-')[1][0], a: 0, kw: 0, n: (P.bySrc[id] || []).length, k: 0, lv: 'z', ghost: true })))
      .concat(p.lids.map(id => { const b = cur[id], a = b ? b.a : (unk.has(id) ? null : 0); return { id, fam: id.split('-')[1][0], a, kw: b ? b.kw : 0, n: (P.bySrc[id] || []).length, k: 0, lv: lvl(a), ghost: true, lay: true }; }));
    const lv0 = p.src.filter(s => !s.ghost);
    p.a = lv0.reduce((t, s) => t + (s.a || 0) * s.k, 0); p.kw = lv0.reduce((t, s) => t + (s.kw || 0) * s.k, 0);
    p.max = lv0.reduce((m, s) => Math.max(m, s.a || 0), 0);
    p.zero = p.src.length > 0 && lv0.every(s => s.a == null || s.a < 0.05);
    if (r.st === 'off') p.src.forEach(s => { s.lv = 'z'; });
    p.lv = !p.src.length ? 'nm' : p.zero ? 'z' : lvl(p.max); });
}
/* เรียกที่ต้นทุกการวาด: เตรียมข้อมูล (โหลดจาก ⚡ ไฟฟ้า ถ้ายังไม่มี แล้ววาดใหม่ 1 ครั้ง) */
function prep() {
  const rp = window.RackPower, d = rp && rp.cached && rp.cached();
  if (d && !d.empty) { build(getR(), d); P.ok = true; return true; }
  P.ok = false;
  if (rp && !P.loading) { P.loading = true; rp.ensure().then(x => { P.loading = false; if (x && !x.empty && typeof render === 'function') render(); }).catch(() => { P.loading = false; }); }
  return false;
}
const on = () => P.mode && P.ok;
const hit = r => { const p = P.map[r.id]; return !p || P.f === 'all' || (r.st === 'use' && (P.f === 'zero' ? p.zero : pct(p.max) >= P.lim.warn)); };

const CSS = `
.pwr-bar{margin:0 0 6px}.pwr-bar .seg{margin-bottom:8px}
.pwr-kpi{grid-template-columns:repeat(4,1fr)}.pwr-kpi div{min-width:0}@media(max-width:560px){.pwr-kpi{grid-template-columns:1fr 1fr}}
.pwr-note{font-size:12.5px;color:var(--mut);margin:2px 0 8px}
.pwr-leg i.z{background:#6f7a93}
.pwr-leg i.fA{background:#c4372b}.pwr-leg i.fB{background:#2368c4}.pwr-leg i.fC{background:#f0c419}.pwr-leg i.fD{background:#1c9c52}
main:has(.pwr-bar.on) .kpi:not(.pwr-kpi),main:has(.pwr-bar.on) .leg:not(.pwr-leg){display:none}
main:has(.pwr-grid){max-width:1240px}
main:has(.pwr-bar.on) .pv.mi,main:has(.pwr-bar.on) .pv.mi + p.sub{display:none}
.pwr-d{opacity:.2}
.pwr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:start}
.pwr-col{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:2px 6px 6px}
.pwr-col .rowh{margin:8px 4px 6px}
.pwr-r{display:grid;grid-template-columns:1fr 76px 1fr;gap:3px;padding:2px;margin:3px 0;border-radius:10px;border:2px solid var(--line);background:var(--card)}
.pwr-r.off{border-style:dashed}
.pwr-L,.pwr-RR{display:flex;flex-direction:column;gap:3px;min-width:0;align-self:stretch}.pwr-L>.pwr-s,.pwr-RR>.pwr-s{flex:1 1 0;min-height:34px}
.pwr-c{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:8px;background:var(--card2);color:var(--ink);padding:2px 8px 2px 10px;min-height:34px;text-decoration:none;font-size:12.5px;line-height:1.15;border:2px solid var(--line);box-sizing:border-box;position:relative;overflow:hidden;align-self:stretch}
.pwr-c::before,.pwr-c::after{content:'';position:absolute;top:0;bottom:0;width:7px}
.pwr-c::before{left:0;background:var(--gl,var(--line))}.pwr-c::after{right:0;background:var(--gr2,var(--line))}
.pwr-c b{font-size:13.5px}.pwr-c em{font-style:normal;font-size:9.5px;font-weight:700;color:var(--dual)}.pwr-c small{font-size:9.5px;font-weight:600;color:var(--ink);opacity:.8}.pwr-c span{font-size:10px;color:var(--mut);max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pwr-r.empty .pwr-c{opacity:.5}.pwr-r.zero .pwr-c{opacity:.85}
.pwr-s{position:relative;border-radius:8px;padding:2px 6px 5px;color:#fff;min-height:34px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;overflow:hidden;min-width:0}
.pwr-s i{font-style:normal;font-size:9px;opacity:.92;white-space:nowrap;line-height:1.2}.pwr-s b{font-size:13px;line-height:1.15;white-space:nowrap}.pwr-s b small{font-size:9px;font-weight:500;opacity:.85;margin-left:2px}
.pwr-s.fA{background:#c4372b}.pwr-s.fB{background:#2368c4}.pwr-s.fD{background:#1c9c52}.pwr-s.fC{background:#f0c419;color:#1b1b1b}
.pwr-s.z{background:#6f7a93!important;color:#fff!important;opacity:.9;background-image:none;box-shadow:none}
.pwr-s.z i,.pwr-s.z b{color:#fff}
.pwr-r.zero .pwr-s:not(.none),.pwr-r.off .pwr-s:not(.none){background:#6f7a93!important;color:#fff!important;background-image:none}
.pwr-r.off .pwr-c{border-style:dashed}
.pwr-s.yl{box-shadow:0 0 0 2px #ffe14d inset}.pwr-s.rd{box-shadow:0 0 0 2px #fff inset,0 0 0 3px #000}
.pwr-s.na{background:#6b7694}.pwr-s.none i{white-space:normal;line-height:1.15}.pwr-s.none{background:transparent;border:1px dashed var(--line);color:var(--mut);cursor:default;opacity:1;background-image:none}
.pwr-s u{position:absolute;right:3px;top:1px;font-size:8px;text-decoration:none;background:#0006;border-radius:4px;padding:0 4px;color:#fff}
.pwr-s .lv{position:absolute;left:0;right:0;bottom:0;height:2px;background:#0004}.pwr-s .lv em{display:block;height:100%;background:#fff}
@media(hover:hover){.pwr-s:hover{filter:brightness(1.12)}}
.pwr-rb,.pwr-card{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:12px;margin:0 0 12px}
.pwr-card{display:block;color:inherit;text-decoration:none;margin:0 0 8px}
.pwr-card.zero,.pwr-rb.zero{box-shadow:inset 3px 0 0 #6f7a93}
.pwr-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.pwr-h b{font-size:15px}
.pwr-tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}
.pwr-tag.rd{background:var(--rd);color:#fff}.pwr-tag.gy{background:var(--dualbg);color:var(--dual)}.pwr-tag.gr{background:var(--grbg);color:var(--gr)}.pwr-tag.yl{background:var(--yl);color:#3b2d06}
.pwr-warn{margin:8px 0;padding:8px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--line);font-size:13px}
.pwr-sl{display:grid;grid-template-columns:8px 1fr 48px 120px;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--line);cursor:pointer;font-size:13.5px}
.pwr-sl i{height:24px;border-radius:3px}.pwr-sl .id{font-weight:600}.pwr-sl .id small{color:var(--mut);font-weight:400;margin-left:4px}
.pwr-sl .bar{height:6px;border-radius:4px;background:var(--card2);overflow:hidden}.pwr-sl .bar em{display:block;height:100%}.pwr-sl b{text-align:right}
.pwr-lk{display:inline-block;margin-top:8px;font-size:13px;color:var(--dual);cursor:pointer;text-decoration:underline}

.pwx{margin:0 0 12px;padding:14px;border-radius:16px;background:var(--card);border:1px solid var(--line);box-shadow:0 10px 24px -14px var(--sh),inset 0 1px 0 var(--hi)}
.pwx-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:12px}.pwx-h b{font-size:14.5px;font-weight:600}
.pwx-top{display:flex;align-items:center;gap:16px}
.pwx-ring{--c:var(--gr);position:relative;flex:0 0 88px;width:88px;height:88px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c) calc(var(--p)*1%),var(--emp,rgba(128,128,128,.18)) 0)}
.pwx-ring.yl{--c:var(--yl)}.pwx-ring.rd{--c:var(--rd)}.pwx-ring.z{--c:var(--mut)}
.pwx-ring::before{content:"";position:absolute;inset:8px;border-radius:50%;background:var(--cardsolid)}
.pwx-ring b{position:relative;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}.pwx-ring b small{font-size:12px;color:var(--mut);margin-left:1px}
.pwx-cap{font-size:13px;color:var(--mut);line-height:1.5}.pwx-cap b{color:var(--ink);font-size:16px}.pwx-cap small{display:block;font-size:11.5px}
.pwx-sl{margin-top:12px;border-top:1px solid var(--line);padding-top:2px}
.pwx-s{padding:8px 0 4px;cursor:pointer}
.pwx-sh{display:flex;align-items:center;gap:8px;font-size:13px}.pwx-sh>i{flex:0 0 4px;height:15px;border-radius:2px}
.pwx-sh .id{flex:1;min-width:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pwx-sh .id small{margin-left:6px;font-weight:400;color:var(--mut);font-size:11px}
.pwx-sh .v{font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums}.pwx-sh .v b{color:var(--ink);font-size:13.5px}.pwx-sh .v em{font-style:normal;margin-left:8px}
.pwx-bar{height:5px;margin-top:6px;border-radius:3px;background:var(--emp,rgba(128,128,128,.18));overflow:hidden}
.pwx-bar em{display:block;height:100%;min-width:2px;border-radius:3px;background:var(--gr)}.pwx-bar em.yl{background:var(--yl)}.pwx-bar em.rd{background:var(--rd)}.pwx-bar em.z{background:var(--mut);opacity:.5}
.pwx-f{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11.5px;color:var(--mut)}.pwx-f .pwr-lk{margin:0}

/* ════ ผังห้อง · โหมดไฟฟ้า ════
   กติกา: ทุกอย่างในผังใช้ "สี่เหลี่ยมมุมมน 6px" เท่ากันหมด (ช่อง Rack · ป้าย Zone/Net · กรอบโซน) ไม่มีทรงแคปซูลปนกับทรงเหลี่ยม
   ช่อง = [ชิปเลข Rack 26px | kW + ป้ายเล็ก] สูงเท่ากันทุกช่อง แถวจึงเรียงตรงกันทั้งผัง */
main:has(.pwr-bar.on){--pr:6px;--pw-chip:rgba(0,0,0,.24)}
main:has(.pwr-bar.on) .fz{border-radius:8px}
main:has(.pwr-bar.on) :is(.fz>em,.fn>em){border-radius:var(--pr);box-shadow:none;background:#4472c4;background-image:none;font-size:12px;letter-spacing:.02em}
main:has(.pwr-bar.on) .fc-col,main:has(.pwr-bar.on) .fn{gap:4px}
main:has(.pwr-bar.on) .fc{display:flex;align-items:stretch;justify-content:flex-start;gap:0;width:100%;max-width:80px;height:30px;padding:0;border:1px solid transparent;border-radius:var(--pr);box-shadow:none;background-image:none;font-size:11px;line-height:1;font-weight:600;overflow:hidden;transition:transform .15s,box-shadow .15s}
main:has(.pwr-bar.on) .fn .fc{max-width:80px}
@media(hover:hover){main:has(.pwr-bar.on) .fc:hover{transform:scale(1.18);overflow:hidden;box-shadow:0 6px 14px -6px var(--sh,rgba(0,0,0,.4));z-index:3;position:relative}}
/* ซ้าย: ชิปเลข Rack */
main:has(.pwr-bar.on) .fc .pm-n{flex:0 0 26px;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums;background:var(--pw-chip);color:inherit}
/* ขวา: kW (ใหญ่) + ป้าย (เล็ก) */
main:has(.pwr-bar.on) .fc .pm-b{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0 2px}
main:has(.pwr-bar.on) .fc .pm-k{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap}
main:has(.pwr-bar.on) .fc .pm-l{font-size:8.5px;font-weight:600;opacity:.8;letter-spacing:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
main:has(.pwr-bar.on) .fc .pm-k:empty{display:none}
main:has(.pwr-bar.on) .fc .pm-k:empty + .pm-l{font-size:10px;font-weight:700;opacity:.7}
/* ระดับกระแส */
main:has(.pwr-bar.on) .fc.pm-gr{background:var(--gr);color:#fff}
main:has(.pwr-bar.on) .fc.pm-yl{background:var(--yl);color:#3b2d06;--pw-chip:rgba(0,0,0,.18)}
html[data-skin=soft] main:has(.pwr-bar.on) .fc.pm-yl,html[data-skin=space] main:has(.pwr-bar.on) .fc.pm-yl{color:#fff;--pw-chip:rgba(0,0,0,.24)}
main:has(.pwr-bar.on) .fc.pm-rd{background:var(--rd);color:#fff;box-shadow:0 0 0 1.5px #fff,0 0 0 3px var(--rd);z-index:1;position:relative}
main:has(.pwr-bar.on) .fc.pm-z{background:#6f7a93;color:#fff}
main:has(.pwr-bar.on) .fc:is(.pm-na,.pm-nm){background:var(--dualbg);color:var(--dual);border-color:var(--line);--pw-chip:rgba(128,128,128,.14)}
/* ช่องที่ไม่ใช่ Rack ใช้ไฟ — ทรงเดียวกัน แค่จางลง */
main:has(.pwr-bar.on) .fc.empty{background:var(--emp);color:var(--mut);--pw-chip:rgba(128,128,128,.12)}
main:has(.pwr-bar.on) .fc.cage{background:repeating-linear-gradient(135deg,var(--emp) 0 3px,transparent 3px 6px);border-color:var(--line);color:var(--mut);--pw-chip:transparent}
main:has(.pwr-bar.on) .fc.off{background:transparent;border:1px dashed var(--dual);color:var(--dual);--pw-chip:var(--dualbg)}
main:has(.pwr-bar.on) .fc.off .pm-k{font-size:9.5px;letter-spacing:.04em}
main:has(.pwr-bar.on) .fc.p{outline:none}
main:has(.pwr-bar.on) .fc.pwr-d{opacity:.2}
`;
const FC = { A: '#c4372b', B: '#2368c4', C: '#f0c419', D: '#1c9c52' }, LC = { gr: 'var(--gr)', yl: 'var(--yl)', rd: 'var(--rd)', z: '#5a6685', na: '#5a6685' };
const label = r => r.zone === 'Network-Telecom' ? r.name : 'Rack ' + String(r.n).padStart(2, '0');
/* กลุ่ม: Network-Telecom · Cloud · ที่เหลือ (SCG / BAAC / KTC / Co-location) = Co-location */
const grpOf = r => r.zone === 'Network-Telecom' ? 'nt' : r.g === 'Cloud' ? 'cl' : 'co';
function stats(rs) {
  const u = rs.filter(r => r.st === 'use' && P.map[r.id]);
  return { a: rs.reduce((t, r) => t + (P.map[r.id] ? P.map[r.id].a : 0), 0), kw: rs.reduce((t, r) => t + (P.map[r.id] ? P.map[r.id].kw : 0), 0),
    grp: ['co', 'cl', 'nt'].reduce((o, k) => { const l = rs.filter(r => P.map[r.id] && grpOf(r) === k); o[k] = { kw: l.reduce((t, r) => t + P.map[r.id].kw, 0), a: l.reduce((t, r) => t + P.map[r.id].a, 0) }; return o; }, {}),
    zero: u.filter(r => P.map[r.id].zero).length, hot: u.filter(r => pct(P.map[r.id].max) >= P.lim.warn).length };
}

/* ── ปุ่มสลับโหมด + KPI + legend + ตัวกรอง (แทรกที่ต้น hseg) ── */
function modeBar(c) {
  const ok = prep(), rs = getR().filter(r => c === 'plan' || r.zone === c), s = ok ? stats(rs) : null;
  let h = '<div class="pwr-bar' + (on() ? ' on' : '') + '"><div class="seg"><a data-pm="n" class="' + (P.mode ? '' : 'on') + '">ปกติ</a><a data-pm="p" class="' + (P.mode ? 'on' : '') + '">⚡ ไฟฟ้า</a></div>';
  if (P.mode && !ok) h += '<p class="pwr-note">กำลังโหลดข้อมูลไฟฟ้า… (ต้องมีสิทธิ์ดูไฟฟ้า และมีไฟล์กระแสที่อัปโหลดแล้ว)</p>';
  if (on()) {
    h += '<div class="kpi pwr-kpi">' + [['กำลังรวม', s.kw, s.a], ['Co-location', s.grp.co.kw, s.grp.co.a], ['Cloud', s.grp.cl.kw, s.grp.cl.a], ['Network / Telecom', s.grp.nt.kw, s.grp.nt.a]]
      .map(k => '<div class="tb"><b>' + fmt(k[1], 1) + '</b><span class="sub">kW ' + k[0] + ' · ' + fmt(k[2], 1) + ' A</span></div>').join('') + '</div>' +
      '<div class="leg pwr-leg"><span><i style="background:var(--gr)"></i>ปกติ</span><span><i style="background:var(--yl)"></i>≥' + P.lim.warn + '% ของ ' + P.lim.limit + ' A (' + fmt(kwOf(P.lim.limit)) + ' kW)</span><span><i style="background:var(--rd);box-shadow:0 0 0 2px #fff inset"></i>เกิน</span><span><i class="z"></i>0 A</span>' +
      '<span><i class="fA"></i>Source A</span><span><i class="fB"></i>B</span><span><i class="fC"></i>C</span><span><i class="fD"></i>D</span></div>' +
      '<div class="seg"><a data-pf="zero" class="' + (P.f === 'zero' ? 'on' : '') + '">เฉพาะ 0 A (' + s.zero + ')</a><a data-pf="hot" class="' + (P.f === 'hot' ? 'on' : '') + '">เฉพาะโหลดสูง (' + s.hot + ')</a></div>' +
      '<p class="pwr-note">สีตามเบรกเกอร์ที่หนักสุดของ Rack · ' + (c === 'plan' ? 'ในผัง: ช่องซ้าย = เลข Rack · ช่องขวา = กำลังไฟ kW · ตัวเล็กใต้ kW = ป้าย/รหัส · แตะ Rack เพื่อดูรายละเอียด' : 'ตัวเลข = กำลังไฟ kW (ค่าจริงจากระบบ) · กลางแถว = เลข Rack / ลูกค้า / kW รวมของ Rack · แตะ Rack เพื่อดูรายละเอียด · แตะ Source เพื่อดูแนวโน้ม') + '</p>'
  }
  return h + '</div>';
}

/* ── ผังห้อง: ทุกช่องใช้โครงเดียวกัน  [ เลข Rack | kW ]  + ป้ายเล็ก (เช่น B8) ใต้ kW ──
 *  ซ้าย = ชิปเลข Rack (กว้างคงที่)  ·  ขวา = กำลังไฟ kW (ตัวใหญ่) และป้ายลูกค้า/รหัส (ตัวเล็กจาง)
 *  เก็บ href/title/FM เดิมไว้ · ช่องว่าง/กรง/ไม่ ON ก็ใช้โครงเดียวกัน ทรงจึงเท่ากันทั้งผัง */
function cell(r, base) {
  const html = base(r);
  if (!on()) return html;
  const m = /^<(a|span) class="fc ([^"]*)"([^>]*)>/.exec(html); if (!m) return html;
  const p = P.map[r.id], use = r.st === 'use', dim = hit(r) ? '' : ' pwr-d';
  let cls, val = '', tip = '';
  if (use) {
    const lv = p ? p.lv : 'nm';
    cls = 'pm-' + lv;
    val = !p || lv === 'nm' ? '–' : p.zero ? '0' : fmt(p.kw, p.kw >= 10 ? 1 : 2);
    if (p) { const src = p.src.map(s => s.id + ' ' + fmt(s.kw) + ' kW (' + fmt(s.a) + ' A)').join('\n');
      tip = ' · ⚡ ' + fmt(p.kw, 2) + ' kW (' + fmt(p.a, 1) + ' A)' + (p.zero ? ' (0 A ทั้ง Rack)' : '') + (src ? '&#10;' + esc(src) : lv === 'nm' ? ' (ยังไม่ระบุ Source)' : ''); }
  } else { cls = m[2].trim(); if (r.st === 'off') val = 'OFF'; }
  const attrs = m[3].replace(/title="([^"]*)"/, (x, t) => 'title="' + t + tip + '"');
  const lb = r.lb ? '<small class="pm-l">' + esc(String(r.lb).replace(/^\((.*)\)$/, '$1')) + '</small>' : '';
  return '<' + m[1] + ' class="fc ' + cls + (r.n == 19 ? ' p' : '') + dim + '"' + attrs + '><i class="pm-n">' + esc(r.n) + '</i><span class="pm-b"><b class="pm-k">' + val + '</b>' + lb + '</span></' + m[1] + '>';
}

/* ── รายการแถว: แถวละ 1 การ์ด ตามผังไฟของคุณ ── */
function scell(s) {
  const w = s.a == null ? 0 : Math.min(pct(s.a), 100);
  return '<div class="pwr-s f' + s.fam + ' ' + s.lv + '" data-psrc="' + esc(s.id) + '" title="' + esc(s.id + ' · ' + fmt(s.kw) + ' kW (' + fmt(s.a) + ' A) · แตะดูแนวโน้ม' + (s.n > 1 ? ' · ใช้ร่วม ' + s.n + ' Rack' : '')) + '"><i>' + esc(s.id) + '</i><b>' + (s.a == null ? '–' : fmt(s.kw) + '<small>kW · ' + fmt(s.a, 1) + ' A</small>') + '</b>' + (s.lay ? '<u>ตาม Layout</u>' : s.ghost ? '<u>OFF · เดิม</u>' : s.n > 1 ? '<u>ร่วม ' + s.n + '</u>' : '') + '<span class="lv"><em style="width:' + w + '%"></em></span></div>';
}
function col(rh, l) {
  const none0 = t => '<div class="pwr-s none"><i>' + t + '</i></div>', s = stats(l);
  rh = rh.replace(/<span class="sub">เสี่ยง[^<]*<\/span><\/div>$/, '<span class="sub"><b style="color:var(--ink)">' + fmt(s.kw, 1) + ' kW</b> · ' + fmt(s.a, 1) + ' A' + (s.zero ? ' · <b>0 A ' + s.zero + ' Rack</b>' : '') + '</span></div>');
  return '<div class="pwr-col">' + rh + l.slice().sort((a, b) => b.n - a.n).map(r => {
    const p = P.map[r.id], srt = p.src.slice().sort((x, y) => x.fam < y.fam ? -1 : x.fam > y.fam ? 1 : x.id < y.id ? -1 : 1), h = Math.ceil(srt.length / 2), L = srt.slice(0, h), Rt = srt.slice(h);
    const cl = x => { if (!x.length) return 'var(--line)'; const n = x.length; return 'linear-gradient(to bottom,' + x.map((q, i) => FC[q.fam] + ' ' + (i * 100 / n) + '% ' + ((i + 1) * 100 / n) + '%').join(',') + ')'; }, off = r.st === 'off';
    return '<div class="pwr-r ' + (r.st === 'empty' ? 'empty ' : '') + (r.st === 'use' && p.zero ? 'zero ' : '') + (off ? 'off ' : '') + (hit(r) ? '' : 'pwr-d') + '"><div class="pwr-L">' + (L.map(scell).join('') || (p.src.length ? none0('–') : none0(r.st === 'empty' ? 'ว่าง' : r.st === 'off' ? 'ไม่ ON · ไม่ระบุ RPP' : 'ไม่ระบุ RPP'))) + '</div>' +
      '<a class="pwr-c" style="--gl:' + cl(L) + ';--gr2:' + cl(Rt) + '" href="#rack/' + encodeURIComponent(r.id) + '" title="' + esc(r.name + ' · ' + r.c + (p.src.length ? '\n⚡ ' + fmt(p.kw) + ' kW (' + fmt(p.a, 1) + ' A)\nSource: ' + p.src.map(x => x.id).join(', ') : '') + (off ? '\n(วางเครื่อง ไม่ ON)' : '')) + '"><b>' + esc(label(r)) + '</b>' + (r.lb ? '<em>(' + esc(r.lb) + ')</em>' : '') + '<span>' + esc(r.st === 'empty' ? 'ว่าง' : r.c) + '</span>' + (r.st === 'use' && p.src.some(x => !x.ghost) ? '<small>' + (p.zero ? '0' : fmt(p.kw, p.kw >= 10 ? 1 : 2)) + ' kW</small>' : '') + '</a><div class="pwr-RR">' + (Rt.map(scell).join('') || (p.src.length ? none0('–') : '')) + '</div></div>';
  }).join('') + '</div>';
}

/* ── กำลังไฟของ Rack: กำลังรวมสูงสุด = Σ (14.4 A × สัดส่วนที่ Rack ใช้ต่อ Source) → 2 Source = 28.8 A · 3 = 43.2 A · 4 = 57.6 A ── */
function rackPower(r) {
  if (!r || (!P.ok && !prep())) return null;
  const p = P.map[r.id]; if (!p) return null;
  const src = p.src.filter(s => !s.ghost); if (!src.length) return null;
  const L = P.lim.limit, capA = src.reduce((t, s) => t + L * s.k, 0), a = p.a, pc = capA ? a / capA * 100 : 0;
  const lv = a < 0.05 ? 'z' : pc >= P.lim.crit ? 'rd' : pc >= P.lim.warn ? 'yl' : 'gr';
  return { n: src.length, L, a, kw: p.kw, capA, capKw: kwOf(capA), pct: pc, lv, src, zero: p.zero };
}

/* ── หน้า Rack: การ์ดกำลังไฟ (โดนัท % ของกำลังรวม + แถบแต่ละ Source) ── */
function rackBlock(r) {
  const m = rackPower(r); if (!m) return '';
  const rows = m.src.map(s => '<div class="pwx-s" data-psrc="' + esc(s.id) + '" title="แตะดูแนวโน้ม"><div class="pwx-sh"><i style="background:' + FC[s.fam] + '"></i><span class="id">' + esc(s.id) + (s.n > 1 ? '<small>ใช้ร่วม ' + s.n + ' Rack</small>' : '') + '</span>' +
    '<span class="v">' + (s.a == null ? 'ไม่มีในไฟล์' : '<b>' + fmt(s.kw) + '</b> kW<em>' + fmt(s.a, 1) + ' A</em>') + '</span></div>' +
    '<div class="pwx-bar"><em class="' + s.lv + '" style="width:' + (s.a == null ? 0 : Math.min(pct(s.a), 100)) + '%"></em></div></div>').join('');
  return '<div class="pwx"><div class="pwx-h"><b>กำลังไฟฟ้า</b><span class="sub">' + fmt(m.kw) + ' kW · ' + fmt(m.a, 1) + ' A</span></div>' +
    (r.st === 'use' && m.zero ? '<div class="pwr-warn">กระแสของทุก Source ใน Rack นี้เป็น 0 A — ตรวจว่าเครื่องปิดอยู่ ปลั๊กไม่ได้เสียบ หรือเบรกเกอร์ OFF</div>' : '') +
    '<div class="pwx-top"><div class="pwx-ring ' + m.lv + '" style="--p:' + Math.min(m.pct, 100).toFixed(1) + '"><div><b>' + fmt(m.pct, 0) + '<small>%</small></b></div></div>' +
    '<div class="pwx-cap">ใช้ <b>' + fmt(m.kw) + '</b> จากสูงสุด <b>' + fmt(m.capKw) + '</b> kW<small>' + m.n + ' Source × ' + fmt(m.L, 1) + ' A</small></div></div>' +
    '<div class="pwx-sl">' + rows + '</div>' +
    '<div class="pwx-f"><a class="pwr-lk" data-prk="' + esc(r.id) + '">ดูแนวโน้มทั้ง Rack ›</a><span>ข้อมูล ณ ' + esc(P.ts || '–') + '</span></div></div>';
}

/* ── ผลค้นหา: Rack ที่ตรงชื่อ/ลูกค้า หรือรหัส Source ── */
function searchBlock(rs, q) {
  if (!prep()) return ''; q = (q || '').trim().toLowerCase();
  const seen = new Set(rs.map(r => r.id)), more = q.length >= 3 ? getR().filter(r => !seen.has(r.id) && P.map[r.id] && P.map[r.id].ids.some(i => i.toLowerCase().includes(q))) : [];
  const l = rs.concat(more).filter(r => P.map[r.id] && (P.map[r.id].src.length || r.st === 'use')).slice(0, 10); if (!l.length) return '';
  return '<h2>⚡ ไฟฟ้า</h2>' + l.map(r => { const p = P.map[r.id], z = r.st === 'use' && p.zero;
    return '<a class="pwr-card ' + (z ? 'zero' : '') + '" href="#rack/' + encodeURIComponent(r.id) + '" onclick="clr()"><div class="pwr-h"><b>' + esc(r.name) + '</b>' +
      (!p.src.length ? '<span class="pwr-tag gy">ยังไม่ระบุ Source</span>' : z ? '<span class="pwr-tag gy">0 A ทั้ง Rack</span>' : '<span class="pwr-tag gr">' + fmt(p.kw) + ' kW</span>') + '</div><div class="sub">' + esc(r.c) + ' / ' + esc(r.zone) + ' ' + esc(r.row || '') + '</div>' +
      p.src.map(s => '<div class="pwr-sl" style="cursor:inherit"><i style="background:' + FC[s.fam] + '"></i><span class="id">' + esc(s.id) + '</span><span></span><b>' + (s.a == null ? '–' : fmt(s.a) + ' A') + '</b></div>').join('') + '</a>'; }).join('');
}

const rerender = () => { const y = scrollY; if (typeof render === 'function') render(); scrollTo(0, y); };
document.addEventListener('click', e => {
  const q = s => e.target.closest && e.target.closest(s), m = q('[data-pm]'), f = q('[data-pf]'), s = q('[data-psrc]'), k = q('[data-prk]');
  if (m) { P.mode = m.dataset.pm === 'p'; try { localStorage.setItem(KEY, P.mode ? 'p' : 'n'); } catch (_) { /* ignore */ } if (!P.mode) P.f = 'all'; rerender(); }
  else if (f) { P.f = P.f === f.dataset.pf ? 'all' : f.dataset.pf; rerender(); }
  else if (s && window.RackPower && window.RackPower.openSrc) { e.preventDefault(); window.RackPower.openSrc(s.dataset.psrc); }
  else if (k && window.RackPower && window.RackPower.openRack) window.RackPower.openRack(k.dataset.prk);
});
if (!document.getElementById('pwr-css')) { const st = document.createElement('style'); st.id = 'pwr-css'; st.textContent = CSS; document.head.appendChild(st); }
/* ตั้งค่า Rack → Source สดจากชีต RackCB (GAS ส่งมาใน get_data เป็น cb:[{rack_id,cb_layout}]) · ถ้าไม่มี/ว่าง ใช้ rack-cb.js เดิม */
function setCB(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  const m = {};
  rows.forEach(x => { const k = String((x && x.rack_id) || ''), g = /^RPP([12])-([A-D])(\d)-(\d+)$/i.exec(String((x && x.cb_layout) || '').trim());
    if (!k || !g) return; const id = 'RPP' + g[1] + '-' + g[2].toUpperCase() + g[3] + '-' + String(+g[4]).padStart(2, '0'); (m[k] = m[k] || []);
    if (m[k].indexOf(id) < 0) m[k].push(id); });
  Object.keys(m).forEach(k => m[k].sort());
  window.RACK_CB = m;
}
window.PowerMap = { setCB, on, modeBar, cell, col, rackBlock, rackPower, searchBlock, parseRpp, state: P };
})();
