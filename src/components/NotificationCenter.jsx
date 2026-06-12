// ═══════════════════════════════════════════════════════════════
// src/components/NotificationCenter.jsx
// แสดง notification history จาก IndexedDB
// ใช้งาน: <NotificationCenter isOpen onClose user={...} />
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import {
  getAllNotifications, markAllRead, markOneRead,
  clearAllNotifications, getUnreadCount,
} from '../services/pushService.js';

// local displayTs — ไม่ import จาก gasService เพื่อหลีกเลี่ยง circular/binary issue
// ถ้า gasService.js export displayTs จริงสามารถแทนที่ได้ภายหลัง
function displayTs(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d)) return ts;
    const now  = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'เมื่อกี้';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} ชั่วโมงที่แล้ว`;
    const day = d.getDate().toString().padStart(2,'0');
    const mon = (d.getMonth()+1).toString().padStart(2,'0');
    const h   = d.getHours().toString().padStart(2,'0');
    const m   = d.getMinutes().toString().padStart(2,'0');
    return `${day}/${mon} ${h}:${m}`;
  } catch { return ts; }
}

const TYPE_CFG = {
  pending: { icon: '📤', color: '#213A58', bg: '#EFF6FF', border: '#BFDBFE', label: 'รออนุมัติ' },
  return:  { icon: '📥', color: '#4A90D9', bg: '#EFF6FF', border: '#BFDBFE', label: 'คืนของ' },
  weekly:  { icon: '📋', color: '#15919B', bg: '#F0FDFA', border: '#99F6E4', label: 'รายงาน' },
  audit:   { icon: '🔍', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', label: 'Asset' },
  general: { icon: '🔔', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', label: 'ทั่วไป' },
};

function getModeIcon(mode) {
  if (mode === 'withdraw') return '📤';
  if (mode === 'return')   return '📥';
  if (mode === 'restock')  return '📦';
  return '🔔';
}

function NotiCard({ noti, onRead }) {
  const cfg = TYPE_CFG[noti.type] || TYPE_CFG.general;
  const icon = noti.mode ? getModeIcon(noti.mode) : cfg.icon;
  const isUnread = !noti.read;

  return (
    <div
      onClick={() => onRead(noti.id)}
      style={{
        background: isUnread ? cfg.bg : 'var(--surface)',
        border: `1.5px solid ${isUnread ? cfg.border : 'var(--mint-border)'}`,
        borderRadius: 'var(--r)',
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: 'pointer',
        transition: 'all 0.18s',
        position: 'relative',
        animation: 'fadeUp 0.25s ease both',
      }}
    >
      {/* Unread dot */}
      {isUnread && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 8, height: 8, borderRadius: '50%',
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.color}`,
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 13, fontWeight: isUnread ? 700 : 600,
            color: 'var(--txt)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {noti.title}
          </span>
        </div>

        {/* Employee */}
        {noti.employee && (
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4, fontFamily: "'Space Mono',monospace" }}>
            👤 {noti.employee} {noti.employeeId ? `(${noti.employeeId})` : ''}
            {noti.pmJob ? ` · 🔧 ${noti.pmJob}` : ''}
          </div>
        )}

        {/* Items list */}
        {noti.items && noti.items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {noti.items.slice(0, 4).map((it, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 100,
                background: 'var(--surface2)', border: '1px solid var(--mint-border)',
                color: 'var(--txt2)',
              }}>
                {it.name} ×{it.qty} {it.unit}
              </span>
            ))}
            {noti.items.length > 4 && (
              <span style={{ fontSize: 11, color: 'var(--txt3)', padding: '2px 6px' }}>
                +{noti.items.length - 4} รายการ
              </span>
            )}
          </div>
        )}

        {/* Body fallback */}
        {(!noti.items || noti.items.length === 0) && noti.body && (
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 4, lineHeight: 1.5 }}>
            {noti.body}
          </div>
        )}

        {/* Timestamp */}
        <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: "'Space Mono',monospace" }}>
          {displayTs(noti.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default function NotificationCenter({ isOpen, onClose }) {
  const [notis,   setNotis]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllNotifications();
      setNotis(all);
    } catch { setNotis([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  async function handleRead(id) {
    await markOneRead(id);
    setNotis(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function handleReadAll() {
    await markAllRead();
    setNotis(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleClear() {
    await clearAllNotifications();
    setNotis([]);
  }

  const unread = notis.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(33,58,88,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '88dvh',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom,0px)',
          animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 18px 14px',
          borderBottom: '1px solid var(--mint-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg,var(--mint),var(--mid-teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-bell" style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                การแจ้งเตือน
              </div>
              {unread > 0 && (
                <div style={{ fontSize: 11, color: 'var(--mid-teal)', fontWeight: 600 }}>
                  {unread} รายการยังไม่ได้อ่าน
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              background: 'var(--surface)', border: '1px solid var(--mint-border)',
              borderRadius: 10, padding: '6px 10px',
              cursor: 'pointer', color: 'var(--txt3)', fontSize: 18,
            }}>✕</button>
          </div>

          {/* Actions */}
          {notis.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {unread > 0 && (
                <button onClick={handleReadAll} style={{
                  padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                  border: '1.5px solid var(--mint-border)', background: 'var(--surface)',
                  color: 'var(--mid-teal)', cursor: 'pointer',
                  fontFamily: "'Noto Sans Thai',sans-serif",
                }}>
                  ✓ อ่านทั้งหมด
                </button>
              )}
              <button onClick={handleClear} style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                border: '1.5px solid #FECACA', background: '#FFF5F5',
                color: '#EF4444', cursor: 'pointer', marginLeft: 'auto',
                fontFamily: "'Noto Sans Thai',sans-serif",
              }}>
                🗑 ล้างทั้งหมด
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 13 }}>กำลังโหลด...</div>
            </div>
          )}
          {!loading && notis.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt2)', marginBottom: 6 }}>ยังไม่มีการแจ้งเตือน</div>
              <div style={{ fontSize: 12 }}>การแจ้งเตือนจะปรากฏที่นี่เมื่อมีการเบิก/คืนของ</div>
            </div>
          )}
          {!loading && notis.map((n, i) => (
            <NotiCard key={n.id} noti={n} onRead={handleRead} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
      `}</style>
    </div>
  );
}

// ── Export unread count hook ──────────────────────────────────
export function useUnreadCount(isOpen) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try { setCount(await getUnreadCount()); } catch { setCount(0); }
  }, []);

  useEffect(() => {
    refresh(); // เรียกครั้งแรก และทุกครั้งที่ isOpen toggle (เช่น ปิด panel → refresh badge)
  }, [isOpen, refresh]);

  // ฟัง SW postMessage เมื่อมี push ใหม่
  useEffect(() => {
    function onMessage(e) {
      if (e.data?.type === 'NOTIFICATION_CLICKED' || e.data?.type === 'NEW_PUSH') {
        refresh();
      }
    }
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [refresh]);

  return { count, refresh };
}
