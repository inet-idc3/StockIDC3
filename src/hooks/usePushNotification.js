// ═══════════════════════════════════════════════════════════════
// usePushNotification.js
// วางไว้ใน src/hooks/usePushNotification.js
//
// React hook สำหรับ subscribe FCM VAPID Push
// ใช้งาน:
//   const { subscribe, unsubscribe, isSubscribed, isSupported } = usePushNotification();
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

// ─── แก้ค่านี้: VAPID Public Key จาก Firebase Console ──────────
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// → Generate key pair → copy "Key pair" (เริ่มด้วย B...)
const VAPID_PUBLIC_KEY = 'BJ1TjKB9KvxYSPT3Yfpfyx5yA6OAVXhvOJVCxHftrpXaElDrpWGScBDhL_6vn0tGxHrOEP9hABqMTrDUVGFtfYw';

// ─── endpoint ของ Cloudflare Worker ที่รับ subscription ─────────
// (ดูไฟล์ cloudflare-worker-fcm.js)
const SUBSCRIPTION_ENDPOINT = 'https://push.pongsatorn2612.workers.dev/subscribe';

// ─── แปลง base64 → Uint8Array (สำหรับ VAPID key) ───────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotification() {
  const [isSubscribed, setIsSubscribed]   = useState(false);
  const [subscription, setSubscription]   = useState(null);
  const [isSupported,  setIsSupported]    = useState(false);
  const [isLoading,    setIsLoading]      = useState(false);
  const [error,        setError]          = useState(null);

  // ── ตรวจสอบ support และ subscription ปัจจุบัน ────────────────
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (!supported) return;

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscription(sub);
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  // ── Subscribe ─────────────────────────────────────────────────
  const subscribe = useCallback(async (userInfo = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // ขอ permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('ผู้ใช้ไม่อนุญาตการแจ้งเตือน');
      }

      const reg = await navigator.serviceWorker.ready;

      // สร้าง push subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // ส่ง subscription ไปเก็บที่ Cloudflare Worker
      const res = await fetch(SUBSCRIPTION_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          subscription: sub.toJSON(),
          userInfo: {
            employeeId: userInfo.employeeId || '',
            name:       userInfo.name       || '',
            device:     navigator.userAgent.includes('Android') ? 'android' : 'other',
          },
        }),
      });

      if (!res.ok) throw new Error('ไม่สามารถลงทะเบียนกับเซิร์ฟเวอร์ได้');

      setSubscription(sub);
      setIsSubscribed(true);
      return true;

    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Unsubscribe ───────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setIsLoading(true);

    try {
      await subscription.unsubscribe();

      // แจ้ง server ให้ลบ subscription
      await fetch(SUBSCRIPTION_ENDPOINT, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setSubscription(null);
      setIsSubscribed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return { subscribe, unsubscribe, isSubscribed, isSupported, isLoading, error };
}
