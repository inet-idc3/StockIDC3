/* ════════════════════════════════════════════════════════════════
 *  Face Rack — 3D Rack View (ส่วนเสริม)
 *  จำลองตู้ Rack 42U แบบ 3 มิติ จากข้อมูลเครื่องจริงในหน้า #rack/<id>
 *  - ไม่ใช้ไลบรารี (CSS 3D ล้วน) / ไม่แก้ข้อมูล / ไม่ยุ่งกับระบบแก้ไขแบบ 2D
 *  - ใส่ <script src="rack3d.js"></script> ต่อท้าย rack-live.js
 *  - ลากเพื่อหมุน · แตะเครื่องเพื่อดูรายละเอียด · สลับ 2D/3D ได้ (จำค่าไว้)
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
if (window.__rack3d) return; window.__rack3d = 1;

const NU = 42, UH = 13, W = 214, D = 236, DD = 188, PAD = 11, H = NU * UH;
const KEY = 'rack3dMode';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const view = { ry: -26, rx: -14, auto: !REDUCE, dir: 1, pause: 0, drag: null, scale: 1 };
let mode = '3d', raf = 0, last = 0, cur = null;
try { mode = localStorage.getItem(KEY) === '2d' ? '2d' : '3d'; } catch (_) { /* ignore */ }

const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uTxt = (t, b) => t === b ? 'U' + t : 'U' + b + '–' + t;

/* ---------- CSS ---------- */
const css = `
.r3-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 2px}
.r3-bar .sub{font-size:12.5px}
.r3-seg{display:inline-flex;padding:3px;border-radius:99px;background:var(--card);border:1px solid var(--line);box-shadow:inset 0 1px 0 var(--hi)}
.r3-seg button{font:600 12.5px/1 "Plus Jakarta Sans",system-ui,sans-serif;letter-spacing:.4px;color:var(--mut);background:none;border:0;border-radius:99px;padding:7px 15px;cursor:pointer;transition:background .25s,color .25s,box-shadow .25s}
.r3-seg button.on{color:#fff;background:linear-gradient(160deg,#6c9fff,#2f5fdc);box-shadow:0 6px 14px -4px rgba(60,110,255,.75),inset 0 1px 0 rgba(255,255,255,.4)}
.rk:not(.r3on)>.r3-stage{display:none}
.rk.r3on>.el{display:none}
.rk>.r3-stage{order:2}
.r3-stage{position:relative;height:720px;margin:10px 0;border-radius:22px;overflow:hidden;perspective:1700px;touch-action:pan-y;cursor:grab;-webkit-user-select:none;user-select:none;outline:0;
 background:radial-gradient(520px 380px at 50% 38%,rgba(40,110,255,.28),transparent 70%),radial-gradient(400px 300px at 50% 100%,rgba(0,220,255,.16),transparent 70%),linear-gradient(180deg,#071230,#030816);
 border:1px solid rgba(120,160,255,.28);box-shadow:0 22px 44px -18px var(--sh),inset 0 1px 0 rgba(255,255,255,.1)}
.r3-stage:active{cursor:grabbing}.r3-stage:focus-visible{box-shadow:0 0 0 3px var(--dualbg)}
.r3-cam{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;will-change:transform}
.r3-cam>*{position:absolute;left:0;top:0;transform-style:preserve-3d}
.r3f{position:absolute;left:0;top:0;display:block}
.r3-floor{width:1100px;height:1100px;margin:-550px 0 0 -550px;background:repeating-linear-gradient(0deg,rgba(90,150,255,.22) 0 1px,transparent 1px 44px),repeating-linear-gradient(90deg,rgba(90,150,255,.22) 0 1px,transparent 1px 44px);-webkit-mask-image:radial-gradient(closest-side,#000 18%,transparent 100%);mask-image:radial-gradient(closest-side,#000 18%,transparent 100%)}
.r3-ring{background:radial-gradient(closest-side,rgba(60,190,255,.55),rgba(60,120,255,.18) 62%,transparent 100%)}
.r3-glass{background:linear-gradient(180deg,rgba(80,130,255,.1),rgba(30,60,160,.06));border:1px solid rgba(120,170,255,.38);box-shadow:inset 0 0 26px rgba(70,130,255,.16)}
.r3-back{background:repeating-linear-gradient(180deg,transparent 0 ${UH - 1}px,rgba(110,160,255,.09) ${UH - 1}px ${UH}px),linear-gradient(180deg,#0a1330,#060b1d);border:1px solid rgba(120,170,255,.3)}
.r3-top{background:linear-gradient(135deg,rgba(110,160,255,.3),rgba(40,70,170,.14));border:1px solid rgba(140,185,255,.55)}
.r3-rail{background:repeating-linear-gradient(180deg,transparent 0 ${UH - 2}px,rgba(255,255,255,.22) ${UH - 2}px ${UH - 1}px,transparent ${UH - 1}px ${UH}px),linear-gradient(90deg,#1a2342,#0e1530);border:1px solid rgba(140,180,255,.35);border-radius:2px}
.r3-rail i{position:absolute;left:1px;right:1px;text-align:center;font:600 6.5px/${UH}px "Plus Jakarta Sans",sans-serif;color:#9db8ff;background:#0e1530}
.r3-cap{background:linear-gradient(180deg,#27345e,#131b36);border:1px solid rgba(150,190,255,.4);border-radius:3px;box-shadow:0 0 14px rgba(60,140,255,.35)}
.r3-scan{background:linear-gradient(180deg,transparent,rgba(110,210,255,.34) 50%,transparent) 0 -90px/100% 90px no-repeat;pointer-events:none;animation:r3s 4.8s linear infinite}
@keyframes r3s{to{background-position:0 ${H + 90}px}}
.r3-dv{cursor:pointer;--ac:#7d89a8;transition:transform .35s cubic-bezier(.3,1.3,.5,1)}
.r3-dv.Dual{--ac:#3ee0a5;--gl:rgba(62,224,165,.5);--tn:rgba(62,224,165,.17)}.r3-dv.Single{--ac:#ff6b78;--gl:rgba(255,107,120,.7);--tn:rgba(255,107,120,.34)}.r3-dv.off{--ac:#6f8cf0}
.r3-fr{display:flex;align-items:center;overflow:hidden;padding:0 26px 0 10px;border-radius:2px;color:#dce7ff;font:600 8.5px/1 "Plus Jakarta Sans","IBM Plex Sans Thai",sans-serif;white-space:nowrap;border:1px solid rgba(160,190,255,.24);
 background:linear-gradient(90deg,var(--ac) 0 4px,transparent 4px),linear-gradient(90deg,var(--tn,transparent),transparent 78%),repeating-linear-gradient(90deg,transparent 0 4px,rgba(255,255,255,.04) 4px 5px),linear-gradient(180deg,#2d3959,#1b2442 58%,#121a31);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 12px -3px var(--gl,transparent)}
.r3-dv.off .r3-fr{background:linear-gradient(90deg,var(--ac) 0 3px,transparent 3px),linear-gradient(180deg,#1a2240,#101730);border:1px dashed rgba(111,140,240,.6);color:#8da4e6;box-shadow:none}
.r3-dv.x .r3-fr{color:#9aa6c4}
.r3-t{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;overflow:hidden;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.r3-t .r3n{flex:1 1 auto;min-width:0;white-space:nowrap}
.r3-t .r3s{flex:0 0 auto;white-space:nowrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.88em;font-weight:500;color:#9fd0ff}
.r3-dv.off .r3-t .r3s{color:#8da4e6}
.r3-t.r3stk{flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;line-height:1.05}
.r3-t.r3stk .r3n,.r3-t.r3stk .r3s{flex:0 0 auto;max-width:100%}
.r3-t.r3cnd{flex:none;width:max-content;overflow:visible;transform-origin:left center}.r3-t.r3cnd .r3n{flex:none}
.r3-led{position:absolute;right:8px;top:50%;width:4px;height:4px;margin-top:-2px;border-radius:50%;background:#46f2a8;box-shadow:0 0 6px 1px #46f2a8;animation:r3b 1.6s ease-in-out infinite}
.r3-led.b{right:15px;background:#ffc24d;box-shadow:0 0 6px 1px #ffc24d;animation-duration:.55s}
.r3-dv.off .r3-led,.r3-dv.x .r3-led{animation:none;background:#33405f;box-shadow:none}
@keyframes r3b{0%,100%{opacity:1}50%{opacity:.2}}
.r3-sd{background:linear-gradient(180deg,#141c36,#0a1022);border:1px solid rgba(120,160,255,.14)}
.r3-tp{background:linear-gradient(180deg,#35446d,#222d4d);border:1px solid rgba(160,195,255,.3)}
.r3-dv.sel{z-index:3}.r3-dv.sel .r3-fr{background:linear-gradient(90deg,var(--ac) 0 3px,transparent 3px),linear-gradient(180deg,#4a5d95,#2c3a66);box-shadow:0 0 18px 2px rgba(190,220,255,.8),inset 0 1px 0 rgba(255,255,255,.4);color:#fff}
.r3-ui{position:absolute;z-index:5}
.r3-hd{left:14px;top:12px;max-width:62%;padding:9px 12px;border-radius:14px;background:rgba(8,18,50,.62);border:1px solid rgba(130,170,255,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#eaf1ff;pointer-events:none}
.r3-hd b{display:block;font:700 15px/1.2 "Plus Jakarta Sans","IBM Plex Sans Thai",sans-serif;letter-spacing:.3px}
.r3-hd span{display:block;margin-top:3px;font-size:11.5px;color:#9db4e8}
.r3-hd em{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#46f2a8;box-shadow:0 0 8px #46f2a8;animation:r3b 1.6s ease-in-out infinite;vertical-align:1px}
.r3-g{right:14px;top:12px;width:66px;height:66px;border-radius:50%;display:grid;place-items:center;pointer-events:none;background:conic-gradient(#4ee0ff calc(var(--p)*1%),rgba(255,255,255,.12) 0);box-shadow:0 0 20px -4px rgba(60,190,255,.65)}
.r3-g::before{content:"";position:absolute;inset:6px;border-radius:50%;background:#071230}
.r3-g b{position:relative;font:700 15px/1 "Plus Jakarta Sans",sans-serif;color:#eaf1ff}
.r3-g small{position:relative;display:block;margin-top:-6px;font-size:8.5px;color:#9db4e8;text-align:center}
.r3-g div{position:relative;text-align:center}
.r3-ch{left:14px;right:14px;bottom:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;pointer-events:none}
.r3-ch i{font-style:normal;font:600 11.5px/1 "IBM Plex Sans Thai",sans-serif;padding:6px 10px;border-radius:99px;color:#eaf1ff;background:rgba(8,18,50,.62);border:1px solid rgba(130,170,255,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.r3-ch i.s{color:#ff9aa3;border-color:rgba(255,107,120,.5)}.r3-ch i.d{color:#6df0bd;border-color:rgba(62,224,165,.5)}
.r3-tl{right:14px;bottom:56px;display:flex;flex-direction:column;gap:6px}
.r3-tl button{width:38px;height:38px;border-radius:12px;border:1px solid rgba(130,170,255,.35);background:rgba(8,18,50,.7);color:#cfe0ff;cursor:pointer;display:grid;place-items:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.r3-tl button.on{background:linear-gradient(160deg,#6c9fff,#2f5fdc);color:#fff}
.r3-tl svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.r3-hint{left:0;right:0;bottom:62px;text-align:center;font-size:11px;color:#7f97cf;pointer-events:none;letter-spacing:.2px}
.r3-card{left:12px;right:12px;top:12px;padding:12px 14px;border-radius:16px;background:rgba(10,22,60,.9);border:1px solid rgba(160,200,255,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#eaf1ff;box-shadow:0 14px 30px -10px rgba(0,0,0,.7);animation:r3u .3s cubic-bezier(.2,.85,.25,1)}
@keyframes r3u{from{opacity:0;transform:translateY(-14px)}}
.r3-card b{display:block;padding-right:30px;font:600 14px/1.3 "IBM Plex Sans Thai",sans-serif;word-break:break-word}
.r3-card p{margin:4px 0 0;font-size:12px;color:#a9bde8}
.r3-card .r3-row{display:flex;gap:8px;margin-top:10px}
.r3-card button{font:600 12.5px/1 "IBM Plex Sans Thai",sans-serif;padding:9px 14px;border-radius:11px;border:1px solid rgba(160,200,255,.4);background:rgba(255,255,255,.08);color:#eaf1ff;cursor:pointer}
.r3-card button.p{background:linear-gradient(160deg,#6c9fff,#2f5fdc);border-color:transparent}
.r3-card .r3-x{position:absolute;right:8px;top:8px;width:28px;height:28px;padding:0;border-radius:50%}
.r3-card .pl{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;vertical-align:1px;background:rgba(255,255,255,.12)}
.r3-card .pl.Single{background:rgba(255,107,120,.22);color:#ff9aa3}.r3-card .pl.Dual{background:rgba(62,224,165,.2);color:#6df0bd}
@media(min-width:1024px){.rk>.r3-stage{order:0;grid-column:1;grid-row:1;position:sticky;top:calc(112px + env(safe-area-inset-top,0px));margin:0}}
@media(max-width:430px){.r3-stage{height:700px}.r3-hd{max-width:58%}}
@media(prefers-reduced-motion:reduce){.r3-scan,.r3-led,.r3-hd em{animation:none!important}}
`;
{ const s = document.createElement('style'); s.id = 'r3-css'; s.textContent = css; document.head.appendChild(s); }

/* ---------- ตัวช่วยสร้างหน้า (face) ของกล่อง 3D ---------- */
const F = (cls, w, h, tf, inner, extra) =>
  '<i class="r3f ' + cls + '" style="width:' + w + 'px;height:' + h + 'px;margin:' + (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px;transform:' + tf + (extra || '') + '">' + (inner || '') + '</i>';

const kOf = v => v[3] === 'Single' || v[3] === 'Dual' ? v[3] : v[3] === 'วางเครื่องไม่ ON' ? 'off' : 'x';

function deviceHTML(v, i) {
  const t = Math.min(NU, v[0] || NU), b = Math.max(1, v[1] || t), h = (t - b + 1) * UH - 2, w = W - 2 * PAD;
  const yc = -H / 2 + (NU - t) * UH + (t - b + 1) * UH / 2, zc = D / 2 - 9 - DD / 2, k = kOf(v);
  const on = k === 'Single' || k === 'Dual';
  const led = on ? '<b class="r3-led" style="animation-delay:' + ((i * 370) % 1600) + 'ms"></b><b class="r3-led b" style="animation-delay:' + ((i * 210) % 550) + 'ms"></b>' : '<b class="r3-led"></b>';
  return '<div class="r3-dv ' + k + '" data-i="' + i + '" style="transform:translate3d(0,' + yc + 'px,' + zc + 'px)">' +
    F('r3-fr', w, h, 'translateZ(' + DD / 2 + 'px)', '<span class="r3-t"><span class="r3n">' + E(v[2]) + '</span>' + (v[12] ? '<span class="r3s">S/N: ' + E(v[12]) + '</span>' : '') + '</span>' + led) +
    F('r3-sd', DD, h, 'rotateY(-90deg) translateZ(' + w / 2 + 'px)') +
    F('r3-sd', DD, h, 'rotateY(90deg) translateZ(' + w / 2 + 'px)') +
    F('r3-tp', w, DD, 'rotateX(90deg) translateZ(' + h / 2 + 'px)') +
    F('r3-sd', w, h, 'rotateY(180deg) translateZ(' + DD / 2 + 'px)') + '</div>';
}


/* ---------- ย่อชื่อ + S/N ให้พอดีหน้ากล่อง (ไม่ล้น ไม่ตัด) ---------- */
function fitTxt(st) {
  st = st || document.querySelector('.r3-stage'); if (!st) return;
  st.querySelectorAll('.r3-fr').forEach(f => {
    const t = f.querySelector('.r3-t'); if (!t || !t.clientWidth) return;     // ซ่อนอยู่ (โหมด 2D) → ข้าม
    const n = t.querySelector('.r3n'), s = t.querySelector('.r3s'), els = s ? [n, s] : [n];
    const tall = f.clientHeight >= 20;                                       // 2U ขึ้นไป = สองบรรทัด
    const bad = () => f.scrollHeight > f.clientHeight + 1 || els.some(e => e.scrollWidth > e.clientWidth + 1);
    t.classList.remove('r3cnd', 'r3stk'); t.style.transform = ''; f.style.fontSize = '';
    const stk = !!s && tall, floor = stk ? 5.5 : 6;
    t.classList.toggle('r3stk', stk);
    let ok = false;
    for (let fs = 8.5; fs >= floor; fs -= .5) { f.style.fontSize = fs + 'px'; if (!bad()) { ok = true; break; } }
    if (!ok) {                                                               // ทางสุดท้าย: บีบแนวนอนให้พอดี
      t.classList.add('r3cnd');
      const cs = getComputedStyle(f), avail = f.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), need = t.offsetWidth;
      if (need > avail && avail > 0) t.style.transform = 'scaleX(' + (avail / need) + ')';
    }
  });
}

function sceneHTML(r) {
  const nums = []; for (let u = 1; u <= NU; u++) if (u === 1 || u % 5 === 0 || u === NU) nums.push('<i style="top:' + (NU - u) * UH + 'px">' + u + '</i>');
  const rail = '<span style="position:absolute;inset:0">' + nums.join('') + '</span>';
  return '<div class="r3-cam">' +
    F('r3-floor', 1100, 1100, 'translate3d(0,' + (H / 2 + 7) + 'px,0) rotateX(90deg)') +
    F('r3-ring', 380, 380, 'translate3d(0,' + (H / 2 + 8) + 'px,0) rotateX(90deg)') +
    F('r3-glass', D, H, 'translate3d(' + -W / 2 + 'px,0,0) rotateY(-90deg)') +
    F('r3-glass', D, H, 'translate3d(' + W / 2 + 'px,0,0) rotateY(90deg)') +
    F('r3-back', W, H, 'translate3d(0,0,' + -D / 2 + 'px) rotateY(180deg)') +
    F('r3-top', W, D, 'translate3d(0,' + -H / 2 + 'px,0) rotateX(90deg)') +
    F('r3-rail', PAD, H, 'translate3d(' + (-W / 2 + PAD / 2) + 'px,0,' + D / 2 + 'px)', rail) +
    F('r3-rail', PAD, H, 'translate3d(' + (W / 2 - PAD / 2) + 'px,0,' + D / 2 + 'px)') +
    F('r3-cap', W + 8, 9, 'translate3d(0,' + (-H / 2 - 4) + 'px,' + D / 2 + 'px)') +
    F('r3-cap', W + 8, 12, 'translate3d(0,' + (H / 2 + 6) + 'px,' + D / 2 + 'px)') +
    r.dv.map(deviceHTML).join('') +
    F('r3-scan', W, H, 'translate3d(0,0,' + (D / 2 + 4) + 'px)') + '</div>';
}

/* ---------- สร้าง/ใส่ลงหน้า Rack ---------- */
const ICON = {
  rot: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/></svg>',
  rst: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>'
};

function enhance() {
  const rk = M.querySelector('.rk'); if (!rk || rk.querySelector('.r3-stage')) return;
  const m = /^#rack\/(.+)$/.exec(location.hash); const r = m && byId[decodeURIComponent(m[1])];
  if (!r || !r.dv || !r.dv.length) return;                         // ไม่มีเครื่อง = ไม่มีอะไรให้โชว์ 3D
  cur = r;
  const used = r.dv.reduce((a, v) => a + (Math.min(NU, v[0] || NU) - Math.max(1, v[1] || 1) + 1), 0), pct = Math.min(100, Math.round(used / NU * 100));
  const bar = document.createElement('div'); bar.className = 'r3-bar';
  bar.innerHTML = '<span class="sub">มุมมอง Rack จำลอง</span><div class="r3-seg" role="tablist"><button data-m="2d">2D</button><button data-m="3d">3D</button></div>';
  rk.parentNode.insertBefore(bar, rk);
  const st = document.createElement('div'); st.className = 'r3-stage'; st.tabIndex = 0;
  st.setAttribute('role', 'img'); st.setAttribute('aria-label', 'Rack ' + r.name + ' แบบ 3 มิติ มี ' + r.dv.length + ' เครื่อง ใช้ ' + used + ' จาก 42 U');
  st.innerHTML = sceneHTML(r) +
    '<div class="r3-ui r3-hd"><b><em></em>' + E(r.name) + '</b><span>' + E(r.c) + ' · ' + E(r.zone) + ' ' + E(r.row) + ' · Rack ' + r.n + (r.lb ? ' (' + E(r.lb) + ')' : '') + '</span></div>' +
    '<div class="r3-ui r3-g" style="--p:' + pct + '"><div><b>' + pct + '%</b><small>' + used + '/42 U</small></div></div>' +
    '<div class="r3-ui r3-hint">ลากเพื่อหมุน · แตะเครื่องเพื่อดูรายละเอียด</div>' +
    '<div class="r3-ui r3-ch"><i class="s">Single ' + r.s + '</i><i class="d">Dual ' + r.d + '</i>' + (r.no ? '<i>ไม่ ON ' + r.no + '</i>' : '') + '<i>ว่าง ' + (NU - used) + ' U</i>' + (r.ups && r.ups.length ? '<i>UPS-' + E(r.ups.join(', ')) + '</i>' : '') + '</div>' +
    '<div class="r3-ui r3-tl"><button data-a="auto" aria-label="หมุนอัตโนมัติ" class="' + (view.auto ? 'on' : '') + '">' + ICON.rot + '</button><button data-a="rst" aria-label="รีเซ็ตมุมมอง">' + ICON.rst + '</button></div>';
  rk.insertBefore(st, rk.firstChild);
  setMode(mode, rk, bar);
  wire(st, rk, bar, r);
  fit(st); apply(st);
  fitTxt(st); requestAnimationFrame(() => fitTxt(st)); if (document.fonts) document.fonts.ready.then(() => fitTxt(st));
  if (mode === '3d' && !raf) { last = 0; raf = requestAnimationFrame(tick); }
}

function setMode(m, rk, bar) {
  mode = m; rk.classList.toggle('r3on', m === '3d');
  bar.querySelectorAll('[data-m]').forEach(b => { b.classList.toggle('on', b.dataset.m === m); b.setAttribute('aria-selected', b.dataset.m === m); });
  try { localStorage.setItem(KEY, m); } catch (_) { /* ignore */ }
  requestAnimationFrame(() => { fitTxt(); if (window.fitDv) window.fitDv(); });   // สลับ 2D/3D → คำนวณขนาดตัวอักษรใหม่
  if (m === '3d' && !raf) { last = 0; raf = requestAnimationFrame(tick); }
}

const fit = st => { view.scale = Math.max(.6, Math.min(1, st.clientWidth / 440, st.clientHeight / 690)) || 1; };
const apply = st => { const c = st.querySelector('.r3-cam'); if (c) c.style.transform = 'translateY(8px) scale(' + view.scale + ') rotateX(' + view.rx + 'deg) rotateY(' + view.ry + 'deg)'; };

function tick(t) {
  const st = document.querySelector('.r3-stage');
  if (!st || !st.isConnected || st.offsetParent === null) { raf = 0; return; }
  const dt = Math.min(48, t - (last || t)); last = t;
  if (view.auto && !view.drag && !document.hidden && Date.now() > view.pause) {
    view.ry += view.dir * dt * 0.011;
    if (view.ry > 42) view.dir = -1; else if (view.ry < -42) view.dir = 1;
    apply(st);
  }
  raf = requestAnimationFrame(tick);
}

function wire(st, rk, bar, r) {
  bar.onclick = e => { const b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m, rk, bar); };
  let moved = false;
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('.r3-ui') && !e.target.closest('.r3-hd,.r3-g,.r3-ch,.r3-hint')) return;
    view.drag = { x: e.clientX, y: e.clientY, ry: view.ry, rx: view.rx, id: e.pointerId, cap: false }; moved = false;
  });
  st.addEventListener('pointermove', e => {
    const d = view.drag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.cap && Math.hypot(dx, dy) > 5) { d.cap = true; moved = true; try { st.setPointerCapture(d.id); } catch (_) { /* ignore */ } }
    if (!d.cap) return;
    view.ry = d.ry + dx * 0.55; view.rx = Math.max(-38, Math.min(8, d.rx + (e.pointerType === 'mouse' ? dy * 0.25 : 0)));
    view.pause = Date.now() + 3500; apply(st);
  });
  const end = () => { view.drag = null; view.pause = Date.now() + 3500; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  st.addEventListener('click', e => {
    if (moved) { moved = false; return; }
    const tl = e.target.closest('[data-a]');
    if (tl) {
      if (tl.dataset.a === 'auto') { view.auto = !view.auto; tl.classList.toggle('on', view.auto); }
      else { view.ry = -26; view.rx = -14; view.pause = 0; apply(st); }
      return;
    }
    if (e.target.closest('.r3-card')) return;
    const d = e.target.closest('.r3-dv'); if (d) pick(st, r, +d.dataset.i); else closeCard(st);
  });
  st.addEventListener('dblclick', () => { view.ry = -26; view.rx = -14; apply(st); });
  st.addEventListener('keydown', e => {
    const k = { ArrowLeft: -8, ArrowRight: 8 }[e.key]; if (k == null) return;
    e.preventDefault(); view.ry += k; view.pause = Date.now() + 3500; apply(st);
  });
  new ResizeObserver(() => { fit(st); apply(st); fitTxt(st); }).observe(st);
}

function closeCard(st) {
  st.querySelectorAll('.r3-dv.sel').forEach(x => { x.classList.remove('sel'); x.style.transform = x.dataset.t0; });
  const c = st.querySelector('.r3-card'); if (c) c.remove();
  st.querySelectorAll('.r3-hd,.r3-g,.r3-ch,.r3-hint').forEach(x => { x.style.display = ''; });
}

function pick(st, r, i) {
  const v = r.dv[i]; if (!v) return;
  closeCard(st);
  const el = st.querySelector('.r3-dv[data-i="' + i + '"]');
  el.dataset.t0 = el.style.transform; el.classList.add('sel');
  el.style.transform = el.style.transform.replace(/,(-?[\d.]+)px\)$/, (_, z) => ',' + (+z + 22) + 'px)');
  // ส่งต่อให้ระบบเดิม เพื่อให้แผงรายละเอียด/ปุ่ม "จัดการเครื่องนี้" ทำงานเหมือนหน้า 2D
  const d2 = document.querySelector('.ub .dv[data-i="' + i + '"]'); if (d2) d2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const mb = document.querySelector('#inf [data-m]');
  let sub = ''; try { sub = typeof devSub === 'function' ? devSub(v) : ''; } catch (_) { /* ignore */ }
  const t = Math.min(NU, v[0] || NU), b = Math.max(1, v[1] || t);
  const card = document.createElement('div'); card.className = 'r3-ui r3-card';
  card.innerHTML = '<button class="r3-x" aria-label="ปิด">✕</button><b>' + E(v[2]) + '</b><p>' + uTxt(t, b) + ' · <span class="pl ' + kOf(v) + '">' + E(v[3] || '—') + '</span></p>' +
    (v[12] ? '<p>S/N: ' + E(v[12]) + '</p>' : '') + (sub ? '<p>' + E(sub) + '</p>' : '') + (mb ? '<div class="r3-row"><button class="p" data-go="1">จัดการเครื่องนี้</button></div>' : '');
  card.onclick = e => { if (e.target.closest('.r3-x')) closeCard(st); else if (e.target.closest('[data-go]') && mb) mb.click(); };
  st.appendChild(card);
  st.querySelectorAll('.r3-hd,.r3-g,.r3-ch,.r3-hint').forEach(x => { x.style.display = 'none'; });
}

/* ---------- เฝ้าดูหน้า: เมื่อเข้า #rack/<id> (หรือ render ใหม่) ให้เติม 3D ---------- */
let t0 = 0;
const scan = () => { cancelAnimationFrame(t0); t0 = requestAnimationFrame(() => { try { enhance(); } catch (e) { console.error('rack3d', e); } }); };
new MutationObserver(scan).observe(M, { childList: true });
scan();
})();
