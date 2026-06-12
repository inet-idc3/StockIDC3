// ═══════════════════════════════════════════════════════════════
// src/hooks/usePush.js
// Hook สำหรับจัดการ Web Push ทั้งหมด:
//  - ขอ permission
//  - register SW
//  - subscribe ntfy.sh SSE (foreground real-time)
//  - ฟัง SW postMessage (background push)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  registerPushSW,
  requestNotificationPermission,
  getNotificationPermission,
  subscribeNtfySSE,
  registerWebPushSubscription,
  NTFY_TOPIC,
  NTFY_SERVER,
} from '../services/pushService.js';

export function usePush({ onNewNotification, userInfo } = {}) {
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [swReady,    setSwReady]    = useState(false);
  const [swError,    setSwError]    = useState('');
  const [pushRegistered, setPushRegistered] = useState(false);

  const swRegRef = useRef(null);
  const userInfoRef = useRef(userInfo);
  useEffect(() => { userInfoRef.current = userInfo; }, [userInfo]);

  // เก็บ callback ใน ref — ป้องกัน SSE unsubscribe/resubscribe loop
  // เมื่อ parent re-render ส่ง callback ใหม่ทุกครั้ง
  const onNewNotiRef = useRef(onNewNotification);
  useEffect(() => { onNewNotiRef.current = onNewNotification; }, [onNewNotification]);

  // ── Register SW on mount ──────────────────────────────────
  useEffect(() => {
    registerPushSW().then(({ ok, reason, reg }) => {
      if (ok) {
        swRegRef.current = reg;
        setSwReady(true);
      } else {
        setSwError(reason || 'SW ลงทะเบียนไม่ได้');
      }
    });
  }, []);

  // ── Subscribe SSE เมื่อ SW พร้อมและมี permission ──────────
  // dependency: [swReady, permission] เท่านั้น — ไม่ใส่ callback
  useEffect(() => {
    if (!swReady || permission !== 'granted') return;

    const unsub = subscribeNtfySSE(data => {
      onNewNotiRef.current?.(data);
    });

    return () => { unsub?.(); };
  }, [swReady, permission]);

  // ── ลงทะเบียน Web Push (VAPID) กับ Cloudflare Worker ────────
  // เมื่อ SW พร้อมและ permission = granted แล้ว ให้สร้าง PushSubscription
  // แล้วส่งไปเก็บที่ Worker เพื่อให้ Apps Script ส่ง push มาถึงเครื่องนี้ได้
  useEffect(() => {
    if (!swReady || permission !== 'granted' || pushRegistered) return;
    if (!swRegRef.current) return;

    registerWebPushSubscription(swRegRef.current, userInfoRef.current || {}).then(({ ok, reason }) => {
      if (ok) setPushRegistered(true);
      else    console.error('[Push] registerWebPushSubscription failed:', reason);
    });
  }, [swReady, permission, pushRegistered]);

  // ── ฟัง SW postMessage (background push → app เปิด) ───────
  useEffect(() => {
    function onSWMessage(e) {
      if (e.data?.type === 'NOTIFICATION_CLICKED' || e.data?.type === 'NEW_PUSH') {
        onNewNotiRef.current?.(e.data.data);
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onSWMessage);
  }, []); // mount/unmount ครั้งเดียว

  // ── Request permission ─────────────────────────────────────
  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, swReady, swError, pushRegistered, requestPermission, ntfyTopic: NTFY_TOPIC, ntfyServer: NTFY_SERVER };
}
