// ─────────────────────────────────────────────────────────────
// SparePart.jsx — Spare Part inventory app  (Engineer Edition)
// Features: Bottom Nav, Employee card, Log, Settings, QR Scan
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { EMPLOYEES } from '../../data/employees.js';
import { EmpMiniAvatar } from '../../components/EmployeeDirectory.jsx';
import { gasPost as _gasPost } from '../../services/gasService.js';

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
  if (left === 0) return '#FF4D4D';
  if (left / total <= 0.25) return '#FFB700';
  return '#09D1C7';
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
      background: color || '#1a2a3a', color: '#fff',
      padding: '12px 22px', borderRadius: 100, fontSize: 13, fontWeight: 600,
      fontFamily: "'Noto Sans Thai',sans-serif",
      boxShadow: '0 6px 24px rgba(0,0,0,.4)', whiteSpace: 'nowrap',
      animation: 'slideUp .3s cubic-bezier(0.34,1.56,0.64,1)',
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
    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: c, borderRadius: 99, transition: 'width .4s' }} />
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 390, height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <canvas ref={cvsRef} style={{ display: 'none' }} />
      <button onClick={() => { activeRef.current = false; streamRef.current?.getTracks().forEach(t => t.stop()); onClose?.(); }}
        style={{ position: 'absolute', top: 48, right: 16, zIndex: 20, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 240, height: 240, borderRadius: 20, position: 'relative', boxShadow: '0 0 0 2000px rgba(0,0,0,.65)' }}>
          {corners.map((c, i) => (<div key={i} style={{ position: 'absolute', width: 44, height: 44, borderColor: '#F59E0B', borderStyle: 'solid', ...c }} />))}
          <div style={{ position: 'absolute', left: 4, right: 4, height: 2, top: '50%', background: 'linear-gradient(90deg,transparent,#F59E0B,transparent)', animation: 'scanLine 2s ease-in-out infinite' }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif" }}>วาง QR Code ของ Spare Part ในกรอบ</div>
        <div style={{ color: '#F59E0B', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{status}</div>
      </div>
    </div>
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
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${value ? '#F59E0B' : 'rgba(245,158,11,.25)'}`, background: value ? 'rgba(245,158,11,.08)' : 'rgba(255,255,255,.04)', cursor: 'pointer', transition: 'all .18s' }}>
        <i className="ti ti-tools" style={{ fontSize: 14, color: value ? '#F59E0B' : '#6b7280', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: value ? '#e5e7eb' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'เลือกงาน PM (ถ้ามี)...'}
        </span>
        {value
          ? <button onClick={e => { e.stopPropagation(); onChange(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2 }}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
          : <i className="ti ti-chevron-down" style={{ fontSize: 13, color: '#6b7280' }} />}
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => { setOpen(false); setSearch(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d3d', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '72vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom,0px)', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔧</div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800, color: '#f9fafb' }}>เลือกงาน PM</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Preventive Maintenance</div>
                </div>
                <button onClick={() => { setOpen(false); setSearch(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 20, padding: 4 }}>✕</button>
              </div>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6b7280' }} />
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหางาน PM..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, border: '1.5px solid rgba(245,158,11,.3)', background: 'rgba(255,255,255,.05)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", outline: 'none', color: '#f3f4f6', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
              <button onClick={() => select('')} style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: 13, color: '#6b7280', fontFamily: "'Noto Sans Thai',sans-serif", fontStyle: 'italic' }}>— ไม่ระบุงาน PM</span>
                {!value && <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 13, color: '#F59E0B' }} />}
              </button>
              {filtered.map((job, i) => (
                <button key={i} onClick={() => select(job)} style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: value === job ? 'rgba(245,158,11,.1)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none', color: value === job ? '#F59E0B' : '#d1d5db', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif" }}>
                  <i className="ti ti-tool" style={{ fontSize: 12, color: value === job ? '#F59E0B' : '#6b7280', flexShrink: 0 }} />
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{job}</span>
                  {value === job && <i className="ti ti-check" style={{ fontSize: 13, color: '#F59E0B', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Action Modal ───────────────────────────────────────────────
function ActionModal({ action, part, user, onConfirm, onClose }) {
  const [qty, setQty]   = useState(1);
  const [note, setNote] = useState('');
  const [pm, setPm]     = useState('');
  const maxQty = action === 'withdraw' ? part.stockLeft : action === 'return' ? 99 : 99;
  const icons = { withdraw: '📤', return: '📥', restock: '🔼', delete: '🗑️' };
  const labels = { withdraw: 'เบิก Spare Part', return: 'คืน Spare Part', restock: 'เติม Stock', delete: 'ลบรายการ' };
  const colors = { withdraw: '#F59E0B', return: '#4A90D9', restock: '#09D1C7', delete: '#FF4D4D' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d3d', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: '#f9fafb', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icons[action]}</span>
          <span>{labels[action]}</span>
        </div>

        {action === 'delete' ? (
          <div style={{ background: 'rgba(255,77,77,.12)', border: '1px solid rgba(255,77,77,.3)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f9fafb' }}>{part.name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{part.system}</div>
            <div style={{ fontSize: 12, color: '#FF6B6B', marginTop: 8 }}>⚠️ การลบนี้ไม่สามารถกู้คืนได้</div>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{part.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{part.system} · คงเหลือ <b style={{ color: stockColor(part.stockLeft, part.stockTotal) }}>{part.stockLeft}</b> / {part.stockTotal}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '10px 13px', marginBottom: 12, fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-user" style={{ fontSize: 13, color: '#F59E0B' }} />
              <b style={{ color: '#d1d5db' }}>{user?.displayName || user?.empId || user?.id}</b>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>
                จำนวน {action === 'withdraw' && <span style={{ color: '#6b7280' }}>(สูงสุด {maxQty})</span>}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#d1d5db', fontSize: 18, cursor: 'pointer' }}>−</button>
                <input type="number" value={qty} min={1} max={maxQty || 999}
                  onChange={e => setQty(Math.max(1, Math.min(maxQty || 999, Number(e.target.value))))}
                  style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, border: `1.5px solid ${colors[action]}40`, background: 'rgba(255,255,255,.05)', fontSize: 16, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: colors[action], outline: 'none' }} />
                <button onClick={() => setQty(q => Math.min(maxQty || 999, q + 1))} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#d1d5db', fontSize: 18, cursor: 'pointer' }}>＋</button>
              </div>
            </div>
            {(action === 'withdraw' || action === 'return') && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 5 }}>🔧 งาน PM (ถ้ามี)</label>
                <PmPicker value={pm} onChange={setPm} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 5 }}>หมายเหตุ</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุรายละเอียดเพิ่มเติม..."
                style={{ width: '100%', padding: '10px 13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid rgba(255,255,255,.15)', background: 'transparent', color: '#9ca3af', fontSize: 14, fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={() => onConfirm({ action, part, qty, note, pm })} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${colors[action]},${colors[action]}cc)`, color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer', boxShadow: `0 4px 16px ${colors[action]}44` }}>
            {action === 'delete' ? '🗑️ ยืนยันการลบ' : `${icons[action]} ยืนยัน ${action !== 'restock' ? qty + ' ชิ้น' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form Modal (Add / Edit) ────────────────────────────────────
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e2d3d', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 800, color: '#f9fafb', marginBottom: 16 }}>
          {part ? '✏️ แก้ไข Spare Part' : '➕ เพิ่ม Spare Part ใหม่'}
        </div>

        {[
          { label: 'ชื่อ Spare Part *', value: name, set: setName, placeholder: 'เช่น Bearing 6205, Filter 10 micron...' },
          { label: 'ชื่อระบบ *', value: sys, set: setSys, placeholder: 'เช่น Chiller, Pump, Electrical...' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 5 }}>{label}</label>
            <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
              style={{ width: '100%', padding: '10px 13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}

        {existingSystems.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {existingSystems.slice(0, 8).map(s => (
              <button key={s} onClick={() => setSys(s)} style={{ padding: '4px 10px', borderRadius: 100, border: `1px solid ${sys === s ? '#F59E0B' : 'rgba(255,255,255,.15)'}`, background: sys === s ? 'rgba(245,158,11,.15)' : 'transparent', color: sys === s ? '#F59E0B' : '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif" }}>{s}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[['Stock รวม *', total, setTotal], ['คงเหลือ *', left, setLeft]].map(([label, val, set]) => (
            <div key={label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 5 }}>{label}</label>
              <input type="number" value={val} onChange={e => set(e.target.value)} min={0}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif", color: '#09D1C7', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 5 }}>ไอคอน (Emoji)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2}
            style={{ width: 60, padding: '10px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', fontSize: 22, textAlign: 'center', outline: 'none', color: '#f3f4f6' }} />
        </div>

        {err && <div style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 12 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid rgba(255,255,255,.15)', background: 'transparent', color: '#9ca3af', fontSize: 14, fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={submit} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,.4)' }}>
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

function BottomNav({ active, onGo }) {
  const isScanActive = active === 'scan';
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 100,
      background: 'rgba(15,23,32,0.97)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(245,158,11,.2)',
      paddingBottom: 'env(safe-area-inset-bottom,0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 64 }}>
        {NAV_LEFT.map(n => {
          const isActive = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 4px 8px', background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? '#F59E0B' : '#6b7280',
              transition: 'color 0.18s', position: 'relative', height: '100%', justifyContent: 'center',
            }}>
              {isActive && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: '#F59E0B', borderRadius: 2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10, fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: isActive ? 700 : 400 }}>{n.label}</span>
            </button>
          );
        })}

        {/* Center scan FAB */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, position: 'relative' }}>
          <button onClick={() => onGo('scan')} style={{
            width: 62, height: 62, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg,#F59E0B,#D97706)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isScanActive
              ? '0 6px 24px rgba(245,158,11,0.65), 0 2px 8px rgba(245,158,11,0.3)'
              : '0 4px 18px rgba(245,158,11,0.5), 0 2px 6px rgba(245,158,11,0.2)',
            position: 'relative', bottom: isScanActive ? 22 : 18,
            transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            transform: isScanActive ? 'scale(1.08)' : 'scale(1)',
            animation: isScanActive ? 'scanBtnPulseAmber 2s ease-in-out infinite' : 'scanBtnFloatAmber 3s ease-in-out infinite',
            outline: isScanActive ? '3px solid rgba(245,158,11,0.3)' : 'none',
            outlineOffset: 3,
          }}>
            <i className="ti ti-scan" style={{ fontSize: 26 }} />
          </button>
          <span style={{ fontSize: 10, fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: isScanActive ? 700 : 400, color: isScanActive ? '#F59E0B' : '#6b7280', marginTop: -2, lineHeight: 1 }}>สแกน/เบิก</span>
        </div>

        {NAV_RIGHT.map(n => {
          const isActive = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 4px 8px', background: 'none', border: 'none',
              cursor: 'pointer', color: isActive ? '#F59E0B' : '#6b7280',
              transition: 'color 0.18s', position: 'relative', height: '100%', justifyContent: 'center',
            }}>
              {isActive && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: '#F59E0B', borderRadius: 2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10, fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: isActive ? 700 : 400 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes scanBtnPulseAmber {
          0%,100% { box-shadow: 0 6px 24px rgba(245,158,11,.65), 0 2px 8px rgba(245,158,11,.3); }
          50%      { box-shadow: 0 8px 32px rgba(245,158,11,.85), 0 2px 12px rgba(245,158,11,.5); }
        }
        @keyframes scanBtnFloatAmber {
          0%,100% { transform: scale(1) translateY(0px); }
          50%      { transform: scale(1) translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

// ── Top Bar ────────────────────────────────────────────────────
function TopBar({ loggedInEmp, syncStatus, onSync }) {
  const statusColor = syncStatus === 'ok' ? '#09D1C7' : syncStatus === 'error' ? '#FF4D4D' : '#6b7280';
  const statusText  = syncStatus === 'ok' ? 'Connected ✓' : syncStatus === 'error' ? 'Sync Error ⚠' : 'กำลังซิงค์...';
  return (
    <div style={{ padding: '14px 16px 12px', background: 'linear-gradient(180deg,#0d1b2a 0%,#0f2032 100%)', borderBottom: '1px solid rgba(245,158,11,.2)' }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🔩</div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, color: '#f9fafb', letterSpacing: '.3px' }}>Spare Part</span>
          <span style={{ fontSize: 10, color: '#6b7280', fontFamily: "'Space Mono',monospace" }}>IDC3</span>
        </div>
        <div onClick={onSync} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 11px', borderRadius: 100, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 10, color: statusColor, fontFamily: "'Space Mono',monospace" }}>{statusText}</span>
        </div>
      </div>

      {/* Employee card */}
      {loggedInEmp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 14, padding: '9px 13px' }}>
          <EmpMiniAvatar emp={loggedInEmp} size={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', lineHeight: 1.3 }}>{loggedInEmp.displayName}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'Space Mono',monospace" }}>{loggedInEmp.id} · Engineer</div>
          </div>
          <div style={{ background: 'rgba(245,158,11,.2)', borderRadius: 8, padding: '4px 8px' }}>
            <i className="ti ti-tool" style={{ fontSize: 14, color: '#F59E0B' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page: Home (ภาพรวม) ────────────────────────────────────────
function PageHome({ parts, onGoScan, onActionPart }) {
  const stats = {
    total: parts.length,
    ok:    parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal > 0.25).length,
    low:   parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal <= 0.25).length,
    zero:  parts.filter(p => p.stockLeft === 0).length,
  };
  const alertParts = parts.filter(p => p.stockLeft === 0 || p.stockLeft / p.stockTotal <= 0.25)
    .sort((a, b) => (a.stockLeft / a.stockTotal) - (b.stockLeft / b.stockTotal));

  const statItems = [
    { label: 'รายการทั้งหมด', val: stats.total, color: '#9ca3af', icon: 'ti-tool' },
    { label: 'พร้อมใช้งาน',   val: stats.ok,    color: '#09D1C7', icon: 'ti-check' },
    { label: 'ใกล้หมด',       val: stats.low,   color: '#FFB700', icon: 'ti-alert-triangle' },
    { label: 'หมดแล้ว',       val: stats.zero,  color: '#FF4D4D', icon: 'ti-bell-ringing' },
  ];

  return (
    <div style={{ padding: '16px 14px 0' }}>
      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {statItems.map(({ label, val, color, icon }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 18, color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color, lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, fontFamily: "'Noto Sans Thai',sans-serif" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Scan button */}
      <button onClick={onGoScan} style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontFamily: "'Noto Sans Thai',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 24px rgba(245,158,11,.4)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <i className="ti ti-qrcode" style={{ fontSize: 20 }} /> สแกน QR / เบิก Spare Part
      </button>

      {/* Alert list */}
      {alertParts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#f3f4f6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Noto Sans Thai',sans-serif" }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: '#FFB700' }} />
            ของใกล้หมด / หมดแล้ว
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontWeight: 400 }}>{alertParts.length} รายการ</span>
          </div>
          {alertParts.map((p, i) => {
            const c = stockColor(p.stockLeft, p.stockTotal);
            return (
              <div key={p.id} onClick={() => onActionPart(p)} style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${p.stockLeft === 0 ? 'rgba(255,77,77,.35)' : 'rgba(255,183,0,.3)'}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', animation: `fadeUp .3s ease ${i * 0.05}s both` }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{p.system}</div>
                  <StockBar left={p.stockLeft} total={p.stockTotal} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, color: c }}>{p.stockLeft}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>/ {p.stockTotal}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {parts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280' }}>
          <i className="ti ti-tool" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
          <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: "'Noto Sans Thai',sans-serif" }}>ยังไม่มีรายการ</div>
          <div style={{ fontSize: 12 }}>กดเพิ่ม Spare Part เพื่อเริ่มต้น</div>
        </div>
      )}
    </div>
  );
}

// ── Page: Parts List (ภาพรวม full) ────────────────────────────
function PageParts({ parts, onAction, onEdit, onAdd, onScan }) {
  const [searchQ,   setSearchQ]   = useState('');
  const [filterSys, setFilterSys] = useState('all');

  const systems  = ['all', ...new Set(parts.map(p => p.system))];
  const filtered = parts.filter(p => {
    const ms = filterSys === 'all' || p.system === filterSys;
    const mq = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.system.toLowerCase().includes(searchQ.toLowerCase());
    return ms && mq;
  });

  return (
    <div style={{ padding: '14px 14px 0' }}>
      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#6b7280' }} />
          <input style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }}
            value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ค้นหา spare part / ระบบ..." />
        </div>
        <button onClick={onScan} style={{ padding: '10px 13px', borderRadius: 12, border: '1.5px solid rgba(245,158,11,.4)', background: 'rgba(245,158,11,.1)', color: '#F59E0B', cursor: 'pointer', fontSize: 13 }}>
          <i className="ti ti-scan" />
        </button>
      </div>

      {/* System filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {systems.map(sys => (
          <button key={sys} onClick={() => setFilterSys(sys)}
            style={{ padding: '5px 12px', borderRadius: 100, border: `1.5px solid ${filterSys === sys ? '#F59E0B' : 'rgba(255,255,255,.15)'}`, background: filterSys === sys ? 'rgba(245,158,11,.15)' : 'transparent', color: filterSys === sys ? '#F59E0B' : '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: filterSys === sys ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {sys === 'all' ? 'ทั้งหมด' : sys}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280' }}>
          <i className="ti ti-tool" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
          <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: "'Noto Sans Thai',sans-serif" }}>ไม่พบรายการ</div>
          <div style={{ fontSize: 12 }}>ลองเปลี่ยน filter หรือเพิ่มรายการใหม่</div>
        </div>
      ) : filtered.map((p, i) => {
        const c  = stockColor(p.stockLeft, p.stockTotal);
        const isZero = p.stockLeft === 0;
        const isLow  = !isZero && p.stockLeft / p.stockTotal <= 0.25;
        return (
          <div key={p.id} style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${isZero ? 'rgba(255,77,77,.3)' : isLow ? 'rgba(255,183,0,.3)' : 'rgba(255,255,255,.08)'}`, borderRadius: 14, padding: '14px', marginBottom: 8, animation: `fadeUp .3s ease ${i * 0.04}s both`, borderLeft: `3px solid ${isZero ? '#FF4D4D' : isLow ? '#FFB700' : 'rgba(9,209,199,.4)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{p.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 600, background: 'rgba(245,158,11,.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,.3)' }}>{p.system}</span>
                  <span style={{ fontSize: 10, color: '#6b7280', fontFamily: "'Space Mono',monospace" }}>{p.id}</span>
                </div>
              </div>
              <button onClick={() => onEdit(p)} style={{ padding: '5px 9px', borderRadius: 9, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>✏️</button>
            </div>
            {/* Stock */}
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5, display: 'flex', justifyContent: 'space-between', fontFamily: "'Noto Sans Thai',sans-serif" }}>
              <span>คงเหลือ</span><span>รวม: <b style={{ color: '#9ca3af' }}>{p.stockTotal}</b></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><StockBar left={p.stockLeft} total={p.stockTotal} /></div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17, color: c, flexShrink: 0 }}>{p.stockLeft}</span>
              <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>/ {p.stockTotal}</span>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.07)' }}>
              {[
                { action: 'withdraw', label: '📤 เบิก', color: '#F59E0B' },
                { action: 'return',   label: '📥 คืน',  color: '#4A90D9' },
                { action: 'restock',  label: '🔼 เติม', color: '#09D1C7' },
                { action: 'delete',   label: '🗑️',      color: '#FF4D4D' },
              ].map(({ action, label, color }) => (
                <button key={action} onClick={() => onAction(action, p)}
                  style={{ flex: 1, padding: '7px 3px', borderRadius: 9, border: `1px solid ${color}40`, background: `${color}10`, color, fontSize: 11, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: 600 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page: Log ──────────────────────────────────────────────────
function PageLog({ logs, onSync }) {
  const [filterAction, setFilterAction] = useState('all');
  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction);
  const actionMeta = { withdraw: { label: 'เบิก', color: '#F59E0B', icon: '📤' }, return: { label: 'คืน', color: '#4A90D9', icon: '📥' }, restock: { label: 'เติม', color: '#09D1C7', icon: '🔼' }, delete: { label: 'ลบ', color: '#FF4D4D', icon: '🗑️' } };

  return (
    <div style={{ padding: '14px 14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#f3f4f6', fontFamily: "'Noto Sans Thai',sans-serif" }}>
          📋 ประวัติการใช้งาน
        </div>
        <button onClick={onSync} style={{ padding: '6px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#9ca3af', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-refresh" style={{ fontSize: 12 }} /> รีเฟรช
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
        {['all', 'withdraw', 'return', 'restock', 'delete'].map(f => {
          const m = actionMeta[f]; const isActive = filterAction === f;
          return (
            <button key={f} onClick={() => setFilterAction(f)}
              style={{ padding: '5px 12px', borderRadius: 100, border: `1.5px solid ${isActive ? (m?.color || '#F59E0B') : 'rgba(255,255,255,.12)'}`, background: isActive ? `${m?.color || '#F59E0B'}18` : 'transparent', color: isActive ? (m?.color || '#F59E0B') : '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f === 'all' ? 'ทั้งหมด' : `${m?.icon} ${m?.label}`}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280' }}>
          <i className="ti ti-list" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
          <div style={{ fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: 600, marginBottom: 6 }}>ยังไม่มีประวัติ</div>
          <div style={{ fontSize: 12 }}>เริ่มเบิก/คืน Spare Part เพื่อดู Log</div>
        </div>
      ) : filtered.map((l, i) => {
        const m = actionMeta[l.action] || { label: l.action, color: '#6b7280', icon: '📋' };
        return (
          <div key={i} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '11px 13px', marginBottom: 7, display: 'flex', gap: 10, alignItems: 'flex-start', animation: `fadeUp .25s ease ${i * 0.03}s both` }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${m.color}18`, border: `1px solid ${m.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>{m.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.partName || l.part_name}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontFamily: "'Noto Sans Thai',sans-serif" }}>
                <span style={{ color: m.color, fontWeight: 600 }}>{m.label}</span>
                {l.qty > 0 && <span> · {l.qty} ชิ้น</span>}
                {l.employee && <span> · {l.employee}</span>}
              </div>
              {l.pm_job && <div style={{ fontSize: 10, color: '#F59E0B', marginTop: 2 }}>🔧 {l.pm_job}</div>}
              {l.note && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {l.note}</div>}
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', fontFamily: "'Space Mono',monospace", flexShrink: 0, textAlign: 'right' }}>
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
      <div style={{ fontWeight: 800, fontSize: 16, color: '#f9fafb', fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>⚙️ ตั้งค่าระบบ</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20, fontFamily: "'Noto Sans Thai',sans-serif" }}>Spare Part — IDC3 Engineer App</div>

      <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-link" style={{ fontSize: 13, color: '#F59E0B' }} /> GAS URL
        </div>
        <textarea value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..."
          style={{ width: '100%', padding: '10px 13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', fontSize: 12, fontFamily: "'Space Mono',monospace", color: '#f3f4f6', outline: 'none', resize: 'none', height: 90, boxSizing: 'border-box', lineHeight: 1.5 }} />
        <button onClick={save} style={{ width: '100%', marginTop: 10, padding: '11px', borderRadius: 12, border: 'none', background: saved ? 'rgba(9,209,199,.2)' : 'linear-gradient(135deg,#F59E0B,#D97706)', color: saved ? '#09D1C7' : '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer', transition: 'all .2s' }}>
          {saved ? '✅ บันทึกแล้ว' : '💾 บันทึก URL'}
        </button>
      </div>

      <button onClick={onSync} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(9,209,199,.4)', background: 'rgba(9,209,199,.1)', color: '#09D1C7', fontSize: 13, fontWeight: 700, fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <i className="ti ti-refresh" style={{ fontSize: 14 }} /> ซิงค์ข้อมูลตอนนี้
      </button>

      <div style={{ marginTop: 24, padding: '14px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 14, fontSize: 12, color: '#9ca3af', fontFamily: "'Noto Sans Thai',sans-serif", lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: '#F59E0B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13 }} /> ข้อมูลแอพ
        </div>
        <div>Spare Part v2.0 — Engineer Edition</div>
        <div style={{ color: '#6b7280', marginTop: 4 }}>ระบบจัดการ Spare Part สำหรับทีม Facility / Maintenance</div>
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
  const [showCam,    setShowCam]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [syncStatus, setSyncStatus] = useState('none');
  const [cfg,        setCfg]        = useState(() => { const c = loadCfg(); return { url: gasUrlProp || c.url || '' }; });

  const gasUrl = cfg.url || gasUrlProp || '';

  function showToast(msg, color) { setToast({ msg, color }); setTimeout(() => setToast(null), 2800); }

  // ── Fetch from GAS ──────────────────────────────────────────
  const fetchParts = useCallback(async () => {
    if (!gasUrl) { setLoading(false); setSyncStatus('none'); return; }
    setSyncStatus('syncing');
    setLoading(true);
    try {
      const res = await spPost(gasUrl, { action: 'spare_get' });
      if (res?.ok && Array.isArray(res.spareParts)) {
        const keys0 = Object.keys(res.spareParts[0] || {});
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
        // fetch logs if available
        if (Array.isArray(res.logs)) { setLogs(res.logs); saveLogCache(res.logs); }
        setSyncStatus('ok');
      } else { setSyncStatus('error'); }
    } catch { setSyncStatus('error'); }
    setLoading(false);
  }, [gasUrl]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  // ── QR Scan ─────────────────────────────────────────────────
  function handleQrScan(qrCode) {
    setShowCam(false);
    const part = parts.find(p => p.id === qrCode);
    if (!part) { showToast('❌ ไม่พบ Spare Part นี้ในระบบ', '#FF4D4D'); return; }
    setModal({ type: 'action', action: 'withdraw', part });
  }

  // ── Action confirm ──────────────────────────────────────────
  async function handleActionConfirm({ action, part, qty, note, pm }) {
    const noteStr = [note, pm ? `PM: ${pm}` : ''].filter(Boolean).join(' | ');
    const logEntry = { action, partName: part.name, partSystem: part.system, qty, employee: user?.displayName || user?.empId, employeeId: user?.empId, note: noteStr, pm_job: pm || '', timestamp: nowISO() };
    try {
      const res = await spPost(gasUrl, {
        action: `spare_${action}`,
        part_id: part.id, part_name: part.name, part_system: part.system,
        qty, employee: user?.displayName || user?.empId || user?.id,
        employeeId: user?.empId || user?.id,
        note: noteStr, pm_job: pm || '', timestamp: nowISO(),
      });
      if (!res?.ok) { showToast('❌ เกิดข้อผิดพลาด: ' + (res?.reason || ''), '#FF4D4D'); return; }
      const labels = { withdraw: '📤 เบิก', return: '📥 คืน', restock: '🔼 เติม Stock', delete: '🗑️ ลบ' };
      showToast(`${labels[action]} ${action !== 'delete' ? qty + ' ชิ้น ' : ''}เรียบร้อย`);
      // Update local logs
      const newLogs = [logEntry, ...logs].slice(0, 200);
      setLogs(newLogs); saveLogCache(newLogs);
      setModal(null);
      fetchParts();
    } catch { showToast('❌ ไม่สามารถเชื่อมต่อได้', '#FF4D4D'); }
  }

  // ── Form confirm ────────────────────────────────────────────
  async function handleFormConfirm(data) {
    const isEdit = !!modal?.part;
    const payload = isEdit
      ? { action: 'spare_edit', id: modal.part.id, ...data }
      : { action: 'spare_add', id: 'sp' + Date.now(), ...data };
    try {
      const res = await spPost(gasUrl, payload);
      if (!res?.ok) { showToast('❌ เกิดข้อผิดพลาด: ' + (res?.reason || ''), '#FF4D4D'); return; }
      showToast(isEdit ? '✅ แก้ไขเรียบร้อย' : '✅ เพิ่ม Spare Part แล้ว');
      setModal(null); fetchParts();
    } catch { showToast('❌ ไม่สามารถเชื่อมต่อได้', '#FF4D4D'); }
  }

  // ── Nav ─────────────────────────────────────────────────────
  function goNav(key) {
    if (key === 'scan') { setShowCam(true); return; }
    if (key === 'add')  { setModal({ type: 'form' }); return; }
    setActivePage(key);
  }

  const existingSystems = [...new Set(parts.map(p => p.system))];

  if (loading && parts.length === 0) {
    return (
      <div style={{ background: '#0d1b2a', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#6b7280', fontFamily: "'Noto Sans Thai',sans-serif" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔩</div>
        <div style={{ fontWeight: 600 }}>กำลังโหลดข้อมูล...</div>
        <div style={{ fontSize: 12 }}>เชื่อมต่อ Google Sheet</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Noto Sans Thai',sans-serif", background: '#0d1b2a', color: '#f3f4f6', maxWidth: 480, margin: '0 auto', minHeight: '100%', width: '100%', overflowX: 'hidden', paddingBottom: 88 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes scanLine { 0%,100% { top:20%; } 50% { top:80%; } }
      `}</style>

      <TopBar loggedInEmp={loggedInEmp} syncStatus={syncStatus} onSync={fetchParts} />

      <div>
        {activePage === 'home'  && (
          <PageHome
            parts={parts}
            onGoScan={() => setShowCam(true)}
            onActionPart={p => setModal({ type: 'action', action: 'withdraw', part: p })}
          />
        )}
        {activePage === 'parts' && (
          <PageParts
            parts={parts}
            onAction={(action, p) => setModal({ type: 'action', action, part: p })}
            onEdit={p => setModal({ type: 'form', part: p })}
            onAdd={() => setModal({ type: 'form' })}
            onScan={() => setShowCam(true)}
          />
        )}
        {activePage === 'log'   && <PageLog logs={logs} onSync={fetchParts} />}
        {activePage === 'setup' && <PageSetup cfg={cfg} onSave={c => { setCfg(c); saveCfg(c); }} onSync={fetchParts} />}
      </div>

      <BottomNav active={activePage} onGo={goNav} />

      {/* QR Camera */}
      {showCam && <QRCamera onScan={handleQrScan} onClose={() => setShowCam(false)} />}

      {/* Modals */}
      {modal?.type === 'action' && (
        <ActionModal
          action={modal.action}
          part={modal.part}
          user={user}
          onConfirm={handleActionConfirm}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'form' && (
        <FormModal
          part={modal.part || null}
          existingSystems={existingSystems}
          onConfirm={handleFormConfirm}
          onClose={() => setModal(null)}
        />
      )}

      <Toast msg={toast?.msg} color={toast?.color} />
    </div>
  );
}
