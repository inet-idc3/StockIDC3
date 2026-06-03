// PageScan.jsx — QR scan + withdraw/return/restock form
import { useState, useEffect } from 'react';
import { EmployeePicker } from '../../../components/EmployeeDirectory.jsx';

const MODES = [
  { key:'withdraw', label:'เบิก',          icon:'📤', color:'var(--navy)' },
  { key:'return',   label:'คืน',           icon:'📥', color:'#4A90D9' },
  { key:'restock',  label:'เติม Stock',    icon:'📦', color:'var(--mid-teal)', locked:true },
];

export default function PageScan({ items, curItem, onScan, onConfirm, onCancel, onOpenCamera, loggedInEmp, setupUnlocked, onUnlockRestock }) {
  const [manualId, setManualId] = useState('');
  const [mode,     setMode]     = useState('withdraw');
  const [qty,      setQty]      = useState(1);
  const [note,     setNote]     = useState('');
  const [selEmp,   setSelEmp]   = useState(null);

  useEffect(() => { if (!curItem) { setMode('withdraw'); setQty(1); setNote(''); setSelEmp(null); } }, [curItem]);

  const IS = { width:'100%',padding:'12px 14px',borderRadius:14,border:'1.5px solid var(--teal-border)',background:'var(--surface)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,outline:'none',color:'var(--txt)',boxShadow:'var(--shadow-sm)' };

  function handleModeClick(m) {
    if (m.locked && !setupUnlocked) { onUnlockRestock(); return; }
    setMode(m.key);
  }

  function handleScan() {
    const id = manualId.trim();
    if (!id) return;
    onScan(id);
    setManualId('');
  }

  const modeObj = MODES.find(m => m.key === mode);
  const emp = selEmp || loggedInEmp;

  return (
    <div style={{ paddingTop:16 }}>
      {!curItem ? (
        <>
          <button onClick={onOpenCamera} style={{ width:'100%',padding:'18px 20px',borderRadius:'var(--r2)',border:'2px dashed var(--teal-border)',background:'var(--teal-dim)',color:'var(--mid-teal)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:16,fontWeight:700,cursor:'pointer',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
            <i className="ti ti-camera" style={{ fontSize:24 }} /> เปิดกล้องสแกน QR
          </button>
          <div style={{ textAlign:'center',color:'var(--txt3)',fontSize:12,marginBottom:12 }}>— หรือพิมพ์รหัสด้วยตนเอง —</div>
          <div style={{ display:'flex',gap:8 }}>
            <input value={manualId} onChange={e => setManualId(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleScan()} placeholder="QR ID เช่น QR-A1B2C3" style={{ ...IS,flex:1 }} />
            <button onClick={handleScan} style={{ padding:'12px 18px',borderRadius:14,border:'none',background:'var(--teal)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14,flexShrink:0 }}>ค้นหา</button>
          </div>
          <div style={{ marginTop:20 }}>
            <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:10 }}>รายการทั้งหมด ({items.length})</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {items.map(it => (
                <div key={it.id} onClick={() => onScan(it.id)} style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'11px 14px',boxShadow:'var(--shadow-sm)',display:'flex',alignItems:'center',gap:12,cursor:'pointer',border:'1.5px solid transparent',transition:'border-color 0.15s,background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--teal-border)'; e.currentTarget.style.background='var(--teal-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='var(--surface)'; }}>
                  <div style={{ fontSize:24,flexShrink:0 }}>{it.icon||'📦'}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{it.name}</div>
                    <div style={{ fontSize:11,color:'var(--txt3)' }}>{it.cat}</div>
                  </div>
                  <div style={{ fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:16,color:it.stock===0?'#FF4D4D':it.stock<=it.min?'#FFB700':'var(--teal)',flexShrink:0 }}>{it.stock}</div>
                  <div style={{ fontSize:11,color:'var(--txt3)',flexShrink:0 }}>{it.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ animation:'fadeUp 0.25s ease' }}>
          {/* Item info */}
          <div style={{ background:'linear-gradient(135deg,var(--navy),var(--deep-teal))',borderRadius:'var(--r2)',padding:'18px',marginBottom:16,color:'#fff' }}>
            <div style={{ display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ fontSize:36 }}>{curItem.icon||'📦'}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:800,fontSize:15,lineHeight:1.3,marginBottom:4 }}>{curItem.name}</div>
                <div style={{ fontSize:11,opacity:0.7,fontFamily:"'Space Mono',monospace" }}>{curItem.id}</div>
              </div>
              <div style={{ textAlign:'center',flexShrink:0 }}>
                <div style={{ fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:26,color:'var(--teal)' }}>{curItem.stock}</div>
                <div style={{ fontSize:11,opacity:0.7 }}>{curItem.unit}</div>
              </div>
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display:'flex',gap:8,marginBottom:16 }}>
            {MODES.map(m => (
              <button key={m.key} onClick={() => handleModeClick(m)}
                style={{ flex:1,padding:'10px 6px',borderRadius:12,border:`1.5px solid ${mode===m.key?m.color:'var(--teal-border)'}`,background:mode===m.key?m.color:'var(--surface)',color:mode===m.key?'#fff':'var(--txt2)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all 0.15s',position:'relative' }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                {m.label}
                {m.locked && !setupUnlocked && <span style={{ position:'absolute',top:4,right:6,fontSize:10 }}>🔒</span>}
              </button>
            ))}
          </div>

          {/* Qty */}
          <div style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'14px',boxShadow:'var(--shadow-sm)',marginBottom:12 }}>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:10,fontWeight:500 }}>จำนวน ({curItem.unit})</div>
            <div style={{ display:'flex',alignItems:'center',gap:12 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width:40,height:40,borderRadius:12,border:'1.5px solid var(--teal-border)',background:'var(--surface2)',fontSize:20,fontWeight:700,cursor:'pointer',color:'var(--txt)',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
              <input type="number" value={qty} min={1} onChange={e => setQty(Math.max(1, parseInt(e.target.value)||1))} style={{ flex:1,padding:'10px',borderRadius:12,border:'1.5px solid var(--teal-border)',background:'var(--surface)',textAlign:'center',fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:22,outline:'none',color:'var(--txt)' }} />
              <button onClick={() => setQty(q => q + 1)} style={{ width:40,height:40,borderRadius:12,border:'1.5px solid var(--teal-border)',background:'var(--surface2)',fontSize:20,fontWeight:700,cursor:'pointer',color:'var(--txt)',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
            </div>
          </div>

          {/* Employee */}
          <EmployeePicker selected={selEmp} onSelect={setSelEmp} label="ชื่อผู้เบิก (ถ้าต่างจากที่ login)" />

          {/* Note */}
          <div style={{ marginTop:14,marginBottom:16 }}>
            <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:6,fontWeight:500 }}>หมายเหตุ (ถ้ามี)</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="เช่น ใช้ซ่อม Server Rack A" style={{ ...IS,resize:'none',lineHeight:1.5 }} />
          </div>

          {/* Buttons */}
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={onCancel} style={{ flex:1,padding:14,borderRadius:16,border:'1.5px solid var(--teal-border)',background:'var(--surface)',color:'var(--txt2)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:600,cursor:'pointer' }}>ยกเลิก</button>
            <button onClick={() => onConfirm(mode, emp, qty, note)} style={{ flex:2,padding:14,borderRadius:16,border:'none',background:modeObj.color,color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:`0 4px 14px rgba(9,209,199,0.25)` }}>
              {modeObj.icon} ยืนยัน{modeObj.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
