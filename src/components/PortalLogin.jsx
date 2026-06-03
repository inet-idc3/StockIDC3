// ─────────────────────────────────────────────────────────────
// PortalLogin.jsx — Cinematic login screen for the portal shell
// ─────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { LoginBackground, CinParticles } from './ui/CinBackground.jsx';
import { EMPLOYEES, EMP_IDS } from '../data/employees.js';

export default function PortalLogin({ syncing, syncFailed, onLogin, onRetry, error, setError }) {
  const [empId,    setEmpId]    = useState('');
  const [pin,      setPin]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const pinRef = useRef(null);

  function clearErr() { setError(''); }

  async function handleSubmit() {
    clearErr();
    const id = empId.trim();
    if (!id)          { setError('กรุณากรอกรหัสพนักงาน'); return; }
    if (!pin)         { setError('กรุณากรอกรหัสผ่าน');     return; }
    if (!EMP_IDS.includes(id)) { setError('ไม่พบรหัสพนักงานนี้ในระบบ'); return; }

    setLoading(true);
    try {
      const { isFirst } = await onLogin(id, pin);
      // onLogin commits session internally; isFirst triggers pw-change screen
      const emp = EMPLOYEES.find(e => e.id === id);
      return { empId: id, displayName: emp?.displayName || id, isFirst };
    } catch (e) {
      // error already set by useAuth
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 14, color: '#fff',
    fontFamily: "'Space Mono','Noto Sans Thai',sans-serif",
    fontSize: '1rem', outline: 'none', letterSpacing: '1px',
    transition: 'border-color 0.2s,background 0.2s,box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  };

  const focusStyle = {
    border: '1px solid rgba(9,209,199,0.7)',
    background: 'rgba(255,255,255,0.15)',
    boxShadow: '0 0 0 3px rgba(9,209,199,0.15)',
  };

  return (
    <LoginBackground>
      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 5,
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.22)', borderRadius: 28,
        padding: '36px 28px 32px',
        width: 'calc(100% - 40px)', maxWidth: 380,
        boxShadow: '0 32px 72px rgba(4,25,40,0.45),0 2px 0 rgba(255,255,255,0.15) inset',
        animation: 'cin-card-rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.7s both',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ animation: 'cin-logo-pop 0.8s cubic-bezier(0.34,1.56,0.64,1) 1.0s both', display: 'inline-block', marginBottom: 14 }}>
            <div style={{ width:76,height:76,borderRadius:22,background:'linear-gradient(145deg,rgba(255,255,255,0.22),rgba(9,209,199,0.18))',border:'1.5px solid rgba(255,255,255,0.35)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 32px rgba(0,0,0,0.22),0 2px 0 rgba(255,255,255,0.2) inset',margin:'0 auto',overflow:'hidden' }}>
              <img loading="eager" src="icon/ios_180x180.webp" style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:20 }} />
            </div>
          </div>
          <div style={{ animation:'cin-title-slide 0.7s cubic-bezier(0.22,1,0.36,1) 1.3s both',color:'#fff',fontSize:'1.75rem',fontWeight:800,letterSpacing:'1.5px',textShadow:'0 2px 12px rgba(0,0,0,0.3)',fontFamily:"'Outfit',sans-serif" }}>
            INET IDC-3
          </div>
          <div style={{ animation:'cin-subtitle-fade 0.6s ease 1.6s both',color:'rgba(255,255,255,0.65)',fontSize:'0.76rem',marginTop:5,fontFamily:"'Noto Sans Thai',sans-serif",letterSpacing:'1px' }}>
            Portal · บริการองค์กร
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'rgba(255,77,77,0.15)',border:'1px solid rgba(255,100,100,0.35)',borderRadius:12,padding:'10px 14px',color:'#fff',fontSize:'0.82rem',fontFamily:"'Noto Sans Thai',sans-serif",marginBottom:16,textAlign:'center',animation:'fadeUp 0.2s ease' }}>
            ⚠ {error}
          </div>
        )}

        {/* Sync notice */}
        {syncing && (
          <div style={{ background:'rgba(9,209,199,0.1)',border:'1px solid rgba(9,209,199,0.25)',borderRadius:12,padding:'10px 14px',color:'rgba(255,255,255,0.8)',fontSize:'0.8rem',fontFamily:"'Noto Sans Thai',sans-serif",marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            <span style={{ display:'inline-block',width:14,height:14,border:'2px solid rgba(9,209,199,0.4)',borderTopColor:'#09D1C7',borderRadius:'50%',animation:'scanLine 0.7s linear infinite',flexShrink:0 }} />
            <span>กำลังเชื่อมต่อระบบ...</span>
          </div>
        )}

        {/* Sync failed warning */}
        {syncFailed && !syncing && (
          <div style={{ background:'rgba(255,180,0,0.12)',border:'1px solid rgba(255,180,0,0.3)',borderRadius:12,padding:'10px 14px',color:'rgba(255,220,100,0.9)',fontSize:'0.78rem',fontFamily:"'Noto Sans Thai',sans-serif",marginBottom:16,textAlign:'center' }}>
            ⚡ ใช้ข้อมูล Cache (ออฟไลน์)
            <button onClick={onRetry} style={{ marginLeft:8,background:'none',border:'none',color:'rgba(9,209,199,0.9)',fontSize:'0.78rem',cursor:'pointer',textDecoration:'underline',fontFamily:"'Noto Sans Thai',sans-serif" }}>ลองอีกครั้ง</button>
          </div>
        )}

        {/* Employee ID field */}
        <div style={{ animation:'cin-field-in 0.55s cubic-bezier(0.22,1,0.36,1) 1.85s both', marginBottom:14 }}>
          <label style={{ color:'rgba(255,255,255,0.75)',fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.8px',display:'block',marginBottom:7,fontFamily:"'Noto Sans Thai',sans-serif",textTransform:'uppercase' }}>
            รหัสพนักงาน
          </label>
          <input
            value={empId}
            onChange={e => { setEmpId(e.target.value); clearErr(); }}
            onKeyDown={e => { if (e.key === 'Enter') pinRef.current?.focus(); }}
            type="text" placeholder="เช่น OD1100000"
            autoCapitalize="off" autoCorrect="off"
            style={inputStyle}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, { border: inputStyle.border, background: inputStyle.background, boxShadow: inputStyle.boxShadow })}
          />
        </div>

        {/* PIN field */}
        <div style={{ animation:'cin-field-in 0.55s cubic-bezier(0.22,1,0.36,1) 2.05s both', marginBottom:8 }}>
          <label style={{ color:'rgba(255,255,255,0.75)',fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.8px',display:'block',marginBottom:7,fontFamily:"'Noto Sans Thai',sans-serif",textTransform:'uppercase' }}>
            รหัสผ่าน
          </label>
          <input
            ref={pinRef}
            value={pin}
            onChange={e => { setPin(e.target.value); clearErr(); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            type="password" placeholder="ตัวเลข 6 หลัก"
            inputMode="numeric" maxLength={20}
            style={inputStyle}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, { border: inputStyle.border, background: inputStyle.background, boxShadow: inputStyle.boxShadow })}
          />
        </div>

        {/* Submit */}
        <div style={{ animation:'cin-field-in 0.55s cubic-bezier(0.22,1,0.36,1) 2.25s both', marginTop:18 }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width:'100%',padding:15,border:'none',borderRadius:14,background:'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(220,248,246,0.98))',color:'#0C5060',fontFamily:"'Prompt',sans-serif",fontSize:'1rem',fontWeight:700,cursor:loading?'not-allowed':'pointer',letterSpacing:'0.5px',transition:'transform 0.15s,opacity 0.2s',boxShadow:'0 6px 20px rgba(0,0,0,0.15)',opacity:loading?0.7:1,animation:'cin-btn-glow 3s ease-in-out 3s infinite' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
          </button>
        </div>

        {/* Hint */}
        <div style={{ animation:'cin-hint-blink 2.8s ease-in-out 2.6s infinite',color:'rgba(255,255,255,0.45)',fontSize:'0.68rem',textAlign:'center',marginTop:18,fontFamily:"'Noto Sans Thai',sans-serif",letterSpacing:'0.3px' }}>
          ครั้งแรก: รหัสผ่านคือตัวเลขจากรหัสพนักงาน เช่น OD1100000 → 1100000
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(0,0,0,0.18)',backdropFilter:'blur(8px)',borderTop:'1px solid rgba(255,255,255,0.08)',zIndex:6,animation:'cin-subtitle-fade 0.6s ease 2.5s both' }}>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:'0.6rem',color:'rgba(255,255,255,0.3)',letterSpacing:'1.5px' }}>INET · IDC-3 PORTAL</span>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:'0.6rem',color:'rgba(9,209,199,0.5)',letterSpacing:'1px' }}>v4.0</span>
      </div>
    </LoginBackground>
  );
}
