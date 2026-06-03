// ─────────────────────────────────────────────────────────────
// EmployeeDirectory.jsx — Cinematic employee directory overlay
// Shared between StockScan and AssetAudit
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EMPLOYEES } from '../data/employees.js';
import '../styles/employee.css';

const FILTERS = [
  { key: 'all',                                       label: 'ทั้งหมด' },
  { key: 'ผู้ช่วยผู้อำนวยการ',                       label: 'ผู้ช่วยผอ.' },
  { key: 'รองผู้จัดการ',                              label: 'รองผู้จัดการ' },
  { key: 'วิศวกรไฟฟ้า',                               label: 'วิศวกรไฟฟ้า' },
  { key: 'วิศวกรคอมพิวเตอร์',                         label: 'วิศวกรคอมพิวเตอร์' },
  { key: 'เจ้าหน้าที่ดูแลศูนย์ข้อมูลคอมพิวเตอร์',   label: 'เจ้าหน้าที่ฯ' },
  { key: 'เจ้าหน้าที่ขุมชนสัมพันธ์',                 label: 'CSR' },
  { key: 'ช่างซ่อมบำรุงอาคาร',                       label: 'ช่างอาคาร' },
  { key: 'เจ้าหน้าที่บริหารสำนักงาน',                label: 'GA' },
  { key: 'เจ้าหน้าที่ความปลอดภัยวิชาชีพ',            label: 'เจ้าหน้าที่ความปลอดภัย' },
];

/** Avatar with lazy image loading */
function EmpCardAvatar({ emp }) {
  const [err,     setErr]     = useState(false);
  const [loaded,  setLoaded]  = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!emp.img) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [emp.img]);

  const showImg = emp.img && !err && visible;

  return (
    <div className="emp-avatar" ref={ref}>
      <div className="emp-avatar-ph" style={{ opacity: showImg && loaded ? 0 : 1, transition: 'opacity 0.2s' }}>
        {emp.initials}
      </div>
      {showImg && (
        <img loading="eager" src={emp.img} alt=""
          onError={() => setErr(true)}
          onLoad={() => setLoaded(true)}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',display:'block',opacity:loaded?1:0,transition:'opacity 0.2s' }}
        />
      )}
    </div>
  );
}

/** Particle layer for the overlay background */
function EmpParticles() {
  const pts = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id:    i,
    left:  Math.random() * 100,
    size:  Math.random() * 3.5 + 1.5,
    dur:   Math.random() * 14 + 9,
    delay: Math.random() * 12,
    op:    Math.random() * 0.35 + 0.15,
  })), []);

  return (
    <div className="emp-cin-particles">
      {pts.map(p => (
        <div key={p.id} className="emp-cin-pt" style={{ left:`${p.left}%`, width:p.size, height:p.size, opacity:p.op, animationDuration:`${p.dur}s`, animationDelay:`${p.delay}s` }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function EmployeeDirectory({ isOpen, onClose, onSelect, selectMode = false }) {
  const [q,      setQ]      = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isOpen) { setQ(''); setFilter('all'); }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return EMPLOYEES.filter(e => {
      const matchQ = !q
        || e.name.toLowerCase().includes(qq)
        || e.id.toLowerCase().includes(qq)
        || e.pos.includes(q)
        || e.displayName.includes(q);
      const matchF = filter === 'all' || e.pos.startsWith(filter) || e.pos === filter;
      return matchQ && matchF;
    });
  }, [q, filter]);

  const portalEl = document.getElementById('emp-overlay-portal');

  const content = (
    <div className={`emp-overlay${isOpen ? ' open' : ''}`}>
      {/* Background */}
      <div className="emp-cin-bg">
        <div className="emp-cin-grad" />
        <div className="emp-cin-noise" />
        <div className="emp-cin-grid" />
        <div className="emp-cin-orb emp-cin-orb-1" />
        <div className="emp-cin-orb emp-cin-orb-2" />
        <div className="emp-cin-orb emp-cin-orb-3" />
        <EmpParticles />
        <div className="emp-cin-vignette" />
      </div>
      {isOpen && <div className="emp-cin-scanline" key={String(isOpen)} />}

      {/* Top bar */}
      <div className="emp-cin-topbar-wrap">
        <div className="emp-topbar">
          <div className="emp-topbar-inner">
            <div className="emp-tb-row1">
              <div className="emp-brand">
                <div className="emp-brand-dot" />
                <span className="emp-brand-name">INET</span>
                <span style={{ fontSize:'0.68rem',color:'var(--emp-muted)',fontFamily:'Prompt',marginLeft:4 }}>IDC-3 · Directory</span>
              </div>
              <button className="emp-close-btn" onClick={onClose}>✕</button>
            </div>

            {selectMode && (
              <div style={{ fontSize:12,color:'var(--emp-dark)',fontFamily:'Noto Sans Thai',background:'rgba(255,255,255,0.55)',borderRadius:10,padding:'6px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}>
                <i className="ti ti-user-check" style={{ fontSize:14 }} />
                แตะ "เลือก" เพื่อใช้ชื่อพนักงานในการเบิก
              </div>
            )}

            <div className="emp-search-wrap">
              <i className="ti ti-search emp-si" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ ตำแหน่ง หรือรหัส…" />
            </div>
          </div>

          {/* Filter chips */}
          <div className="emp-fbar">
            {FILTERS.map(f => (
              <button key={f.key} className={`emp-fb${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="emp-grid-list">
        {filtered.length === 0
          ? <div style={{ gridColumn:'1/-1',textAlign:'center',padding:'40px 20px',color:'var(--emp-dark)',opacity:0.6,fontFamily:'Prompt' }}>ไม่พบพนักงาน</div>
          : filtered.map((e, i) => (
            <div key={e.id} className="emp-grid-card" style={{ animationDelay: `${i * 0.028}s` }}>
              <EmpCardAvatar emp={e} />
              <div className="emp-name">{e.displayName}</div>
              <div className="emp-pos">{e.pos}</div>
              <div className="emp-id-badge">{e.id}</div>

              <div className="emp-grid-acts">
                <button className={!e.phone ? 'disabled' : ''} onClick={ev => { ev.stopPropagation(); if (e.phone) window.location.href = 'tel:' + e.phone.replace(/\s/g, ''); }} title="โทร">
                  <i className="ti ti-phone" />
                </button>
                <button className={!e.email ? 'disabled' : ''} onClick={ev => { ev.stopPropagation(); if (e.email) window.location.href = 'mailto:' + e.email; }} title="อีเมล">
                  <i className="ti ti-mail" />
                </button>
              </div>

              {selectMode && (
                <button className="emp-select-chip" onClick={() => { onSelect?.(e); onClose(); }}>เลือกพนักงาน</button>
              )}
            </div>
          ))
        }
      </div>

      {/* Footer */}
      <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(5,30,45,0.22)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',borderTop:'1px solid rgba(255,255,255,0.12)',zIndex:15 }}>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:'0.58rem',color:'rgba(255,255,255,0.35)',letterSpacing:'1.5px' }}>INET · IDC-3 DIRECTORY</span>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:'0.58rem',color:'rgba(9,209,199,0.55)',letterSpacing:'1px' }}>{filtered.length} พนักงาน</span>
      </div>
    </div>
  );

  if (!portalEl) return content;
  return createPortal(content, portalEl);
}

// ── Mini avatar (used inside app forms) ──────────────────────

export function EmpMiniAvatar({ emp, size = 32, radius = 9 }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width:size,height:size,borderRadius:radius,overflow:'hidden',border:'1.5px solid var(--teal-border)',flexShrink:0,background:'var(--teal-dim)',position:'relative',boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
      {emp.img && !err
        ? <img loading="lazy" src={emp.img} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 15%',display:'block' }} onError={() => setErr(true)} />
        : <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.35,fontWeight:700,color:'var(--mid-teal)' }}>{emp.initials}</div>
      }
    </div>
  );
}

// ── Employee picker (inline in forms) ───────────────────────

export function EmployeePicker({ selected, onSelect, label }) {
  const [q,       setQ]       = useState('');
  const [open,    setOpen]    = useState(false);
  const [showDir, setShowDir] = useState(false);

  const suggestions = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return qq
      ? EMPLOYEES.filter(e => e.name.toLowerCase().includes(qq) || e.id.toLowerCase().includes(qq) || e.displayName.includes(q))
      : EMPLOYEES.slice(0, 6);
  }, [q]);

  const IS = { background:'var(--surface)',border:'1.5px solid var(--teal-border)',borderRadius:14,color:'var(--txt)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,padding:'11px 14px 11px 38px',width:'100%',outline:'none',boxShadow:'var(--shadow-sm)' };

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6,marginTop:14 }}>
        <span style={{ fontSize:12,color:'var(--txt2)',fontWeight:500 }}>{label || 'ชื่อผู้เบิก'}</span>
        <button className="emp-link-btn" onClick={() => setShowDir(true)} style={{ fontSize:10 }}>
          <i className="ti ti-address-book" style={{ fontSize:11 }} /> ดูรายชื่อพนักงาน
        </button>
      </div>

      <div style={{ position:'relative',marginBottom:6 }}>
        <i className="ti ti-search" style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:15,color:'var(--txt3)',pointerEvents:'none' }} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="พิมพ์ชื่อหรือรหัสพนักงาน…" style={IS} />
        {q && <button onClick={() => { setQ(''); setOpen(false); }} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--txt3)',cursor:'pointer',fontSize:14 }}>✕</button>}
      </div>

      {open && (
        <div style={{ background:'var(--surface)',border:'1.5px solid var(--teal-border)',borderRadius:14,boxShadow:'var(--shadow-md)',marginBottom:8,maxHeight:200,overflowY:'auto',animation:'slideDown .15s ease',position:'relative',zIndex:10 }}>
          {suggestions.length === 0
            ? <div style={{ padding:'12px 14px',color:'var(--txt3)',fontSize:12 }}>ไม่พบพนักงาน</div>
            : suggestions.map((e, i) => (
              <div key={e.id} onMouseDown={() => { onSelect(e); setQ(''); setOpen(false); }}
                style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 14px',borderBottom:i<suggestions.length-1?'1px solid var(--teal-border)':'none',cursor:'pointer' }}>
                <EmpMiniAvatar emp={e} size={32} radius={9} />
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{e.name}</div>
                  <div style={{ fontSize:11,color:'var(--txt2)' }}>{e.pos}</div>
                </div>
                <span style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:'var(--txt3)',flexShrink:0 }}>{e.id}</span>
              </div>
            ))
          }
        </div>
      )}

      {selected && (
        <div style={{ background:'var(--teal-dim)',border:'1.5px solid var(--teal-border)',borderRadius:14,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,animation:'slideDown .15s ease',marginBottom:2 }}>
          <EmpMiniAvatar emp={selected} size={38} radius={11} />
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:13,fontWeight:700,color:'var(--txt)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{selected.name}</div>
            <div style={{ fontSize:11,color:'var(--txt2)' }}>{selected.pos} · <span style={{ fontFamily:"'Space Mono',monospace",fontSize:10 }}>{selected.id}</span></div>
          </div>
          <button onClick={() => onSelect(null)} style={{ background:'none',border:'none',color:'var(--txt3)',cursor:'pointer',fontSize:14,padding:'2px 4px' }}>✕</button>
        </div>
      )}

      <EmployeeDirectory isOpen={showDir} onClose={() => setShowDir(false)} onSelect={e => { onSelect(e); setShowDir(false); }} selectMode />
    </div>
  );
}
