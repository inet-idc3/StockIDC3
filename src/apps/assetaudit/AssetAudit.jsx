// AssetAudit.jsx — Asset audit app (refactored)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { gasGet, gasPost, loadLocal, saveLocal, uid, nowISO, displayTs, fuzzyMatch } from '../../services/gasService.js';
import { EMPLOYEES } from '../../data/employees.js';
import EmployeeDirectory, { EmpMiniAvatar, EmployeePicker } from '../../components/EmployeeDirectory.jsx';

const DEFAULT_GAS_URL = import.meta.env.VITE_GAS_URL || '';
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '240739';

const STATUS_CFG = {
  good:     { label:'ดี',           color:'#22C55E', bg:'#F0FDF4', border:'#BBF7D0' },
  damaged:  { label:'ชำรุด',        color:'#EF4444', bg:'#FEF2F2', border:'#FECACA' },
  missing:  { label:'หาย',          color:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A' },
  disposed: { label:'จำหน่ายแล้ว',  color:'#6B7280', bg:'#F9FAFB', border:'#E5E7EB' },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.good;
  return <span style={{ padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:700,color:c.color,background:c.bg,border:`1px solid ${c.border}`,fontFamily:"'Noto Sans Thai',sans-serif",whiteSpace:'nowrap' }}>{c.label}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div style={{ position:'fixed',bottom:96,left:'50%',transform:'translateX(-50%)',background:toast.color||'#213A58',color:'#fff',borderRadius:100,padding:'12px 24px',fontSize:13,zIndex:300,whiteSpace:'nowrap',boxShadow:'0 8px 32px rgba(33,58,88,0.2)',animation:'toastPop .3s cubic-bezier(0.34,1.56,0.64,1)',fontFamily:"'Noto Sans Thai',sans-serif" }}>{toast.msg}</div>;
}

const NAV = [
  { key:'home',   icon:'ti-home-2',    label:'หน้าหลัก' },
  { key:'scan',   icon:'ti-qrcode',    label:'สแกน/ตรวจ' },
  { key:'list',   icon:'ti-list',      label:'รายการ' },
  { key:'report', icon:'ti-chart-bar', label:'รายงาน' },
  { key:'setup',  icon:'ti-settings',  label:'ตั้งค่า' },
];

function BottomNav({ active, onGo }) {
  return (
    <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,zIndex:100,background:'rgba(255,255,255,0.94)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderTop:'1px solid var(--mint-border)',paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
      <div style={{ display:'flex' }}>
        {NAV.map(n => {
          const act = active === n.key;
          return (
            <button key={n.key} onClick={() => onGo(n.key)} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 4px 8px',background:'none',border:'none',cursor:'pointer',color:act?'var(--mint)':'var(--txt3)',position:'relative' }}>
              {act && <div style={{ position:'absolute',top:0,left:'20%',right:'20%',height:2,background:'var(--mint)',borderRadius:2 }} />}
              <i className={`ti ${n.icon}`} style={{ fontSize:20 }} />
              <span style={{ fontSize:10,fontFamily:"'Noto Sans Thai',sans-serif",fontWeight:act?700:400 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopBar({ syncStatus, onSync, onOpenDirectory, loggedInEmp }) {
  const colors = { ok:'var(--mint)', syncing:'var(--txt3)', error:'#FF4D4D', none:'var(--txt3)' };
  const labels = { ok:'Connected ✓', syncing:'กำลังซิงค์...', error:'ซิงค์ไม่ได้ ⚠', none:'ยังไม่ได้เชื่อม' };
  return (
    <div style={{ padding:'16px 16px 0' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:loggedInEmp?10:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ background:'var(--navy)',color:'#fff',fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:13,padding:'5px 14px',borderRadius:100 }}>Asset</div>
          <span style={{ fontSize:11,color:'var(--txt3)',fontFamily:"'Space Mono',monospace" }}>IDC3</span>
          <button onClick={onOpenDirectory} style={{ background:'none',border:'none',color:'var(--mid-teal)',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4,padding:'4px 6px',borderRadius:8 }}>
            <i className="ti ti-users" style={{ fontSize:12 }} /> พนักงาน
          </button>
        </div>
        <div onClick={onSync} style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'6px 12px',borderRadius:100,background:'var(--surface)',border:'1px solid var(--mint-border)',boxShadow:'var(--shadow-sm)',flexShrink:0 }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:colors[syncStatus]||'var(--txt3)' }} />
          <span style={{ fontSize:11,color:colors[syncStatus]||'var(--txt3)',fontFamily:"'Space Mono',monospace" }}>{labels[syncStatus]}</span>
        </div>
      </div>
      {loggedInEmp && (
        <div style={{ display:'flex',alignItems:'center',gap:10,background:'linear-gradient(135deg,var(--navy),var(--deep-teal))',borderRadius:14,padding:'9px 14px' }}>
          <EmpMiniAvatar emp={loggedInEmp} size={34} radius={10} />
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,fontWeight:600,color:'#fff',lineHeight:1.3 }}>{loggedInEmp.displayName}</div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,0.5)',fontFamily:"'Space Mono',monospace",marginTop:1 }}>{loggedInEmp.id}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  function submit() { if (pin === ADMIN_PIN) onSuccess(); else { setErr('PIN ไม่ถูกต้อง'); setPin(''); } }
  return (
    <div style={{ position:'fixed',inset:0,zIndex:250,background:'rgba(33,58,88,0.45)',display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ background:'var(--surface)',borderRadius:'28px 28px 0 0',padding:28,width:'100%',maxWidth:480,paddingBottom:'calc(28px + env(safe-area-inset-bottom,0px))' }}>
        <div style={{ fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:800,color:'var(--txt)',marginBottom:16 }}>🔐 ยืนยัน PIN</div>
        <input type="password" inputMode="numeric" maxLength={10} value={pin} onChange={e => { setPin(e.target.value); setErr(''); }} onKeyDown={e => e.key==='Enter'&&submit()} style={{ width:'100%',padding:'14px 16px',borderRadius:16,border:'2px solid var(--mint-border)',background:'var(--surface2)',fontFamily:"'Space Mono',monospace",fontSize:20,letterSpacing:6,outline:'none',textAlign:'center',marginBottom:8 }} autoFocus />
        <div style={{ textAlign:'center',color:'#e03030',fontSize:12,minHeight:18,marginBottom:12 }}>{err}</div>
        <button onClick={submit} style={{ width:'100%',padding:14,borderRadius:20,border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer' }}>ยืนยัน</button>
        <button onClick={onClose} style={{ width:'100%',padding:13,borderRadius:20,marginTop:10,border:'1.5px solid var(--mint-border)',background:'var(--surface)',color:'var(--txt2)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:600,cursor:'pointer' }}>ยกเลิก</button>
      </div>
    </div>
  );
}

function CameraOverlay({ onScan, onClose }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const [status, setStatus] = useState('กำลังเปิดกล้อง...');
  useEffect(() => {
    let lastScan = 0, active = true;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('พร้อมสแกน ✓');
        function tick() {
          if (!active) return;
          const v = videoRef.current, c = canvasRef.current;
          if (v?.readyState === v?.HAVE_ENOUGH_DATA) {
            c.width = v.videoWidth; c.height = v.videoHeight;
            const ctx = c.getContext('2d'); ctx.drawImage(v,0,0,c.width,c.height);
            if (Date.now()-lastScan > 300) {
              lastScan = Date.now();
              try { const d = ctx.getImageData(0,0,c.width,c.height); const code = window.jsQR?.(d.data,d.width,d.height,{inversionAttempts:'dontInvert'}); if (code?.data) { active=false; onScan(code.data.trim()); return; } } catch {}
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch { setStatus('❌ ไม่สามารถเปิดกล้องได้'); setTimeout(onClose, 2000); }
    }
    start();
    return () => { active=false; cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t=>t.stop()); };
  }, []);
  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%',maxWidth:390,height:'100%',objectFit:'cover',position:'absolute',inset:0 }} />
      <canvas ref={canvasRef} style={{ display:'none' }} />
      <button onClick={onClose} style={{ position:'absolute',top:48,right:16,zIndex:20,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',borderRadius:'50%',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,cursor:'pointer' }}><i className="ti ti-x" /></button>
      <div style={{ position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:16 }}>
        <div style={{ width:240,height:240,borderRadius:20,position:'relative',boxShadow:'0 0 0 2000px rgba(33,58,88,0.6)' }}>
          {[{top:0,left:0,borderWidth:'3px 0 0 3px',borderRadius:'10px 0 0 0'},{top:0,right:0,borderWidth:'3px 3px 0 0',borderRadius:'0 10px 0 0'},{bottom:0,left:0,borderWidth:'0 0 3px 3px',borderRadius:'0 0 0 10px'},{bottom:0,right:0,borderWidth:'0 3px 3px 0',borderRadius:'0 0 10px 0'}].map((s,i)=><div key={i} style={{ position:'absolute',width:44,height:44,borderColor:'var(--mint)',borderStyle:'solid',...s }} />)}
          <div style={{ position:'absolute',left:4,right:4,height:2,background:'linear-gradient(90deg,transparent,var(--mint),transparent)',animation:'scanLine 2s ease-in-out infinite' }} />
        </div>
        <div style={{ color:'rgba(255,255,255,0.7)',fontSize:13 }}>วาง QR Code ให้อยู่ในกรอบ</div>
        <div style={{ color:'#fff',fontFamily:"'Space Mono',monospace",fontSize:11 }}>{status}</div>
      </div>
    </div>
  );
}

function AuditSheet({ asset, loggedInEmp, onConfirm, onClose }) {
  const [status,   setStatus]   = useState(asset?.status||'good');
  const [note,     setNote]     = useState('');
  const [selEmp,   setSelEmp]   = useState(null);
  const [location, setLocation] = useState(asset?.location||'');
  const IS = { width:'100%',padding:'11px 13px',borderRadius:14,border:'1.5px solid var(--mint-border)',background:'var(--surface)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,outline:'none',color:'var(--txt)' };
  if (!asset) return null;
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(33,58,88,0.45)',display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--surface)',borderRadius:'28px 28px 0 0',padding:24,width:'100%',maxWidth:480,paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))',maxHeight:'90dvh',overflowY:'auto',animation:'pCardIn 0.3s cubic-bezier(0.16,1,0.3,1)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
          <div style={{ fontSize:32 }}>{asset.icon||'🔍'}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:16,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{asset.name}</div>
            <div style={{ fontSize:11,color:'var(--txt3)',fontFamily:"'Space Mono',monospace" }}>{asset.id}</div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:8,fontWeight:500 }}>สถานะ</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {Object.entries(STATUS_CFG).map(([k,v]) => (
              <button key={k} onClick={() => setStatus(k)} style={{ padding:'10px 8px',borderRadius:12,border:`1.5px solid ${status===k?v.color:v.border}`,background:status===k?v.bg:'var(--surface)',color:v.color,fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.15s' }}>{v.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:6,fontWeight:500 }}>ตำแหน่ง/สถานที่</div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="เช่น Rack A, Row 3" style={IS} />
        </div>
        <EmployeePicker selected={selEmp} onSelect={setSelEmp} label="ผู้รับผิดชอบ" />
        <div style={{ marginTop:12,marginBottom:16 }}>
          <div style={{ fontSize:12,color:'var(--txt2)',marginBottom:6,fontWeight:500 }}>หมายเหตุ</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="บันทึกเพิ่มเติม..." style={{ ...IS,resize:'none',lineHeight:1.5 }} />
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:13,borderRadius:16,border:'1.5px solid var(--mint-border)',background:'var(--surface)',color:'var(--txt2)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:600,cursor:'pointer' }}>ยกเลิก</button>
          <button onClick={() => onConfirm({ asset,status,note,location,assignee:selEmp||loggedInEmp })} style={{ flex:2,padding:13,borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(70,223,177,0.3)' }}>✓ บันทึกการตรวจสอบ</button>
        </div>
      </div>
    </div>
  );
}

function AssetCard({ asset, onTap }) {
  const c = STATUS_CFG[asset.status]||STATUS_CFG.good;
  return (
    <div onClick={() => onTap(asset)} style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'12px 14px',boxShadow:'var(--shadow-sm)',display:'flex',gap:12,alignItems:'flex-start',cursor:'pointer',animation:'fadeUp 0.25s ease both',border:`1.5px solid ${c.border}` }}>
      <div style={{ fontSize:28,flexShrink:0,lineHeight:1 }}>{asset.icon||'🔍'}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3 }}>{asset.name}</div>
        <div style={{ fontSize:11,color:'var(--txt3)',marginBottom:5 }}>{asset.cat} · <span style={{ fontFamily:"'Space Mono',monospace",fontSize:10 }}>{asset.id}</span></div>
        <StatusBadge status={asset.status} />
      </div>
      {asset.lastAudit && <div style={{ fontSize:9,color:'var(--txt3)',flexShrink:0,textAlign:'right',fontFamily:"'Space Mono',monospace" }}>{displayTs(asset.lastAudit).split(' ').slice(-2).join('\n')}</div>}
    </div>
  );
}

export default function AssetAudit({ user }) {
  const [loggedInEmp,   setLoggedInEmp]   = useState(() => user ? EMPLOYEES.find(e => e.id===user.id)||null : null);
  const [assets,        setAssets]        = useState(() => loadLocal('aa_assets', []));
  const [auditLogs,     setAuditLogs]     = useState(() => loadLocal('aa_logs', []));
  const [cfg,           setCfg]           = useState(() => { const c = loadLocal('aa_cfg',{}); if (!c.url) c.url=DEFAULT_GAS_URL; return c; });
  const [activePage,    setActivePage]    = useState('home');
  const [syncStatus,    setSyncStatus]    = useState('none');
  const [pinOpen,       setPinOpen]       = useState(false);
  const [setupUnlocked, setSetupUnlocked] = useState(false);
  const [showCamera,    setShowCamera]    = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [curAsset,      setCurAsset]      = useState(null);
  const [toast,         setToast]         = useState(null);
  const [searchQ,       setSearchQ]       = useState('');
  const [filterStatus,  setFilterStatus]  = useState('all');

  const showToast = useCallback((msg, color) => { setToast({ msg, color:color||'#213A58' }); setTimeout(() => setToast(null), 2800); }, []);

  useEffect(() => { saveLocal('aa_assets', assets); }, [assets]);
  useEffect(() => { saveLocal('aa_logs', auditLogs); }, [auditLogs]);
  useEffect(() => { saveLocal('aa_cfg', cfg); }, [cfg]);
  useEffect(() => { syncData(); }, [cfg.url]);

  async function syncData() {
    if (!cfg.url) { setSyncStatus('none'); return; }
    setSyncStatus('syncing');
    try {
      const d = await gasGet(cfg.url);
      if (Array.isArray(d?.assets)) setAssets(d.assets.map(a => ({ id:String(a.id||''),name:String(a.name||''),cat:String(a.cat||''),status:a.status||'good',location:a.location||'',assignee:a.assignee||'',icon:a.icon||'🔍',lastAudit:a.lastAudit||'' })));
      if (Array.isArray(d?.auditLogs)) setAuditLogs(d.auditLogs);
      setSyncStatus('ok');
    } catch { setSyncStatus('error'); }
  }

  function handleScanQR(code) {
    const a = assets.find(x => x.id===code);
    if (!a) { showToast('ไม่พบ Asset นี้ในระบบ ❌','#FF4D4D'); return; }
    setCurAsset(a); setActivePage('scan');
  }

  async function handleAuditConfirm({ asset, status, note, location, assignee }) {
    const ts = nowISO();
    const emp = assignee||loggedInEmp;
    const snap = { ...asset, status, location, lastAudit:ts };
    if (assignee) snap.assignee = assignee.id;
    setAssets(prev => prev.map(a => a.id===asset.id ? snap : a));
    setAuditLogs(prev => [{ timestamp:ts,asset_id:asset.id,asset_name:asset.name,status,location,inspector:emp?.id||'',note,action:'audit' }, ...prev]);
    setCurAsset(null);
    showToast(`บันทึกการตรวจสอบ "${asset.name}" ✓`,'var(--mid-teal)');
    if (cfg.url) {
      try { await gasPost(cfg.url, { action:'audit',timestamp:ts,asset_id:asset.id,asset_name:asset.name,status,location,inspector:emp?.id||'',note }); setTimeout(syncData,1000); }
      catch { showToast('บันทึกในเครื่อง (ส่ง Sheet ไม่ได้)','#FFB700'); }
    }
  }

  async function handleAddAsset(form) {
    if (!form.name) { showToast('ใส่ชื่อ Asset ด้วย','#FFB700'); return; }
    const cnt = Math.max(1, parseInt(form.count)||1);
    const newAssets = Array.from({ length:cnt }, () => ({ id:uid(),name:form.name,cat:form.cat||'IT',status:'good',location:form.location||'',assignee:'',icon:form.icon||'🔍',lastAudit:'' }));
    setAssets(prev => [...prev,...newAssets]);
    if (cfg.url) {
      try { await gasPost(cfg.url,{ action:'add_assets',assets:newAssets }); showToast(`เพิ่ม "${form.name}" ${cnt} รายการ ✓`); await syncData(); }
      catch { showToast('บันทึกในเครื่อง (ส่ง Sheet ไม่ได้)','#FFB700'); }
    } else { showToast(`เพิ่ม Asset (ยังไม่ได้เชื่อม Sheet)`,'#FFB700'); }
  }

  async function handleDelAsset(id) {
    if (!window.confirm('ยืนยันลบ Asset นี้?')) return;
    setAssets(prev => prev.filter(a => a.id!==id));
    if (cfg.url) { try { await gasPost(cfg.url,{ action:'delete_asset',id }); showToast('ลบแล้ว ✓'); } catch { showToast('ลบในเครื่อง (ส่ง Sheet ไม่ได้)','#FFB700'); } }
  }

  function goNav(key) {
    if (key==='setup' && !setupUnlocked) { setPinOpen(true); return; }
    setActivePage(key);
  }

  const filteredAssets = useMemo(() => assets.filter(a => {
    const mS = filterStatus==='all' || a.status===filterStatus;
    const mQ = !searchQ || fuzzyMatch(a.name+' '+a.id+' '+a.cat+' '+a.location, searchQ);
    return mS && mQ;
  }), [assets, filterStatus, searchQ]);

  const stats = useMemo(() => ({
    total:   assets.length, audited: assets.filter(a=>!!a.lastAudit).length,
    good:    assets.filter(a=>a.status==='good').length,    damaged:  assets.filter(a=>a.status==='damaged').length,
    missing: assets.filter(a=>a.status==='missing').length, disposed: assets.filter(a=>a.status==='disposed').length,
  }), [assets]);

  if (!loggedInEmp) return <AALogin onLogin={emp => setLoggedInEmp(emp)} />;

  const IS = { width:'100%',padding:'11px 13px',borderRadius:14,border:'1.5px solid var(--mint-border)',background:'var(--surface)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,outline:'none',color:'var(--txt)' };

  return (
    <div style={{ fontFamily:"'Noto Sans Thai',sans-serif",background:'var(--bg)',color:'var(--txt)',maxWidth:480,margin:'0 auto',minHeight:'100%',width:'100%',overflowX:'hidden',paddingBottom:88 }}>
      <TopBar syncStatus={syncStatus} onSync={syncData} onOpenDirectory={() => setShowDirectory(true)} loggedInEmp={loggedInEmp} />
      <div style={{ padding:'0 14px' }}>

        {/* HOME */}
        {activePage==='home' && (
          <div style={{ paddingTop:16 }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20 }}>
              {[{icon:'🏷️',label:'ทั้งหมด',value:stats.total,color:'var(--navy)'},{icon:'✅',label:'ดี',value:stats.good,color:'#22C55E'},{icon:'🔧',label:'ชำรุด',value:stats.damaged,color:'#EF4444'},{icon:'❓',label:'หาย',value:stats.missing,color:'#F59E0B'}].map((s,i) => (
                <div key={i} style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'14px 16px',boxShadow:'var(--shadow-sm)',display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ fontSize:26,flexShrink:0 }}>{s.icon}</div>
                  <div><div style={{ fontSize:22,fontWeight:800,color:s.color,fontFamily:"'Outfit',sans-serif",lineHeight:1.1 }}>{s.value}</div><div style={{ fontSize:11,color:'var(--txt3)',marginTop:2 }}>{s.label}</div></div>
                </div>
              ))}
            </div>
            <button onClick={() => setActivePage('scan')} style={{ width:'100%',padding:'15px 20px',borderRadius:'var(--r2)',border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 6px 20px rgba(70,223,177,0.3)',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
              <i className="ti ti-qrcode" style={{ fontSize:22 }} /> สแกนตรวจสอบ Asset
            </button>
            <div style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'14px',boxShadow:'var(--shadow-sm)',marginBottom:16 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)' }}>ความคืบหน้าการตรวจสอบ</div>
                <div style={{ fontSize:12,color:'var(--txt3)' }}>{stats.audited}/{stats.total}</div>
              </div>
              <div style={{ height:8,borderRadius:100,background:'var(--bg)',overflow:'hidden' }}>
                <div style={{ height:'100%',width:stats.total>0?`${(stats.audited/stats.total)*100}%`:'0%',background:'linear-gradient(90deg,var(--mint),var(--teal))',borderRadius:100,transition:'width 0.8s ease' }} />
              </div>
              <div style={{ fontSize:11,color:'var(--txt3)',marginTop:6,textAlign:'right' }}>{stats.total>0?Math.round((stats.audited/stats.total)*100):0}% เสร็จแล้ว</div>
            </div>
            {auditLogs.slice(0,4).length > 0 && (
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:10 }}>🕒 ตรวจสอบล่าสุด</div>
                <div style={{ background:'var(--surface)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)',overflow:'hidden' }}>
                  {auditLogs.slice(0,4).map((l,i) => (
                    <div key={i} style={{ padding:'10px 14px',borderBottom:i<3?'1px solid var(--mint-border)':'none',display:'flex',gap:10,alignItems:'center' }}>
                      <StatusBadge status={l.status} />
                      <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:12,fontWeight:600,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.asset_name}</div><div style={{ fontSize:11,color:'var(--txt3)' }}>{l.inspector}</div></div>
                      <div style={{ fontSize:10,color:'var(--txt3)',fontFamily:"'Space Mono',monospace",flexShrink:0 }}>{displayTs(l.timestamp).split(' ').slice(-2).join(' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCAN */}
        {activePage==='scan' && (
          <div style={{ paddingTop:16 }}>
            {!curAsset ? (
              <>
                <button onClick={() => setShowCamera(true)} style={{ width:'100%',padding:'18px 20px',borderRadius:'var(--r2)',border:'2px dashed var(--mint-border)',background:'var(--mint-dim)',color:'var(--mid-teal)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:16,fontWeight:700,cursor:'pointer',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
                  <i className="ti ti-camera" style={{ fontSize:24 }} /> เปิดกล้องสแกน QR
                </button>
                <div style={{ display:'flex',gap:8,marginBottom:20 }}>
                  <input placeholder="Asset ID" style={{ ...IS,flex:1 }} onKeyDown={e => { if (e.key==='Enter') handleScanQR(e.target.value.trim()); }} />
                  <button onClick={e => handleScanQR(e.target.previousSibling?.value?.trim()||'')} style={{ padding:'11px 18px',borderRadius:14,border:'none',background:'var(--mint)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14 }}>ค้นหา</button>
                </div>
                <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:10 }}>Asset ทั้งหมด ({assets.length})</div>
                <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                  {assets.map(a => <AssetCard key={a.id} asset={a} onTap={a => setCurAsset(a)} />)}
                </div>
              </>
            ) : (
              <div style={{ animation:'fadeUp 0.25s ease' }}>
                <div style={{ background:'linear-gradient(135deg,var(--navy),var(--deep-teal))',borderRadius:'var(--r2)',padding:18,marginBottom:16,color:'#fff',display:'flex',alignItems:'center',gap:14 }}>
                  <div style={{ fontSize:36 }}>{curAsset.icon||'🔍'}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:800,fontSize:15,marginBottom:4 }}>{curAsset.name}</div>
                    <div style={{ fontSize:11,opacity:.7,fontFamily:"'Space Mono',monospace",marginBottom:6 }}>{curAsset.id}</div>
                    <StatusBadge status={curAsset.status} />
                  </div>
                </div>
                <AuditSheet asset={curAsset} loggedInEmp={loggedInEmp} onConfirm={handleAuditConfirm} onClose={() => setCurAsset(null)} />
              </div>
            )}
          </div>
        )}

        {/* LIST */}
        {activePage==='list' && (
          <div style={{ paddingTop:16 }}>
            <div style={{ position:'relative',marginBottom:10 }}>
              <i className="ti ti-search" style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--txt3)',pointerEvents:'none' }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ค้นหาชื่อ, ID, ตำแหน่ง..." style={{ ...IS,paddingLeft:36 }} />
            </div>
            <div style={{ display:'flex',gap:6,marginBottom:12,overflowX:'auto',scrollbarWidth:'none' }}>
              {[['all','ทั้งหมด'],['good','✅ ดี'],['damaged','🔧 ชำรุด'],['missing','❓ หาย'],['disposed','🗑 จำหน่าย']].map(([k,l]) => (
                <button key={k} onClick={() => setFilterStatus(k)} style={{ padding:'6px 14px',borderRadius:100,border:'1.5px solid',borderColor:filterStatus===k?'var(--mint)':'var(--mint-border)',background:filterStatus===k?'var(--mint)':'var(--surface)',color:filterStatus===k?'#fff':'var(--txt2)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s' }}>{l}</button>
              ))}
            </div>
            <div style={{ fontSize:11,color:'var(--txt3)',marginBottom:10 }}>{filteredAssets.length} รายการ</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {filteredAssets.map(a => (
                <div key={a.id} style={{ display:'flex',gap:6,alignItems:'center' }}>
                  <div style={{ flex:1 }}><AssetCard asset={a} onTap={a => { setCurAsset(a); setActivePage('scan'); }} /></div>
                  <button onClick={() => handleDelAsset(a.id)} style={{ width:36,height:36,borderRadius:12,border:'1px solid #FFD0D0',background:'#FFF5F5',color:'#FF4D4D',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><i className="ti ti-trash" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT */}
        {activePage==='report' && (
          <div style={{ paddingTop:16 }}>
            <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)',marginBottom:12 }}>📊 สรุปสถานะ Asset</div>
            <div style={{ background:'var(--surface)',borderRadius:'var(--r2)',padding:'16px',boxShadow:'var(--shadow-md)',marginBottom:16 }}>
              {Object.entries(STATUS_CFG).map(([k,v],i,arr) => {
                const cnt = assets.filter(a=>a.status===k).length;
                return (
                  <div key={k} style={{ display:'flex',alignItems:'center',gap:12,marginBottom:i<arr.length-1?14:0 }}>
                    <StatusBadge status={k} />
                    <div style={{ flex:1,height:8,borderRadius:100,background:'var(--bg)',overflow:'hidden' }}>
                      <div style={{ height:'100%',width:stats.total>0?`${(cnt/stats.total)*100}%`:'0%',background:v.color,borderRadius:100,transition:'width 0.8s ease' }} />
                    </div>
                    <div style={{ fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:16,color:v.color,flexShrink:0,minWidth:24,textAlign:'right' }}>{cnt}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)',marginBottom:10 }}>📋 ประวัติตรวจสอบ ({auditLogs.length})</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {auditLogs.slice(0,20).map((l,i) => (
                <div key={i} style={{ background:'var(--surface)',borderRadius:'var(--r)',padding:'10px 14px',boxShadow:'var(--shadow-sm)',display:'flex',gap:10,alignItems:'center',animation:`fadeUp 0.25s ${i*0.025}s ease both` }}>
                  <StatusBadge status={l.status} />
                  <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:12,fontWeight:600,color:'var(--txt)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.asset_name}</div><div style={{ fontSize:11,color:'var(--txt3)' }}>{l.inspector}{l.note&&' · '+l.note}</div></div>
                  <div style={{ fontSize:10,color:'var(--txt3)',fontFamily:"'Space Mono',monospace",flexShrink:0 }}>{displayTs(l.timestamp).split(' ').slice(-2).join(' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETUP */}
        {activePage==='setup' && (
          <div style={{ paddingTop:16 }}>
            {!setupUnlocked ? (
              <div style={{ paddingTop:40,textAlign:'center',color:'var(--txt3)' }}>
                <div style={{ fontSize:48,marginBottom:12 }}>🔒</div>
                <div style={{ fontWeight:700,fontSize:15,color:'var(--txt)',marginBottom:20 }}>ต้องใส่ PIN เพื่อเข้าตั้งค่า</div>
                <button onClick={() => setPinOpen(true)} style={{ padding:'13px 32px',borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer' }}>🔓 ใส่ PIN</button>
              </div>
            ) : (
              <>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:'var(--txt)' }}>⚙️ ตั้งค่า Asset Audit</div>
                  <button onClick={() => { setSetupUnlocked(false); setActivePage('home'); }} style={{ padding:'7px 14px',borderRadius:100,border:'1.5px solid #FF4D4D',background:'transparent',color:'#FF4D4D',fontSize:12,fontWeight:600,cursor:'pointer' }}>🔒 ล็อค</button>
                </div>
                <SetupForm cfg={cfg} onSave={url => { setCfg(c=>({...c,url})); setTimeout(syncData,200); showToast('บันทึกแล้ว ✓'); }} onSync={syncData} onAdd={handleAddAsset} IS={IS} />
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav active={activePage} onGo={goNav} />
      {pinOpen && <PinModal onSuccess={() => { setSetupUnlocked(true); setPinOpen(false); setActivePage('setup'); }} onClose={() => setPinOpen(false)} />}
      {showCamera && <CameraOverlay onScan={code => { setShowCamera(false); handleScanQR(code); }} onClose={() => setShowCamera(false)} />}
      {curAsset && activePage!=='scan' && <AuditSheet asset={curAsset} loggedInEmp={loggedInEmp} onConfirm={handleAuditConfirm} onClose={() => setCurAsset(null)} />}
      <EmployeeDirectory isOpen={showDirectory} onClose={() => setShowDirectory(false)} selectMode={false} />
      <Toast toast={toast} />
    </div>
  );
}

function SetupForm({ cfg, onSave, onSync, onAdd, IS }) {
  const [url,  setUrl]  = useState(cfg.url||'');
  const [form, setForm] = useState({ name:'',cat:'IT',location:'',icon:'🔍',count:1 });
  const sf = (k,v) => setForm(f => ({ ...f,[k]:v }));
  return (
    <>
      <div style={{ background:'var(--surface)',borderRadius:'var(--r2)',padding:'16px',boxShadow:'var(--shadow-md)',marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:10 }}>GAS URL</div>
        <textarea value={url} onChange={e => setUrl(e.target.value)} rows={3} placeholder="https://script.google.com/macros/s/…/exec" style={{ ...IS,resize:'none',fontFamily:"'Space Mono',monospace",fontSize:11,marginBottom:10 }} />
        <button onClick={() => onSave(url.trim())} style={{ width:'100%',padding:12,borderRadius:14,border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:8 }}>💾 บันทึก URL</button>
        <button onClick={onSync} style={{ width:'100%',padding:11,borderRadius:14,border:'1.5px solid var(--mint-border)',background:'var(--surface)',color:'var(--mid-teal)',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:13,fontWeight:600,cursor:'pointer' }}>🔄 ซิงค์ตอนนี้</button>
      </div>
      <div style={{ background:'var(--surface)',borderRadius:'var(--r2)',padding:'16px',boxShadow:'var(--shadow-md)' }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--txt)',marginBottom:12 }}>➕ เพิ่ม Asset ใหม่</div>
        <div style={{ marginBottom:10 }}><div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>ชื่อ Asset</div><input value={form.name} onChange={e => sf('name',e.target.value)} placeholder="เช่น Server Dell R740" style={IS} /></div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
          <div><div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>หมวดหมู่</div><input value={form.cat} onChange={e => sf('cat',e.target.value)} placeholder="IT" style={IS} /></div>
          <div><div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>ตำแหน่ง</div><input value={form.location} onChange={e => sf('location',e.target.value)} placeholder="Rack A" style={IS} /></div>
          <div><div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>ไอคอน</div><input value={form.icon} onChange={e => sf('icon',e.target.value)} placeholder="🔍" style={IS} /></div>
          <div><div style={{ fontSize:12,color:'var(--txt2)',marginBottom:5 }}>จำนวน</div><input type="number" value={form.count} onChange={e => sf('count',e.target.value)} min={1} max={100} style={IS} /></div>
        </div>
        <button onClick={() => onAdd(form)} style={{ width:'100%',padding:12,borderRadius:14,border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:14,fontWeight:700,cursor:'pointer' }}>➕ เพิ่ม Asset</button>
      </div>
    </>
  );
}

function AALogin({ onLogin }) {
  const [empId, setEmpId] = useState('');
  const [err,   setErr]   = useState('');
  const IS = { width:'100%',padding:'13px 14px',borderRadius:14,border:'1.5px solid var(--mint-border)',background:'var(--surface)',fontFamily:"'Space Mono',monospace",fontSize:14,outline:'none',color:'var(--txt)',marginBottom:16 };
  function submit() { const emp = EMPLOYEES.find(e => e.id===empId.trim()); if (!emp) { setErr('ไม่พบรหัสพนักงานนี้'); return; } onLogin(emp); }
  return (
    <div style={{ padding:'40px 20px',maxWidth:360,margin:'0 auto' }}>
      <div style={{ textAlign:'center',marginBottom:32 }}><div style={{ fontSize:48,marginBottom:12 }}>🔍</div><div style={{ fontFamily:"'Outfit',sans-serif",fontSize:'1.5rem',fontWeight:800,color:'var(--navy)' }}>Asset Audit</div><div style={{ fontSize:12,color:'var(--txt3)' }}>INET IDC-3</div></div>
      {err && <div style={{ background:'#FFF0F0',border:'1px solid #FFB0B0',borderRadius:12,padding:'10px 14px',color:'#CC3333',fontSize:13,marginBottom:14,textAlign:'center' }}>{err}</div>}
      <label style={{ fontSize:12,color:'var(--txt2)',display:'block',marginBottom:6 }}>รหัสพนักงาน</label>
      <input value={empId} onChange={e => { setEmpId(e.target.value); setErr(''); }} onKeyDown={e => e.key==='Enter'&&submit()} placeholder="เช่น OD1100000" style={IS} />
      <button onClick={submit} style={{ width:'100%',padding:14,borderRadius:16,border:'none',background:'linear-gradient(135deg,var(--mint),var(--mid-teal))',color:'#fff',fontFamily:"'Noto Sans Thai',sans-serif",fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(70,223,177,0.3)' }}>เข้าสู่ระบบ →</button>
    </div>
  );
}
