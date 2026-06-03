// PageSetup.jsx — GAS URL config
import { useState } from 'react';

export default function PageSetup({ cfg, setupUnlocked, onSave, onSync, onLock, onUnlock }) {
  const [url, setUrl] = useState(cfg.url || '');

  const IS = { width:'100%',padding:'12px 14px',borderRadius:14,border:'1.5px solid var(--teal-border)',background:'var(--surface)',fontFamily:"'Space Mono',monospace",fontSize:12,outline:'none',color:'var(--txt)',wordBreak:'break-all',marginBottom:14 };

  if (!setupUnlocked) {
    return (
      <div style={{ paddingTop:40,textAlign:'center',color:'var(--txt3)' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>🔒</div>
        <div style={{ fontWeight:700,fontSize:15,color:'var(--txt)',marginBottom:6 }}>ต้องใส่ PIN</div>
        <button onClick={onUnlock} style={{ padding:'13px 32px',borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer',marginTop:16 }}>🔓 ใส่ PIN</button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop:16 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)' }}>⚙️ ตั้งค่าระบบ</div>
        <button onClick={onLock} style={{ padding:'7px 14px',borderRadius:100,border:'1.5px solid #FF4D4D',background:'transparent',color:'#FF4D4D',fontSize:12,fontWeight:600,cursor:'pointer' }}>
          <i className="ti ti-lock" /> ล็อค
        </button>
      </div>

      <div style={{ background:'var(--surface)',borderRadius:'var(--r2)',padding:'18px',boxShadow:'var(--shadow-md)',marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:4 }}>Google Apps Script URL</div>
        <div style={{ fontSize:11,color:'var(--txt3)',marginBottom:12 }}>URL ของ GAS ที่ deploy เป็น Web App สำหรับเชื่อมต่อ Google Sheet</div>
        <textarea value={url} onChange={e => setUrl(e.target.value)} rows={4} placeholder="https://script.google.com/macros/s/…/exec" style={IS} />
        <button onClick={() => onSave(url.trim())} style={{ width:'100%',padding:13,borderRadius:14,border:'none',background:'linear-gradient(135deg,var(--teal),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:10 }}>
          💾 บันทึกและซิงค์
        </button>
        <button onClick={onSync} style={{ width:'100%',padding:12,borderRadius:14,border:'1.5px solid var(--teal-border)',background:'var(--surface)',color:'var(--mid-teal)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,fontWeight:600,cursor:'pointer' }}>
          🔄 ซิงค์ข้อมูลตอนนี้
        </button>
      </div>

      <div style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'14px',boxShadow:'var(--shadow-sm)',fontSize:12,color:'var(--txt2)',lineHeight:1.7 }}>
        <div style={{ fontWeight:700,color:'var(--txt)',marginBottom:6 }}>📋 GAS ต้องรองรับ action เหล่านี้</div>
        {['login — ตรวจสอบ credential','change_password — เปลี่ยนรหัสผ่าน','withdraw / return / restock — เบิก/คืน/เติม','add_items — เพิ่มอุปกรณ์','delete_item — ลบอุปกรณ์','doGet() — คืน { items, logs, auth }'].map((t,i) => (
          <div key={i} style={{ display:'flex',gap:8,marginBottom:4 }}>
            <span style={{ color:'var(--teal)',flexShrink:0 }}>▸</span>
            <span style={{ fontFamily:"'Space Mono',monospace",fontSize:11 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
