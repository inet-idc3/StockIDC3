/* ════════════════════════════════════════════════════════════════
 *  rack-responsive.js — หน้า Dashboard (รายการแถว) แยกหน้าตา มือถือ / คอม
 *  โหลดหลัง rack-powermap.js · ไม่แก้โค้ดเดิม ใช้ได้ทั้ง Phase 1 และ Phase 2
 *  - ตรวจอุปกรณ์ → ตั้ง <html data-dev="phone|desktop">
 *  - ทดสอบบนคอม: เติม ?dev=phone หรือ ?dev=desktop ต่อท้าย URL (หรือเรียก RackDev.set('phone'))
 *  มือถือ : Rack = 1 การ์ด · สีแค่แถบเล็กบอก Source · ตัวเลขเปลี่ยนสีเฉพาะตอนใกล้เต็ม/เกิน · 0 A ถูกลดความเด่น · Rack ว่างยุบเหลือบรรทัดเดียว
 *  คอม    : ใช้เต็มความกว้างจอ · จำนวนคอลัมน์ (Row) ปรับตามจอ · ตัวอักษร/บล็อกขยายตามความกว้าง
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const h = document.documentElement, mq = window.matchMedia('(max-width:700px)');
let force = (new URLSearchParams(location.search).get('dev') || '').toLowerCase();
const isPhone = () => {
  if (force === 'phone' || force === 'desktop') return force === 'phone';
  const ua = navigator.userAgent || '', uad = navigator.userAgentData;
  return /Android.*Mobile|iPhone|iPod|Windows Phone|Mobile.*Firefox/i.test(ua) || !!(uad && uad.mobile) || mq.matches;
};
const apply = () => { h.dataset.dev = isPhone() ? 'phone' : 'desktop'; };
apply();
(mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
addEventListener('orientationchange', apply);
window.RackDev = { set(m) { force = m; apply(); }, get: () => h.dataset.dev };

const CSS = `
.pwr-s.fA{--fc:#c4372b}.pwr-s.fB{--fc:#2368c4}.pwr-s.fC{--fc:#e0b400}.pwr-s.fD{--fc:#1c9c52}

/* ════ มือถือ ════ */
html[data-dev=phone] main:has(.pwr-grid){max-width:none;padding:12px 10px 28px}
html[data-dev=phone] .pwr-grid{grid-template-columns:1fr;gap:10px}
@media(min-width:600px){html[data-dev=phone] .pwr-grid{grid-template-columns:1fr 1fr}}
html[data-dev=phone] .pwr-col{padding:2px 8px 8px}
html[data-dev=phone] .pwr-r{grid-template-columns:1fr 1fr;gap:4px;padding:6px;margin:6px 0;border:1px solid var(--line);border-radius:12px}
html[data-dev=phone] .pwr-r.off{border-style:dashed}
html[data-dev=phone] .pwr-r .pwr-c{grid-column:1/-1;grid-row:1}
html[data-dev=phone] .pwr-r .pwr-L{grid-column:1;grid-row:2}
html[data-dev=phone] .pwr-r .pwr-RR{grid-column:2;grid-row:2}
html[data-dev=phone] .pwr-r .pwr-RR:empty{display:none}
html[data-dev=phone] .pwr-r:has(.pwr-RR:empty) .pwr-L{grid-column:1/-1}
/* หัวการ์ด: Rack · ลูกค้า ........ kW รวม */
html[data-dev=phone] .pwr-r .pwr-c{flex-direction:row;flex-wrap:nowrap;align-items:baseline;justify-content:flex-start;text-align:left;gap:8px;min-height:0;padding:1px 2px 3px;border:0;background:none;overflow:visible}
html[data-dev=phone] .pwr-c::before,html[data-dev=phone] .pwr-c::after{display:none}
html[data-dev=phone] .pwr-c b{font-size:16px}
html[data-dev=phone] .pwr-c em{font-size:11px}
html[data-dev=phone] .pwr-r .pwr-c span{flex:1 1 0;min-width:0;max-width:none;font-size:12px}
html[data-dev=phone] .pwr-r .pwr-c small{margin-left:auto;font-size:15px;font-weight:700;opacity:1;font-variant-numeric:tabular-nums;white-space:nowrap}
/* Source: การ์ดกลาง + แถบสีซ้ายบอกสาย A/B/C/D */
html[data-dev=phone] .pwr-r .pwr-s:not(.none){background:var(--card2)!important;color:var(--ink)!important;border:1px solid var(--line);border-left:4px solid var(--fc,#888);border-radius:8px;padding:4px 8px 7px;min-height:42px;box-shadow:none}
html[data-dev=phone] .pwr-r .pwr-s i{font-size:10.5px;color:var(--mut);opacity:1}
html[data-dev=phone] .pwr-r .pwr-s b{font-size:15px;color:var(--ink);font-variant-numeric:tabular-nums}
html[data-dev=phone] .pwr-r .pwr-s b small{font-size:10.5px;color:var(--mut);opacity:1}
html[data-dev=phone] .pwr-r .pwr-s.yl:not(.none){background:var(--ylbg)!important;border-color:var(--yl);border-left-color:var(--fc)}
html[data-dev=phone] .pwr-r .pwr-s.yl b{color:var(--yl)}
html[data-dev=phone] .pwr-r .pwr-s.rd:not(.none){background:var(--rdbg)!important;border-color:var(--rd);border-left-color:var(--fc)}
html[data-dev=phone] .pwr-r .pwr-s.rd b{color:var(--rd)}
html[data-dev=phone] .pwr-r .pwr-s .lv{height:3px;background:var(--emp)}
html[data-dev=phone] .pwr-r .pwr-s .lv em{background:var(--gr)}
html[data-dev=phone] .pwr-r .pwr-s.yl .lv em{background:var(--yl)}
html[data-dev=phone] .pwr-r .pwr-s.rd .lv em{background:var(--rd)}
html[data-dev=phone] .pwr-r .pwr-s u{background:var(--emp);color:var(--mut);font-size:9px}
/* 0 A → จางลง · Rack ว่าง → บรรทัดเดียว */
html[data-dev=phone] .pwr-r .pwr-s.z{opacity:.55;min-height:34px}
html[data-dev=phone] .pwr-r.zero{opacity:.8}
html[data-dev=phone] .pwr-r .pwr-s.none{min-height:34px;font-size:11px}
html[data-dev=phone] .pwr-r.empty{padding:6px 10px}
html[data-dev=phone] .pwr-r.empty .pwr-L,html[data-dev=phone] .pwr-r.empty .pwr-RR{display:none}
html[data-dev=phone] .pwr-r.empty .pwr-c b{color:var(--mut);font-weight:500}

/* ════ คอม: เต็มจอ ════ */
html[data-dev=desktop] main:has(.pwr-grid){max-width:none;padding:20px clamp(16px,2vw,40px) 32px}
html[data-dev=desktop] .pwr-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,clamp(400px,26vw,560px)),1fr));gap:clamp(12px,1.2vw,22px)}
html[data-dev=desktop] .pwr-col{padding:2px clamp(6px,.6vw,12px) clamp(6px,.6vw,12px)}
html[data-dev=desktop] .pwr-r{grid-template-columns:1fr clamp(84px,6.5vw,128px) 1fr;gap:clamp(3px,.3vw,6px)}
html[data-dev=desktop] .pwr-L>.pwr-s,html[data-dev=desktop] .pwr-RR>.pwr-s,html[data-dev=desktop] .pwr-c{min-height:clamp(36px,3.2vw,56px)}
html[data-dev=desktop] .pwr-s b{font-size:clamp(13px,.95vw,18px)}
html[data-dev=desktop] .pwr-s i,html[data-dev=desktop] .pwr-s b small{font-size:clamp(9px,.62vw,12px)}
html[data-dev=desktop] .pwr-c b{font-size:clamp(13.5px,1vw,19px)}
html[data-dev=desktop] .pwr-c small,html[data-dev=desktop] .pwr-c span,html[data-dev=desktop] .pwr-c em{font-size:clamp(10px,.68vw,13px)}
html[data-dev=desktop] .pwr-c span{max-width:none}
`;
const st = document.createElement('style'); st.id = 'rack-resp-css'; st.textContent = CSS; document.head.appendChild(st);
})();
