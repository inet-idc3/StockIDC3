/* ════════════════════════════════════════════════════════════════
 *  rack-powermap.js (Phase 2) — "โหมดไฟฟ้า" ของหน้า Face Rack (โหลดหลัง rack-power.js)
 *  โหมดปกติ = ผังเดิม (Dual/Single)  ·  โหมดไฟฟ้า = สีตาม % ของ quota_kw + ตัวเลข kW ในทุก Rack
 *  - ข้อมูลทั้งหมดมาจาก get_power (Power2.gs) → Rack → Source ตาม Tab RackCB (1 Rack = 2 / 4 / 6 Source)
 *  - ฝั่ง A อยู่ซ้าย · ฝั่ง B อยู่ขวา · Source ที่ 0 A ใน Rack ที่มีโหลด = เทา (ตรวจว่า feed ขาดหรือไม่)
 *  - จุดที่ฝังเข้ากับของเดิม: ปุ่มสลับโหมด (hseg) · ผังห้อง (fcell) · รายการแถว (hall0) · หน้า Rack
 *  - แตะ Source → แนวโน้มกระแสใน ⚡ ไฟฟ้า · แตะ Rack → หน้า Rack
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const KEY = 'fr_pmode2';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 2) => x == null || isNaN(x) ? '–' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const P = { map: {}, ok: false, loading: false, f: 'all', lim: { warn: 80, crit: 100 }, ts: '', zeroKw: 0.02,
  mode: (() => { try { return localStorage.getItem(KEY) === 'p'; } catch (_) { return false; } })() };
const getR = () => (typeof R !== 'undefined' ? R : []);
/* 'DC2-EFU5-1A2-1_cb02' → '2/EFU5-1A2-1' (รูปแบบเดียวกับผัง Source Phase 2) */
const short = id => { const m = /^(?:DC2-)?(.*)_cb0?(\d+)$/.exec(String(id)); return m ? m[2] + '/' + m[1] : String(id); };
const lvOf = p => p == null ? 'na' : p >= P.lim.crit ? 'rd' : p >= P.lim.warn ? 'yl' : 'gr';

function build(RR, d) {
  if (d.limits) P.lim = Object.assign({}, P.lim, d.limits); P.ts = d.ts || '';
  P.map = {};
  RR.forEach(r => {
    const o = d.racks && d.racks[r.id];
    if (!o) { P.map[r.id] = { src: [], a: 0, kw: 0, A: 0, B: 0, cap: 0, pct: null, zero: false, lv: 'nm', nA: 0, nB: 0 }; return; }
    const zero = o.n > 0 && o.kw < P.zeroKw, rlv = !o.n ? 'na' : zero ? 'z' : lvOf(o.pct);
    const off = r.st === 'off';
    const src = o.src.map(s => ({ id: s.id, fam: s.phase, a: s.a, kw: s.kw, k: s.k, n: Math.round(1 / (s.k || 1)), lv: off || s.a < 0.05 ? 'z' : rlv === 'z' ? 'z' : rlv }))
      .concat((o.miss || []).map(id => ({ id, fam: (/-\d([AB])\d-/.exec(id) || [])[1] || 'A', a: null, kw: 0, k: 1, n: 1, lv: 'na' })))
      .sort((x, y) => x.fam < y.fam ? -1 : x.fam > y.fam ? 1 : x.id < y.id ? -1 : 1);
    P.map[r.id] = { src, a: o.a, kw: o.kw, A: o.A, B: o.B, cap: o.cap, pct: o.pct, zero, lv: rlv, nA: src.filter(s => s.fam === 'A').length, nB: src.filter(s => s.fam === 'B').length };
  });
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
const hit = r => { const p = P.map[r.id]; return !p || P.f === 'all' || (r.st === 'use' && (P.f === 'zero' ? p.zero : p.pct != null && p.pct >= P.lim.warn)); };

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

const FC = { A: '#c4372b', B: '#2368c4' };
const label = r => r.zone === 'Network-Telecom' ? r.name : 'Rack ' + String(r.n).padStart(2, '0');
/* กลุ่ม: Network-Telecom · Cloud · ที่เหลือ (IBANK / KTBCS / Openland / อื่น ๆ) = Co-location */
const grpOf = r => r.zone === 'Network-Telecom' ? 'nt' : r.g === 'Cloud' ? 'cl' : 'co';
function stats(rs) {
  const u = rs.filter(r => r.st === 'use' && P.map[r.id]);
  return { a: rs.reduce((t, r) => t + (P.map[r.id] ? P.map[r.id].a : 0), 0), kw: rs.reduce((t, r) => t + (P.map[r.id] ? P.map[r.id].kw : 0), 0),
    grp: ['co', 'cl', 'nt'].reduce((o, k) => { const l = rs.filter(r => P.map[r.id] && grpOf(r) === k); o[k] = { kw: l.reduce((t, r) => t + P.map[r.id].kw, 0), a: l.reduce((t, r) => t + P.map[r.id].a, 0) }; return o; }, {}),
    zero: u.filter(r => P.map[r.id].zero).length, hot: u.filter(r => P.map[r.id].pct != null && P.map[r.id].pct >= P.lim.warn).length };
}

/* ── ปุ่มสลับโหมด + KPI + legend + ตัวกรอง (แทรกที่ต้น hseg) ── */
function modeBar(c) {
  const ok = prep(), rs = getR().filter(r => c === 'plan' || r.zone === c), s = ok ? stats(rs) : null;
  let h = '<div class="pwr-bar' + (on() ? ' on' : '') + '"><div class="seg"><a data-pm="n" class="' + (P.mode ? '' : 'on') + '">ปกติ</a><a data-pm="p" class="' + (P.mode ? 'on' : '') + '">⚡ ไฟฟ้า</a></div>';
  if (P.mode && !ok) h += '<p class="pwr-note">กำลังโหลดข้อมูลไฟฟ้า… (ต้องมีสิทธิ์ดูไฟฟ้า และมีไฟล์ที่อัปโหลดแล้ว)</p>';
  if (on()) {
    h += '<div class="kpi pwr-kpi">' + [['กำลังรวม', s.kw, s.a], ['Co-location', s.grp.co.kw, s.grp.co.a], ['Cloud', s.grp.cl.kw, s.grp.cl.a], ['Network / Telecom', s.grp.nt.kw, s.grp.nt.a]]
      .map(k => '<div class="tb"><b>' + fmt(k[1], 1) + '</b><span class="sub">kW ' + k[0] + ' · ' + fmt(k[2], 1) + ' A</span></div>').join('') + '</div>' +
      '<div class="leg pwr-leg"><span><i style="background:var(--gr)"></i>ปกติ</span><span><i style="background:var(--yl)"></i>≥' + P.lim.warn + '% ของ quota_kw</span><span><i style="background:var(--rd);box-shadow:0 0 0 2px #fff inset"></i>เกิน quota</span><span><i class="z"></i>0 kW</span>' +
      '<span><i class="fA"></i>Source A</span><span><i class="fB"></i>Source B</span></div>' +
      '<div class="seg"><a data-pf="zero" class="' + (P.f === 'zero' ? 'on' : '') + '">เฉพาะ 0 kW (' + s.zero + ')</a><a data-pf="hot" class="' + (P.f === 'hot' ? 'on' : '') + '">เฉพาะโหลดสูง (' + s.hot + ')</a></div>' +
      '<p class="pwr-note">สีตาม % ของ quota_kw ทั้ง Rack (รวมทุก Source ของ Rack: 2 / 4 / 6) · ' + (c === 'plan' ? 'ในผัง: ช่องซ้าย = เลข Rack · ช่องขวา = กำลังไฟ kW · แตะ Rack เพื่อดูรายละเอียด' : 'ซ้าย = Source ฝั่ง A · ขวา = Source ฝั่ง B · กลางแถว = เลข Rack / ลูกค้า / kW รวม · แตะ Rack เพื่อดูรายละเอียด · แตะ Source เพื่อดูแนวโน้ม') + '</p>';
  }
  return h + '</div>';
}

/* ── ผังห้อง: ทุกช่องใช้โครงเดียวกัน  [ เลข Rack | kW ] ── */
function cell(r, base) {
  const html = base(r);
  if (!on()) return html;
  const m = /^<(a|span) class="fc ([^"]*)"([^>]*)>/.exec(html); if (!m) return html;
  const p = P.map[r.id], use = r.st === 'use', dim = hit(r) ? '' : ' pwr-d';
  let cls, val = '', tip = '';
  if (use) {
    const lv = p ? p.lv : 'nm';
    cls = 'pm-' + lv;
    val = !p || lv === 'nm' || lv === 'na' ? '–' : p.zero ? '0' : fmt(p.kw, p.kw >= 10 ? 1 : 2);
    if (p && p.src.length) { const src = p.src.map(s => short(s.id) + ' ' + (s.a == null ? 'ไม่มีค่า' : fmt(s.kw) + ' kW (' + fmt(s.a) + ' A)')).join('\n');
      tip = ' · ⚡ ' + fmt(p.kw, 2) + ' kW' + (p.cap ? ' / quota ' + fmt(p.cap, 1) + ' (' + fmt(p.pct, 0) + '%)' : '') + (p.zero ? ' (0 kW ทั้ง Rack)' : '') + '&#10;' + esc(src); }
    else if (p) tip = ' (ยังไม่มี Source ใน RackCB)';
  } else { cls = m[2].trim(); if (r.st === 'off') val = 'OFF'; }
  const attrs = m[3].replace(/title="([^"]*)"/, (x, t) => 'title="' + t + tip + '"');
  const lb = r.lb ? '<small class="pm-l">' + esc(String(r.lb).replace(/^\((.*)\)$/, '$1')) + '</small>' : '';
  return '<' + m[1] + ' class="fc ' + cls + (r.n == 19 ? ' p' : '') + dim + '"' + attrs + '><i class="pm-n">' + esc(r.n) + '</i><span class="pm-b"><b class="pm-k">' + val + '</b>' + lb + '</span></' + m[1] + '>';
}

/* ── รายการแถว: A ซ้าย · B ขวา ── */
function scell(s) {
  const w = s.a == null ? 0 : Math.min(s.kw / ((s.cap) || 4) * 100, 100);
  return '<div class="pwr-s f' + s.fam + ' ' + s.lv + '" data-psrc="' + esc(s.id) + '" title="' + esc(s.id + ' · ' + (s.a == null ? 'ไม่มีค่าในไฟล์' : fmt(s.kw) + ' kW (' + fmt(s.a) + ' A)') + ' · แตะดูแนวโน้ม' + (s.n > 1 ? ' · ใช้ร่วม ' + s.n + ' Rack' : '')) + '"><i>' + esc(short(s.id)) + '</i><b>' + (s.a == null ? '–' : fmt(s.kw) + '<small>kW · ' + fmt(s.a, 1) + ' A</small>') + '</b>' + (s.n > 1 ? '<u>ร่วม ' + s.n + '</u>' : '') + '<span class="lv"><em style="width:' + w + '%"></em></span></div>';
}
function col(rh, l) {
  const none0 = t => '<div class="pwr-s none"><i>' + t + '</i></div>', s = stats(l);
  rh = rh.replace(/<span class="sub">ใช้[^<]*<\/span><\/div>$/, '<span class="sub"><b style="color:var(--ink)">' + fmt(s.kw, 1) + ' kW</b> · ' + fmt(s.a, 1) + ' A' + (s.zero ? ' · <b>0 kW ' + s.zero + ' Rack</b>' : '') + '</span></div>');
  return '<div class="pwr-col">' + rh + l.slice().sort((a, b) => b.n - a.n).map(r => {
    const p = P.map[r.id], L = p.src.filter(x => x.fam === 'A'), Rt = p.src.filter(x => x.fam === 'B'), off = r.st === 'off';
    L.forEach(x => { x.cap = p.cap; }); Rt.forEach(x => { x.cap = p.cap; });
    const cl = x => x.length ? 'linear-gradient(to bottom,' + x.map((q, i) => FC[q.fam] + ' ' + (i * 100 / x.length) + '% ' + ((i + 1) * 100 / x.length) + '%').join(',') + ')' : 'var(--line)';
    const nm = t => t;
    return '<div class="pwr-r ' + (r.st === 'empty' ? 'empty ' : '') + (r.st === 'use' && p.zero ? 'zero ' : '') + (off ? 'off ' : '') + (hit(r) ? '' : 'pwr-d') + '"><div class="pwr-L">' + (L.map(scell).join('') || none0(nm(p.src.length ? '–' : r.st === 'empty' ? 'ว่าง' : 'ไม่มี Source'))) + '</div>' +
      '<a class="pwr-c" style="--gl:' + cl(L) + ';--gr2:' + cl(Rt) + '" href="#rack/' + encodeURIComponent(r.id) + '" title="' + esc(r.name + ' · ' + r.c + (p.src.length ? '\n⚡ ' + fmt(p.kw) + ' kW (' + fmt(p.a, 1) + ' A)' + (p.cap ? ' · quota ' + fmt(p.cap, 1) + ' kW (' + fmt(p.pct, 0) + '%)' : '') + '\nSource: ' + p.src.map(x => short(x.id)).join(', ') : '') + (off ? '\n(วางเครื่อง ไม่ ON)' : '')) + '"><b>' + esc(label(r)) + '</b>' + (r.lb ? '<em>(' + esc(r.lb) + ')</em>' : '') + '<span>' + esc(r.st === 'empty' ? 'ว่าง' : r.c) + '</span>' + (r.st === 'use' && p.src.length ? '<small>' + (p.zero ? '0' : fmt(p.kw, p.kw >= 10 ? 1 : 2)) + ' kW</small>' : '') + '</a><div class="pwr-RR">' + (Rt.map(scell).join('') || none0(nm(p.src.length ? '–' : ''))) + '</div></div>';
  }).join('') + '</div>';
}

function rackPower(r) {
  if (!r || (!P.ok && !prep())) return null;
  const p = P.map[r.id]; if (!p || !p.src.length) return null;
  return { n: p.src.length, nA: p.nA, nB: p.nB, kw: p.kw, a: p.a, A: p.A, B: p.B, cap: p.cap, pct: p.pct, lv: p.lv, src: p.src, zero: p.zero };
}

/* ── หน้า Rack: การ์ดกำลังไฟ (โดนัท % ของ quota + แถบแต่ละ Source) ── */
function rackBlock(r) {
  const m = rackPower(r); if (!m) return '';
  const miss = m.src.filter(s => s.a == null).length, dead = m.src.filter(s => s.a != null && s.a < 0.05).length;
  const rows = m.src.map(s => '<div class="pwx-s" data-psrc="' + esc(s.id) + '" title="แตะดูแนวโน้ม"><div class="pwx-sh"><i style="background:' + FC[s.fam] + '"></i><span class="id">' + esc(short(s.id)) + '<small>ฝั่ง ' + s.fam + (s.n > 1 ? ' · ใช้ร่วม ' + s.n + ' Rack' : '') + '</small></span>' +
    '<span class="v">' + (s.a == null ? 'ไม่มีค่าในไฟล์' : '<b>' + fmt(s.kw) + '</b> kW<em>' + fmt(s.a, 1) + ' A</em>') + '</span></div>' +
    '<div class="pwx-bar"><em class="' + (s.a == null ? 'z' : s.lv) + '" style="width:' + (s.a == null || !m.cap ? 0 : Math.min(s.kw / m.cap * 100, 100)) + '%"></em></div></div>').join('');
  const warn = (r.st === 'use' && m.zero) ? '<div class="pwr-warn">ทุก Source ใน Rack นี้เป็น 0 kW — ตรวจว่าเครื่องปิดอยู่ ปลั๊กไม่ได้เสียบ หรือเบรกเกอร์ OFF</div>'
    : (miss ? '<div class="pwr-warn">มี ' + miss + ' Source ที่ไม่มีค่าในไฟล์ — กำลังไฟรวมอาจต่ำกว่าจริง</div>' : (r.st === 'use' && dead && dead < m.n ? '<div class="pwr-warn">มี ' + dead + ' Source ที่ 0 A ขณะที่ Source อื่นมีโหลด — ตรวจ feed ที่ขาด</div>' : ''));
  return '<div class="pwx"><div class="pwx-h"><b>กำลังไฟฟ้า</b><span class="sub">' + fmt(m.kw) + ' kW · ' + fmt(m.a, 1) + ' A</span></div>' + warn +
    '<div class="pwx-top"><div class="pwx-ring ' + m.lv + '" style="--p:' + Math.min(m.pct || 0, 100).toFixed(1) + '"><div><b>' + fmt(m.pct, 0) + '<small>%</small></b></div></div>' +
    '<div class="pwx-cap">ใช้ <b>' + fmt(m.kw) + '</b> จาก quota <b>' + fmt(m.cap, 1) + '</b> kW<small>' + m.n + ' Source (' + m.nA + 'A + ' + m.nB + 'B) · ฝั่ง A ' + fmt(m.A) + ' kW · ฝั่ง B ' + fmt(m.B) + ' kW</small></div></div>' +
    '<div class="pwx-sl">' + rows + '</div>' +
    '<div class="pwx-f"><a class="pwr-lk" data-prk="' + esc(r.id) + '">ดูแนวโน้มทั้ง Rack ›</a><span>ข้อมูล ณ ' + esc(P.ts || '–') + '</span></div></div>';
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
window.PowerMap = { setCB() {}, on, modeBar, cell, col, rackBlock, rackPower, state: P };
})();
