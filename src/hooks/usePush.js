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
  NTFY_TOPIC,
  NTFY_SERVER,
} from '../services/pushService.js';

export function usePush({ onNewNotification } = {}) {
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [swReady,    setSwReady]    = useState(false);
  const [swError,    setSwError]    = useState('');

  // เก็บ callback ใน ref — ป้องกัน SSE unsubscribe/resubscribe loop
  // เมื่อ parent re-render ส่ง callback ใหม่ทุกครั้ง
  const onNewNotiRef = useRef(onNewNotification);
  useEffect(() => { onNewNotiRef.current = onNewNotification; }, [onNewNotification]);

  // ── Register SW on mount ──────────────────────────────────
  useEffect(() => {
    registerPushSW().then(({ ok, reason }) => {
      if (ok) setSwReady(true);
      else    setSwError(reason || 'SW ลงทะเบียนไม่ได้');
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

  return { permission, swReady, swError, requestPermission, ntfyTopic: NTFY_TOPIC, ntfyServer: NTFY_SERVER };
}
