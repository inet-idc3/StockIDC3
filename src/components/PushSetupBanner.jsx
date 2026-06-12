// ═══════════════════════════════════════════════════════════════
// src/components/PushSetupBanner.jsx
// แสดงสถานะ Push Notification และปุ่มขอ permission
// วางใน PortalShell ด้านบน app grid
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react';

export default function PushSetupBanner({ permission, onRequest, ntfyTopic }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('push-banner-dismissed') === '1'
  );

  function dismiss() {
    localStorage.setItem('push-banner-dismissed', '1');
    setDismissed(true);
  }

  // granted: ไม่แสดง banner
  if (permission === 'granted') return null;
  // not-supported: ไม่มี Notification API
  if (permission === 'not-supported') return null;
  // dismissed
  if (dismissed) return null;

  if (permission === 'denied') {
    return (
      <div style={{
        margin: '0 0 12px',
        background: '#FFF7ED',
        border: '1.5px solid #FED7AA',
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🔕</span>
        <div style={{ flex: 1, fontSize: 12, color: '#92400E', fontFamily: "'Noto Sans Thai',sans-serif", lineHeight: 1.5 }}>
          การแจ้งเตือนถูกปิดกั้น<br/>
          <span style={{ opacity: 0.75 }}>เปิดใน Settings → Site → Notifications</span>
        </div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#92400E', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
      </div>
    );
  }

  // default: ยังไม่ได้ขอ permission
  return (
    <div style={{
      margin: '0 0 12px',
      background: 'rgba(70,223,177,0.1)',
      border: '1.5px solid rgba(70,223,177,0.35)',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2, fontFamily: "'Noto Sans Thai',sans-serif" }}>
          เปิดการแจ้งเตือน
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontFamily: "'Noto Sans Thai',sans-serif" }}>
          รับแจ้งเตือนเมื่อมีการขอเบิกของรออนุมัติ
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onRequest}
          style={{
            padding: '7px 14px', borderRadius: 100, border: 'none',
            background: 'linear-gradient(135deg,var(--mint),var(--mid-teal))',
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif",
            boxShadow: '0 3px 10px rgba(70,223,177,0.3)',
          }}
        >
          เปิด
        </button>
        <button onClick={dismiss} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '7px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>
          ไม่ใช่ตอนนี้
        </button>
      </div>
    </div>
  );
}
