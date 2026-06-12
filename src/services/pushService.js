// ═══════════════════════════════════════════════════════════════
// src/services/pushService.js
// จัดการ Web Push subscription + อ่าน/เขียน notification history
// จาก IndexedDB (เขียนโดย SW, อ่านโดย App)
// ═══════════════════════════════════════════════════════════════

const DB_NAME    = 'idc3-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

// ── ntfy.sh config ────────────────────────────────────────────
// topic ชื่อไหนก็ได้ แต่ให้ยากเดา เพื่อป้องกันคนนอก subscribe
// เปลี่ยนได้ใน .env เป็น VITE_NTFY_TOPIC
export const NTFY_TOPIC  = import.meta.env.VITE_NTFY_TOPIC  || 'inet-idc3-stock-default';
export const NTFY_SERVER = import.meta.env.VITE_NTFY_SERVER || 'https://ntfy.sh';

// ── FCM VAPID Web Push config (Cloudflare Worker) ─────────────
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
  || 'BJ1TjKB9KvxYSPT3Yfpfyx5yA6OAVXhvOJVCxHftrpXaElDrpWGScBDhL_6vn0tGxHrOEP9hABqMTrDUVGFtfYw';
export const PUSH_SUBSCRIBE_ENDPOINT = import.meta.env.VITE_PUSH_WORKER_URL
  ? `${import.meta.env.VITE_PUSH_WORKER_URL}/subscribe`
  : 'https://push.pongsatorn2612.workers.dev/subscribe';

// ── IndexedDB helpers ─────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function getAllNotifications() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const idx   = store.index('timestamp');
    const req   = idx.getAll();
    req.onsuccess = e => resolve([...e.target.result].reverse()); // newest first
    req.onerror   = e => reject(e.target.error);
  });
}

export async function getUnreadCount() {
  const all = await getAllNotifications();
  return all.filter(n => !n.read).length;
}

export async function markAllRead() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // cursor ทั้ง store อัปเดต read:true ทีละ record
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) return; // หมดแล้ว → tx.oncomplete จะ resolve
      if (!cursor.value.read) {
        cursor.update({ ...cursor.value, read: true });
      }
      cursor.continue();
    };
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function markOneRead(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = e => {
      if (!e.target.result) { resolve(); return; }
      store.put({ ...e.target.result, read: true }).onsuccess = resolve;
    };
    getReq.onerror = e => reject(e.target.error);
  });
}

export async function clearAllNotifications() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.clear();
    req.onsuccess = resolve;
    req.onerror   = e => reject(e.target.error);
  });
}

// ── SW Registration & ntfy.sh SSE subscription ───────────────
export async function registerPushSW() {
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'SW not supported' };

  try {
    // Register SW (วางไว้ที่ /StockIDC3/sw-push.js)
    const reg = await navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw-push.js',
      { scope: import.meta.env.BASE_URL }
    );
    await navigator.serviceWorker.ready;

    // ส่ง ntfy config ไปให้ SW เพื่อให้ background SSE ใช้ topic ที่ถูกต้อง
    const sw = reg.active || reg.waiting || reg.installing;
    if (sw) {
      sw.postMessage({
        type:   'SET_NTFY_CONFIG',
        server: NTFY_SERVER,
        topic:  NTFY_TOPIC,
      });
    }

    return { ok: true, reg };
  } catch (err) {
    console.error('[Push] SW register error:', err);
    return { ok: false, reason: err.message };
  }
}

// ── Subscribe ntfy.sh via SSE (EventSource) ──────────────────
// ใช้ใน foreground เมื่อ app เปิดอยู่ — background จัดการโดย SW
let _sseSource  = null;
let _sseRetry   = null;
let _sseActive  = false;

export function subscribeNtfySSE(onMessage) {
  _sseActive = true;
  _connect();

  function _connect() {
    if (!_sseActive) return;
    if (_sseSource) { try { _sseSource.close(); } catch {} }

    const url = `${NTFY_SERVER}/${NTFY_TOPIC}/sse`;
    _sseSource = new EventSource(url);

    _sseSource.addEventListener('message', e => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'message') onMessage(data);
      } catch {}
    });

    _sseSource.onerror = () => {
      // EventSource retry อัตโนมัติ แต่ถ้า readyState = CLOSED → reconnect เอง
      if (_sseSource?.readyState === EventSource.CLOSED && _sseActive) {
        clearTimeout(_sseRetry);
        _sseRetry = setTimeout(_connect, 15000); // retry ใน 15s
      }
    };
  }

  // คืน unsubscribe function
  return () => {
    _sseActive = false;
    clearTimeout(_sseRetry);
    _sseSource?.close();
    _sseSource = null;
  };
}

// ── Request OS notification permission ───────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'not-supported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'not-supported';
  return Notification.permission;
}

// ── Subscribe ntfy.sh Web Push (VAPID) ───────────────────────
// ntfy.sh รองรับ Web Push VAPID: POST /StockIDC3/json กับ sub ที่ได้จาก browser
// แต่ถ้าใช้ ntfy.sh public server ไม่ต้องทำ VAPID — SSE + OS SW เพียงพอแล้ว
// ฟังก์ชันนี้เก็บไว้สำหรับ self-hosted ntfy ที่ต้องการ VAPID

export async function subscribeWebPush(reg, vapidPublicKey) {
  if (!vapidPublicKey) return null;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return sub;
  } catch (err) {
    console.error('[Push] subscribe error:', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── สร้าง PushSubscription (VAPID) แล้วส่งไปลงทะเบียนที่ Cloudflare Worker ──
// เรียกหลังจาก permission === 'granted' และ SW register สำเร็จแล้ว
export async function registerWebPushSubscription(reg, userInfo = {}) {
  if (!reg?.pushManager) return { ok: false, reason: 'PushManager not available' };

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const res = await fetch(PUSH_SUBSCRIBE_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userInfo: {
          employeeId: userInfo.employeeId || '',
          name:       userInfo.name       || '',
          device:     navigator.userAgent.includes('Android') ? 'android' : 'other',
        },
      }),
    });

    if (!res.ok) throw new Error('subscribe endpoint error: ' + res.status);
    return { ok: true, subscription: sub };
  } catch (err) {
    console.error('[Push] registerWebPushSubscription error:', err);
    return { ok: false, reason: err.message };
  }
}
