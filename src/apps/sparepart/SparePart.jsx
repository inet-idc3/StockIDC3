// ─────────────────────────────────────────────────────────────
// SparePart.jsx — Spare Part inventory app
// Features: QR Scan, PM Job picker, GAS sync, Push notification
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { gasPost } from '../../services/gasService.js';

// ── PM Job list (เหมือน StockScan) ───────────────────────────
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
const CACHE_KEY = 'idc3_sparepart_v2';
function loadCache() {
  try { const d = JSON.parse(localStorage.getItem(CACHE_KEY)); return Array.isArray(d) ? d : []; }
  catch { return []; }
}
function saveCache(parts) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(parts)); } catch {}
}

// ── Helpers ────────────────────────────────────────────────────
function pct(left, total) { return total > 0 ? Math.min(100, (left / total) * 100) : 0; }
function stockColor(left, total) {
  if (left === 0) return '#FF4D4D';
  if (left / total <= 0.25) return '#FFB700';
  return 'var(--teal)';
}
function stockClass(left, total) {
  if (left === 0) return 'zero';
  if (left / total <= 0.25) return 'low';
  return '';
}
function nowISO() {
  const now = new Date();
  const thai = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return thai.toISOString().replace('Z', '+07:00');
}

// ══════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════

// ── Toast ──────────────────────────────────────────────────────
function Toast({ msg, color }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom,0px))',
      left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: color || 'var(--navy)', color: '#fff',
      padding: '12px 22px', borderRadius: 100, fontSize: 13, fontWeight: 600,
      fontFamily: "'Noto Sans Thai',sans-serif",
      boxShadow: '0 6px 24px rgba(0,0,0,.3)', whiteSpace: 'nowrap',
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
    <div style={{ height: 6, borderRadius: 99, background: 'var(--teal-border)', overflow: 'hidden' }}>
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
      const vid = vidRef.current;
      const cvs = cvsRef.current;
      if (vid && cvs && vid.readyState === vid.HAVE_ENOUGH_DATA) {
        cvs.width = vid.videoWidth;
        cvs.height = vid.videoHeight;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(vid, 0, 0);
        const now = Date.now();
        if (now - lastScan > 300) {
          lastScan = now;
          try {
            const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
            const code = window.jsQR?.(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              activeRef.current = false;
              cleanup();
              onScan(code.data.trim());
              return;
            }
          } catch {}
        }
      }
      rafRef.current = requestAnimationFrame(scan);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(s => {
        if (!activeRef.current) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        vidRef.current.srcObject = s;
        return vidRef.current.play();
      })
      .then(() => { setStatus('พร้อมสแกน ✓'); scan(); })
      .catch(() => { setStatus('❌ ไม่สามารถเปิดกล้องได้'); setTimeout(() => { cleanup(); onClose?.(); }, 2000); });

    function cleanup() {
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
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
        style={{ position: 'absolute', top: 48, right: 16, zIndex: 20, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ✕
      </button>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 240, height: 240, borderRadius: 20, position: 'relative', boxShadow: '0 0 0 2000px rgba(33,58,88,.6)' }}>
          {corners.map((c, i) => (
            <div key={i} style={{ position: 'absolute', width: 44, height: 44, borderColor: 'var(--teal)', borderStyle: 'solid', ...c }} />
          ))}
          <div style={{ position: 'absolute', left: 4, right: 4, height: 2, top: '50%', background: 'linear-gradient(90deg,transparent,var(--teal),transparent)', animation: 'scanLine 2s ease-in-out infinite' }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif" }}>วาง QR Code ของ Spare Part ในกรอบ</div>
        <div style={{ color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 11, minHeight: 16 }}>{status}</div>
      </div>
    </div>
  );
}

// ── PM Picker ──────────────────────────────────────────────────
function PmPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  const filtered = search.trim()
    ? PM_JOBS.filter(j => j.toLowerCase().includes(search.toLowerCase()))
    : PM_JOBS;

  function select(val) { onChange(val); setOpen(false); setSearch(''); }

  return (
    <>
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 80); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 13px', borderRadius: 'var(--r)',
          border: `1.5px solid ${value ? 'var(--teal)' : 'var(--teal-border)'}`,
          background: value ? 'rgba(9,209,199,.05)' : 'var(--surface)',
          cursor: 'pointer', transition: 'all .18s',
        }}
      >
        <i className="ti ti-tools" style={{ fontSize: 14, color: value ? 'var(--teal)' : 'var(--txt3)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: value ? 'var(--txt)' : 'var(--txt3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'เลือกงาน PM (ถ้ามี)...'}
        </span>
        {value
          ? <button onClick={e => { e.stopPropagation(); onChange(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
          : <i className="ti ti-chevron-down" style={{ fontSize: 13, color: 'var(--txt3)', flexShrink: 0 }} />
        }
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(33,58,88,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => { setOpen(false); setSearch(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, maxHeight: '72vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom,0px)', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)' }}>
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--teal-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--teal),var(--mid-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔧</div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>เลือกงาน PM</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Preventive Maintenance</div>
                </div>
                <button onClick={() => { setOpen(false); setSearch(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 20, padding: 4 }}>✕</button>
              </div>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--txt3)' }} />
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหางาน PM..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, border: '1.5px solid var(--teal-border)', background: 'var(--surface)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", outline: 'none', color: 'var(--txt)', boxSizing: 'border-box' }} />
              </div>
              {search && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 5, fontFamily: "'Space Mono',monospace" }}>พบ {filtered.length} รายการ</div>}
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
              <button onClick={() => select('')} style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: !value ? 'rgba(9,209,199,.07)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--teal-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--txt3)', fontFamily: "'Noto Sans Thai',sans-serif", fontStyle: 'italic' }}>— ไม่ระบุงาน PM</span>
                {!value && <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--teal)' }} />}
              </button>
              {filtered.map((job, i) => (
                <button key={i} onClick={() => select(job)}
                  style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: value === job ? 'rgba(9,209,199,.07)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < filtered.length - 1 ? '1px solid var(--teal-border)' : 'none', color: value === job ? 'var(--teal)' : 'var(--txt)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif" }}>
                  <i className="ti ti-tool" style={{ fontSize: 12, color: value === job ? 'var(--teal)' : 'var(--txt3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{job}</span>
                  {value === job && <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--teal)', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Action Modal (withdraw / return / restock / delete) ────────
function ActionModal({ action, part, user, onConfirm, onClose }) {
  const [qty, setQty]     = useState(1);
  const [note, setNote]   = useState('');
  const [pm, setPm]       = useState('');
  const [busy, setBusy]   = useState(false);

  const showPm   = action === 'withdraw' || action === 'return';
  const isDelete = action === 'delete';

  const labels = { withdraw: '📤 เบิก', return: '📥 คืน', restock: '🔼 เติม Stock', delete: '🗑️ ลบรายการ' };
  const colors  = { withdraw: '#D97706', return: '#4A90D9', restock: 'var(--teal)', delete: '#CC0000' };

  async function handleConfirm() {
    if (!isDelete && qty < 1) return;
    if (action === 'withdraw' && qty > part.stockLeft) return;
    setBusy(true);
    await onConfirm({ action, part, qty, note, pm });
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(33,58,88,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '22px 18px calc(28px + env(safe-area-inset-bottom,0px))', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)' }}>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {labels[action]}{!isDelete && `: ${part.name}`}
        </div>

        {isDelete ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>{part.name}</div>
            <div style={{ fontSize: 13, color: 'var(--txt3)' }}>ต้องการลบรายการนี้?<br />ไม่สามารถเรียกคืนได้</div>
          </div>
        ) : (
          <>
            {/* Part info card */}
            <div style={{ background: 'var(--surface)', border: '2px solid var(--teal)', borderRadius: 'var(--r2)', padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 32 }}>{part.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 8 }}>{part.system}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StockBar left={part.stockLeft} total={part.stockTotal} />
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, color: stockColor(part.stockLeft, part.stockTotal), flexShrink: 0 }}>{part.stockLeft}</span>
                    <span style={{ fontSize: 11, color: 'var(--txt3)', flexShrink: 0 }}>/ {part.stockTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee info */}
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--r)', padding: '10px 13px', marginBottom: 12, fontSize: 12, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 ผู้{action === 'withdraw' ? 'เบิก' : action === 'return' ? 'คืน' : 'เติม'}:
              <b style={{ color: 'var(--txt)' }}>{user?.displayName || user?.empId || user?.id}</b>
            </div>

            {/* Qty */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>
                จำนวน{action === 'withdraw' ? ' (เบิก)' : action === 'return' ? ' (คืน)' : ' (เติม)'} *
              </label>
              <input
                type="number" min="1" max={action === 'withdraw' ? part.stockLeft : undefined}
                value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)}
                autoFocus
                style={{ width: '100%', padding: '11px 13px', borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'var(--bg)', fontSize: 14, fontFamily: "'Noto Sans Thai',sans-serif", color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }}
              />
              {action === 'withdraw' && qty > part.stockLeft && (
                <div style={{ fontSize: 11, color: '#FF4D4D', marginTop: 4 }}>⚠ คงเหลือเพียง {part.stockLeft} ชิ้น</div>
              )}
            </div>

            {/* PM Picker */}
            {showPm && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>🔧 งาน PM (ถ้ามี)</label>
                <PmPicker value={pm} onChange={setPm} />
              </div>
            )}

            {/* Note */}
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>หมายเหตุ</label>
              <input
                type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                style={{ width: '100%', padding: '11px 13px', borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'var(--bg)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'transparent', color: 'var(--txt2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif" }}>
            ยกเลิก
          </button>
          <button onClick={handleConfirm} disabled={busy || (!isDelete && qty < 1) || (action === 'withdraw' && qty > part.stockLeft)}
            style={{ flex: 2, padding: 13, borderRadius: 'var(--r)', border: 'none', background: isDelete ? 'linear-gradient(135deg,#FF4D4D,#CC0000)' : `linear-gradient(135deg,${colors[action]},${colors[action]})`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: "'Noto Sans Thai',sans-serif", opacity: busy ? 0.7 : 1 }}>
            {busy ? '⏳ กำลังบันทึก...' : labels[action]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form Modal (add / edit) ────────────────────────────────────
function FormModal({ part, existingSystems, onConfirm, onClose }) {
  const isEdit = !!part;
  const [name,  setName]  = useState(part?.name       || '');
  const [sys,   setSys]   = useState(part?.system     || '');
  const [total, setTotal] = useState(part?.stockTotal ?? 0);
  const [left,  setLeft]  = useState(part?.stockLeft  ?? 0);
  const [icon,  setIcon]  = useState(part?.icon       || '🔩');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  async function handleSave() {
    if (!name.trim() || !sys.trim()) { setErr('กรุณากรอกชื่อและชื่อระบบ'); return; }
    if (Number(left) > Number(total)) { setErr('คงเหลือต้องไม่เกิน Stock รวม'); return; }
    setBusy(true);
    await onConfirm({ name: name.trim(), system: sys.trim(), stockTotal: Number(total), stockLeft: Number(left), icon: icon.trim() || '🔩' });
    setBusy(false);
  }

  const fieldStyle = { width: '100%', padding: '11px 13px', borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'var(--bg)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(33,58,88,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '22px 18px calc(28px + env(safe-area-inset-bottom,0px))', animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)' }}>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 16 }}>
          {isEdit ? `✏️ แก้ไข: ${part.name}` : '➕ เพิ่ม Spare Part ใหม่'}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>ชื่อ Spare Part *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น Snubber Valve, Lamp 36W" autoFocus style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>ชื่อระบบ *</label>
          <input value={sys} onChange={e => setSys(e.target.value)} placeholder="เช่น Cooling System" list="sp-sys-list" style={fieldStyle} />
          <datalist id="sp-sys-list">{existingSystems.map(s => <option key={s} value={s} />)}</datalist>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>Stock รวม *</label>
            <input type="number" min="0" value={total} onChange={e => setTotal(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>คงเหลือ *</label>
            <input type="number" min="0" value={left} onChange={e => setLeft(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>ไอคอน (Emoji)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} style={{ ...fieldStyle, fontSize: 20 }} />
        </div>

        {err && <div style={{ fontSize: 12, color: '#FF4D4D', marginBottom: 10 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'transparent', color: 'var(--txt2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif" }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={busy} style={{ flex: 2, padding: 13, borderRadius: 'var(--r)', border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: "'Noto Sans Thai',sans-serif", opacity: busy ? 0.7 : 1 }}>
            {busy ? '⏳ กำลังบันทึก...' : isEdit ? '✅ บันทึกการแก้ไข' : '✅ เพิ่มรายการ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main SparePart Component
// ══════════════════════════════════════════════════════════════
export default function SparePart({ user, gasUrl }) {
  const [parts,     setParts]     = useState(loadCache);
  const [loading,   setLoading]   = useState(true);
  const [searchQ,   setSearchQ]   = useState('');
  const [filterSys, setFilterSys] = useState('all');
  const [modal,     setModal]     = useState(null); // { type: 'action'|'form', action?, part? }
  const [showCam,   setShowCam]   = useState(false);
  const [toast,     setToast]     = useState(null);

  function showToast(msg, color) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2800);
  }

  // ── Fetch from GAS ──────────────────────────────────────────
  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gasPost(gasUrl, { action: 'spare_get' });
      if (res?.ok && Array.isArray(res.spareParts)) {
        const normalized = res.spareParts.map(p => {
          // normalize keys — trim whitespace และ lowercase เพื่อกัน GAS header ผิดพลาด
          const keys = Object.keys(p);
          const get = (...names) => {
            for (const n of names) {
              const k = keys.find(k => k.trim().toLowerCase() === n.toLowerCase());
              if (k !== undefined && p[k] !== undefined && p[k] !== '') return p[k];
            }
            return '';
          };
          return {
            id:         String(get('id') || '').trim(),
            name:       String(get('name') || '').trim(),
            system:     String(get('system') || '').trim(),
            icon:       String(get('icon') || '🔩').trim(),
            stockTotal: Number(get('stockTotal', 'stocktotal', 'stock_total')) || 0,
            stockLeft:  Number(get('stockLeft',  'stockleft',  'stock_left'))  || 0,
          };
        }).filter(p => p.id); // กรองแถวที่ไม่มี id ออก
        setParts(normalized);
        saveCache(normalized);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  // ── QR Scan result ──────────────────────────────────────────
  function handleQrScan(qrCode) {
    setShowCam(false);
    const part = parts.find(p => p.id === qrCode);
    if (!part) { showToast('❌ ไม่พบ Spare Part นี้ในระบบ', '#FF4D4D'); return; }
    setModal({ type: 'action', action: 'withdraw', part });
  }

  // ── Action confirm ──────────────────────────────────────────
  async function handleActionConfirm({ action, part, qty, note, pm }) {
    const gasAction = `spare_${action}`;
    const noteStr = [note, pm ? `PM: ${pm}` : ''].filter(Boolean).join(' | ');
    try {
      const res = await gasPost(gasUrl, {
        action:      gasAction,
        part_id:     part.id,
        part_name:   part.name,
        part_system: part.system,
        qty,
        employee:    user?.displayName || user?.empId || user?.id,
        employeeId:  user?.empId || user?.id,
        note:        noteStr,
        pm_job:      pm || '',
        timestamp:   nowISO(),
      });
      if (!res?.ok) { showToast('❌ เกิดข้อผิดพลาด: ' + (res?.reason || ''), '#FF4D4D'); return; }
      const labels = { withdraw: '📤 เบิก', return: '📥 คืน', restock: '🔼 เติม Stock', delete: '🗑️ ลบ' };
      showToast(`${labels[action]} ${action !== 'delete' ? qty + ' ชิ้น ' : ''}เรียบร้อย`);
      setModal(null);
      fetchParts();
    } catch (e) {
      showToast('❌ ไม่สามารถเชื่อมต่อได้', '#FF4D4D');
    }
  }

  // ── Form confirm (add / edit) ────────────────────────────────
  async function handleFormConfirm(data) {
    const isEdit = !!modal?.part;
    const payload = isEdit
      ? { action: 'spare_edit', id: modal.part.id, ...data }
      : { action: 'spare_add', id: 'sp' + Date.now(), ...data };
    try {
      const res = await gasPost(gasUrl, payload);
      if (!res?.ok) { showToast('❌ เกิดข้อผิดพลาด: ' + (res?.reason || ''), '#FF4D4D'); return; }
      showToast(isEdit ? '✅ แก้ไขเรียบร้อย' : '✅ เพิ่ม Spare Part แล้ว');
      setModal(null);
      fetchParts();
    } catch {
      showToast('❌ ไม่สามารถเชื่อมต่อได้', '#FF4D4D');
    }
  }

  // ── Filter & Stats ──────────────────────────────────────────
  const systems  = ['all', ...new Set(parts.map(p => p.system))];
  const filtered = parts.filter(p => {
    const ms = filterSys === 'all' || p.system === filterSys;
    const mq = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.system.toLowerCase().includes(searchQ.toLowerCase());
    return ms && mq;
  });
  const stats = {
    total: parts.length,
    ok:    parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal > 0.25).length,
    low:   parts.filter(p => p.stockLeft > 0 && p.stockLeft / p.stockTotal <= 0.25).length,
    zero:  parts.filter(p => p.stockLeft === 0).length,
  };

  // ── Styles ──────────────────────────────────────────────────
  const s = {
    wrap:    { padding: 16, maxWidth: 480, margin: '0 auto', fontFamily: "'Noto Sans Thai',sans-serif", paddingBottom: 100 },
    statGrid:{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
    stat:    { background: 'var(--surface)', borderRadius: 'var(--r)', padding: '13px 14px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 10 },
    card:    { background: 'var(--surface)', borderRadius: 'var(--r)', padding: '14px 15px', boxShadow: 'var(--shadow-sm)', marginBottom: 10, animation: 'fadeUp .3s ease both' },
    addBtn:  { width: '100%', padding: 13, borderRadius: 'var(--r)', border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontFamily: "'Noto Sans Thai',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
    search:  { flex: 1, padding: '10px 14px', borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'var(--surface)', fontSize: 13, fontFamily: "'Noto Sans Thai',sans-serif", color: 'var(--txt)', outline: 'none' },
    actBtn:  { flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid var(--teal-border)', background: 'transparent', fontSize: 11, color: 'var(--txt2)', cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif', whiteSpace: 'nowrap" },
    fab:     { position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom,0px))', right: 20, zIndex: 150, width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', fontSize: 26, boxShadow: '0 6px 20px rgba(245,158,11,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  };

  // ── Render ───────────────────────────────────────────────────
  if (loading && parts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--txt3)', fontFamily: "'Noto Sans Thai',sans-serif" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>กำลังโหลดข้อมูล...</div>
        <div style={{ fontSize: 12 }}>เชื่อมต่อ Google Sheet</div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.statGrid}>
        {[
          { icon: '🔧', val: stats.total, label: 'รายการทั้งหมด', color: 'var(--navy)' },
          { icon: '✅', val: stats.ok,    label: 'พร้อมใช้งาน',   color: 'var(--teal)' },
          { icon: '⚠️', val: stats.low,   label: 'ใกล้หมด',       color: '#FFB700' },
          { icon: '🚨', val: stats.zero,  label: 'หมดแล้ว',       color: '#FF4D4D' },
        ].map(({ icon, val, label, color }) => (
          <div key={label} style={s.stat}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button style={s.addBtn} onClick={() => setModal({ type: 'form' })}>
        <span style={{ fontSize: 18 }}>＋</span> เพิ่ม Spare Part ใหม่
      </button>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={s.search} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 ค้นหา spare part / ระบบ..." />
        <button onClick={fetchParts} style={{ padding: '10px 13px', borderRadius: 'var(--r)', border: '1.5px solid var(--teal-border)', background: 'var(--surface)', color: 'var(--mid-teal)', cursor: 'pointer', fontSize: 13 }} title="รีเฟรช">
          <i className="ti ti-refresh" />
        </button>
      </div>

      {/* System filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {systems.map(sys => (
          <button key={sys} onClick={() => setFilterSys(sys)}
            style={{ padding: '6px 13px', borderRadius: 100, border: `1.5px solid ${filterSys === sys ? 'var(--teal)' : 'var(--teal-border)'}`, background: filterSys === sys ? 'rgba(9,209,199,.1)' : 'var(--surface)', color: filterSys === sys ? 'var(--teal)' : 'var(--txt2)', fontSize: 11, cursor: 'pointer', fontFamily: "'Noto Sans Thai',sans-serif", fontWeight: filterSys === sys ? 700 : 400, whiteSpace: 'nowrap' }}>
            {sys === 'all' ? 'ทั้งหมด' : sys}
          </button>
        ))}
      </div>

      {/* Part cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--txt3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>ไม่พบรายการ</div>
          <div style={{ fontSize: 12 }}>ลองเปลี่ยน filter หรือเพิ่มรายการใหม่</div>
        </div>
      ) : filtered.map((p, i) => {
        const c  = stockColor(p.stockLeft, p.stockTotal);
        const cl = stockClass(p.stockLeft, p.stockTotal);
        return (
          <div key={p.id} style={{ ...s.card, borderLeft: `3px solid ${cl === 'zero' ? '#FF4D4D' : cl === 'low' ? '#FFB700' : 'transparent'}`, animationDelay: `${i * 0.05}s` }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{p.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{p.name}</div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 600, background: 'rgba(9,209,199,.12)', color: 'var(--teal)', border: '1px solid rgba(9,209,199,.3)' }}>{p.system}</span>
                <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: "'Space Mono',monospace", marginTop: 3 }}>{p.id}</div>
              </div>
              <button onClick={() => setModal({ type: 'form', part: p })} style={{ ...s.actBtn, flex: 'none', padding: '6px 10px', fontSize: 13, border: '1px solid var(--teal-border)' }}>✏️</button>
            </div>

            {/* Stock bar */}
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>คงเหลือ</span><span>Stock รวม: <b style={{ color: 'var(--txt)' }}>{p.stockTotal}</b></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}><StockBar left={p.stockLeft} total={p.stockTotal} /></div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, color: c, flexShrink: 0 }}>{p.stockLeft}</span>
              <span style={{ fontSize: 11, color: 'var(--txt3)', flexShrink: 0 }}>/ {p.stockTotal}</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--teal-border)' }}>
              {[
                { action: 'withdraw', label: '📤 เบิก',  color: 'rgba(245,158,11,.4)', textColor: '#D97706' },
                { action: 'return',   label: '📥 คืน',   color: 'rgba(74,144,217,.4)',  textColor: '#4A90D9' },
                { action: 'restock',  label: '🔼 เติม',  color: 'rgba(9,209,199,.4)',   textColor: 'var(--teal)' },
                { action: 'delete',   label: '🗑️',       color: 'rgba(255,77,77,.3)',   textColor: '#CC0000' },
              ].map(({ action, label, color, textColor }) => (
                <button key={action} onClick={() => setModal({ type: 'action', action, part: p })}
                  style={{ ...s.actBtn, borderColor: color, color: textColor }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* FAB — QR Scan */}
      <button style={s.fab} onClick={() => setShowCam(true)} title="สแกน QR">
        📷
      </button>

      {/* Modals */}
      {showCam && <QRCamera onScan={handleQrScan} onClose={() => setShowCam(false)} />}

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
          existingSystems={[...new Set(parts.map(p => p.system))]}
          onConfirm={handleFormConfirm}
          onClose={() => setModal(null)}
        />
      )}

      <Toast msg={toast?.msg} color={toast?.color} />
    </div>
  );
}
