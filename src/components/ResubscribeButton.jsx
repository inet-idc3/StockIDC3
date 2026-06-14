// ResubscribeButton.jsx
// ปุ่ม Re-subscribe Push Notification — กดได้ตลอดเวลา
// ใช้ในกรณีที่ subscription หมดอายุ หรือเปลี่ยน browser/device

import { useState } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const WORKER_URL = import.meta.env.VITE_PUSH_WORKER_URL;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function ResubscribeButton() {
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error

  async function handleResubscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;

      // Unsubscribe เก่าออกก่อน
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();

      // ขอ permission ถ้ายังไม่ได้รับ
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('error'); return; }

      // Subscribe ใหม่
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // ส่งไปเก็บที่ Worker
      const res = await fetch(`${WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      const data = await res.json();
      setStatus(data.ok ? 'ok' : 'error');
    } catch (e) {
      console.error('Resubscribe error:', e);
      setStatus('error');
    }

    // Reset หลัง 3 วินาที
    setTimeout(() => setStatus('idle'), 3000);
  }

  const labels = {
    idle:    '🔔 ลงทะเบียนรับ Push ใหม่',
    loading: '⏳ กำลังลงทะเบียน...',
    ok:      '✅ ลงทะเบียนสำเร็จ!',
    error:   '❌ เกิดข้อผิดพลาด',
  };

  return (
    <button
      onClick={handleResubscribe}
      disabled={status === 'loading'}
      style={{
        padding: '7px 18px',
        borderRadius: 100,
        border: '1px solid rgba(9,209,199,0.35)',
        background: status === 'ok'
          ? 'rgba(70,223,177,0.15)'
          : status === 'error'
          ? 'rgba(255,100,50,0.15)'
          : 'rgba(9,209,199,0.1)',
        color: status === 'error' ? '#FF8A65' : 'rgba(255,255,255,0.65)',
        fontSize: 11,
        cursor: status === 'loading' ? 'default' : 'pointer',
        fontFamily: "'Noto Sans Thai',sans-serif",
        transition: 'all 0.2s',
        letterSpacing: '0.3px',
      }}
    >
      {labels[status]}
    </button>
  );
}
