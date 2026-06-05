// ─────────────────────────────────────────────────────────────
// PageScan.jsx — Scan & Withdraw page with Multi-item Cart
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

// ── CartBadge ─────────────────────────────────────────────────
function CartBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: -6, right: -6,
      background: 'linear-gradient(135deg,#FF6B35,#FF4500)',
      color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800,
      padding: '2px 6px', lineHeight: 1.4, minWidth: 18, textAlign: 'center',
      boxShadow: '0 2px 8px rgba(255,69,0,0.4)',
    }}>
      {count}
    </span>
  );
}

// ── CartSheet ─────────────────────────────────────────────────
function CartSheet({ cart, mode, onChangeMode, onChangeQty, onRemove, onConfirm, onClose, loggedInEmp, setupUnlocked, onUnlockRestock }) {
  const [note, setNote] = useState('');

  const modeOptions = [
    { key: 'withdraw', label: '📤 เบิก',       color: '#213A58' },
    { key: 'return',   label: '📥 คืน',        color: '#4A90D9' },
    { key: 'restock',  label: '🔼 เติม Stock', color: 'var(--teal)' },
  ];

  function handleModeChange(m) {
    if (m === 'restock' && !setupUnlocked) { onUnlockRestock(); return; }
    onChangeMode(m);
  }

  const modeInfo = modeOptions.find(o => o.key === mode) || modeOptions[0];
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(33,58,88,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom,0px)',
          animation: 'slideUp .28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--teal-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,var(--teal),var(--mid-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20 }}>🛒</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                รายการที่เลือก
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: "'Space Mono',monospace" }}>
                {cart.length} ชนิด · {totalItems} รายการ
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--surface2)', border: '1px solid var(--teal-border)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'var(--txt3)', fontSize: 18 }}>✕</button>
          </div>

          {/* Employee */}
          <div style={{ background: 'linear-gradient(135deg,var(--navy),var(--deep-teal))', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 1 }}>ผู้ดำเนินการ</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{loggedInEmp?.displayName || loggedInEmp?.name || '—'}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: "'Space Mono',monospace" }}>{loggedInEmp?.id}</div>
          </div>

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 6 }}>
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
        </div>

        {/* Cart items list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cart.map((entry) => {
            const item = entry.item;
            const isOut = item.stock === 0;
            const isLow = !isOut && item.stock <= item.min;
            const stockColor = isOut ? '#FF4D4D' : isLow ? '#FFB700' : 'var(--teal)';
            return (
              <div key={item.id} style={{
                background: 'var(--surface2)',
                borderRadius: 16, padding: '11px 12px',
                border: '1.5px solid var(--teal-border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ fontSize: 26, flexShrink: 0 }}>{item.icon || '📦'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <CategoryBadge cat={item.cat} />
                    <span style={{ fontSize: 10, color: stockColor, fontWeight: 600 }}>
                      เหลือ {item.stock} {item.unit}
                    </span>
                  </div>
                </div>
                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => onChangeQty(item.id, entry.qty - 1)}
                    style={{ width: 30, height: 30, borderRadius: 9, border: '1.5px solid var(--teal-border)', background: 'var(--surface)', fontSize: 16, cursor: 'pointer', color: 'var(--txt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <span style={{ minWidth: 26, textAlign: 'center', fontSize: 16, fontWeight: 800, color: 'var(--txt)', fontFamily: "'Space Mono',monospace" }}>{entry.qty}</span>
                  <button
                    onClick={() => onChangeQty(item.id, entry.qty + 1)}
                    style={{ width: 30, height: 30, borderRadius: 9, border: '1.5px solid var(--teal-border)', background: 'var(--surface)', fontSize: 16, cursor: 'pointer', color: 'var(--txt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                  <button
                    onClick={() => onRemove(item.id)}
                    style={{ width: 30, height: 30, borderRadius: 9, border: '1.5px solid rgba(255,77,77,0.3)', background: 'rgba(255,77,77,0.07)', fontSize: 14, cursor: 'pointer', color: '#FF4D4D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note + Confirm */}
        <div style={{ padding: '10px 16px 18px', borderTop: '1px solid var(--teal-border)', flexShrink: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 5 }}>หมายเหตุ (ถ้ามี)</label>
            <input
              value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุหมายเหตุ..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--teal-border)', background: 'var(--surface2)', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans Thai',sans-serif" }}
            />
          </div>
          <button
            onClick={() => onConfirm(mode, note)}
            style={{
              width: '100%', padding: 14, borderRadius: 16, border: 'none',
              background: modeInfo.color === 'var(--teal)'
                ? 'linear-gradient(135deg,var(--teal),var(--mid-teal))'
                : `linear-gradient(135deg,${modeInfo.color},${modeInfo.color}cc)`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(9,209,199,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>ยืนยัน{modeInfo.label.replace(/^[^ ]+ /, '')} {cart.length} รายการ ({totalItems} ชิ้น)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmSheet (single item — still used when clicking directly) ──
function ConfirmSheet({ item, loggedInEmp, setupUnlocked, onUnlockRestock, onConfirm, onCancel, onAddToCart, cartHasItem }) {
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
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', marginBottom: 6 }}>หมายเหตุ (ถ้ามี)</label>
        <input
          value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุหมายเหตุ..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--teal-border)', background: 'var(--surface2)', fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Add to Cart button (only for withdraw/return) */}
        {mode !== 'restock' && (
          <button
            onClick={() => onAddToCart(item, qty, mode)}
            style={{
              flex: 1, padding: 13, borderRadius: 14, border: '1.5px solid var(--teal)',
              background: cartHasItem ? 'rgba(9,209,199,0.12)' : 'var(--surface2)',
              color: 'var(--teal)', fontSize: 13, fontWeight: 700,
              fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.18s',
            }}
          >
            <span style={{ fontSize: 16 }}>{cartHasItem ? '✓' : '🛒'}</span>
            {cartHasItem ? 'อยู่ในตะกร้า' : 'เพิ่มในตะกร้า'}
          </button>
        )}
        {/* Confirm immediately */}
        <button
          onClick={() => onConfirm(mode, null, qty, note)}
          style={{
            flex: mode !== 'restock' ? 1 : '1 0 100%',
            padding: 13, borderRadius: 14, border: 'none',
            background: modeInfo.color === 'var(--teal)'
              ? 'linear-gradient(135deg,var(--teal),var(--mid-teal))'
              : `linear-gradient(135deg,${modeInfo.color},${modeInfo.color}cc)`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            fontFamily: "'Noto Sans Thai',sans-serif", cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(9,209,199,0.2)',
          }}
        >
          ยืนยัน {modeInfo.label.replace(/^[^ ]+ /, '')}
        </button>
      </div>
    </div>
  );
}

const qBtnStyle = {
  width: 44, height: 44, borderRadius: 12, border: '1.5px solid var(--teal-border)',
  background: 'var(--surface2)', fontSize: 20, cursor: 'pointer', color: 'var(--txt)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

// ── ItemCard ──────────────────────────────────────────────────
function ItemCard({ item, onSelect, onAddToCart, cartQty }) {
  const isOut  = item.stock === 0;
  const isLow  = !isOut && item.stock <= item.min;
  const stockColor = isOut ? '#FF4D4D' : isLow ? '#FFB700' : 'var(--teal)';
  const inCart = cartQty > 0;

  return (
    <div
      style={{
        background: inCart ? 'rgba(9,209,199,0.04)' : 'var(--surface)',
        borderRadius: 16, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: `1.5px solid ${inCart ? 'var(--teal)' : isOut ? 'rgba(255,77,77,0.2)' : isLow ? 'rgba(255,183,0,0.2)' : 'var(--teal-border)'}`,
        cursor: 'pointer', transition: 'box-shadow 0.15s',
        boxShadow: inCart ? '0 2px 12px rgba(9,209,199,0.12)' : '0 1px 6px rgba(33,58,88,0.06)',
      }}
    >
      {/* Left: icon + info (tappable → open confirm) */}
      <div onClick={() => onSelect(item)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: 28, flexShrink: 0, position: 'relative' }}>
          {item.icon || '📦'}
          {inCart && (
            <span style={{
              position: 'absolute', top: -4, right: -6,
              background: 'var(--teal)', color: '#fff',
              borderRadius: 99, fontSize: 9, fontWeight: 800,
              padding: '1px 5px', lineHeight: 1.4,
            }}>{cartQty}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <CategoryBadge cat={item.cat} />
          </div>
          <StockBar stock={item.stock} min={item.min} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: stockColor, fontFamily: "'Space Mono',monospace" }}>{item.stock}</div>
          <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{item.unit}</div>
          {isOut  && <div style={{ fontSize: 10, fontWeight: 700, color: '#FF4D4D', marginTop: 2 }}>หมดแล้ว!</div>}
          {isLow  && <div style={{ fontSize: 10, fontWeight: 700, color: '#FFB700', marginTop: 2 }}>ใกล้หมด</div>}
        </div>
        {/* Quick add button */}
        <button
          onClick={e => { e.stopPropagation(); onAddToCart(item, 1, 'withdraw'); }}
          style={{
            width: 32, height: 32, borderRadius: 9,
            border: inCart ? '1.5px solid var(--teal)' : '1.5px solid var(--teal-border)',
            background: inCart ? 'rgba(9,209,199,0.15)' : 'var(--surface2)',
            color: inCart ? 'var(--teal)' : 'var(--txt3)',
            fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          title="เพิ่มในตะกร้า"
        >
          {inCart ? '✓' : '+'}
        </button>
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
  if (q.trim()) {
    const t = q.trim().toLowerCase();
    result = result.filter(x => x.id?.toLowerCase().includes(t) || x.name?.toLowerCase().includes(t));
  }
  switch (activeFilter) {
    case 'consumable':
      result = result.filter(x => x.cat && !x.cat.toLowerCase().includes('inet')); break;
    case 'inet':
      result = result.filter(x => x.cat?.toLowerCase().includes('inet')); break;
    case 'low':
      result = result.filter(x => x.stock > 0 && x.stock <= x.min); break;
    case 'out':
      result = result.filter(x => x.stock === 0); break;
    default: break;
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
  // Cart props from parent
  cart = [],
  onAddToCart,
  onCartChangeQty,
  onCartRemove,
  onCartConfirm,
  cartMode,
  onCartModeChange,
}) {
  const [scanInput,    setScanInput]    = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCart,     setShowCart]     = useState(false);
  const inputRef = useRef(null);

  const filteredItems = applyFilters(items, scanInput, activeFilter);

  const countLow = items.filter(x => x.stock > 0 && x.stock <= x.min).length;
  const countOut = items.filter(x => x.stock === 0).length;
  const cartTotal = cart.reduce((s, c) => s + c.qty, 0);

  function handleSearch(val) { setScanInput(val); }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && scanInput.trim()) {
      const exact = items.find(x => x.id === scanInput.trim());
      if (exact) { onScan(exact.id); setScanInput(''); return; }
    }
  }

  function handleSelectItem(item) {
    onScan(item.id);
    setScanInput('');
  }

  function filterBadge(key) {
    if (key === 'low') return countLow > 0 ? countLow : null;
    if (key === 'out') return countOut > 0 ? countOut : null;
    return null;
  }

  function getCartQty(itemId) {
    return cart.find(c => c.item.id === itemId)?.qty || 0;
  }

  function handleCartConfirm(mode, note) {
    setShowCart(false);
    onCartConfirm(mode, note);
  }

  return (
    <div style={{ paddingTop: 16 }}>

      {/* ── Confirm sheet (single item selected) ── */}
      {curItem && (
        <ConfirmSheet
          item={curItem}
          loggedInEmp={loggedInEmp}
          setupUnlocked={setupUnlocked}
          onUnlockRestock={onUnlockRestock}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onAddToCart={(item, qty, mode) => {
            onAddToCart(item, qty, mode);
            onCancel(); // close confirm after adding
          }}
          cartHasItem={getCartQty(curItem.id) > 0}
        />
      )}

      {/* ── Search bar + Cart button ── */}
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
        {/* Camera scan */}
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
        {/* Cart button */}
        <button
          onClick={() => setShowCart(true)}
          style={{
            flexShrink: 0, width: 46, height: 46, borderRadius: 14,
            background: cart.length > 0
              ? 'linear-gradient(135deg,#FF6B35,#FF4500)'
              : 'var(--surface)',
            border: cart.length > 0 ? 'none' : '1.5px solid var(--teal-border)',
            color: cart.length > 0 ? '#fff' : 'var(--txt3)',
            fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: cart.length > 0 ? '0 3px 12px rgba(255,107,53,0.4)' : 'none',
            position: 'relative', transition: 'all 0.2s',
          }}
        >
          🛒
          <CartBadge count={cartTotal} />
        </button>
      </div>

      {/* ── Cart summary strip (if items in cart) ── */}
      {cart.length > 0 && (
        <div
          onClick={() => setShowCart(true)}
          style={{
            background: 'linear-gradient(135deg,rgba(255,107,53,0.1),rgba(255,69,0,0.07))',
            border: '1.5px solid rgba(255,107,53,0.35)',
            borderRadius: 14, padding: '10px 14px',
            marginBottom: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fadeIn .2s ease',
          }}
        >
          <span style={{ fontSize: 20 }}>🛒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#CC3300', fontFamily: "'Noto Sans Thai',sans-serif" }}>
              ตะกร้า: {cart.length} ชนิด · {cartTotal} รายการ
            </div>
            <div style={{ fontSize: 10, color: '#AA2200', marginTop: 1, fontFamily: "'Noto Sans Thai',sans-serif" }}>
              {cart.map(c => `${c.item.name} ×${c.qty}`).join(', ')}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FF4500', background: 'rgba(255,69,0,0.1)', borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>
            ดูตะกร้า →
          </div>
        </div>
      )}

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
            <ItemCard
              key={item.id}
              item={item}
              onSelect={handleSelectItem}
              onAddToCart={(item, qty, mode) => onAddToCart(item, qty, mode)}
              cartQty={getCartQty(item.id)}
            />
          ))}
        </div>
      )}

      <div style={{ height: 24 }} />

      {/* ── Cart Bottom Sheet ── */}
      {showCart && cart.length > 0 && (
        <CartSheet
          cart={cart}
          mode={cartMode}
          onChangeMode={onCartModeChange}
          onChangeQty={(itemId, newQty) => onCartChangeQty(itemId, newQty)}
          onRemove={(itemId) => onCartRemove(itemId)}
          onConfirm={handleCartConfirm}
          onClose={() => setShowCart(false)}
          loggedInEmp={loggedInEmp}
          setupUnlocked={setupUnlocked}
          onUnlockRestock={onUnlockRestock}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
      `}</style>
    </div>
  );
}
