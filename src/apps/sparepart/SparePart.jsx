// ─────────────────────────────────────────────────────────────
// SparePart.jsx — Spare Part inventory app  (Engineer Edition)
// v3.0: Cart system for multi-item withdraw/return + return flow
// Restyled: Poppins font, #181717/#242424/#FAD85D/#2B2C2C/#FFFFFF palette
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { EMPLOYEES } from '../../data/employees.js';
import { EmpMiniAvatar } from '../../components/EmployeeDirectory.jsx';
import { gasPost as _gasPost } from '../../services/gasService.js';

import iconWrench   from '../../assets/icons/wrench.png';
import iconCheck     from '../../assets/icons/check.png';
import iconWarning   from '../../assets/icons/warning.png';
import iconAlert     from '../../assets/icons/alert.png';
import iconSparkles  from '../../assets/icons/sparkles.png';

// ── Design Tokens ─────────────────────────────────────────────
const T = {
  bg:        '#181717',   // Chinese Black
  surface:   '#242424',   // Raisin Black
  surface2:  '#2B2C2C',   // Charleston Green
  accent:    '#FAD85D',   // Naples Yellow
  accentDim: 'rgba(250,216,93,0.15)',
  accentBorder: 'rgba(250,216,93,0.35)',
  text:      '#FFFFFF',
  textMid:   'rgba(255,255,255,0.6)',
  textLow:   'rgba(255,255,255,0.35)',
  border:    'rgba(255,255,255,0.08)',
  borderMid: 'rgba(255,255,255,0.14)',
  green:     '#4ADE80',
  red:       '#F87171',
  blue:      '#60A5FA',
  orange:    '#FB923C',
  font:      "'Poppins', 'Noto Sans Thai', sans-serif",
  mono:      "'Poppins', monospace",
  radius:    '16px',
  radiusSm:  '10px',
  radiusXl:  '22px',
};

// ── Spare Part ใช้ fetch ตรงๆ เพราะ GAS redirect POST ────────
async function spPost(gasUrl, payload) {
  try {
    const res = await fetch(gasUrl, {
      method:   'POST',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
      body:     JSON.stringify(payload),
    });
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ── PM Job list ───────────────────────────────────────────────
const PM_JOBS = [
  'Fire Alarm Office','Booter pump Office','ปั๊มบ่อน้ำพุ',
  'Fire hose cabinet ,Fire hose box','ระบบเครื่องกรองน้ำ',
  'Booter pump UT Phase1','Air Office','Pump & FCU OAU Phase1',
  'ล้างแผงรังผึ้ง Chiller Phase1',
  'Fuel Supply System (Day & Underground Tank) Phase1',
  'CPMS Phase1','Air Shower','VMP',
  'Lighting Control & Lighting Fixture Phase1','TVSS Phase1',
  'CCTV Phase1','ตู้ไฟฟ้าย่อย Phase1','Subsation Phase1',
  'Measurement Battery Monitering Phase1',
  'Emergency Litgh & Exit Sign Phase1','Ventilation Fan Phase1',
  'Fuel Supply System (Day & Underground Tank) Phase2',
  'Chiller Water Pump Phase2','Booster Pump Phase2',
  'FCU&OAU Phase2','CPMS Phase2',
  'Lighting Control & Lighting Fixture Phase2','TVSS Phase2',
  'CCTV Phase2','ตู้ไฟฟ้าย่อย Phase2',
  'Emergency Litgh & Exit Sign Phase2','Ventilation Fan Phase2',
  'Bus duct IT Phase2',
  'Pubilc addess ประกาศเสียง Office ,Phase 1 ,Phase2',
  'โทรมาตร','MATV ประกาศเสียง Office',
  'ประตูเลื่อนอัตโนมัติ โครงการ 6 บาน',
  'ประตูเลื่อนอัตโนมัติ Office&DC 5 บาน',
  'สปิงเกอร์รดน้ำต้นไม้','ปั้มเติมอากาศบ่อบำบัดน้ำเสีย',
  'แสงสว่างรอบโครงการ','ถังดับเพลิง Phase1',
  'Piping ท่อส่งน้ำเย็น & Valve Phase1',
  'Piping ท่อส่งน้ำเย็น & Valve Phase2',
  'FireAlarm Substation','FUC Substation',
  'Access Control Phase1','BMS Phase1','PME Phase1',
  'Access Control Phase2','BMS Phase2','PME Phase2',
  'Generator Phase1','Fire Suppression&Fire Alarm Phase1',
  'Fire Pump & Jockey Pump','Water Leak Phase1',
  'Main Electrical System Phase1','Main Electrical System Phase2',
  'Generator Phase2','Fire Suppression&Fire Alarm Phase2',
  'ล้างแผงรังผึ้ง Chiller Phase2',
  'Measurement Battery Monitering Phase2',
  'Grounding System Phase1','Grounding System Phase2',
  'MDB & DB Solar Farm','Transformer Solar Farm',
  'โครงสร้าง PV,Mounting Solar Farm','Grounding System Solar Farm',
  'Fire Alarm Solar Farm','วัดประสิทธิภาพแผง IV Curve Solar Farm',
  'Inverter System Solar Farm','แสงสว่าง Solar Farm',
  'CCTV Solar Farm','Air Condition Solar Farm','Water Trestment Solar Farm',
];

// ── Cache ──────────────────────────────────────────────────────
const CACHE_KEY     = 'idc3_sparepart_v2';
const CACHE_LOG_KEY = 'idc3_sparepart_log_v1';
const CACHE_CFG_KEY = 'idc3_sparepart_cfg_v1';

function loadCache()    { try { const d = JSON.parse(localStorage.getItem(CACHE_KEY));     return Array.isArray(d) ? d : []; } catch { return []; } }
function saveCache(p)   { try { localStorage.setItem(CACHE_KEY, JSON.stringify(p));     } catch {} }
function loadLogCache() { try { const d = JSON.parse(localStorage.getItem(CACHE_LOG_KEY)); return Array.isArray(d) ? d : []; } catch { return []; } }
function saveLogCache(l){ try { localStorage.setItem(CACHE_LOG_KEY, JSON.stringify(l)); } catch {} }
function loadCfg()      { try { return JSON.parse(localStorage.getItem(CACHE_CFG_KEY)) || {}; } catch { return {}; } }
function saveCfg(c)     { try { localStorage.setItem(CACHE_CFG_KEY, JSON.stringify(c)); } catch {} }

// ── Helpers ────────────────────────────────────────────────────
function pct(left, total) { return total > 0 ? Math.min(100, (left / total) * 100) : 0; }
function stockColor(left, total) {
  if (left === 0) return T.red;
  if (left / total <= 0.25) return T.orange;
  return T.green;
}
function nowISO() {
  const now = new Date();
  const thai = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return thai.toISOString().replace('Z', '+07:00');
}
function fmtTs(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ══════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════

// ── Toast ──────────────────────────────────────────────────────
function Toast({ msg, color }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom,0px))',
      left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: color || T.surface2, color: T.text,
      padding: '12px 22px', borderRadius: 100, fontSize: 13, fontWeight: 600,
      fontFamily: T.font,
      boxShadow: '0 6px 24px rgba(0,0,0,.5)', whiteSpace: 'nowrap',
      animation: 'slideUp .3s cubic-bezier(0.34,1.56,0.64,1)',
      border: `1px solid ${T.border}`,
    }}>
      {msg}
    </div>
  );
}

// ── StockBar ───────────────────────────────────────────────────
function StockBar({ left, total }) {
  const w = pct(left, total);
  const c = stockColor(left, total);
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: c, borderRadius: 99, transition: 'width .4s' }} />
    </div>
  );
}

// ── CartBadge ──────────────────────────────────────────────────
function CartBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: -6, right: -6,
      background: T.red, color: '#fff',
      borderRadius: 99, fontSize: 10, fontWeight: 700,
      padding: '2px 6px', lineHeight: 1.4, minWidth: 18, textAlign: 'center',
      boxShadow: `0 2px 8px rgba(248,113,113,0.5)`,
    }}>
      {count}
    </span>
  );
}

// ── PM Picker ──────────────────────────────────────────────────
function PmPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const filtered = search.trim() ? PM_JOBS.filter(j => j.toLowerCase().includes(search.toLowerCase())) : PM_JOBS;
  function select(val) { onChange(val); setOpen(false); setSearch(''); }
  return (
    <>
      <div onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 80); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderRadius: T.radius, border: `1.5px solid ${value ? T.accentBorder : T.border}`, background: value ? T.accentDim : T.surface2, cursor: 'pointer', transition: 'all .18s' }}>
        <i className="ti ti-tools" style={{ fontSize: 14, color: value ? T.accent : T.textLow, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontFamily: T.font, color: value ? T.text : T.textLow, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'เลือกงาน PM (ถ้ามี)...'}
        </span>
        {value
          ? <button onClick={e => { e.stopPropagation(); onChange(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textLow, padding: 2 }}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
          : <i className="ti ti-chevron-down" style={{ fontSize: 13, color: T.textLow }} />}
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => { setOpen(false); setSearch(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`, width: '100%', maxWidth: 480, maxHeight: '72vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom,0px)', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)', border: `1px solid ${T.borderMid}`, borderBottom: 'none' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: T.radiusSm, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔧</div>
                <div>
                  <div style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.text }}>เลือกงาน PM</div>
                  <div style={{ fontSize: 10, color: T.textLow, fontFamily: T.font }}>Preventive Maintenance</div>
                </div>
                <button onClick={() => { setOpen(false); setSearch(''); }} style={{ marginLeft: 'auto', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.textMid, fontSize: 18, padding: '4px 8px' }}>✕</button>
              </div>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: T.textLow }} />
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหางาน PM..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: T.radius, border: `1.5px solid ${T.accentBorder}`, background: T.surface2, fontSize: 13, fontFamily: T.font, outline: 'none', color: T.text, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
              <button onClick={() => select('')} style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.textLow, fontFamily: T.font, fontStyle: 'italic' }}>— ไม่ระบุงาน PM</span>
                {!value && <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 13, color: T.accent }} />}
              </button>
              {filtered.map((job, i) => (
                <button key={i} onClick={() => select(job)} style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: value === job ? T.accentDim : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', color: value === job ? T.accent : T.textMid, fontSize: 13, fontFamily: T.font }}>
                  <i className="ti ti-tool" style={{ fontSize: 12, color: value === job ? T.accent : T.textLow, flexShrink: 0 }} />
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{job}</span>
                  {value === job && <i className="ti ti-check" style={{ fontSize: 13, color: T.accent, flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── CartSheet ─────────────────────────────────────────────────
function CartSheet({ cart, mode, onChangeMode, onChangeQty, onRemove, onConfirm, onClose, user }) {
  const [note, setNote] = useState('');
  const [pm,   setPm]   = useState('');

  const modeOptions = [
    { key: 'withdraw', label: '📤 เบิก',  color: T.accent },
    { key: 'return',   label: '📥 คืน',   color: T.blue },
  ];

  const modeInfo = modeOptions.find(o => o.key === mode) || modeOptions[0];
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`,
        width: '100%', maxWidth: 480,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
        animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)',
        border: `1px solid ${T.borderMid}`, borderBottom: 'none',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.borderMid }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 18px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.font, fontSize: 16, fontWeight: 700, color: T.text }}>รายการที่เลือก</div>
              <div style={{ fontSize: 11, color: T.textLow, fontFamily: T.font }}>
                {cart.length} ชนิด · {totalItems} ชิ้น
              </div>
            </div>
            <button onClick={onClose} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '6px 10px', cursor: 'pointer', color: T.textMid, fontSize: 18 }}>✕</button>
          </div>

          {/* Employee card */}
          {user && (
            <div style={{ background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderRadius: T.radius, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>👤</span>
              <div>
                <div style={{ fontSize: 11, color: T.textLow, marginBottom: 1, fontFamily: T.font }}>ผู้ดำเนินการ</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{user?.displayName || user?.empId || user?.id}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: T.textLow, fontFamily: T.font }}>{user?.empId || user?.id}</div>
            </div>
          )}

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 8 }}>
            {modeOptions.map(o => (
              <button key={o.key} onClick={() => onChangeMode(o.key)} style={{
                flex: 1, padding: '10px 4px', borderRadius: T.radius,
                border: `1.5px solid ${mode === o.key ? o.color : T.border}`,
                background: mode === o.key ? `${o.color}22` : T.surface2,
                color: mode === o.key ? o.color : T.textLow,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: T.font, transition: 'all 0.18s',
              }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cart items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cart.map(entry => {
            const p = entry.part;
            const c = stockColor(p.stockLeft, p.stockTotal);
            const isZero = p.stockLeft === 0;
            return (
              <div key={p.id} style={{
                background: T.surface2,
                borderRadius: T.radius, padding: '11px 12px',
                border: `1px solid ${isZero ? 'rgba(248,113,113,.3)' : T.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: T.textLow, marginTop: 2 }}>
                    <span style={{ background: T.accentDim, color: T.accent, padding: '1px 7px', borderRadius: 100, marginRight: 5, border: `1px solid ${T.accentBorder}` }}>{p.system}</span>
                    <span style={{ color: c }}>เหลือ {p.stockLeft} ชิ้น</span>
                  </div>
                </div>
                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => onChangeQty(p.id, entry.qty - 1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 16, cursor: 'pointer', color: T.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ minWidth: 26, textAlign: 'center', fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.font }}>{entry.qty}</span>
                  <button onClick={() => onChangeQty(p.id, entry.qty + 1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 16, cursor: 'pointer', color: T.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <button onClick={() => onRemove(p.id)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid rgba(248,113,113,.3)`, background: 'rgba(248,113,113,.07)', fontSize: 14, cursor: 'pointer', color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* PM + Note + Confirm */}
        <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.textLow, display: 'block', marginBottom: 5, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '.5px' }}>🔧 งาน PM (ถ้ามี)</label>
            <PmPicker value={pm} onChange={setPm} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.textLow, display: 'block', marginBottom: 5, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '.5px' }}>หมายเหตุ</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุหมายเหตุ..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: T.font }} />
          </div>
          <button onClick={() => onConfirm(mode, note, pm)} style={{
            width: '100%', padding: 14, borderRadius: T.radius, border: 'none',
            background: mode === 'return' ? T.blue : T.accent,
            color: mode === 'return' ? '#fff' : '#181717',
            fontSize: 15, fontWeight: 700,
            fontFamily: T.font, cursor: 'pointer',
            boxShadow: mode === 'return' ? '0 4px 14px rgba(96,165,250,.3)' : '0 4px 14px rgba(250,216,93,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {mode === 'return' ? '📥' : '📤'}
            ยืนยัน{mode === 'return' ? 'คืน' : 'เบิก'} {totalItems} ชิ้น ({cart.length} รายการ)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ScanSheet ─────────────────────────────────────────────────
function ScanSheet({ parts, user, cart, mode, onChangeMode, onOpenCamera, onAddToCart, onRemoveFromCart, onOpenCart, onClose }) {
  const [searchQ,   setSearchQ]   = useState('');
  const [filterSys, setFilterSys] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  const systems  = ['all', ...new Set(parts.map(p => p.system))];
  const filtered = parts.filter(p => {
    const ms = filterSys === 'all' || p.system === filterSys;
    const mq = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.id.toLowerCase().includes(searchQ.toLowerCase());
    return ms && mq;
  });

  const countLow  = parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal <= 0.25).length;
  const countZero = parts.filter(p => p.stockLeft === 0).length;
  const cartTotal = cart.reduce((s, c) => s + c.qty, 0);

  const modeOptions = [
    { key: 'withdraw', label: '📤 เบิก',  color: T.accent },
    { key: 'return',   label: '📥 คืน',   color: T.blue },
  ];

  function onChangeQty(partId, newQty) {
    if (newQty <= 0) onRemoveFromCart(partId);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`,
        width: '100%', maxWidth: 480,
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
        animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)',
        border: `1px solid ${T.borderMid}`, borderBottom: 'none',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.borderMid }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 16px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔩</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.text }}>เลือก Spare Part</div>
              <div style={{ fontSize: 10, color: T.textLow, fontFamily: T.font }}>{parts.length} รายการ · {countLow} ใกล้หมด · {countZero} หมด</div>
            </div>
            {/* Camera */}
            <button onClick={onOpenCamera} style={{
              width: 40, height: 40, borderRadius: 11,
              background: T.accent, border: 'none', color: '#181717', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 3px 12px rgba(250,216,93,.4)`,
            }}>
              <i className="ti ti-scan" style={{ fontSize: 19 }} />
            </button>
            {/* Cart button */}
            <button onClick={onOpenCart} style={{
              width: 40, height: 40, borderRadius: 11,
              background: cart.length > 0 ? T.orange : T.surface2,
              border: cart.length > 0 ? 'none' : `1px solid ${T.border}`,
              color: cart.length > 0 ? '#fff' : T.textMid, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              boxShadow: cart.length > 0 ? `0 3px 12px rgba(251,146,60,.4)` : 'none',
            }}>
              🛒
              <CartBadge count={cartTotal} />
            </button>
            <button onClick={onClose} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: '6px 10px', cursor: 'pointer', color: T.textMid, fontSize: 18 }}>✕</button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {modeOptions.map(o => (
              <button key={o.key} onClick={() => onChangeMode(o.key)} style={{
                flex: 1, padding: '8px 4px', borderRadius: T.radiusSm,
                border: `1.5px solid ${mode === o.key ? o.color : T.border}`,
                background: mode === o.key ? `${o.color}22` : T.surface2,
                color: mode === o.key ? o.color : T.textLow,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: T.font, transition: 'all 0.15s',
              }}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Cart strip */}
          {cart.length > 0 && (
            <div onClick={onOpenCart} style={{
              background: `${T.orange}18`, border: `1.5px solid rgba(251,146,60,.35)`,
              borderRadius: T.radius, padding: '9px 13px', marginBottom: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>🛒</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, fontFamily: T.font }}>
                  ตะกร้า: {cart.length} ชนิด · {cartTotal} ชิ้น
                </div>
                <div style={{ fontSize: 10, color: T.textLow, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cart.map(c => `${c.part.name} ×${c.qty}`).join(', ')}
                </div>
              </div>
              <span style={{ fontSize: 11, color: T.orange, fontWeight: 700, background: `${T.orange}18`, borderRadius: 8, padding: '3px 8px', flexShrink: 0 }}>ดูตะกร้า →</span>
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: T.textLow }} />
            <input
              ref={inputRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="พิมพ์ชื่อ หรือสแกน QR..."
              style={{ width: '100%', padding: '11px 38px 11px 38px', borderRadius: T.radius, border: `1.5px solid ${T.accentBorder}`, background: T.surface2, fontSize: 14, fontFamily: T.font, color: T.text, outline: 'none', boxSizing: 'border-box' }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textLow, fontSize: 16, padding: 2 }}>✕</button>
            )}
          </div>

          {/* System filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {systems.slice(0, 10).map(sys => (
              <button key={sys} onClick={() => setFilterSys(sys)}
                style={{ padding: '5px 11px', borderRadius: 100, border: `1.5px solid ${filterSys === sys ? T.accent : T.border}`, background: filterSys === sys ? T.accentDim : 'transparent', color: filterSys === sys ? T.accent : T.textLow, fontSize: 11, cursor: 'pointer', fontFamily: T.font, fontWeight: filterSys === sys ? 600 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {sys === 'all' ? 'ทั้งหมด' : sys}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textLow }}>
              <i className="ti ti-search" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
              <div style={{ fontFamily: T.font, fontWeight: 600 }}>ไม่พบรายการ</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>ลองค้นด้วยคำอื่น หรือสแกน QR</div>
            </div>
          ) : filtered.map((p, i) => {
            const c = stockColor(p.stockLeft, p.stockTotal);
            const isZero = p.stockLeft === 0;
            const isLow  = !isZero && p.stockLeft / p.stockTotal <= 0.25;
            const inCart = cart.find(ci => ci.part.id === p.id);
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 12px', borderRadius: T.radius, marginBottom: 6,
                background: inCart ? `${T.orange}10` : T.surface2,
                border: `1px solid ${inCart ? `rgba(251,146,60,.4)` : isZero ? 'rgba(248,113,113,.3)' : isLow ? 'rgba(251,146,60,.25)' : T.border}`,
                animation: `fadeUp .2s ease ${i * 0.03}s both`,
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 100, background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBorder}` }}>{p.system}</span>
                    {isZero && <span style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>หมดแล้ว!</span>}
                    {isLow  && <span style={{ fontSize: 10, color: T.orange, fontWeight: 700 }}>ใกล้หมด</span>}
                  </div>
                  <div style={{ marginTop: 5 }}><StockBar left={p.stockLeft} total={p.stockTotal} /></div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 2 }}>
                  <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 18, color: c }}>{p.stockLeft}</div>
                  <div style={{ fontSize: 10, color: T.textLow }}>/ {p.stockTotal}</div>
                </div>
                {inCart ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => onChangeQty ? onChangeQty(p.id, inCart.qty - 1) : onRemoveFromCart(p.id)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.textMid, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 700, color: T.orange, fontFamily: T.font }}>{inCart.qty}</span>
                    <button onClick={() => onAddToCart(p, 1)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid rgba(251,146,60,.4)`, background: `${T.orange}15`, color: T.orange, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => onAddToCart(p, 1)} style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: T.accentDim, border: `1px solid ${T.accentBorder}`,
                    color: T.accent, fontSize: 20, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
                )}
              </div>
            );
          })}
          <div style={{ height: 12 }} />
        </div>
      </div>
    </div>
  );
}

// ── QR Camera ──────────────────────────────────────────────────
function QRCamera({ onScan, onClose }) {
  const vidRef = useRef(null);
  const cvsRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const activeRef = useRef(true);
  const [status, setStatus] = useState('กำลังเปิดกล้อง...');

  useEffect(() => {
    let lastScan = 0;
    function scan() {
      if (!activeRef.current) return;
      const vid = vidRef.current; const cvs = cvsRef.current;
      if (vid && cvs && vid.readyState === vid.HAVE_ENOUGH_DATA) {
        cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
        const ctx = cvs.getContext('2d'); ctx.drawImage(vid, 0, 0);
        const now = Date.now();
        if (now - lastScan > 300) {
          lastScan = now;
          try {
            const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
            const code = window.jsQR?.(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) { activeRef.current = false; cleanup(); onScan(code.data.trim()); return; }
          } catch {}
        }
      }
      rafRef.current = requestAnimationFrame(scan);
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(s => { if (!activeRef.current) { s.getTracks().forEach(t => t.stop()); return; } streamRef.current = s; vidRef.current.srcObject = s; return vidRef.current.play(); })
      .then(() => { setStatus('พร้อมสแกน ✓'); scan(); })
      .catch(() => { setStatus('❌ ไม่สามารถเปิดกล้องได้'); setTimeout(() => { cleanup(); onClose?.(); }, 2000); });
    function cleanup() { activeRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); }
    return cleanup;
  }, []);

  const corners = [
    { top: 0, left: 0, borderWidth: '3px 0 0 3px', borderRadius: '10px 0 0 0' },
    { top: 0, right: 0, borderWidth: '3px 3px 0 0', borderRadius: '0 10px 0 0' },
    { bottom: 0, left: 0, borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 10px' },
    { bottom: 0, right: 0, borderWidth: '0 3px 3px 0', borderRadius: '0 0 10px 0' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 390, height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <canvas ref={cvsRef} style={{ display: 'none' }} />
      <button onClick={() => { activeRef.current = false; streamRef.current?.getTracks().forEach(t => t.stop()); onClose?.(); }}
        style={{ position: 'absolute', top: 48, right: 16, zIndex: 20, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 240, height: 240, borderRadius: 20, position: 'relative', boxShadow: '0 0 0 2000px rgba(0,0,0,.65)' }}>
          {corners.map((c, i) => (<div key={i} style={{ position: 'absolute', width: 44, height: 44, borderColor: T.accent, borderStyle: 'solid', ...c }} />))}
          <div style={{ position: 'absolute', left: 4, right: 4, height: 2, top: '50%', background: `linear-gradient(90deg,transparent,${T.accent},transparent)`, animation: 'scanLine 2s ease-in-out infinite' }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontFamily: T.font }}>วาง QR Code ของ Spare Part ในกรอบ</div>
        <div style={{ color: T.accent, fontFamily: T.font, fontSize: 11 }}>{status}</div>
      </div>
    </div>
  );
}

// ── Action Modal ───────────────────────────────────────────────
function ActionModal({ action, part, user, onConfirm, onClose }) {
  const [qty, setQty]   = useState(1);
  const [note, setNote] = useState('');
  const maxQty = action === 'restock' ? 999 : 99;
  const icons  = { restock: '🔼', delete: '🗑️' };
  const labels = { restock: 'เติม Stock', delete: 'ลบรายการ' };
  const colors = { restock: T.green, delete: T.red };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`, width: '100%', maxWidth: 480, padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)', border: `1px solid ${T.borderMid}`, borderBottom: 'none' }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.borderMid }} />
        </div>

        <div style={{ fontFamily: T.font, fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${colors[action]}20`, border: `1.5px solid ${colors[action]}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icons[action]}</div>
          <span>{labels[action]}</span>
        </div>

        {action === 'delete' ? (
          <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: T.radius, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{part.name}</div>
            <div style={{ fontSize: 12, color: T.textLow, marginTop: 4 }}>{part.system}</div>
            <div style={{ fontSize: 12, color: T.red, marginTop: 8 }}>⚠️ การลบนี้ไม่สามารถกู้คืนได้</div>
          </div>
        ) : (
          <>
            <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{part.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.name}</div>
                <div style={{ fontSize: 11, color: T.textLow }}>{part.system} · คงเหลือ <b style={{ color: stockColor(part.stockLeft, part.stockTotal) }}>{part.stockLeft}</b> / {part.stockTotal}</div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textLow, display: 'block', marginBottom: 6, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '.5px' }}>จำนวน</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 38, height: 38, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 18, cursor: 'pointer' }}>−</button>
                <input type="number" value={qty} min={1} max={maxQty}
                  onChange={e => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value))))}
                  style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: T.radiusSm, border: `1.5px solid ${colors[action]}40`, background: T.surface2, fontSize: 16, fontWeight: 700, fontFamily: T.font, color: colors[action], outline: 'none' }} />
                <button onClick={() => setQty(q => Math.min(maxQty, q + 1))} style={{ width: 38, height: 38, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 18, cursor: 'pointer' }}>＋</button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textLow, display: 'block', marginBottom: 5, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '.5px' }}>หมายเหตุ</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุรายละเอียดเพิ่มเติม..."
                style={{ width: '100%', padding: '10px 13px', borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: T.surface2, fontSize: 13, fontFamily: T.font, color: T.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 14, fontFamily: T.font, cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={() => onConfirm({ action, part, qty, note, pm: '' })} style={{ flex: 2, padding: 13, borderRadius: T.radius, border: 'none', background: colors[action], color: action === 'restock' ? '#181717' : '#fff', fontSize: 14, fontWeight: 700, fontFamily: T.font, cursor: 'pointer', boxShadow: `0 4px 16px ${colors[action]}44` }}>
            {action === 'delete' ? '🗑️ ยืนยันการลบ' : `${icons[action]} ยืนยัน ${qty} ชิ้น`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────
function FormModal({ part, existingSystems, onConfirm, onClose }) {
  const [name,  setName]  = useState(part?.name || '');
  const [sys,   setSys]   = useState(part?.system || '');
  const [total, setTotal] = useState(String(part?.stockTotal ?? ''));
  const [left,  setLeft]  = useState(String(part?.stockLeft  ?? ''));
  const [icon,  setIcon]  = useState(part?.icon || '🔩');
  const [err,   setErr]   = useState('');

  function submit() {
    if (!name.trim()) { setErr('กรุณาระบุชื่อ Spare Part'); return; }
    if (!sys.trim())  { setErr('กรุณาระบุชื่อระบบ'); return; }
    const t = parseInt(total) || 0;
    const l = parseInt(left)  || 0;
    if (t < 0 || l < 0) { setErr('จำนวนต้องมากกว่า 0'); return; }
    if (l > t)           { setErr('คงเหลือต้องไม่เกิน Stock รวม'); return; }
    onConfirm({ name: name.trim(), system: sys.trim(), stockTotal: t, stockLeft: l, icon });
  }

  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: T.surface2, fontSize: 13, fontFamily: T.font, color: T.text, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.textLow, display: 'block', marginBottom: 5, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '.5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`, width: '100%', maxWidth: 480, padding: '20px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom,0px))', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)', border: `1px solid ${T.borderMid}`, borderBottom: 'none' }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.borderMid }} />
        </div>

        <div style={{ fontFamily: T.font, fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 20 }}>
          {part ? '✏️ แก้ไข Spare Part' : '➕ เพิ่ม Spare Part ใหม่'}
        </div>

        {[
          { label: 'ชื่อ Spare Part *', value: name, set: setName, placeholder: 'เช่น Bearing 6205, Filter 10 micron...' },
          { label: 'ชื่อระบบ *', value: sys, set: setSys, placeholder: 'เช่น Chiller, Pump, Electrical...' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{label}</label>
            <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
          </div>
        ))}

        {existingSystems.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {existingSystems.slice(0, 8).map(s => (
              <button key={s} onClick={() => setSys(s)} style={{ padding: '4px 10px', borderRadius: 100, border: `1px solid ${sys === s ? T.accent : T.border}`, background: sys === s ? T.accentDim : 'transparent', color: sys === s ? T.accent : T.textLow, fontSize: 11, cursor: 'pointer', fontFamily: T.font }}>{s}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[['Stock รวม *', total, setTotal], ['คงเหลือ *', left, setLeft]].map(([label, val, set]) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <input type="number" value={val} onChange={e => set(e.target.value)} min={0}
                style={{ ...inputStyle, fontSize: 14, fontWeight: 700, color: T.accent }} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>ไอคอน (Emoji)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2}
            style={{ width: 60, padding: '10px', borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: T.surface2, fontSize: 22, textAlign: 'center', outline: 'none', color: T.text }} />
        </div>

        {err && <div style={{ fontSize: 12, color: T.red, marginBottom: 12 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textMid, fontSize: 14, fontFamily: T.font, cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={submit} style={{ flex: 2, padding: 13, borderRadius: T.radius, border: 'none', background: T.accent, color: '#181717', fontSize: 14, fontWeight: 700, fontFamily: T.font, cursor: 'pointer', boxShadow: `0 4px 16px rgba(250,216,93,.35)` }}>
            {part ? '💾 บันทึก' : '➕ เพิ่ม Spare Part'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────
const NAV_LEFT  = [
  { key: 'home', icon: 'ti-layout-grid', label: 'ภาพรวม' },
  { key: 'log',  icon: 'ti-list',        label: 'Log' },
];
const NAV_RIGHT = [
  { key: 'add',   icon: 'ti-square-plus', label: 'เพิ่ม SP' },
  { key: 'setup', icon: 'ti-settings',    label: 'ตั้งค่า' },
];

function BottomNav({ active, cartCount, onGo }) {
  const isScanActive = active === 'scan';
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 100,
      background: T.surface,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.border}`,
      paddingBottom: 'env(safe-area-inset-bottom,0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 64 }}>
        {NAV_LEFT.map(n => {
          const isActive = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 4px 8px', background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? T.accent : T.textLow,
              transition: 'color 0.18s', position: 'relative', height: '100%', justifyContent: 'center',
              fontFamily: T.font,
            }}>
              {isActive && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2.5, background: T.accent, borderRadius: 2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10, fontFamily: T.font, fontWeight: isActive ? 600 : 400 }}>{n.label}</span>
            </button>
          );
        })}

        {/* Center scan FAB */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, position: 'relative' }}>
          <button onClick={() => onGo('scan')} style={{
            width: 58, height: 58, borderRadius: '50%', border: 'none',
            background: cartCount > 0 ? T.orange : T.accent,
            color: '#181717', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isScanActive
              ? `0 6px 24px rgba(250,216,93,0.6), 0 2px 8px rgba(250,216,93,0.3)`
              : `0 4px 18px rgba(250,216,93,0.4), 0 2px 6px rgba(250,216,93,0.2)`,
            position: 'relative', bottom: isScanActive ? 22 : 18,
            transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            transform: isScanActive ? 'scale(1.08)' : 'scale(1)',
            animation: isScanActive ? 'scanBtnPulse 2s ease-in-out infinite' : 'scanBtnFloat 3s ease-in-out infinite',
            outline: isScanActive ? `3px solid rgba(250,216,93,0.3)` : 'none',
            outlineOffset: 3,
          }}>
            {cartCount > 0 ? <span style={{ fontSize: 22 }}>🛒</span> : <i className="ti ti-scan" style={{ fontSize: 26 }} />}
            <CartBadge count={cartCount} />
          </button>
          <span style={{ fontSize: 10, fontFamily: T.font, fontWeight: isScanActive ? 600 : 400, color: isScanActive ? T.accent : T.textLow, marginTop: -2, lineHeight: 1 }}>
            {cartCount > 0 ? 'ตะกร้า' : 'สแกน/เบิก'}
          </span>
        </div>

        {NAV_RIGHT.map(n => {
          const isActive = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 4px 8px', background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? T.accent : T.textLow,
              transition: 'color 0.18s', position: 'relative', height: '100%', justifyContent: 'center',
              fontFamily: T.font,
            }}>
              {isActive && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2.5, background: T.accent, borderRadius: 2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10, fontFamily: T.font, fontWeight: isActive ? 600 : 400 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes scanBtnPulse {
          0%,100% { box-shadow: 0 6px 24px rgba(250,216,93,.6), 0 2px 8px rgba(250,216,93,.3); }
          50%      { box-shadow: 0 8px 32px rgba(250,216,93,.8), 0 2px 12px rgba(250,216,93,.5); }
        }
        @keyframes scanBtnFloat {
          0%,100% { transform: scale(1) translateY(0px); }
          50%      { transform: scale(1) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

// ── Top Bar ────────────────────────────────────────────────────
function TopBar({ loggedInEmp, syncStatus, onSync }) {
  const statusColor = syncStatus === 'ok' ? T.green : syncStatus === 'error' ? T.red : T.textLow;
  const statusText  = syncStatus === 'ok' ? 'Connected ✓' : syncStatus === 'error' ? 'Sync Error ⚠' : 'กำลังซิงค์...';
  return (
    <div style={{ padding: '14px 16px 12px', background: T.surface, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: T.accent, borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={iconWrench} alt="" style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 16, color: T.text, letterSpacing: '.2px' }}>Spare Part</span>
            <span style={{ fontSize: 10, color: T.textLow, fontFamily: T.font, marginLeft: 6 }}>IDC3</span>
          </div>
        </div>
        <div onClick={onSync} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 11px', borderRadius: 100, background: T.surface2, border: `1px solid ${T.border}` }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 10, color: statusColor, fontFamily: T.font }}>{statusText}</span>
        </div>
      </div>

      {loggedInEmp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderRadius: T.radius, padding: '9px 13px' }}>
          <EmpMiniAvatar emp={loggedInEmp} size={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.3, fontFamily: T.font }}>{loggedInEmp.displayName}</div>
            <div style={{ fontSize: 10, color: T.textLow, fontFamily: T.font }}>{loggedInEmp.id} · Engineer</div>
          </div>
          <div style={{ background: T.accentDim, borderRadius: 8, padding: '4px 8px', border: `1px solid ${T.accentBorder}` }}>
            <i className="ti ti-tool" style={{ fontSize: 14, color: T.accent }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pastel 3D-icon stat card (Spare Part dashboard) ─────────────
const SP_STAT_STYLE = {
  all:  { icon: iconWrench,  bg: 'linear-gradient(150deg,var(--pc-blue-1),var(--pc-blue-2))',   glow: 'rgba(110,143,240,0.35)' },
  ok:   { icon: iconCheck,   bg: 'linear-gradient(150deg,var(--pc-teal-1),var(--pc-teal-2))',   glow: 'rgba(15,191,160,0.35)' },
  low:  { icon: iconWarning, bg: 'linear-gradient(150deg,var(--pc-gold-1),var(--pc-gold-2))',   glow: 'rgba(247,187,62,0.35)' },
  zero: { icon: iconAlert,   bg: 'linear-gradient(150deg,var(--pc-coral-1),var(--pc-coral-2))', glow: 'rgba(255,111,105,0.35)' },
};

function SpStatCard({ statKey, label, value, isActive, onClick }) {
  const s = SP_STAT_STYLE[statKey];
  return (
    <div onClick={onClick} style={{
      position: 'relative', overflow: 'hidden',
      background: s.bg, color: 'var(--pc-ink)',
      borderRadius: T.radius, padding: '13px 13px 12px',
      boxShadow: isActive ? `var(--shadow-pastel-sm), 0 0 0 2px var(--pc-ink), 0 8px 20px ${s.glow}` : `var(--shadow-pastel-sm), 0 6px 16px ${s.glow}`,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6,
      cursor: 'pointer', transition: 'all .18s cubic-bezier(.4,0,.2,1)',
      transform: isActive ? 'scale(1.03) translateY(-2px)' : 'scale(1)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--pc-texture)', opacity: 0.45, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.font, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--pc-ink-soft)', marginTop: 3, fontFamily: T.font, fontWeight: 600 }}>{label}</div>
      </div>
      <img src={s.icon} alt="" style={{ position: 'relative', zIndex: 1, width: 36, height: 36, flexShrink: 0, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.22))', marginTop: -2 }} />
    </div>
  );
}

// ── Page: Home ─────────────────────────────────────────────────
function PageHome({ parts, onGoScan, onActionPart }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const stats = {
    total: parts.length,
    ok:    parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal > 0.25).length,
    low:   parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal <= 0.25).length,
    zero:  parts.filter(p => p.stockLeft === 0).length,
  };

  const statItems = [
    { key: 'all',  label: 'รายการทั้งหมด', val: stats.total },
    { key: 'ok',   label: 'พร้อมใช้งาน',   val: stats.ok    },
    { key: 'low',  label: 'ใกล้หมด',       val: stats.low   },
    { key: 'zero', label: 'หมดแล้ว',        val: stats.zero  },
  ];

  const filterConfig = {
    all:  { label: 'รายการทั้งหมด', fn: () => true },
    ok:   { label: 'พร้อมใช้งาน',  fn: p => p.stockLeft > 0 && p.stockLeft / p.stockTotal > 0.25 },
    low:  { label: 'ใกล้หมด',      fn: p => p.stockLeft > 0 && p.stockLeft / p.stockTotal <= 0.25 },
    zero: { label: 'หมดแล้ว',      fn: p => p.stockLeft === 0 },
  };

  const displayParts = parts
    .filter(filterConfig[activeFilter].fn)
    .sort((a, b) => (a.stockLeft / Math.max(a.stockTotal, 1)) - (b.stockLeft / Math.max(b.stockTotal, 1)));

  const accentColor = T.text;

  return (
    <div style={{ padding: '16px 14px 0' }}>
      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {statItems.map(({ key, label, val }) => (
          <SpStatCard
            key={key}
            statKey={key}
            label={label}
            value={val}
            isActive={activeFilter === key}
            onClick={() => setActiveFilter(activeFilter === key ? 'all' : key)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button onClick={() => onGoScan('withdraw')} style={{
          flex: 1, padding: '14px', borderRadius: T.radius, border: 'none',
          background: T.accent, color: '#181717',
          fontFamily: T.font, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(250,216,93,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-qrcode" style={{ fontSize: 18 }} /> 📤 เบิก SP
        </button>
        <button onClick={() => onGoScan('return')} style={{
          flex: 1, padding: '14px', borderRadius: T.radius, border: `1.5px solid ${T.blue}40`,
          background: `${T.blue}14`, color: T.blue,
          fontFamily: T.font, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-qrcode" style={{ fontSize: 18 }} /> 📥 คืน SP
        </button>
      </div>

      {/* Part list */}
      {parts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.font }}>
            <img src={SP_STAT_STYLE[activeFilter].icon} alt="" style={{ width: 16, height: 16 }} />
            <span style={{ color: accentColor }}>{filterConfig[activeFilter].label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textLow, fontWeight: 400, background: T.surface, padding: '2px 8px', borderRadius: 100, border: `1px solid ${T.border}` }}>{displayParts.length} รายการ</span>
          </div>
          {displayParts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: T.textLow, background: T.surface, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
              <img src={iconSparkles} alt="" style={{ width: 40, height: 40, marginBottom: 8 }} />
              <div style={{ fontFamily: T.font, fontWeight: 600, fontSize: 13 }}>ไม่มีรายการในหมวดนี้</div>
            </div>
          ) : displayParts.map((p, i) => {
            const c = stockColor(p.stockLeft, p.stockTotal);
            const isZero = p.stockLeft === 0;
            const isLow  = !isZero && p.stockLeft / p.stockTotal <= 0.25;
            return (
              <div key={p.id} onClick={() => onActionPart(p)} style={{
                background: T.surface,
                border: `1px solid ${isZero ? 'rgba(248,113,113,.35)' : isLow ? 'rgba(251,146,60,.3)' : T.border}`,
                borderRadius: T.radius, padding: '12px 14px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center',
                cursor: 'pointer', animation: `fadeUp .25s ease ${i * 0.04}s both`, transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                onMouseLeave={e => e.currentTarget.style.background = T.surface}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.font }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: T.textLow, marginBottom: 6, fontFamily: T.font }}>
                    <span style={{ background: T.accentDim, color: T.accent, borderRadius: 100, padding: '1px 7px', border: `1px solid ${T.accentBorder}`, marginRight: 4 }}>{p.system}</span>
                    {isZero && <span style={{ color: T.red, fontWeight: 600, fontSize: 10 }}>หมดแล้ว!</span>}
                    {isLow  && <span style={{ color: T.orange, fontWeight: 600, fontSize: 10 }}>ใกล้หมด</span>}
                  </div>
                  <StockBar left={p.stockLeft} total={p.stockTotal} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 20, color: c }}>{p.stockLeft}</div>
                  <div style={{ fontSize: 10, color: T.textLow }}>/ {p.stockTotal}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {parts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: T.textLow }}>
          <i className="ti ti-tool" style={{ fontSize: 48, marginBottom: 12, display: 'block', color: T.accent }} />
          <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: T.font, color: T.textMid }}>ยังไม่มีรายการ</div>
          <div style={{ fontSize: 12, fontFamily: T.font }}>กดเพิ่ม Spare Part เพื่อเริ่มต้น</div>
        </div>
      )}
    </div>
  );
}

// ── Page: Log ──────────────────────────────────────────────────
function PageLog({ logs, onSync }) {
  const [filterAction, setFilterAction] = useState('all');
  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction);
  const actionMeta = {
    withdraw: { label: 'เบิก', color: T.accent,  icon: '📤' },
    return:   { label: 'คืน', color: T.blue,     icon: '📥' },
    restock:  { label: 'เติม', color: T.green,   icon: '🔼' },
    delete:   { label: 'ลบ',  color: T.red,      icon: '🗑️' },
  };

  return (
    <div style={{ padding: '14px 14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text, fontFamily: T.font }}>📋 ประวัติการใช้งาน</div>
        <button onClick={onSync} style={{ padding: '6px 12px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.textMid, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: T.font }}>
          <i className="ti ti-refresh" style={{ fontSize: 12 }} /> รีเฟรช
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
        {['all', 'withdraw', 'return', 'restock'].map(f => {
          const m = actionMeta[f]; const isActive = filterAction === f;
          return (
            <button key={f} onClick={() => setFilterAction(f)}
              style={{ padding: '5px 12px', borderRadius: 100, border: `1.5px solid ${isActive ? (m?.color || T.accent) : T.border}`, background: isActive ? `${m?.color || T.accent}18` : 'transparent', color: isActive ? (m?.color || T.accent) : T.textLow, fontSize: 11, cursor: 'pointer', fontFamily: T.font, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f === 'all' ? 'ทั้งหมด' : `${m?.icon} ${m?.label}`}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: T.textLow }}>
          <i className="ti ti-list" style={{ fontSize: 48, marginBottom: 12, display: 'block', color: T.accent }} />
          <div style={{ fontFamily: T.font, fontWeight: 600, marginBottom: 6, color: T.textMid }}>ยังไม่มีประวัติ</div>
          <div style={{ fontSize: 12, fontFamily: T.font }}>เริ่มเบิก/คืน Spare Part เพื่อดู Log</div>
        </div>
      ) : filtered.map((l, i) => {
        const m = actionMeta[l.action] || { label: l.action, color: T.textLow, icon: '📋' };
        return (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '11px 13px', marginBottom: 7, display: 'flex', gap: 10, alignItems: 'flex-start', animation: `fadeUp .25s ease ${i * 0.03}s both` }}>
            <div style={{ width: 34, height: 34, borderRadius: T.radiusSm, background: `${m.color}14`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>{m.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.font }}>{l.partName || l.part_name}</div>
              <div style={{ fontSize: 11, color: T.textLow, marginTop: 2, fontFamily: T.font }}>
                <span style={{ color: m.color, fontWeight: 600 }}>{m.label}</span>
                {l.qty > 0 && <span> · {l.qty} ชิ้น</span>}
                {l.employee && <span> · {l.employee}</span>}
              </div>
              {l.pm_job && <div style={{ fontSize: 10, color: T.accent, marginTop: 2 }}>🔧 {l.pm_job}</div>}
              {l.note && <div style={{ fontSize: 10, color: T.textLow, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {l.note}</div>}
            </div>
            <div style={{ fontSize: 10, color: T.textLow, fontFamily: T.font, flexShrink: 0, textAlign: 'right' }}>
              {fmtTs(l.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page: Setup ────────────────────────────────────────────────
function PageSetup({ cfg, onSave, onSync }) {
  const [url, setUrl] = useState(cfg.url || '');
  const [saved, setSaved] = useState(false);
  function save() { onSave({ ...cfg, url: url.trim() }); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div style={{ padding: '20px 14px 0' }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: T.text, fontFamily: T.font, marginBottom: 4 }}>⚙️ ตั้งค่าระบบ</div>
      <div style={{ fontSize: 12, color: T.textLow, marginBottom: 20, fontFamily: T.font }}>Spare Part — IDC3 Engineer App</div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusXl, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textLow, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          <i className="ti ti-link" style={{ fontSize: 13, color: T.accent }} /> GAS URL
        </div>
        <textarea value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..."
          style={{ width: '100%', padding: '10px 13px', borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: T.surface2, fontSize: 12, fontFamily: T.font, color: T.text, outline: 'none', resize: 'none', height: 90, boxSizing: 'border-box', lineHeight: 1.5 }} />
        <button onClick={save} style={{ width: '100%', marginTop: 10, padding: '11px', borderRadius: T.radius, border: 'none', background: saved ? `${T.green}20` : T.accent, color: saved ? T.green : '#181717', fontSize: 13, fontWeight: 700, fontFamily: T.font, cursor: 'pointer', transition: 'all .2s' }}>
          {saved ? '✅ บันทึกแล้ว' : '💾 บันทึก URL'}
        </button>
      </div>

      <button onClick={onSync} style={{ width: '100%', padding: '12px', borderRadius: T.radius, border: `1.5px solid ${T.blue}40`, background: `${T.blue}10`, color: T.blue, fontSize: 13, fontWeight: 700, fontFamily: T.font, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <i className="ti ti-refresh" style={{ fontSize: 14 }} /> ซิงค์ข้อมูลตอนนี้
      </button>

      <div style={{ marginTop: 20, padding: '14px', background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderRadius: T.radius, fontSize: 12, color: T.textMid, fontFamily: T.font, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: T.accent, marginBottom: 6 }}><i className="ti ti-info-circle" style={{ fontSize: 13 }} /> ข้อมูลแอพ</div>
        <div>Spare Part v3.0 — Engineer Edition</div>
        <div style={{ color: T.textLow, marginTop: 4 }}>ระบบจัดการ Spare Part พร้อมตะกร้าเบิก/คืนหลายรายการ</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function SparePart({ user, gasUrl: gasUrlProp }) {
  const loggedInEmp = user ? EMPLOYEES.find(e => e.id === user.id || e.id === user.empId) || null : null;

  const [parts,      setParts]      = useState(loadCache);
  const [logs,       setLogs]       = useState(loadLogCache);
  const [loading,    setLoading]    = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [modal,      setModal]      = useState(null);
  const [showCam,       setShowCam]       = useState(false);
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [showCart,      setShowCart]      = useState(false);
  const [toast,      setToast]      = useState(null);
  const [syncStatus, setSyncStatus] = useState('none');
  const [cfg,        setCfg]        = useState(() => { const c = loadCfg(); return { url: gasUrlProp || c.url || '' }; });

  const [cart,     setCart]     = useState([]);
  const [cartMode, setCartMode] = useState('withdraw');

  const gasUrl   = cfg.url || gasUrlProp || '';
  const cartTotal = cart.reduce((s, c) => s + c.qty, 0);

  function showToast(msg, color) { setToast({ msg, color }); setTimeout(() => setToast(null), 2800); }

  function addToCart(part, qty = 1) {
    setCart(prev => {
      const existing = prev.find(c => c.part.id === part.id);
      if (existing) return prev.map(c => c.part.id === part.id ? { ...c, qty: c.qty + qty } : c);
      return [...prev, { part, qty }];
    });
  }
  function removeFromCart(partId) { setCart(prev => prev.filter(c => c.part.id !== partId)); }
  function changeCartQty(partId, newQty) {
    if (newQty <= 0) { removeFromCart(partId); return; }
    setCart(prev => prev.map(c => c.part.id === partId ? { ...c, qty: newQty } : c));
  }
  function clearCart() { setCart([]); }

  const fetchParts = useCallback(async () => {
    if (!gasUrl) { setLoading(false); setSyncStatus('none'); return; }
    setSyncStatus('syncing'); setLoading(true);
    try {
      const res = await spPost(gasUrl, { action: 'spare_get' });
      if (res?.ok && Array.isArray(res.spareParts)) {
        const normalized = res.spareParts.map(p => {
          const keys = Object.keys(p);
          const get = (...names) => { for (const n of names) { const k = keys.find(k => k.trim().toLowerCase() === n.toLowerCase()); if (k !== undefined && p[k] !== undefined && p[k] !== '') return p[k]; } return ''; };
          return {
            id:         String(get('id') || '').trim(),
            name:       String(get('name') || '').trim(),
            system:     String(get('system') || '').trim(),
            icon:       String(get('icon') || '🔩').trim(),
            stockTotal: Number(get('stockTotal', 'stocktotal', 'stock_total')) || 0,
            stockLeft:  Number(get('stockLeft',  'stockleft',  'stock_left'))  || 0,
          };
        }).filter(p => p.id);
        setParts(normalized); saveCache(normalized);
        if (Array.isArray(res.sparePartLogs)) { setLogs(res.sparePartLogs); saveLogCache(res.sparePartLogs); }
        setSyncStatus('ok');
      } else { setSyncStatus('error'); }
    } catch { setSyncStatus('error'); }
    setLoading(false);
  }, [gasUrl]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  function handleQrScan(qrCode) {
    setShowCam(false);
    const part = parts.find(p => p.id === qrCode);
    if (!part) { showToast('❌ ไม่พบ Spare Part นี้ในระบบ', T.red); return; }
    addToCart(part, 1);
    setShowScanSheet(true);
    showToast(`✅ เพิ่ม ${part.name} ในตะกร้าแล้ว`, T.green);
  }

  async function handleCartConfirm(mode, note, pm) {
    if (cart.length === 0) return;
    setShowCart(false); setShowScanSheet(false);
    const ts = nowISO();
    const empName = user?.displayName || user?.empId || user?.id || '';
    const empId   = user?.empId || user?.id || '';
    const noteStr = [note, pm ? `PM: ${pm}` : ''].filter(Boolean).join(' | ');
    const newLogEntries = [];
    let allOk = true;

    const batchPayload = {
      action:     `spare_batch_${mode}`,
      items:      cart.map(({ part, qty }) => ({ part_id: part.id, part_name: part.name, part_system: part.system, qty })),
      employee:   empName, employeeId: empId,
      note:       noteStr, pm_job: pm || '', timestamp: ts,
    };

    try {
      const res = await spPost(gasUrl, batchPayload);
      if (res?.ok) {
        for (const { part, qty } of cart) {
          newLogEntries.push({ action: mode, partName: part.name, partSystem: part.system, qty, employee: empName, employeeId: empId, note: noteStr, pm_job: pm || '', timestamp: ts });
        }
      } else {
        for (const { part, qty } of cart) {
          try {
            const r = await spPost(gasUrl, { action: `spare_${mode}`, part_id: part.id, part_name: part.name, part_system: part.system, qty, employee: empName, employeeId: empId, note: noteStr, pm_job: pm || '', timestamp: ts });
            if (r?.ok) newLogEntries.push({ action: mode, partName: part.name, partSystem: part.system, qty, employee: empName, employeeId: empId, note: noteStr, pm_job: pm || '', timestamp: ts });
            else allOk = false;
          } catch { allOk = false; }
        }
      }
    } catch { allOk = false; }

    const modeLabel = mode === 'return' ? '📥 คืน' : '📤 เบิก';
    if (allOk) showToast(`${modeLabel} ${cart.length} รายการ เรียบร้อย ✅`);
    else showToast(`⚠️ บางรายการอาจมีข้อผิดพลาด`, T.orange);

    const updatedLogs = [...newLogEntries, ...logs].slice(0, 200);
    setLogs(updatedLogs); saveLogCache(updatedLogs);
    clearCart(); fetchParts();
  }

  async function handleActionConfirm({ action, part, qty, note, pm }) {
    const noteStr = [note, pm ? `PM: ${pm}` : ''].filter(Boolean).join(' | ');
    try {
      const res = await spPost(gasUrl, { action: `spare_${action}`, part_id: part.id, part_name: part.name, part_system: part.system, qty, employee: user?.displayName || user?.empId || user?.id, employeeId: user?.empId || user?.id, note: noteStr, pm_job: pm || '', timestamp: nowISO() });
      if (!res?.ok) { showToast('❌ เกิดข้อผิดพลาด: ' + (res?.reason || ''), T.red); return; }
      const labels = { restock: '🔼 เติม Stock', delete: '🗑️ ลบ' };
      showToast(`${labels[action]} ${action !== 'delete' ? qty + ' ชิ้น ' : ''}เรียบร้อย`);
      const logEntry = { action, partName: part.name, partSystem: part.system, qty, employee: user?.displayName || user?.empId, employeeId: user?.empId || user?.id, note: noteStr, pm_job: pm || '', timestamp: nowISO() };
      const newLogs = [logEntry, ...logs].slice(0, 200);
      setLogs(newLogs); saveLogCache(newLogs);
      setModal(null); fetchParts();
    } catch { showToast('❌ ไม่สามารถเชื่อมต่อได้', T.red); }
  }

  async function handleFormConfirm(data) {
    const isEdit = !!modal?.part;
    const payload = isEdit ? { action: 'spare_edit', id: modal.part.id, ...data } : { action: 'spare_add', id: 'sp' + Date.now(), ...data };
    try {
      const res = await spPost(gasUrl, payload);
      if (!res?.ok) { showToast('❌ เกิดข้อผิดพลาด: ' + (res?.reason || ''), T.red); return; }
      showToast(isEdit ? '✅ แก้ไขเรียบร้อย' : '✅ เพิ่ม Spare Part แล้ว');
      setModal(null); fetchParts();
    } catch { showToast('❌ ไม่สามารถเชื่อมต่อได้', T.red); }
  }

  function goNav(key) {
    if (key === 'scan') { if (cart.length > 0) { setShowCart(true); return; } setShowScanSheet(true); return; }
    if (key === 'add') { setModal({ type: 'form' }); return; }
    setActivePage(key);
  }

  const existingSystems = [...new Set(parts.map(p => p.system))];

  if (loading && parts.length === 0) {
    return (
      <div style={{ background: T.bg, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: T.textLow, fontFamily: T.font }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={iconWrench} alt="" style={{ width: 32, height: 32 }} />
        </div>
        <div style={{ fontWeight: 600, color: T.textMid }}>กำลังโหลดข้อมูล...</div>
        <div style={{ fontSize: 12 }}>เชื่อมต่อ Google Sheet</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.font, background: T.bg, color: T.text, maxWidth: 480, margin: '0 auto', minHeight: '100%', width: '100%', overflowX: 'hidden', paddingBottom: 88 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes scanLine { 0%,100% { top:20%; } 50% { top:80%; } }
        * { box-sizing: border-box; }
      `}</style>

      <TopBar loggedInEmp={loggedInEmp} syncStatus={syncStatus} onSync={fetchParts} />

      <div>
        {activePage === 'home' && (
          <PageHome parts={parts} onGoScan={mode => { setCartMode(mode); setShowScanSheet(true); }} onActionPart={p => setModal({ type: 'action', action: 'restock', part: p })} />
        )}
        {activePage === 'log'   && <PageLog logs={logs} onSync={fetchParts} />}
        {activePage === 'setup' && <PageSetup cfg={cfg} onSave={c => { setCfg(c); saveCfg(c); }} onSync={fetchParts} />}
      </div>

      <BottomNav active={activePage} cartCount={cartTotal} onGo={goNav} />

      {showCam && <QRCamera onScan={handleQrScan} onClose={() => setShowCam(false)} />}

      {showScanSheet && (
        <ScanSheet parts={parts} user={user} cart={cart} mode={cartMode} onChangeMode={setCartMode}
          onOpenCamera={() => { setShowScanSheet(false); setShowCam(true); }}
          onAddToCart={(part, qty) => addToCart(part, qty)}
          onRemoveFromCart={removeFromCart}
          onOpenCart={() => { setShowScanSheet(false); setShowCart(true); }}
          onClose={() => setShowScanSheet(false)}
        />
      )}

      {showCart && (
        <CartSheet cart={cart} mode={cartMode} onChangeMode={setCartMode}
          onChangeQty={changeCartQty} onRemove={removeFromCart}
          onConfirm={handleCartConfirm} onClose={() => setShowCart(false)} user={user}
        />
      )}

      {modal?.type === 'action' && (
        <ActionModal action={modal.action} part={modal.part} user={user} onConfirm={handleActionConfirm} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'form' && (
        <FormModal part={modal.part || null} existingSystems={existingSystems} onConfirm={handleFormConfirm} onClose={() => setModal(null)} />
      )}

      <Toast msg={toast?.msg} color={toast?.color} />
    </div>
  );
}
