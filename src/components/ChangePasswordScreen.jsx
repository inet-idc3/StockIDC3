// ─────────────────────────────────────────────────────────────
// ChangePasswordScreen.jsx — First-login password change
// Sends old+new PIN to GAS; GAS stores hash server-side.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { LoginBackground } from './ui/CinBackground.jsx';
import { gasPost } from '../services/authService.js';

export default function ChangePasswordScreen({ empId, gasUrl, onDone }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [cfPin,  setCfPin]  = useState('');
  const [error,  setError]  = useState('');
  const [loading, setLoading] = useState(false);

  const IS = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 14, color: '#fff',
    fontFamily: "'Space Mono',monospace",
    fontSize: '1rem', outline: 'none',
    letterSpacing: '2px',
    transition: 'border-color 0.2s,box-shadow 0.2s',
  };
  const focusStyle = { borderColor: 'rgba(9,209,199,0.7)', boxShadow: '0 0 0 3px rgba(9,209,199,0.15)' };
  const blurStyle  = { borderColor: 'rgba(255,255,255,0.22)', boxShadow: 'none' };

  async function submit() {
    setError('');
    if (newPin.length < 6)  { setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    if (newPin !== cfPin)   { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    if (!gasUrl)            { setError('ยังไม่ได้ตั้งค่า GAS URL (ติดต่อผู้ดูแลระบบ)'); return; }

    setLoading(true);
    try {
      const res = await gasPost(gasUrl, {
        action:  'change_password',
        emp_id:  empId,
        old_pin: oldPin,
        new_pin: newPin,
      });
      if (res?.ok) {
        onDone();
      } else {
        setError(res?.reason || 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบรหัสผ่านเดิม');
      }
    } catch {
      setError('เชื่อมต่อ GAS ไม่ได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginBackground>
      <div style={{
        position: 'relative', zIndex: 5,
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: 28, padding: '36px 28px 32px',
        width: 'calc(100% - 40px)', maxWidth: 380,
        boxShadow: '0 32px 72px rgba(4,25,40,0.45)',
        animation: 'cin-card-rise 0.9s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔑</div>
          <div style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: 6 }}>
            ตั้งรหัสผ่านใหม่
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontFamily: "'Noto Sans Thai',sans-serif", lineHeight: 1.6 }}>
            การใช้งานครั้งแรก — กรุณาตั้งรหัสผ่านของคุณ<br/>
            รหัสพนักงาน: <span style={{ fontFamily: "'Space Mono',monospace", color: 'rgba(9,209,199,0.9)' }}>{empId}</span>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,100,100,0.35)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: '0.82rem', fontFamily: "'Noto Sans Thai',sans-serif", marginBottom: 16, textAlign: 'center' }}>
            ⚠ {error}
          </div>
        )}

        {/* Old PIN */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.8px', display: 'block', marginBottom: 7, fontFamily: "'Noto Sans Thai',sans-serif", textTransform: 'uppercase' }}>
            รหัสผ่านเดิม (ตัวเลขจากรหัสพนักงาน)
          </label>
          <input value={oldPin} onChange={e => { setOldPin(e.target.value); setError(''); }}
            type="password" inputMode="numeric" placeholder="เช่น 1158037"
            style={IS}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, blurStyle)}
          />
        </div>

        {/* New PIN */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.8px', display: 'block', marginBottom: 7, fontFamily: "'Noto Sans Thai',sans-serif", textTransform: 'uppercase' }}>
            รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)
          </label>
          <input value={newPin} onChange={e => { setNewPin(e.target.value); setError(''); }}
            type="password" inputMode="numeric" placeholder="ตั้งรหัสผ่านใหม่"
            style={IS}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, blurStyle)}
          />
        </div>

        {/* Confirm PIN */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.8px', display: 'block', marginBottom: 7, fontFamily: "'Noto Sans Thai',sans-serif", textTransform: 'uppercase' }}>
            ยืนยันรหัสผ่านใหม่
          </label>
          <input value={cfPin} onChange={e => { setCfPin(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            type="password" inputMode="numeric" placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
            style={IS}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e  => Object.assign(e.target.style, blurStyle)}
          />
        </div>

        <button onClick={submit} disabled={loading} style={{ width: '100%', padding: 15, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(220,248,246,0.98))', color: '#0C5060', fontFamily: "'Prompt',sans-serif", fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
          {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่ →'}
        </button>

        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', textAlign: 'center', marginTop: 16, fontFamily: "'Noto Sans Thai',sans-serif", lineHeight: 1.6 }}>
          รหัสผ่านจะถูกเก็บอย่างปลอดภัยในระบบ<br/>ไม่มีการเก็บ plain-text ในเบราว์เซอร์
        </div>
      </div>
    </LoginBackground>
  );
}
