/* ════════════════════════════════════════════════════════════════
 *  Face Rack — Space skin (ตกแต่งอย่างเดียว)
 *  · สร้างฉากหลังอวกาศ: ดาว · วงโคจร · ดาวเคราะห์ low-poly · จุดสีลอย · จรวด
 *  · ใส่ data-wm (เลขจางด้านหลังการ์ด) — ไม่แตะข้อมูล / ฟังก์ชัน / 3D
 *  ใส่ <script src="rack-space.js"></script> ท้ายสุดของ index.html
 * ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';
if (window.__rackSpace) return; window.__rackSpace = 1;

/* ---------- ฉากหลัง ---------- */
try {
  const dots = [
    ['8%', '16%', 13, '#3fd47f', 0, 7], ['22%', '8%', 9, '#ffc933', -2, 6], ['41%', '12%', 8, '#4ab0ff', -4, 8],
    ['63%', '6%', 11, '#ff6b7d', -1, 7.5], ['78%', '20%', 10, '#ffc933', -3, 6.5], ['92%', '10%', 8, '#3fd47f', -5, 9],
    ['5%', '44%', 10, '#ff6b7d', -2, 8], ['94%', '46%', 12, '#4ab0ff', -4, 7], ['15%', '66%', 9, '#ffc933', -1, 6],
    ['86%', '70%', 11, '#b58bff', -3, 8.5], ['32%', '88%', 12, '#3fd47f', -5, 7], ['58%', '92%', 8, '#ff6b7d', -2, 9],
    ['72%', '84%', 10, '#4ab0ff', -4, 6.5], ['48%', '52%', 7, '#ffc933', -6, 8]
  ];
  const rocket = '<svg class="rkt" viewBox="0 0 48 84" aria-hidden="true"><path d="M24 64c-8 8-4 16 0 20 4-4 8-12 0-20z" fill="#ffb300"/><path d="M24 66c-4 5-2 10 0 13 2-3 4-8 0-13z" fill="#fff3b0"/><path d="M14 46 2 64l14-4z" fill="#ef4a5f"/><path d="M34 46l12 18-14-4z" fill="#d93a50"/><path d="M24 2c10 10 14 26 12 54H12C10 28 14 12 24 2z" fill="#fff"/><path d="M24 2c10 10 14 26 12 54h-8c2-28 0-44-4-54z" fill="#dfe5ff"/><path d="M24 2c5 5 8 10 9.500 16h-19C16 12 19 7 24 2z" fill="#ef4a5f"/><circle cx="24" cy="33" r="6.500" fill="#3a7bff" stroke="#c9d6ff" stroke-width="2.500"/><circle cx="22" cy="31" r="2" fill="#fff" opacity=".8"/><rect x="12" y="54" width="24" height="5" rx="2.500" fill="#c4cdf2"/></svg>';
  const sp = document.createElement('div');
  sp.id = 'sp'; sp.setAttribute('aria-hidden', 'true');
  sp.innerHTML =
    '<i class="st"></i><i class="st b"></i>' +
    '<b class="rg r1"></b><b class="rg r2"></b><b class="rg r3"></b>' +
    '<img class="pl pl-e" src="rack-hero.svg" alt="" decoding="async">' +
    '<img class="pl pl-v" src="rack-side.svg" alt="" decoding="async">' +
    '<img class="pl pl-o" src="rack-mini.svg" alt="" decoding="async">' +
    dots.map(d => '<span class="dt" style="--x:' + d[0] + ';--y:' + d[1] + ';--s:' + d[2] + 'px;--c:' + d[3] + ';--d:' + d[4] + 's;--t:' + d[5] + 's"></span>').join('') +
    rocket;
  document.body.insertBefore(sp, document.body.firstChild);
} catch (_) { /* ตกแต่งอย่างเดียว — พังก็ไม่กระทบแอป */ }

/* ---------- เลขจางหลังการ์ด ---------- */
const M = document.getElementById('m');
if (!M) return;
let t = 0;
function mark() {
  t = 0;
  try {
    M.querySelectorAll('.cb:not(.hero)').forEach(c => {
      const b = c.querySelector('.big,b');
      const s = b ? String(b.firstChild ? b.firstChild.textContent : b.textContent).trim() : '';
      const v = /^\d{1,4}$/.test(s) ? s : '';
      if (c.dataset.wm !== v) c.dataset.wm = v;
    });
  } catch (_) { /* ignore */ }
}
new MutationObserver(() => { if (!t) t = requestAnimationFrame(mark); }).observe(M, { childList: true, subtree: true });
mark();
})();
