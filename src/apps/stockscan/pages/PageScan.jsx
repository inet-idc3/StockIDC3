// ─────────────────────────────────────────────────────────────
// PageScan.jsx — Scan & Withdraw page (improved)
// Changes:
//   1. Employee name comes from loggedInEmp only (no search)
//   2. Search by name added (alongside barcode/QR id)
//   3. Filter bar: category (วัสดุสิ้นเปลือง / INET), stock status (ใกล้หมด / หมดแล้ว)
// ─────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';

// ── helpers ───────────────────────────────────────────────────
function fuzzyMatch(a = '', b = '') {
  return a.toLowerCase().includes(b.toLowerCase());
}

// ── CategoryBadge ─────────────────────────────────────────────
function CategoryBadge({ cat }) {
  const isInet = cat?.toLowerCase().includes('inet');
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 600,
      background: isInet ? 'rgba(9,209,199,0.12)' : 'rgba(255,183,0,0.12)',
      color: isInet ? 'var(--teal)' : '#B07800',
      border: `1px solid ${isInet ? 'rgba(9,209,199,0.3)' : 'rgba(255,183,0,0.3)'}`,
    }}>
      {cat || 'ทั่วไป'}
    </span>
  );
}

// ── StockBar ──────────────────────────────────────────────────
function StockBar({ stock, min }) {
  const pct = min > 0 ? Math.min(100, (stock / (min * 2)) * 100) : 100;
  const color = stock === 0 ? '#FF4D4D' : stock <= min ? '#FFB700' : 'var(--teal)';
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'var(--teal-border)', marginTop: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  );
}

// ── ConfirmSheet ──────────────────────────────────────────────
function ConfirmSheet({ item, loggedInEmp, setupUnlocked, onUnlockRestock, onConfirm, onCancel }) {
  const [mode, setMode] = useState('withdraw');
  const [qty,  setQty]  = useState(1);
  const [note, setNote] = useState('');

  const modeOptions = [
    { key: 'withdraw', label: '📤 เบิก',       color: '#213A58' },
    { key: 'return',   label: '📥 คืน',        color: '#4A90D9' },
    { key: 'restock',  label: '🔼 เติม Stock', color: 'var(--teal)' },
  ];

  function handleModeChange(m) {
    if (m === 'restock' && !setupUnlocked) { onUnlockRestock(); return; }
    setMode(m);
  }

  const modeInfo = modeOptions.find(o => o.key === mode);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 18, boxShadow: '0 2px 16px rgba(33,58,88,0.10)', marginBottom: 16 }}>

      {/* Item header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 32 }}>{item.icon || '📦'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--txt)', lineHeight: 1.3 }}>{item.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <CategoryBadge cat={item.cat} />
            <span style={{ fontSize: 11, color: item.stock === 0 ? '#FF4D4D' : item.stock <= item.min ? '#FFB700' : 'var(--teal)', fontWeight: 600 }}>
              คงเหลือ {item.stock} {item.unit}
            </span>
          </div>
        </div>
        <button onClick={onCancel} style={{ background: 'var(--surface2)', border: '1px solid var(--teal-border)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'var(--txt3)', fontSize: 18 }}>✕</button>
      </div>

      {/* Employee (read-only) */}
      <div style={{ background: 'linear-gradient(135deg,var(--navy),var(--deep-teal))', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>👤</span>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 1 }}>ผู้ดำเนินการ</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{loggedInEmp?.displayName || loggedInEmp?.name || '—'}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: "'Space Mono',monospace" }}>{loggedInEmp?.id}</div>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {modeOptions.map(o => (
          <button key={o.key} onClick={() => handleModeChange(o.key)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 12, border: '1.5px solid',
            borderColor: mode === o.key ? o.color : 'var(--teal-border)',
            background: mode === o.key ? o.color : 'var(--surface2)',
            color: mode === o.key ? '#fff' : 'var(--txt2)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Noto Sans Thai',sans-serif", transition: 'all 0.18s',
          }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Qty */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>จำนวน ({item.unit})</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} style={qBtnStyle}>−</button>
          <input
            type="number" min={1} value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 12, border: '1.5px solid var(--teal-border)', background: 'var(--surface2)', fontSize: 20, fontWeight: 700, color: 'var(--txt)', outline: 'none' }}
          />
          <button onClick={() => setQty(q => q + 1)} style={qBtnStyle}>+</button>
        </div>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>หมายเหตุ (ถ้ามี)</label>
        <input
          value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุหมายเหตุ..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--teal-border)', background: 'var(--surface2)', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Confirm btn */}
      <button
        onClick={() => onConfirm(mode, null, qty, note)}
        style={{
          width: '100%', padding: 14, borderRadius: 16, border: 'none',
          background: modeInfo.color === 'var(--teal)'
            ? 'linear-gradient(135deg,var(--teal),var(--mid-teal))'
            : `linear-gradient(135deg,${modeInfo.color},${modeInfo.color}cc)`,
          color: '#fff', fontSize: 15, fontWeight: 700,
          fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(9,209,199,0.25)',
        }}
      >
        ยืนยัน {modeInfo.label} {qty} {item.unit}
      </button>
    </div>
  );
}

const qBtnStyle = {
  width: 44, height: 44, borderRadius: 12, border: '1.5px solid var(--teal-border)',
  background: 'var(--surface2)', fontSize: 20, cursor: 'pointer', color: 'var(--txt)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

// ── ItemCard ──────────────────────────────────────────────────
function ItemCard({ item, onSelect }) {
  const isOut  = item.stock === 0;
  const isLow  = !isOut && item.stock <= item.min;
  const stockColor = isOut ? '#FF4D4D' : isLow ? '#FFB700' : 'var(--teal)';

  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        background: 'var(--surface)', borderRadius: 16, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: `1px solid ${isOut ? 'rgba(255,77,77,0.2)' : isLow ? 'rgba(255,183,0,0.2)' : 'var(--teal-border)'}`,
        cursor: 'pointer', transition: 'box-shadow 0.15s',
        boxShadow: '0 1px 6px rgba(33,58,88,0.06)',
      }}
    >
      <div style={{ fontSize: 28, flexShrink: 0 }}>{item.icon || '📦'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <CategoryBadge cat={item.cat} />
        </div>
        <StockBar stock={item.stock} min={item.min} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: stockColor, fontFamily: "'Space Mono',monospace" }}>{item.stock}</div>
        <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{item.unit}</div>
        {isOut  && <div style={{ fontSize: 10, fontWeight: 700, color: '#FF4D4D', marginTop: 2 }}>หมดแล้ว!</div>}
        {isLow  && <div style={{ fontSize: 10, fontWeight: 700, color: '#FFB700', marginTop: 2 }}>ใกล้หมด</div>}
      </div>
    </div>
  );
}

// ── FILTER CONFIG ─────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',        label: 'ทั้งหมด',          icon: '📋' },
  { key: 'consumable', label: 'วัสดุสิ้นเปลือง',   icon: '🗂' },
  { key: 'inet',       label: 'INET',              icon: '🖥' },
  { key: 'low',        label: 'ใกล้หมด',           icon: '⚠️' },
  { key: 'out',        label: 'หมดแล้ว',           icon: '🚫' },
];

function applyFilters(items, q, activeFilter) {
  let result = items;

  // text search: id or name
  if (q.trim()) {
    const t = q.trim().toLowerCase();
    result = result.filter(x => x.id?.toLowerCase().includes(t) || x.name?.toLowerCase().includes(t));
  }

  // category / stock filter
  switch (activeFilter) {
    case 'consumable':
      result = result.filter(x => x.cat && !x.cat.toLowerCase().includes('inet'));
      break;
    case 'inet':
      result = result.filter(x => x.cat?.toLowerCase().includes('inet'));
      break;
    case 'low':
      result = result.filter(x => x.stock > 0 && x.stock <= x.min);
      break;
    case 'out':
      result = result.filter(x => x.stock === 0);
      break;
    default:
      break;
  }

  return result;
}

// ── Main PageScan ─────────────────────────────────────────────
export default function PageScan({
  items = [],
  curItem,
  onScan,
  onConfirm,
  onCancel,
  onOpenCamera,
  loggedInEmp,
  setupUnlocked,
  onUnlockRestock,
}) {
  const [scanInput,    setScanInput]    = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const inputRef = useRef(null);

  const filteredItems = applyFilters(items, scanInput, activeFilter);

  // counts for badges
  const countLow = items.filter(x => x.stock > 0 && x.stock <= x.min).length;
  const countOut = items.filter(x => x.stock === 0).length;

  function handleSearch(val) {
    setScanInput(val);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && scanInput.trim()) {
      // try exact id match first
      const exact = items.find(x => x.id === scanInput.trim());
      if (exact) { onScan(exact.id); setScanInput(''); return; }
      // else leave search results showing
    }
  }

  function handleSelectItem(item) {
    onScan(item.id);
    setScanInput('');
  }

  // badge helper
  function filterBadge(key) {
    if (key === 'low') return countLow > 0 ? countLow : null;
    if (key === 'out') return countOut > 0 ? countOut : null;
    return null;
  }

  return (
    <div style={{ paddingTop: 16 }}>

      {/* ── Confirm sheet (item selected) ── */}
      {curItem && (
        <ConfirmSheet
          item={curItem}
          loggedInEmp={loggedInEmp}
          setupUnlocked={setupUnlocked}
          onUnlockRestock={onUnlockRestock}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}

      {/* ── Search bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)', fontSize: 16 }} />
          <input
            ref={inputRef}
            value={scanInput}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ค้นหาด้วยชื่อหรือสแกน QR..."
            style={{
              width: '100%', padding: '11px 12px 11px 38px', borderRadius: 14,
              border: '1.5px solid var(--teal-border)', background: 'var(--surface)',
              fontSize: 14, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box',
              fontFamily: "'Noto Sans Thai',sans-serif",
            }}
          />
          {scanInput && (
            <button onClick={() => setScanInput('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16 }}>✕</button>
          )}
        </div>
        <button
          onClick={onOpenCamera}
          style={{
            flexShrink: 0, width: 46, height: 46, borderRadius: 14,
            background: 'linear-gradient(135deg,var(--teal),var(--mid-teal))',
            border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(9,209,199,0.3)',
          }}
        >
          <i className="ti ti-scan" />
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTER_TABS.map(f => {
          const isActive = activeFilter === f.key;
          const badge = filterBadge(f.key);
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                flexShrink: 0, padding: '7px 12px', borderRadius: 100,
                border: '1.5px solid', fontSize: 12, fontWeight: 600,
                fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer',
                transition: 'all 0.18s',
                borderColor: isActive ? 'var(--teal)' : 'var(--teal-border)',
                background: isActive ? 'linear-gradient(135deg,var(--teal),var(--mid-teal))' : 'var(--surface)',
                color: isActive ? '#fff' : 'var(--txt2)',
                position: 'relative',
              }}
            >
              {f.icon} {f.label}
              {badge != null && (
                <span style={{
                  position: 'absolute', top: -5, right: -4,
                  background: f.key === 'out' ? '#FF4D4D' : '#FFB700',
                  color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 800,
                  padding: '1px 5px', lineHeight: 1.4,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Item list ── */}
      <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 8 }}>
        รายการทั้งหมด <strong style={{ color: 'var(--txt)' }}>{filteredItems.length}</strong> รายการ
        {activeFilter !== 'all' && <span> · กรอง: <strong style={{ color: 'var(--teal)' }}>{FILTER_TABS.find(f => f.key === activeFilter)?.label}</strong></span>}
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--txt3)', fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          ไม่พบรายการที่ค้นหา
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} onSelect={handleSelectItem} />
          ))}
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
