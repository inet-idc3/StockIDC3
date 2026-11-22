/* xmas-fx.js — เอฟเฟกต์คริสต์มาส (ไฟประดับ + หิมะ) แบบ classic script
 * ใช้ร่วมกันทั้ง Portal (โหลดจาก src/main.jsx) และแอพ HTML ที่ฝังด้วย iframe (cable / rack / rack2)
 * - ถ้าเปิดในกรอบ iframe ของ Portal ที่เปิดธีมอยู่แล้ว จะไม่วาดซ้ำ (Portal วาดทับอยู่แล้ว) แค่ใส่ class "xmas" ให้ใช้พาเลตสี
 * ★ ฟังก์ชัน decide() ต้องตรงกับ src/theme/christmas.js
 */
(function () {
  'use strict';
  var KEY = 'xmas-theme';
  var MODE = 'auto';                                   // 'auto' | 'on' | 'off'
  var WIN  = { from: { m: 11, d: 15 }, to: { m: 1, d: 6 } };

  function inWindow() {
    var n = new Date(), md = (n.getMonth() + 1) * 100 + n.getDate();
    var a = WIN.from.m * 100 + WIN.from.d, b = WIN.to.m * 100 + WIN.to.d;
    return a <= b ? (md >= a && md <= b) : (md >= a || md <= b);
  }
  function decide() {
    try {
      var q = new URLSearchParams(location.search).get('xmas');
      if (q === '1' || q === '0') localStorage.setItem(KEY, q === '1' ? 'on' : 'off');
      var s = localStorage.getItem(KEY);
      if (s === 'on') return true;
      if (s === 'off') return false;
    } catch (e) {}
    if (MODE === 'on') return true;
    if (MODE === 'off') return false;
    return inWindow();
  }

  if (!decide()) return;
  var root = document.documentElement;
  root.classList.add('xmas');
  // ระบุแอพจาก path (ให้ CSS แยกโทนสีรายแอพ)
  var m = location.pathname.match(/\/(rack2|rack|cable)\//);
  if (m) root.setAttribute('data-xmas-app', m[1]);

  // อยู่ใน iframe ของ Portal ที่วาดเอฟเฟกต์อยู่แล้ว → ไม่วาดซ้ำ
  try {
    if (window.parent !== window && window.parent.document.documentElement.classList.contains('xmas')) return;
  } catch (e) {}

  var me   = document.currentScript;
  var base = (me && me.src) ? me.src.replace(/[^\/]*$/, '') : '/xmas/';

  function ready(fn) {
    if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    if (!document.querySelector('link[data-xm]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = base + 'xmas-fx.css'; l.setAttribute('data-xm', '1');
      document.head.appendChild(l);
    }

    /* ── ไฟประดับ ── */
    var ul = document.createElement('ul');
    ul.className = 'xm-lights'; ul.setAttribute('aria-hidden', 'true');
    function buildLights() {
      var n = Math.ceil(window.innerWidth / 39) + 2, h = '';
      for (var i = 0; i < n; i++) h += '<li></li>';
      ul.innerHTML = h;
    }
    buildLights();
    window.addEventListener('resize', buildLights);
    document.body.appendChild(ul);

    /* ── หิมะ ── */
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var c = document.createElement('canvas');
    c.className = 'xm-snow'; c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = 0, h = 0, flakes = [], raf = 0;

    function mk(anywhere) {
      return {
        x: Math.random() * w, y: anywhere ? Math.random() * h : -8,
        r: 1 + Math.random() * 2.7, vy: 0.35 + Math.random() * 0.95,
        a: Math.random() * 6.28, s: 0.01 + Math.random() * 0.02, amp: 0.25 + Math.random() * 0.8
      };
    }
    function size() {
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, Math.max(34, (w * h) / 17000)));
      while (flakes.length < n) flakes.push(mk(true));
      flakes.length = n;
    }
    function mkSprite(core, edge) {
      var z = 48, cv = document.createElement('canvas'); cv.width = cv.height = z;
      var g = cv.getContext('2d'), gr = g.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
      gr.addColorStop(0, core); gr.addColorStop(.3, core); gr.addColorStop(1, edge);
      g.fillStyle = gr; g.fillRect(0, 0, z, z); return cv;
    }
    var halo = mkSprite('rgba(110,140,175,0.32)', 'rgba(110,140,175,0)');   // เงาจางๆ ให้เห็นบนพื้นสว่าง
    var core = mkSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.a += f.s; f.x += Math.sin(f.a) * f.amp; f.y += f.vy;
        if (f.y > h + 8 || f.x < -12 || f.x > w + 12) { flakes[i] = mk(false); continue; }
        var r = f.r * 2.6;
        ctx.globalAlpha = 0.9; ctx.drawImage(halo, f.x - r * 1.25, f.y - r * 1.25, r * 2.5, r * 2.5);
        ctx.globalAlpha = Math.min(1, 0.65 + f.r * 0.12); ctx.drawImage(core, f.x - r, f.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  });

  window.XmasFx = { on: true };
})();
