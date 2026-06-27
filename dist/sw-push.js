// ═══════════════════════════════════════════════════════════════
// sw-push.js — Service Worker for Web Push Notifications (FCM VAPID)
// วางไฟล์นี้ที่ root: public/sw-push.js
//
// เปลี่ยนจาก ntfy.sh SSE → FCM VAPID Push
// - ไม่มี daily quota limit
// - พนักงานไม่ต้องโหลดแอพเพิ่ม (ใช้ browser ปกติ)
// - รองรับ Android Chrome + iOS Safari 16.4+
// ═══════════════════════════════════════════════════════════════

const DB_NAME    = 'idc3-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';
const MAX_STORED = 50;

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

async function saveNotification(data) {
  const db = await openDB();

  const record = {
    id:        data.id || `noti_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: data.timestamp || new Date().toISOString(),
    read:      false,
    ...data,
  };

  await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });

  await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    countReq.onsuccess = () => {
      const total = countReq.result;
      if (total <= MAX_STORED) { resolve(); return; }
      const toDelete  = total - MAX_STORED;
      const idx       = store.index('timestamp');
      const cursorReq = idx.openCursor();
      let deleted = 0;
      cursorReq.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor && deleted < toDelete) {
          cursor.delete();
          deleted++;
          cursor.continue();
        }
      };
    };
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });

  return record;
}

// ── Push event (FCM VAPID) ─────────────────────────────────────
// FCM ส่ง payload มาใน event.data เป็น JSON
// รูปแบบที่ Apps Script จะส่ง:
// {
//   title: "STOCK IDC-3",
//   body:  "...",
//   type:  "pending" | "general" | "weekly" | "audit",
//   mode:  "withdraw" | "return" | "restock",
//   items: [{ name, qty, unit }],
//   employee: "...",
//   employeeId: "...",
//   pmJob: "...",
//   pendingId: "...",
// }
self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'STOCK IDC-3', body: event.data?.text() || 'มีการแจ้งเตือนใหม่' };
  }

  const notiData = {
    id:         payload.id         || `noti_${Date.now()}`,
    title:      payload.title      || 'STOCK IDC-3',
    body:       payload.body       || payload.message || '',
    type:       payload.type       || detectType(payload.title || payload.body || ''),
    mode:       payload.mode       || '',
    items:      payload.items      || [],
    employee:   payload.employee   || '',
    employeeId: payload.employeeId || '',
    pmJob:      payload.pmJob      || '',
    pendingId:  payload.pendingId  || '',
    timestamp:  payload.timestamp  || new Date().toISOString(),
    priority:   payload.priority   || 'default',
    read:       false,
  };

  const showOptions = {
    body:     buildBodyText(notiData),
    icon:     self.registration.scope + 'icon/android_192x192.webp',
    badge:    self.registration.scope + 'icon/favicon_32x32.webp',
    tag:      notiData.type === 'pending' ? 'pending-request' : notiData.id,
    renotify: notiData.type === 'pending',
    data:     notiData,
    actions:  notiData.type === 'pending' ? [{ action: 'view', title: 'ดูรายละเอียด' }] : [],
    vibrate:  [200, 100, 200],
  };

  event.waitUntil(
    Promise.all([
      saveNotification(notiData),
      self.registration.showNotification(notiData.title, showOptions),
    ])
  );
});

// ── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data    = event.notification.data || {};
  const action  = event.action;
  const appBase = self.registration.scope;

  let targetUrl = appBase;
  if (data.type === 'pending' || action === 'view') {
    targetUrl = appBase + '#pending';
  } else if (data.type === 'weekly') {
    targetUrl = appBase + '#report';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.startsWith(appBase)) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data });
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Helper: detect notification type ─────────────────────────
function detectType(text) {
  const t = text.toLowerCase();
  if (t.includes('เบิก') || t.includes('คืน') || t.includes('pending') || t.includes('รออนุมัติ')) return 'pending';
  if (t.includes('weekly') || t.includes('รายงาน') || t.includes('สรุป')) return 'weekly';
  if (t.includes('audit') || t.includes('ตรวจ')) return 'audit';
  return 'general';
}

// ── Helper: build notification body text ─────────────────────
function buildBodyText(data) {
  if (data.body) return data.body;
  if (data.items && data.items.length > 0) {
    const itemList = data.items.slice(0, 3).map(i => `${i.name} ×${i.qty} ${i.unit}`).join(', ');
    const more     = data.items.length > 3 ? ` +${data.items.length - 3} รายการ` : '';
    return `${data.employee || ''} · ${itemList}${more}`;
  }
  return '';
}

// ── SW Lifecycle ──────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

// ── รับ message จาก app ──────────────────────────────────────
// app จะส่ง NEW_PUSH มาเมื่อได้รับ push เพื่อ refresh badge ใน tab อื่น
self.addEventListener('message', e => {
  if (e.data?.type === 'PING') {
    e.source?.postMessage({ type: 'PONG' });
  }
});
