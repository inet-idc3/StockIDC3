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
const P = { map: {}, bySrc: {}, ok: false, loading: false, f: 'all', lim: { limit: 14.4, warn: 80, crit: 100 }, ts: '',
  mode: (() => { try { return localStorage.getItem(KEY) === 'p'; } catch (_) { return false; } })() };
const getR = () => (typeof R !== 'undefined' ? R : []);

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
  P.map = {}; P.bySrc = {};
  RR.forEach(r => { const ids = new Set(); (r.dv || []).forEach(v => { if (v[3] !== 'ไม่ใช้ไฟ') parseRpp(v[5]).forEach(i => ids.add(i)); });
    P.map[r.id] = { ids: [...ids].sort() }; ids.forEach(i => (P.bySrc[i] = P.bySrc[i] || []).push(r.id)); });
  RR.forEach(r => { const p = P.map[r.id];
    p.src = p.ids.map(id => { const b = cur[id], n = P.bySrc[id].length, a = b ? b.a : (unk.has(id) ? null : 0);
      return { id, fam: id.split('-')[1][0], a, kw: b ? b.kw : 0, n, k: 1 / n, lv: lvl(a) }; });
    p.a = p.src.reduce((t, s) => t + (s.a || 0) * s.k, 0); p.kw = p.src.reduce((t, s) => t + (s.kw || 0) * s.k, 0);
    p.max = p.src.reduce((m, s) => Math.max(m, s.a || 0), 0);
    p.zero = p.src.length > 0 && p.src.every(s => s.a == null || s.a < 0.05);
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
.pwr-note{font-size:12.5px;color:var(--mut);margin:2px 0 8px}
.pwr-leg i.z{background:repeating-linear-gradient(135deg,#0005 0 3px,transparent 3px 6px),#5a6685;outline:2px solid var(--rd);outline-offset:-2px}
.pwr-leg i.fA{background:#c4372b}.pwr-leg i.fB{background:#2368c4}.pwr-leg i.fC{background:#f0c419}.pwr-leg i.fD{background:#1c9c52}
main:has(.pwr-bar.on) .kpi:not(.pwr-kpi),main:has(.pwr-bar.on) .leg:not(.pwr-leg){display:none}
main:has(.pwr-grid){max-width:1240px}
main:has(.pwr-bar.on) .pv.mi,main:has(.pwr-bar.on) .pv.mi + p.sub{display:none}
.pwr-d{opacity:.2}
.fc.pw small.pa{font-size:9.5px;font-weight:700;opacity:1;margin-left:1px}
.fc.pw.gr{background:var(--gr)}.fc.pw.yl{background:var(--yl);color:#3b2d06}.fc.pw.rd{background:var(--rd);box-shadow:0 0 0 2px #fff inset}
.fc.pw.z{background:repeating-linear-gradient(135deg,#0006 0 3px,transparent 3px 6px),#5a6685;outline:2px solid var(--rd);outline-offset:-2px}
.fc.pw.na,.fc.pw.nm{background:var(--dualbg);color:var(--dual);box-shadow:inset 0 0 0 1px var(--line)}
.pwr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:start}
.pwr-col{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:2px 6px 6px}
.pwr-col .rowh{margin:8px 4px 6px}
.pwr-r{display:grid;grid-template-columns:1fr 76px 1fr;gap:3px;padding:2px 0;border-radius:8px}
.pwr-L,.pwr-RR{display:flex;flex-direction:column;gap:3px;min-width:0}
.pwr-c{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:8px;background:var(--card2);color:var(--ink);padding:2px;min-height:42px;text-decoration:none;font-size:12.5px;line-height:1.15}
.pwr-c b{font-size:13px}.pwr-c span{font-size:10px;color:var(--mut);max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pwr-r.empty .pwr-c{opacity:.5}.pwr-r.zero .pwr-c{background:var(--rd);color:#fff}.pwr-r.zero .pwr-c span{color:#fff;opacity:.9}
.pwr-s{position:relative;border-radius:8px;padding:3px 7px 6px;color:#fff;min-height:42px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;overflow:hidden;min-width:0}
.pwr-s i{font-style:normal;font-size:10px;opacity:.92;white-space:nowrap}.pwr-s b{font-size:15.5px;line-height:1.1}
.pwr-s.fA{background:#c4372b}.pwr-s.fB{background:#2368c4}.pwr-s.fD{background:#1c9c52}.pwr-s.fC{background:#f0c419;color:#1b1b1b}
.pwr-s.z{opacity:.6;background-image:repeating-linear-gradient(135deg,#0003 0 6px,transparent 6px 12px)}
.pwr-s.yl{box-shadow:0 0 0 2px #ffe14d inset}.pwr-s.rd{box-shadow:0 0 0 2px #fff inset,0 0 0 3px #000}
.pwr-s.na{background:#6b7694}.pwr-s.none{background:transparent;border:1px dashed var(--line);color:var(--mut);cursor:default;opacity:1;background-image:none}
.pwr-s u{position:absolute;right:4px;top:2px;font-size:9px;text-decoration:none;background:#0006;border-radius:4px;padding:0 4px;color:#fff}
.pwr-s .lv{position:absolute;left:0;right:0;bottom:0;height:3px;background:#0004}.pwr-s .lv em{display:block;height:100%;background:#fff}
@media(hover:hover){.pwr-s:hover{filter:brightness(1.12)}}
.pwr-rb,.pwr-card{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:12px;margin:0 0 12px}
.pwr-card{display:block;color:inherit;text-decoration:none;margin:0 0 8px}
.pwr-card.zero,.pwr-rb.zero{border-color:var(--rd);box-shadow:inset 3px 0 0 var(--rd)}
.pwr-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.pwr-h b{font-size:15px}
.pwr-tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}
.pwr-tag.rd{background:var(--rd);color:#fff}.pwr-tag.gy{background:var(--dualbg);color:var(--dual)}.pwr-tag.gr{background:var(--grbg);color:var(--gr)}.pwr-tag.yl{background:var(--yl);color:#3b2d06}
.pwr-warn{margin:8px 0;padding:8px 10px;border-radius:10px;background:var(--rdbg);border:1px solid var(--rdf);font-size:13px}
.pwr-sl{display:grid;grid-template-columns:8px 1fr 64px 74px;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--line);cursor:pointer;font-size:13.5px}
.pwr-sl i{height:24px;border-radius:3px}.pwr-sl .id{font-weight:600}.pwr-sl .id small{color:var(--mut);font-weight:400;margin-left:4px}
.pwr-sl .bar{height:6px;border-radius:4px;background:var(--card2);overflow:hidden}.pwr-sl .bar em{display:block;height:100%}.pwr-sl b{text-align:right}
.pwr-lk{display:inline-block;margin-top:8px;font-size:13px;color:var(--dual);cursor:pointer;text-decoration:underline}
`;
const FC = { A: '#c4372b', B: '#2368c4', C: '#f0c419', D: '#1c9c52' }, LC = { gr: 'var(--gr)', yl: 'var(--yl)', rd: 'var(--rd)', z: '#5a6685', na: '#5a6685' };
const label = r => r.zone === 'Network-Telecom' ? r.name : 'Rack ' + String(r.n).padStart(2, '0');
function stats(rs) {
  const u = rs.filter(r => r.st === 'use' && P.map[r.id]);
  return { a: rs.reduce((t, r) => t + (P.map[r.id] ? P.map[r.id].a : 0), 0), kw: rs.reduce((t, r) => t + (P.map[r.id] ? P.map[r.id].kw : 0), 0),
    zero: u.filter(r => P.map[r.id].zero).length, hot: u.filter(r => pct(P.map[r.id].max) >= P.lim.warn).length };
}

/* ── ปุ่มสลับโหมด + KPI + legend + ตัวกรอง (แทรกที่ต้น hseg) ── */
function modeBar(c) {
  const ok = prep(), rs = getR().filter(r => c === 'plan' || r.zone === c), s = ok ? stats(rs) : null;
  let h = '<div class="pwr-bar' + (on() ? ' on' : '') + '"><div class="seg"><a data-pm="n" class="' + (P.mode ? '' : 'on') + '">ปกติ</a><a data-pm="p" class="' + (P.mode ? 'on' : '') + '">⚡ ไฟฟ้า</a></div>';
  if (P.mode && !ok) h += '<p class="pwr-note">กำลังโหลดข้อมูลไฟฟ้า… (ต้องมีสิทธิ์ดูไฟฟ้า และมีไฟล์กระแสที่อัปโหลดแล้ว)</p>';
  if (on()) {
    h += '<div class="kpi pwr-kpi"><div class="tb"><b>' + fmt(s.a, 1) + '</b><span class="sub">A รวม · ' + fmt(s.kw, 1) + ' kW</span></div>' +
      '<div class="' + (s.zero ? 'tr' : 'tg') + '"><b>' + s.zero + '</b><span class="sub">Rack ใช้งานแต่ 0 A</span></div>' +
      '<div class="' + (s.hot ? 'ty' : 'tg') + '"><b>' + s.hot + '</b><span class="sub">Rack มี Source ≥' + P.lim.warn + '%</span></div></div>' +
      '<div class="leg pwr-leg"><span><i style="background:var(--gr)"></i>ปกติ</span><span><i style="background:var(--yl)"></i>≥' + P.lim.warn + '% ของ ' + P.lim.limit + ' A</span><span><i style="background:var(--rd);box-shadow:0 0 0 2px #fff inset"></i>เกิน</span><span><i class="z"></i>0 A</span>' +
      '<span><i class="fA"></i>Source A</span><span><i class="fB"></i>B</span><span><i class="fC"></i>C</span><span><i class="fD"></i>D</span></div>' +
      '<div class="seg"><a data-pf="zero" class="' + (P.f === 'zero' ? 'on' : '') + '">เฉพาะ 0 A (' + s.zero + ')</a><a data-pf="hot" class="' + (P.f === 'hot' ? 'on' : '') + '">เฉพาะโหลดสูง (' + s.hot + ')</a></div>' +
      '<p class="pwr-note">สีตามเบรกเกอร์ที่หนักสุดของ Rack · ตัวเลข = กระแสรวมของ Rack (A) · แตะ Rack เพื่อดูรายละเอียด' + (c === 'plan' ? '' : ' · แตะ Source เพื่อดูแนวโน้ม') + '</p>';
  }
  return h + '</div>';
}

/* ── ผังห้อง: แปลงเซลล์ .fc เดิมให้เป็นสีกระแส (เก็บ href/title/FM เดิมไว้) ── */
function cell(r, base) {
  const html = base(r), p = P.map[r.id];
  if (!on() || r.st !== 'use' || !p) return on() && !hit(r) ? html.replace('class="fc ', 'class="fc pwr-d ') : html;
  const src = p.src.map(s => s.id + ' ' + fmt(s.a) + ' A').join('\n');
  return html.replace(/class="fc [^"]*"/, 'class="fc pw ' + p.lv + (r.n == 19 ? ' p' : '') + (hit(r) ? '' : ' pwr-d') + '"')
    .replace(/title="([^"]*)"/, (m, t) => 'title="' + t + ' · ⚡ ' + fmt(p.a, 1) + ' A' + (p.zero ? ' (0 A ทั้ง Rack)' : '') + (src ? '&#10;' + esc(src) : p.lv === 'nm' ? ' (ยังไม่ระบุ Source)' : '') + '"')
    .replace(/<\/(a|span)>$/, '<small class="pa">' + (p.lv === 'nm' ? '–' : p.zero ? '0' : fmt(p.a, p.a >= 100 ? 0 : 1)) + '</small></$1>');
}

/* ── รายการแถว: แถวละ 1 การ์ด ตามผังไฟของคุณ ── */
function scell(s) {
  const w = s.a == null ? 0 : Math.min(pct(s.a), 100);
  return '<div class="pwr-s f' + s.fam + ' ' + s.lv + '" data-psrc="' + esc(s.id) + '" title="' + esc(s.id + ' · แตะดูแนวโน้ม' + (s.n > 1 ? ' · ใช้ร่วม ' + s.n + ' Rack' : '')) + '"><i>' + esc(s.id) + '</i><b>' + (s.a == null ? '–' : fmt(s.a)) + '</b>' + (s.n > 1 ? '<u>ร่วม ' + s.n + '</u>' : '') + '<span class="lv"><em style="width:' + w + '%"></em></span></div>';
}
function col(rh, l) {
  const none = '<div class="pwr-s none"><i>–</i></div>', s = stats(l);
  rh = rh.replace(/<span class="sub">เสี่ยง[^<]*<\/span><\/div>$/, '<span class="sub"><b style="color:var(--ink)">' + fmt(s.a, 1) + ' A</b>' + (s.zero ? ' · <b style="color:var(--rd)">0 A ' + s.zero + ' Rack</b>' : '') + '</span></div>');
  return '<div class="pwr-col">' + rh + l.slice().sort((a, b) => b.n - a.n).map(r => {
    const p = P.map[r.id], L = p.src.filter(s => s.fam === 'A'), Rt = p.src.filter(s => s.fam !== 'A');
    return '<div class="pwr-r ' + (r.st === 'empty' ? 'empty ' : '') + (r.st === 'use' && p.zero ? 'zero ' : '') + (hit(r) ? '' : 'pwr-d') + '"><div class="pwr-L">' + (L.map(scell).join('') || none) + '</div>' +
      '<a class="pwr-c" href="#rack/' + encodeURIComponent(r.id) + '" title="' + esc(r.name + ' · ' + r.c) + '"><b>' + esc(label(r)) + '</b><span>' + esc(r.st === 'empty' ? 'ว่าง' : r.c) + '</span></a><div class="pwr-RR">' + (Rt.map(scell).join('') || none) + '</div></div>';
  }).join('') + '</div>';
}

/* ── หน้า Rack: บล็อกไฟฟ้า (แตะ Source → แนวโน้ม) ── */
function rackBlock(r) {
  if (!prep() || !r) return ''; const p = P.map[r.id]; if (!p || !p.src.length) return '';
  const tag = r.st !== 'use' ? '' : p.zero ? '<span class="pwr-tag rd">0 A ทั้ง Rack</span>' : '<span class="pwr-tag ' + (p.lv === 'rd' ? 'rd' : p.lv === 'yl' ? 'yl' : 'gr') + '">' + fmt(p.a) + ' A · ' + fmt(p.kw) + ' kW</span>';
  return '<div class="pwr-rb ' + (r.st === 'use' && p.zero ? 'zero' : '') + '"><div class="pwr-h"><b>⚡ ไฟฟ้า</b>' + tag + '</div>' +
    (r.st === 'use' && p.zero ? '<div class="pwr-warn">กระแสของทุก Source ใน Rack นี้เป็น 0 A — ตรวจว่าเครื่องปิดอยู่ ปลั๊กไม่ได้เสียบ หรือเบรกเกอร์ OFF</div>' : '') +
    p.src.map(s => '<div class="pwr-sl" data-psrc="' + esc(s.id) + '" title="แตะดูแนวโน้ม"><i style="background:' + FC[s.fam] + '"></i><span class="id">' + esc(s.id) + (s.n > 1 ? '<small>ร่วม ' + s.n + ' Rack</small>' : '') + '</span>' +
      '<span class="bar"><em style="width:' + (s.a == null ? 0 : Math.min(pct(s.a), 100)) + '%;background:' + LC[s.lv] + '"></em></span><b>' + (s.a == null ? 'ไม่มีในไฟล์' : fmt(s.a) + ' A') + '</b></div>').join('') +
    '<a class="pwr-lk" data-prk="' + esc(r.id) + '">ดูแนวโน้มทั้ง Rack ›</a><div class="sub" style="margin-top:4px">ข้อมูล ณ ' + esc(P.ts || '–') + '</div></div>';
}

/* ── ผลค้นหา: Rack ที่ตรงชื่อ/ลูกค้า หรือรหัส Source ── */
function searchBlock(rs, q) {
  if (!prep()) return ''; q = (q || '').trim().toLowerCase();
  const seen = new Set(rs.map(r => r.id)), more = q.length >= 3 ? getR().filter(r => !seen.has(r.id) && P.map[r.id] && P.map[r.id].ids.some(i => i.toLowerCase().includes(q))) : [];
  const l = rs.concat(more).filter(r => P.map[r.id] && (P.map[r.id].src.length || r.st === 'use')).slice(0, 10); if (!l.length) return '';
  return '<h2>⚡ ไฟฟ้า</h2>' + l.map(r => { const p = P.map[r.id], z = r.st === 'use' && p.zero;
    return '<a class="pwr-card ' + (z ? 'zero' : '') + '" href="#rack/' + encodeURIComponent(r.id) + '" onclick="clr()"><div class="pwr-h"><b>' + esc(r.name) + '</b>' +
      (!p.src.length ? '<span class="pwr-tag gy">ยังไม่ระบุ Source</span>' : z ? '<span class="pwr-tag rd">0 A ทั้ง Rack</span>' : '<span class="pwr-tag gr">' + fmt(p.a) + ' A</span>') + '</div><div class="sub">' + esc(r.c) + ' / ' + esc(r.zone) + ' ' + esc(r.row || '') + '</div>' +
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
window.PowerMap = { on, modeBar, cell, col, rackBlock, searchBlock, parseRpp, state: P };
})();
